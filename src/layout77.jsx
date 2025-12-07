import React, { useMemo, useRef, useState } from "react";
import "./layout.css";
import Papa from "papaparse";
import {
    ResponsiveContainer,
    PieChart, Pie, Cell, Tooltip, Legend,
    LineChart, Line, CartesianGrid, XAxis, YAxis,
    Area, ReferenceArea,
    Dot
} from "recharts";

// 기본 설정 //
const COLORS = [
    "#7fd6a0","#ff9aa2","#7fb6cf","#f6d365","#ff6b6b",
    "#6bc7ad","#bdb2ff","#a0e8af","#6aa9ff"
];
const API_BASE = "http://127.001:5001";

// 하단 그래프에서 사용할 컬럼 키 //
const HEAD_KEYS  = ["EX1.MELT_P_PV", "EX1.MELT_TEMP"];
const SCREW_KEYS = ["EX1.MD_PV", "EX1.H20_PV"];

// 아이콘(삼각 경고) 변경 : severity 색상 //
const IconWarn = ({ size=22, severity="info" }) => {
    // severity 색상 매핑 정의 (3단계 경보 알림) //
    const colorMap = {
          light_warn: { fill: "#ffcc00", stroke: "#bd8b00", text: "#573d00" }, // 1-2회 (노란색)
          warn: { fill: "#ff8888", stroke: "#cc5555", text: "#660000" },       // 3-4회 (주황색)
          danger: { fill: "#aa1111", stroke: "#770000", text: "#550000" },     // 5회 이상 (빨간색)
    };
    const colors = colorMap[severity] || colorMap.light_warn; // 기본값 light_warn으로 설정

    return (
        <svg width={size} height={size} viewBox="0 0 24 24">
            <polygon points="12,2 22,20 2,20" fill={colors.fill} stroke={colors.stroke} strokeWidth="2"/>
            <text x="12" y="17" textAnchor="middle" fontWeight="bold" fontSize="14" fill={colors.text}>!</text>
        </svg>
    );
};

// 커스텀 라벨 컴포넌트: Dot + 데이터값 //
const CustomDataLabel = ({ x, y, value }) => (
    <text x={x} y={y} dy={-10} fill="var(--text-primary)" fontSize={12} textAnchor="middle" fontWeight="bold">
        {value !== null && value !== undefined ? value.toFixed(1) : ''}
    </text>
);

// 커스텀 Dot 컴포넌트: 불량 시 빨간 동그라미 표시 //
const CustomDataDot = (alertPids) => ({ cx, cy, payload, dataKey, fill, stroke, r, value }) => {
    // PRO_Num : payload.time 적용 //
    const isAlert = alertPids.includes(payload.time);

    // 불량 제품 : 빨간색 원 경고 알림 //
    if (isAlert) {
        return <Dot cx={cx} cy={cy} r={7} fill="#c43e47" stroke="#fff" strokeWidth={2} />; // 크기 더 키움
    }
    
    // 정상 제품 : 기본 Dot //
    return <Dot cx={cx} cy={cy} r={5} fill={fill} stroke={fill} strokeWidth={1} />; // 크기 더 키움
};

