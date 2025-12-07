import React from "react";
import "./layout.css";
import data from "./data.json";  // ← 번들 타임에 포함 (fetch 불필요)

export default function Layout() {
    console.log(JSON.stringify(data, null, 2))
    console.log('확인')
  return (
    <div className="dash">
      <header className="dash__header">
        <h1>소성가공 품질보증 모니터링 대시보드</h1>
        <div className="dash__controls">
          <label className="dash__filter">
            <span>시작</span>
            <input type="date" defaultValue="2025-03-01" />
          </label>
          <span className="dash__tilde">-</span>
          <label className="dash__filter">
            <span>종료</span>
            <input type="date" defaultValue="2025-03-24" />
          </label>
          <label className="upload btn">
            파일 업로드(CSV)
            <input type="file" hidden />
          </label>
          <button className="btn btn--primary">조회</button>
        </div>
      </header>

      <section className="kpis">
        <div className="kpi"><div className="kpi__label">총 검사수</div><div className="kpi__value">118,361</div></div>
        <div className="kpi"><div className="kpi__label">정상개수</div><div className="kpi__value">6,034</div></div>
        <div className="kpi"><div className="kpi__label">총불량개수</div><div className="kpi__value">4,726</div></div>
        <div className="kpi kpi--accent"><div className="kpi__label">크리티컬 불량영역</div><div className="kpi__value">뒤틀림</div></div>
        <div className="kpi kpi--accent"><div className="kpi__label">불량률</div><div className="kpi__value">13%</div></div>
        <div className="kpi kpi--ghost"><div className="kpi__label">업데이트</div><div className="kpi__value">실시간</div></div>
      </section>

      <section className="grid-3">
        <div className="panel"><div className="panel__title">현재 공정단계</div><div className="chart"><div className="chart__placeholder">5단계 중 압출공정</div></div></div>
        <div className="panel"><div className="panel__title">주차별 불량률c</div><div className="chart"><div className="chart__placeholder">Bar Chart 자리</div></div></div>
        <div className="panel"><div className="panel__title">불량 비율</div><div className="chart"><div className="chart__placeholder">Donut Chart 자리</div></div></div>
      </section>

      <section className="grid-2">
        <div className="panel"><div className="panel__title">불량 개수 총합계</div><div className="chart chart--hbar"><div className="chart__placeholder">HBar 자리</div></div></div>
        <div className="panel"><div className="panel__title">실시간 불량 모니터링</div><div className="chart chart--line"><div className="chart__placeholder">Line 자리</div></div></div>
      </section>
    </div>
  );
}