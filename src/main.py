# pip install fastapi uvicorn[standard] joblib pandas scikit-learn python-multipart
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd, joblib, io

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

MODEL = None

@app.post("/upload_model")
async def upload_model(model: UploadFile = File(...)):
    """pkl 모델 업로드"""
    global MODEL
    MODEL = joblib.load(io.BytesIO(await model.read()))
    return {"status": "ok", "msg": f"모델 로드 완료: {type(MODEL).__name__}"}


@app.post("/predict")
async def predict(data: UploadFile = File(...)):
    """CSV 업로드 후 예측 수행"""
    if MODEL is None:
        return {"status": "error", "msg": "모델이 아직 업로드되지 않았습니다."}

    df = pd.read_csv(io.BytesIO(await data.read()))
    X = df.select_dtypes(include=["number"])  # 숫자형 피처만 예시로 사용

    preds = MODEL.predict(X)
    df["예측결과"] = preds
    df["불량여부"] = df["예측결과"].apply(lambda x: "정상" if x == "정상" else "불량")

    # 지표 계산
    total = len(df)
    defect = (df["불량여부"] == "불량").sum()
    normal = total - defect
    defect_rate = round(defect / total * 100, 2)

    by_type = df["예측결과"].value_counts().reset_index()
    by_type.columns = ["name", "value"]

    payload = {
        "status": "ok",
        "kpis": {
            "totalInspects": total,
            "normalCount": normal,
            "defectTotal": defect,
            "defectRatePct": defect_rate,
            "criticalDefect": by_type.iloc[1]["name"] if len(by_type) > 1 else "없음",
        },
        "defectDist": by_type.to_dict(orient="records"),
        "table": df.head(10).to_dict(orient="records"),
    }
    return payload