// Y축 도메인 계산 함수 : (설정 : 압출헤드는 최대값의 150%, 스크류는 120%)
const calculateYDomain = (data, keys, type) => {
    let maxVal = 0;
    let minVal = Infinity; // 최소값 기반 Y축 시작점 조정
    data.forEach(row => {
        keys.forEach(key => {
            if (row[key] !== null && row[key] !== undefined) {
                maxVal = Math.max(maxVal, row[key]);
                minVal = Math.min(minVal, row[key]);
            }
        });
    });

    // 데이터 없는 경우 : 기본 도메인 반환 //
    if (maxVal === 0 && minVal === Infinity) return [0, 1];

    const paddingFactorMax = 1.2; // 스크류 피쳐 그래프의 Y축 상단 여유를 120%로 조정
    const paddingFactorMin = 0.8; // Y축 하단 여유 (데이터 최소값보다 조금 아래에서 시작)

    if (type === 'screw') {
        // 스크류 그래프 : 최소값 기반 Y축 시작점 조정
        const rawAdjustedMin = minVal * paddingFactorMin;
        const rawAdjustedMax = maxVal * paddingFactorMax;

        // 스크류 Y축 범위 : 10단위로 내림/올림 (minVal이 0보다 큰 경우에만 조정)
        const adjustedMin = minVal > 0 ? Math.floor(rawAdjustedMin / 10) * 10 : 0; 
        const adjustedMax = Math.ceil(rawAdjustedMax / 10) * 10; 
        
        // 스크류 그래프 조정 : min이 max보다 크거나 같아지는 예외 처리
        return adjustedMin < adjustedMax ? [adjustedMin, adjustedMax] : [0, Math.ceil(maxVal * 1.2 / 10) * 10 || 1];
    } else {
        // 압출헤드온도 그래프 : 0부터 시작하고 상단만 150%로 확장
        const rawAdjustedMax = maxVal * 1.5;
        // 10단위로 올림
        const adjustedMax = Math.ceil(rawAdjustedMax / 10) * 10; 
        
        return [0, adjustedMax || 1];
    }
};
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (cx == null || cy == null || innerRadius == null || outerRadius == null) {
    return null;
  }
  const radius = innerRadius + (outerRadius - innerRadius) * 0.1;
  const ncx = Number(cx);
  const x = ncx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const ncy = Number(cy);
  const y = ncy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);

  return (
    <text x={x} y={y} fill="white" fontSize={18} fontWeight="bold" textAnchor={x > ncx ? 'start' : 'end'} dominantBaseline="central">
      {`${((percent ?? 1) * 100).toFixed(0)}%`}
    </text >
  );
}

