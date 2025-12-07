# server.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import json
from xgboost import XGBClassifier

app = Flask(__name__)
CORS(app)  # http://localhost:3000 <-> 5001 교차호출 허용

# ====== 모델 로드 ======
MODEL_JSON_PATH = "best_xgb.json"   # 사용자 파일
FEATURE_ORDER = None                # 모델에 저장된 feature_names로 덮어씀(있으면)

loaded_xgb = XGBClassifier()
try:
    loaded_xgb.load_model(MODEL_JSON_PATH)
    # 모델 json 안에 feature_names가 있을 수도 있고 없을 수도 있음
    try:
        # Booster dump에서 feature 이름을 얻을 수 없으면 None
        # 실사용: 학습 시 XGBClassifier(feature_names=...) 저장이 제일 확실
        feature_names = loaded_xgb.get_booster().feature_names
        if feature_names:
            FEATURE_ORDER = feature_names
    except Exception:
        FEATURE_ORDER = None
    print("[OK] XGB 모델 로드 / features:", FEATURE_ORDER)
except Exception as e:
    print("[WARN] 모델 로드 실패:", e)
    loaded_xgb = None

# CSV에서 모델 피처로 변환
def frame_to_model_matrix(df: pd.DataFrame):
    # 타깃/시간/라벨 후보들은 제외
    drop_cols = {"passorfail", "label", "target", "date", "timestamp", "time", "생산일시"}
    cols = [c for c in df.columns if c not in drop_cols]

    X = df[cols].copy()

    # 숫자 캐스팅
    for c in X.columns:
        X[c] = pd.to_numeric(X[c], errors="coerce")

    # 결측치 처리
    X = X.fillna(X.median(numeric_only=True)).fillna(0)

    # 모델의 FEATURE_ORDER가 있으면 그 순서대로 열 맞춤(없으면 그대로)
    if FEATURE_ORDER:
        # 부족한 열은 0으로 채움
        for f in FEATURE_ORDER:
            if f not in X.columns:
                X[f] = 0.0
        X = X[FEATURE_ORDER]
    return X

# 실시간 단건 예측
@app.post("/predict")
def predict():
    if loaded_xgb is None:
        return jsonify({"error":"model not loaded"}), 500

    try:
        payload = request.get_json(force=True) or {}
        row = pd.DataFrame([payload])
        X = frame_to_model_matrix(row)

        prob = float(loaded_xgb.predict_proba(X)[0, 1])
        pred = int(prob >= 0.5)
        return jsonify({
            "prediction": pred,
            "label": "불량" if pred == 1 else "정상",
            "probability": prob
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# 파일 업로드 후 집계(도넛/라인/PPM KPI)
@app.post("/predict_file")
def predict_file():
    if "file" not in request.files:
        return jsonify({"error":"file field missing"}), 400

    try:
        f = request.files["file"]
        df = pd.read_csv(f)

        # KPI: passorfail(0=정상,1=불량) 기준
        if "passorfail" in df.columns:
            s = df["passorfail"].astype(int)
            normal = int((s == 0).sum())
            defect = int((s == 1).sum())
            total  = normal + defect
        else:
            # 라벨이 없으면 모델로 추론해서 집계
            X = frame_to_model_matrix(df)
            if loaded_xgb is None:
                return jsonify({"error":"model not loaded and passorfail not provided"}), 400
            probs = loaded_xgb.predict_proba(X)[:, 1]
            preds = (probs >= 0.5).astype(int)
            defect = int(preds.sum())
            total  = int(len(preds))
            normal = total - defect
            df["passorfail"] = preds

        rate_pct = round((defect / total) * 100, 2) if total else 0.0

        # 도넛: 정상/불량
        donut = [
            {"name": "정상", "value": normal},
            {"name": "불량", "value": defect},
        ]

        # 라인(분 단위 불량률): time/date/timestamp 중 하나로 그룹핑
        ts_col = None
        for c in ["timestamp", "time", "date", "생산일시"]:
            if c in df.columns:
                ts_col = c; break

        if ts_col is not None:
            ts = pd.to_datetime(df[ts_col], errors="coerce")
            minute = ts.dt.strftime("%H:%M")
            grp = pd.concat([minute, df["passorfail"]], axis=1).dropna()
            rate = grp.groupby(ts.dt.strftime("%H:%M"))["passorfail"].mean().reset_index()
            rate.columns = ["time", "rate"]
            rate = rate.sort_values("time")
            rateData = rate.to_dict(orient="records")
        else:
            rateData = []

        # 헤드/스크류 평균(분단위)
        head_keys  = ["EX1.H2_PV", "EX1.H3_PV", "EX1.H4_PV"]
        screw_keys = ["EX1.Z1_PV", "EX1.Z2_PV", "EX1.Z4_PV"]

        def group_avg(keys):
            if ts_col is None: return []
            tmp = df[[ts_col] + [k for k in keys if k in df.columns]].copy()
            tmp[ts_col] = pd.to_datetime(tmp[ts_col], errors="coerce")
            tmp = tmp.dropna(subset=[ts_col])
            tmp["m"] = tmp[ts_col].dt.strftime("%H:%M")
            agg = tmp.groupby("m").mean(numeric_only=True).reset_index()
            agg = agg.rename(columns={"m":"time"})
            return agg.to_dict(orient="records")

        headData  = group_avg(head_keys)
        screwData = group_avg(screw_keys)

        payload = {
            "kpis": {
                "totalInspects": total,
                "normalCount":   normal,
                "defectTotal":   defect,
                "defectRatePct": rate_pct,
                "criticalDefect": "EX5.MELT_TEMP",  # 예시(원하면 SHAP 등으로 교체)
                "hasCsv": True
            },
            "donutData": donut,
            "rateData":  rateData,
            "headData":  headData,
            "screwData": screwData
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.get("/health")
def health():
    return "ok", 200

if __name__ == "__main__":
    # 프런트 코드와 동일 포트/호스트에 맞추기
    app.run(host="127.0.0.1", port=5001, debug=True)
