// src/layout.jsx
import React, { useState } from "react";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, CartesianGrid, XAxis, YAxis,
  BarChart, Bar
} from "recharts";
import "./layout.css";

/* ===========================
   초기 데모 데이터 / 상수
=========================== */
const DEMO_PIE = [
  { name: "정상", value: 6034 },
  { name: "뒤틀림", value: 817 },
  { name: "밀림", value: 941 },
  { name: "도색불량", value: 417 },
  { name: "오산", value: 421 },
  { name: "찍힘", value: 604 },
  { name: "이물질", value: 496 },
  { name: "역삽", value: 836 },
];

const DEMO_LINE = [
  { time: "15:31", rate: 0.9 },
  { time: "15:33", rate: 0.4 },
  { time: "15:35", rate: 0.1 },
  { time: "15:37", rate: 2.3 },
  { time: "15:39", rate: 1.1 },
  { time: "15:41", rate: 1.2 },
  { time: "15:43", rate: 1.8 },
  { time: "15:45", rate: 1.6 },
];

// 도넛/막대 팔레트
const COLORS = [
  "#7fd6a0", "#ff9aa2", "#7fb6cf", "#f6d365", "#ff6b6b",
  "#6bc7ad", "#bdb2ff", "#a0e8af", "#6aa9ff"
];

/* ===========================
   유틸 함수들
=========================== */

// XGBoost json_model 덤프 → 분할 빈도 기반 중요도 [{name,value}]
function extractXgbImportancesFromDump(json) {
  const names = json?.learner?.feature_names;
  const trees = json?.learner?.gradient_booster?.model?.trees;
  if (!Array.isArray(names) || !Array.isArray(trees)) return null;

  const counts = new Array(names.length).fill(0);

  for (const t of trees) {
    const splits = t?.split_indices;
    const left = t?.left_children;
    const right = t?.right_children;
    if (!Array.isArray(splits) || !Array.isArray(left) || !Array.isArray(right)) continue;

    for (let i = 0; i < splits.length; i++) {
      const fi = splits[i];
      const isInternal = left[i] !== -1 && right[i] !== -1; // 리프 제외
      if (!isInternal) continue;
      if (Number.isInteger(fi) && fi >= 0 && fi < counts.length) counts[fi] += 1;
    }
  }

  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return null;

  return names
    .map((name, idx) => ({ name: String(name), value: +(counts[idx] / total).toFixed(4) }))
    .sort((a, b) => b.value - a.value);
}

// 최상단에서 배열 찾아오기 (data/rows/첫 배열 속성)
function pickArray(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.rows)) return json.rows;
  if (json && typeof json === "object") {
    const firstArr = Object.values(json).find(Array.isArray);
    if (firstArr) return firstArr;
  }
  return null;
}

// [{name,value}] → 표준 rows로 변환 (시간 없음 → 현재시각)
function rowsFromCategoryCounts(arr) {
  const now = new Date();
  return arr
    .filter((o) => o && typeof o === "object")
    .map((o) => {
      const name = String(o.name ?? o.type ?? o.item ?? o.defect_type ?? "기타").trim();
      const value = Number(o.value ?? o.count ?? o.qty ?? 0) || 0;
      const status = name === "정상" ? "정상" : "불량";
      return {
        ts: now,
        defect_type: name || (status === "정상" ? "정상" : "기타"),
        count: value,
        status,
      };
    })
    .filter((r) => r.count > 0);
}

// 일반 레코드 배열 정규화
function normalizeRows(data) {
  if (!Array.isArray(data)) return [];
  return data
    .map((r) => {
      const tsStr = (r.timestamp ?? r.time ?? r.date ?? "").toString().trim();
      const ts = tsStr ? new Date(tsStr.replace(" ", "T")) : null; // "YYYY-MM-DD HH:mm" 허용
      const count = Number(r.count ?? r.qty ?? 1) || 1;
      const t = (r.defect_type ?? r.type ?? r.item ?? r.status ?? "").toString().trim();
      const status = (r.status ?? (t === "정상" ? "정상" : "불량")).toString().trim();
      return { ts, defect_type: t || (status === "정상" ? "정상" : "기타"), count, status };
    })
    .filter((r) => r.ts instanceof Date && !isNaN(r.ts));
}

// 날짜 범위 필터
function filterByDate(rows, s, e) {
  const sDate = new Date(s + "T00:00:00");
  const eDate = new Date(e + "T23:59:59");
  return rows.filter((r) => r.ts >= sDate && r.ts <= eDate);
}

/* ===========================
   메인 컴포넌트
=========================== */