export default function Layout() {
    // 기간
    const [startDate, setStartDate] = useState("2025-03-01");
    const [endDate,   setEndDate]   = useState("2025-03-24");

    // 업로드 상태
    const [hasJson, setHasJson] = useState(false);
    const [jsonObj, setJsonObj] = useState(null);

    // KPI/차트 상태
    const [kpis, setKpis] = useState({
        totalInspects: 0,
        normalCount: 0,
        defectTotal: 0,
        defectRatePct: 0,
        criticalDefect: "-",
        hasCsv: false,
    });
    const [donutData, setDonutData] = useState([]);

    // 실시간 스트리밍 라인차트
    const [streamSeries, setStreamSeries] = useState([]);
    const [isStreaming, setIsStreaming]   = useState(false);
    const [streamSrcName, setStreamSrcName] = useState("");

    // 누적 불량 카운트 & 이벤트 로그 (최근 N개)
    const [cumCount, setCumCount] = useState(0);
    const [alertEvents, setAlertEvents] = useState([]); // [{pid, count, ts}]
    // 경보 항목 최대 개수 (스크롤링 항목 총 개수)
    const MAX_ALERTS = 10;

    // 하단 두 그래프 데이터 - 실시간 갱신
    const [headData,  setHeadData]  = useState([]);
    const [screwData, setScrewData] = useState([]);

    // 타이머/인덱스 ref
    const streamTimerRef = useRef(null);
    const streamIndexRef = useRef(0);
    
    // 실시간 그래프 최대 표시 개수
    const MAX_VIEW_ROWS = 10; 

    // 불량 제품 ID 목록 (하단 그래프 시각화용)
    const alertProductIds = useMemo(() => {
        return alertEvents.map(e => e.pid);
    }, [alertEvents]);

    // Y축 도메인 계산 (useMemo 수정)
    const headYDomain = useMemo(() => calculateYDomain(headData, HEAD_KEYS, 'head'), [headData, HEAD_KEYS]);
    const screwYDomain = useMemo(() => calculateYDomain(screwData, SCREW_KEYS, 'screw'), [screwData, SCREW_KEYS]);


    /* ===== JSON 업로드 - 동일 ===== */
    const onPickJson = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const obj = JSON.parse(text);
            setJsonObj(obj);
            setHasJson(true);
            alert("JSON 업로드 완료 ✅");
        } catch (err) {
            console.error(err);
            alert("❌ JSON 파싱 실패: 파일 형식을 확인하세요.");
        } finally {
            e.target.value = "";
        }
    };

    /* ===== CSV 업로드 + 서버 집계 + 실시간 스트리밍 ===== */
    const onPickCsvCombined = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 초기화
        setStreamSeries([]);
        setHeadData([]);  
        setScrewData([]); 
        setCumCount(0);
        setAlertEvents([]); 

        setStreamSrcName(file.name || "");
        setIsStreaming(true);
        streamIndexRef.current = 0;
        if (streamTimerRef.current) {
            clearInterval(streamTimerRef.current);
            streamTimerRef.current = null;
        }

        // 1) 서버 집계
        const formData = new FormData();
        formData.append("file", file);
        fetch(`${API_BASE}/predict_file`, { method: "POST", body: formData })
            .then(res => res.json())
            .then(payload => {
                if (payload.error) {
                    alert(`서버 오류: ${payload.error}\n누락 컬럼: ${(payload.missing || []).join(", ")}`);
                    setIsStreaming(false);
                    return;
                }
                if (payload.kpis) setKpis(k => ({ ...k, ...payload.kpis, hasCsv: true }));
                setDonutData(payload.donutData || []);
            })
            .catch(err => {
                console.error(err);
                alert("서버(집계) 호출 실패");
                setIsStreaming(false);
            });

        // 2) 프런트 파싱 + 실시간 스트리밍
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows = results.data;
                if (!rows?.length) {
                    setIsStreaming(false);
                    alert("CSV 내용이 비어 있습니다.");
                    return;
                }

                const toNumber = (v) => {
                    if (v === "" || v === null || v === undefined) return null;
                    const n = Number(v);
                    return Number.isFinite(n) ? n : null;
                };
                const labelOf = (rawRow, idx) => {
                    const idRaw =
                        rawRow[" PRODUCT_ID"] ??
                        rawRow["PRODUCT_ID"] ??
                        rawRow["product_id"] ??
                        rawRow[" NUM"] ??
                        rawRow["NUM"] ??
                        rawRow["num"] ??
                        (idx + 1);
                    return `PRD_${String(idRaw).trim()}`;
                };


                // 실시간 스트리밍
                streamTimerRef.current = setInterval(async () => {
                    const idx = streamIndexRef.current;
                    if (idx >= rows.length) {
                        clearInterval(streamTimerRef.current);
                        streamTimerRef.current = null;
                        setIsStreaming(false);
                        return;
                    }

                    const raw = rows[idx] || {};
                    // 숫자 캐스팅
                    const row = Object.fromEntries(
                        Object.entries(raw).map(([k, v]) => {
                            if (v === "" || v === null || v === undefined) return [k, null];
                            const num = Number(v);
                            return [k, Number.isFinite(num) ? num : v];
                        })
                    );

                    try {
                        const res = await fetch(`${API_BASE}/predict`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(row),
                        });
                        if (!res.ok) {
                            const text = await res.text();
                            console.error("실시간 예측 실패:", text);
                            clearInterval(streamTimerRef.current);
                            streamTimerRef.current = null;
                            setIsStreaming(false);
                            return;
                        }
                        const result = await res.json();

                        const productId = labelOf(raw, idx);
                        const pred1 = (result.prediction ?? 0) === 1;

                        // 현재 시점의 하단 그래프 데이터 생성
                        const currentHeadData = { time: productId };
                        HEAD_KEYS.forEach(k => (currentHeadData[k] = toNumber(row[k])));

                        const currentScrewData = { time: productId };
                        SCREW_KEYS.forEach(k => (currentScrewData[k] = toNumber(row[k])));

                        // 1. 실시간 라인 차트 데이터 갱신
                        setStreamSeries(prev => {
                            const next = [
                                ...prev,
                                { name: productId, value: result.prediction ?? 0, alarm: pred1 ? 1 : null },
                            ];
                            // 데이터 최대 개수 제한 (최근 10개만 유지)
                            if (next.length > MAX_VIEW_ROWS) {
                                return next.slice(next.length - MAX_VIEW_ROWS); 
                            }
                            return next;
                        });
                        
                        // 2. 하단 압출헤드 데이터 갱신 (실시간 모니터링 순서 동일)
                        setHeadData(prev => {
                            const next = [...prev, currentHeadData];
                            if (next.length > MAX_VIEW_ROWS) {
                                return next.slice(next.length - MAX_VIEW_ROWS);
                            }
                            return next;
                        });

                        // 3. 하단 스크류 데이터 갱신 (실시간 모니터링 순서 동일)
                        setScrewData(prev => {
                            const next = [...prev, currentScrewData];
                            if (next.length > MAX_VIEW_ROWS) {
                                return next.slice(next.length - MAX_VIEW_ROWS);
                            }
                            return next;
                        });
                        
                        // 누적 카운트 & 알림 로직 (동일)
                        if (pred1) {
                            setCumCount(prev => prev + 1); 

                            setAlertEvents(prevEvents => {
                                const alreadyExists = prevEvents.some(e => e.pid === productId);
                                
                                if (alreadyExists) return prevEvents;
                                
                                const newAlert = {
                                    pid: productId,
                                    count: prevEvents.length + 1, // 누적 횟수를 현재 목록의 길이에 +1로 사용
                                    ts: Date.now()
                                };
                                
                                const nextEvents = [...prevEvents, newAlert];

                                if (nextEvents.length > MAX_ALERTS) {
                                    // MAX_ALERTS(10개)가 넘으면 가장 오래된 항목 제거 
                                    return nextEvents.slice(1);
                                }
                                return nextEvents;
                            });
                        }
                    } catch (err) {
                        console.error("네트워크 오류:", err);
                        clearInterval(streamTimerRef.current);
                        streamTimerRef.current = null;
                        setIsStreaming(false);
                    }

                    streamIndexRef.current = idx + 1;
                }, 1000);
            },
            error: (err) => {
                console.error("CSV 파싱 오류:", err);
                setIsStreaming(false);
            },
        });

        e.target.value = "";
    };

    // 조회 버튼 - 동일
    const onQuery = () => {
        alert(`조회 기간(표시만): ${startDate} ~ ${endDate}`);
    };

    // PPM - 동일
    const ppmValue = useMemo(() => {
        const { defectTotal, totalInspects } = kpis;
        if (!totalInspects) return 0;
        return Math.round((defectTotal / totalInspects) * 1_000_000);
    }, [kpis]);

    // 위험도 클래스 세분화: 3단계로 축소
    const severityOf = (count) => {
        if (count >= 5) return "danger";
        if (count >= 3) return "warn";
        if (count >= 1) return "light_warn";
        return "light_warn"; // 0회일 때도 표시를 위해 light_warn으로 설정
    };
    const alertsView = alertEvents;

    // value===1 인 연속 구간 계산 → 빨간 ReferenceArea - 동일
    const alarmSegments = useMemo(() => {
        const segs = [];
        let start = null;
        for (let i = 0; i < streamSeries.length; i++) {
            const isOne = streamSeries[i]?.value === 1;
            const name = streamSeries[i]?.name;
            if (!name) continue;

            if (isOne && start === null) start = i;
            if (!isOne && start !== null) {
                segs.push({ from: streamSeries[start].name, to: streamSeries[i - 1].name });
                start = null;
            }
        }
        if (start !== null && streamSeries.length) {
            segs.push({
                from: streamSeries[start].name,
                to: streamSeries[streamSeries.length - 1].name,
            });
        }
        return segs;
    }, [streamSeries]);

    return (
        <div className="dash">
            {/* 헤더 (동일) */}
            <header className="dash__header">
                <h1 className="title" style={{fontWeight:800}}>소성가공 품질보증 모니터링 대시보드</h1>
                <div className="dash__controls">
                    <label className="dash__filter">
                        <span>시작</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </label>
                    <span className="dash__tilde">-</span>
                    <label className="dash__filter">
                        <span>종료</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </label>

                    <label className="upload btn btn--upload" title="JSON 업로드" style={{ marginLeft: 8 }}>
                        JSON 업로드
                        <input type="file" accept=".json,application/json" onChange={onPickJson} />
                    </label>

                    <label className="upload btn btn--upload" title="실시간 CSV" style={{ marginLeft: 8 }}>
                        실시간 CSV
                        <input type="file" accept=".csv,text/csv" onChange={onPickCsvCombined} />
                    </label>

                    <button className="btn btn--primary" onClick={onQuery} style={{ marginLeft: 8 }}>
                        조회
                    </button>
                </div>
            </header>
            
            {/* 시각적 구분선 추가 */}
            <hr style={{ borderTop: '1px solid #383a54', margin: '10px 0' }}/>

            {/* KPI (동일) */}
            <section className="kpis kpis--six">
                <div className="kpi" style={{background:"#bdb2ff"}}>
                    <div className="kpi__label">총 검사수</div>
                    <div className="kpi__value">{kpis.totalInspects.toLocaleString()}</div>
                </div>
                <div className="kpi"style={{background:"rgb(147 215 173)"}}>
                    <div className="kpi__label" >정상개수</div>
                    <div className="kpi__value">{kpis.normalCount.toLocaleString()}</div>
                </div>
                <div className="kpi" style={{background:"#ff9aa2"}}>
                    <div className="kpi__label">총불량개수</div>
                    <div className="kpi__value">{kpis.defectTotal.toLocaleString()}</div>
                </div>
                <div className="kpi kpi--accent">
                    <div className="kpi__label">크리티컬 불량영역</div>
                    <div className="kpi__value">{kpis.criticalDefect}</div>
                </div>
                <div className="kpi">
                    <div className="kpi__label">불량률</div>
                    <div className="kpi__value">{kpis.defectRatePct}%</div>
                </div>
                <div className="kpi kpi--ghost">
                    <div className="kpi__label">데이터</div>
                    <div className="kpi__value">
                        CSV: {kpis.hasCsv ? "적용" : "없음"} / JSON: {hasJson ? "적용" : "없음"}
                    </div>
                </div>
            </section>
            
            {/* 시각적 구분선 추가 */}
            <hr style={{ borderTop: '1px solid #383a54', margin: '10px 0' }}/>

            {/* 2행: (좌) PPM / (우) Donut */}
            <section className="grid-2">
                <div className="panel ">
      
                    <div className="panel__title">PPM 불량률</div>
                    <div className="ppm__wrap">
                    <div className="ppm__value">{ppmValue.toLocaleString()}PPM</div>
                    <div className="ppm__sub">
                        (불량 {kpis.defectTotal.toLocaleString()} / 생산 {kpis.totalInspects.toLocaleString()})
                    </div>
                    </div>
   
                </div>

                <div className="panel"> 
                    <div className="panel__title">불량 비율 (Donut)</div>
                    <div className="chart" id="normal"> 
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    label={renderCustomizedLabel}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius="55%"
                                    outerRadius="80%"
                                    paddingAngle={2}
                                >
                                    {donutData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: "var(--text-primary)" }} /> 
                                <Tooltip
  contentStyle={{
    background: "#2b3a45",
    border: "1px solid #49616f",
    borderRadius: 8,
    color: "#fff",
    fontSize: 14,
    padding: "8px 12px",
  }}
/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>
            
            {/* 시각적 구분선 추가 */}
            <hr style={{ borderTop: '1px solid #383a54', margin: '10px 0' }}/>

            {/* 3행: (좌) 실시간 라인 / (우) 경보 목록 */}
            <section className="grid-2">
                <div className="panel"> 
                    <div className="panel__title">
                        실시간 불량 모니터링 — {streamSrcName || "대기"}
                        {isStreaming ? " — 불량 예측중…" : streamSrcName ? " — 불량 검출 완료" : ""}
                    </div>

                    <div className="chart chart--line chart--long"> 
                        <ResponsiveContainer width="100%" height="100%"> 
                            <LineChart data={streamSeries}>
                                <CartesianGrid stroke="#666" strokeDasharray="3 3" opacity={0.5} /> 
                                <XAxis dataKey="name" stroke="#cfe0ea" interval={0} angle={-30} textAnchor="end" height={45} />
                                <YAxis domain={[0, 1]} stroke="#cfe0ea" />
                                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, color: "#2c3e50" }} />

                                {alarmSegments.map((s, i) => (
                                    <ReferenceArea
                                        key={i}
                                        x1={s.from}
                                        x2={s.to}
                                        y1={0}
                                        y2={1}
                                        strokeOpacity={0}
                                        fill="#c43e47"
                                        fillOpacity={0.4} // 투명도 약간 증가 (0.28 -> 0.4)
                                        // 🚨 경고 아이콘 추가
                                        label={{ 
                                            value: "🚨", 
                                            position: "insideTopRight", 
                                            fill: "white", 
                                            fontSize: 24,
                                            dx: -10, // x축에서 왼쪽으로 이동
                                            dy: 10,  // y축에서 아래로 이동
                                        }}
                                    />
                                ))}

                                <Area
                                    type="stepAfter"
                                    dataKey="alarm"
                                    stroke="none"
                                    fill="#c43e47"
                                    fillOpacity={0.38}
                                    isAnimationActive={false}
                                    activeDot={false}
                                    connectNulls={false}
                                />

                                <Line type="monotone" dataKey="value" stroke="#a0e8af" strokeWidth={3} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        
                        {/* 그래프 위 경보 뱃지 */}
                        {cumCount > 0 && <div className="alarm-badge" title="불량 검출">🚨</div>}
                    </div>
                </div>

                <div className="panel panel--alerts">
                    <div className="alerts__title">실시간 불량 감지 목록</div>

                    {/* 목록 컨테이너 */}
                    <ul className="alerts__list">
                        {/* 초기 안내 문구 */}
                        {alertsView.length === 0 && <li className="alerts__empty">현재 감지된 불량이 없습니다.</li>}

                        {alertsView.map((ev, index) => (
                            <li key={`${ev.pid}-${ev.count}`} className={`alerts__item alerts__item--${severityOf(ev.count)}`}>
                                <span className="alerts__icon">
                                    <IconWarn severity={severityOf(ev.count)} />
                                </span>
                                                                
                                <span className="alerts__text">
                                  <strong>
                                    {ev.pid}
                                    {(() => {
                                      const getHeadData = headData?.find(v => String(v?.time) === String(ev?.pid));
                                      const getScrewData = screwData?.find(v => String(v?.time) === String(ev?.pid));

                                      const meltP = getHeadData['EX1.MELT_P_PV'] ?? getHeadData?.EX1?.MELT_P_PV ?? '-';
                                      const meltT = getHeadData['EX4.MELT_TEMP'] ?? getHeadData?.EX4?.MELT_TEMP ?? '-';
                                      const mdP = getScrewData['EX1.MD_PV'] ?? getScrewData?.EX1?.MD_PV ?? '-';
                                      const h20P = getScrewData['EX1.H20_PV'] ?? getScrewData?.EX1?.H20_PV ?? '-';
                                      
                                      return (
                                        <span style={{ marginLeft: 8 }} className="alerts__text">
                                        &nbsp;
                                        용융압력 <span style={{color:"#f6d365"}}>MELTP{meltP}</span>, <span style={{color:"#ff6b6b"}}>meltT{meltT}</span>
                                        &nbsp;모터드라이브 <span style={{color:"#6bc7ad"}}>MDPV{mdP}</span>, <span style={{color:"#bdb2ff"}}>H20PV{h20P}</span> 불량이 발생했습니다
                                        </span>     
                                      );
                                    })()}
                                  </strong>
                                </span>


                                <span className={`alerts__pill alerts__pill--${severityOf(ev.count)}`}>
                                    불량 누적 : {ev.count}회
                                </span>
                            </li>
                        ))}
                    </ul>

                    {/* 하단 배지 */}
                    {alertsView.length === MAX_ALERTS && (
                        <div className="alerts__badge alerts__badge--danger alerts__badge--full alerts__badge--blink"> 
                            ⚠️ 감지 목록이 가득 찼습니다. ({MAX_ALERTS}개)
                        </div>
                    )}
                    {alertsView.length < MAX_ALERTS && cumCount >= 5 && (
                        <div className="alerts__badge alerts__badge--danger alerts__badge--full alerts__badge--blink"> 
                            ⚠️ 불량 누적 : {cumCount}회(5회 이상 위험모드로 전환합니다)
                        </div>
                    )}
                </div>
            </section>
            
            {/* 시각적 구분선 추가 */}
            <hr style={{ borderTop: '1px solid #383a54', margin: '10px 0' }}/>

            {/* 4행: (좌) 압출헤드 / (우) 스크류 */}
            <section className="grid-2">
                {/* 압출헤드 온도 그래프 (LineChart + Area) */}
                <div className="panel">
                    <div className="panel__title">(모터드라이브) : {HEAD_KEYS.join(", ")}</div>
                    <div className="chart-scroll">
                        <div className="chart-scroll__inner"> 
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={headData}> 
                                    <CartesianGrid stroke="#666" strokeDasharray="3 3" opacity={0.5} />
                                    <XAxis dataKey="time" stroke="#cfe0ea" interval={0} angle={-30} textAnchor="end" height={45} />
                                    <YAxis stroke="#cfe0ea" domain={headYDomain} />
                                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, color: "#2c3e50" }} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 10, color: "var(--text-primary)" }} />

                                    {HEAD_KEYS.filter(k => headData[0]?.[k] !== undefined).map((k, i) => {
                                        const color = COLORS[(i + 2) % COLORS.length]; // 색상 인덱스 조정
                                        return (
                                            <React.Fragment key={k}>
                                                {/* 1. 면적 채우기 */}
                                                <Area
                                                    type="monotone"
                                                    dataKey={k}
                                                    fill={color}
                                                    stroke="none"
                                                    fillOpacity={0.7} // 투명도 조정 (0.6 -> 0.7)
                                                    isAnimationActive={false}
                                                />
                                                {/* 2. 꺾은선 그래프: 점 및 CustomDot(불량) 표시 */}
                                                <Line
                                                    type="monotone"
                                                    dataKey={k}
                                                    stroke={color}
                                                    strokeWidth={3} // 선 굵기 조정 (0 -> 3)
                                                    dot={CustomDataDot(alertProductIds)} // 불량일 때 빨간색 원 표시
                                                    activeDot={false}
                                                    isAnimationActive={false}
                                                    connectNulls={false} // null 값 시 선 연결 방지
                                                    label={<CustomDataLabel />} // 점 위에 값 표시 (밝은 색 글꼴)
                                                />
                                            </React.Fragment>
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* 스크류 피쳐 그래프 (LineChart + Area) */}
                <div className="panel">
                    <div className="panel__title">(용융압력) : {SCREW_KEYS.join(", ")}</div>
                    <div className="chart-scroll">
                        <div className="chart-scroll__inner">
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={screwData}> 
                                    <CartesianGrid stroke="#666" strokeDasharray="3 3" opacity={0.5} />
                                    <XAxis dataKey="time" stroke="#cfe0ea" interval={0} angle={-30} textAnchor="end" height={45} />
                                    <YAxis stroke="#cfe0ea" domain={screwYDomain} />
                                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, color: "#2c3e50" }} />
                                    <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: 10, color: "var(--text-primary)" }} />

                                    {SCREW_KEYS.filter(k => screwData[0]?.[k] !== undefined).map((k, i) => {
                                        const color = COLORS[(i + 5) % COLORS.length]; // 색상 인덱스 조정 (압출헤드와 다른 색상셋)
                                        return (
                                            <React.Fragment key={k}>
                                                {/* 1. 면적 채우기 */}
                                                <Area
                                                    type="monotone"
                                                    dataKey={k}
                                                    fill={color}
                                                    stroke="none"
                                                    fillOpacity={0.7} // 투명도 조정 (0.6 -> 0.7)
                                                    isAnimationActive={false}
                                                />
                                                {/* 2. 꺾은선 그래프: 점 및 CustomDot(불량) 표시 */}
                                                <Line
                                                    type="monotone"
                                                    dataKey={k}
                                                    stroke={color}
                                                    strokeWidth={3} // 선 굵기 조정 (0 -> 3)
                                                    dot={CustomDataDot(alertProductIds)} // 불량일 때 빨간색 원 표시
                                                    activeDot={false}
                                                    isAnimationActive={false}
                                                    connectNulls={false} // null 값 시 선 연결 방지
                                                    label={<CustomDataLabel />} // 점 위에 값 표시 (밝은 색 글꼴)
                                                />
                                            </React.Fragment>
                                        );
                                    })}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}