export default function Layout() {
  const [startDate, setStartDate] = useState("2025-03-01");
  const [endDate,   setEndDate]   = useState("2025-03-24");

  // 업로드 원본(정규화 후)
  const [rawRows, setRawRows] = useState([]);

  // 차트 상태
  const [pieData, setPieData]   = useState(DEMO_PIE);
  const [barData, setBarData]   = useState(DEMO_PIE);
  const [lineData, setLineData] = useState(DEMO_LINE);

  // KPI
  const [kpis, setKpis] = useState({
    totalInspects: 118361,
    normalCount: 6034,
    defectTotal: 4726,
    defectRatePct: 13,
    criticalDefect: "뒤틀림",
  });

  // 토스트
  const [toast, setToast] = useState({ show: false, msg: "" });
  const showToast = (msg) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast({ show: false, msg: "" }), 2200);
  };

  // JSON 업로드
  const onPickJson = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target.result);

        // ① XGBoost 모델 덤프 처리 (특징 중요도 추출)
        const fi = extractXgbImportancesFromDump(raw);
        if (fi && fi.length) {
          const rows = rowsFromCategoryCounts(fi); // KPI/라인 일관 위해 표준화
          setRawRows(rows);
          setPieData(fi);
          setBarData(fi);
          setLineData([]); // 실시간 라인 무의미 → 비움
          setKpis({
            totalInspects: fi.length,
            normalCount: 0,
            defectTotal: 0,
            defectRatePct: 0,
            criticalDefect: fi[0]?.name ?? "-",
          });
          showToast(`모델 JSON 업로드 완료 (특징 중요도 ${fi.length}개 반영).`);
          e.target.value = "";
          return;
        }

        // ② 일반 JSON (배열/ data/ rows 등)
        const arr = pickArray(raw);
        if (!arr) {
          showToast("JSON에서 배열을 찾지 못했습니다. (data/rows/첫 배열 속성 확인)");
          return;
        }

        const looksLikeCategory =
          arr.length > 0 &&
          typeof arr[0] === "object" &&
          ("name" in arr[0] || "value" in arr[0]) &&
          !("timestamp" in arr[0] || "time" in arr[0] || "date" in arr[0]);

        const rows = looksLikeCategory ? rowsFromCategoryCounts(arr) : normalizeRows(arr);
        if (!rows.length) {
          showToast("적용 가능한 레코드를 찾지 못했습니다. (필드명 확인)");
          return;
        }

        const filtered = filterByDate(rows, startDate, endDate);
        // KPI/차트 반영
        applyToCharts(filtered);

        // 원본 저장(조회 버튼용)
        setRawRows(rows);

        showToast(`JSON 업로드 완료 (${rows.length.toLocaleString()}행). 기간(${startDate} ~ ${endDate}) 적용됨.`);
      } catch (err) {
        console.error(err);
        showToast("JSON 파싱 실패 — 파일 형식을 확인하세요.");
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  };

  // 기간 재적용
  const onQuery = () => {
    if (!rawRows.length) {
      showToast("먼저 JSON 파일을 업로드하세요.");
      return;
    }
    const filtered = filterByDate(rawRows, startDate, endDate);
    applyToCharts(filtered);
    showToast(`기간(${startDate} ~ ${endDate})으로 다시 적용했습니다.`);
  };

  // 집계 & 상태 반영
  function applyToCharts(rows) {
    if (!rows.length) {
      setKpis({ totalInspects: 0, normalCount: 0, defectTotal: 0, defectRatePct: 0, criticalDefect: "-" });
      setPieData([]);
      setBarData([]);
      setLineData([]);
      return;
    }

    // 총합/정상/불량
    const total = rows.reduce((a, r) => a + r.count, 0);
    const normal = rows.filter((r) => r.status === "정상").reduce((a, r) => a + r.count, 0);
    const defect = total - normal;
    const rate = total ? Math.round((defect / total) * 100) : 0;

    // 유형별 합계 (정상 포함)
    const typeMap = new Map();
    rows.forEach((r) => {
      const key = r.defect_type || (r.status === "정상" ? "정상" : "기타");
      typeMap.set(key, (typeMap.get(key) || 0) + r.count);
    });
    const typeArr = Array.from(typeMap, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // 크리티컬(정상 제외 최다)
    const critical = typeArr.find((d) => d.name !== "정상")?.name ?? "-";

    // 실시간(분 단위) 불량률
    const tmap = new Map(); // "HH:mm" -> {def,total}
    rows.forEach((r) => {
      const key = r.ts.toTimeString().slice(0, 5); // HH:mm
      const ent = tmap.get(key) || { def: 0, total: 0 };
      ent.total += r.count;
      if (r.status !== "정상") ent.def += r.count;
      tmap.set(key, ent);
    });
    const lineArr = Array.from(tmap, ([time, v]) => ({
      time,
      rate: v.total ? +(v.def / v.total).toFixed(2) : 0,
    })).sort((a, b) => a.time.localeCompare(b.time));

    // 반영
    setKpis({
      totalInspects: total,
      normalCount: normal,
      defectTotal: defect,
      defectRatePct: rate,
      criticalDefect: critical,
    });
    setPieData(typeArr);
    setBarData(typeArr);
    setLineData(lineArr);
  }

  return (
    <div className="dash">
      {/* 토스트 */}
      <div className={`toast ${toast.show ? "toast--show" : ""}`}>{toast.msg}</div>

      {/* 헤더 + 컨트롤 */}
      <header className="dash__header">
        <h1>소성가공 품질보증 모니터링 대시보드</h1>
        <div className="dash__controls">
          <label className="dash__filter">
            <span>시작</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <span className="dash__tilde">-</span>
          <label className="dash__filter">
            <span>종료</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>

          {/* JSON 업로드 */}
          <label className="upload btn btn--upload">
            JSON 업로드
            <input type="file" accept=".json,application/json" onChange={onPickJson} />
          </label>

          {/* 기간만 재적용 */}
          <button className="btn btn--primary" onClick={onQuery} disabled={!rawRows.length}>
            조회
          </button>
        </div>
      </header>

      {/* KPI */}
      <section className="kpis">
        <div className="kpi">
          <div className="kpi__label">총 검사수</div>
          <div className="kpi__value">{kpis.totalInspects?.toLocaleString?.() ?? kpis.totalInspects}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">정상개수</div>
          <div className="kpi__value">{kpis.normalCount?.toLocaleString?.() ?? kpis.normalCount}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">총불량개수</div>
          <div className="kpi__value">{kpis.defectTotal?.toLocaleString?.() ?? kpis.defectTotal}</div>
        </div>
        <div className="kpi kpi--accent">
          <div className="kpi__label">크리티컬 불량영역</div>
          <div className="kpi__value">{kpis.criticalDefect}</div>
        </div>
        <div className="kpi kpi--accent">
          <div className="kpi__label">불량률</div>
          <div className="kpi__value">{kpis.defectRatePct}%</div>
        </div>
        <div className="kpi kpi--ghost">
          <div className="kpi__label">데이터</div>
          <div className="kpi__value">{pieData === DEMO_PIE ? "데모" : "업로드"}</div>
        </div>
      </section>

      {/* 상단 3분할 */}
      <section className="grid-3">
        <div className="panel">
          <div className="panel__title">기간별 불량 현황 (요약)</div>
          <div className="chart">
            <div className="chart__placeholder">
              업로드된 데이터 {pieData === DEMO_PIE ? "없음(데모 표시 중)" : "적용됨"}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">유형별 개수 (Bar)</div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData || []}>
                <CartesianGrid stroke="#57707e" strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="name" stroke="#cfe0ea" />
                <YAxis stroke="#cfe0ea" />
                <Tooltip contentStyle={{ background: "#2b3a45", border: "1px solid #49616f", borderRadius: 8, color: "#eef5f8" }} />
                <Bar dataKey="value" fill="#7fb6cf" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">불량 비율 (Donut)</div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData || []} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="85%" paddingAngle={2}>
                  {(pieData || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: "#cfe0ea" }} />
                <Tooltip contentStyle={{ background: "#2b3a45", border: "1px solid #49616f", borderRadius: 8, color: "#eef5f8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 하단 2분할 */}
      <section className="grid-2">
        <div className="panel">
          <div className="panel__title">유형별 총합 (수평 Bar)</div>
          <div className="chart chart--hbar">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={barData || []}>
                <CartesianGrid stroke="#57707e" strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" stroke="#cfe0ea" />
                <YAxis type="category" dataKey="name" width={90} stroke="#cfe0ea" />
                <Tooltip contentStyle={{ background: "#2b3a45", border: "1px solid #49616f", borderRadius: 8, color: "#eef5f8" }} />
                <Bar dataKey="value" fill="#7fb6cf" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title">실시간 불량 모니터링 (라인)</div>
          <div className="chart chart--line">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData || []}>
                <CartesianGrid stroke="#57707e" strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="time" stroke="#cfe0ea" />
                <YAxis domain={[0, "auto"]} stroke="#cfe0ea" />
                <Tooltip contentStyle={{ background: "#2b3a45", border: "1px solid #49616f", borderRadius: 8, color: "#eef5f8" }} />
                <Line type="monotone" dataKey="rate" dot={false} stroke="#a0e8af" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
