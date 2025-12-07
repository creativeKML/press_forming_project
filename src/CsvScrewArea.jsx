import React, { useMemo } from "react";

// Chakra Charts (있으면 사용)
let ChakraAreaChart = null;
try {
  ChakraAreaChart = require("@chakra-ui/charts").AreaChart;
} catch (_) { /* 설치 안 되어 있으면 무시 */ }

// Recharts Fallback (없어도 앱이 돌아가게)
import {
  ResponsiveContainer, AreaChart as RcAreaChart, Area,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
} from "recharts";

export default function CsvScrewArea({ csvRows, title = "스크류·존 평균(Area)" }) {
  // 원하는 컬럼명으로 바꾸세요
  const ZONE_KEYS = ["EX1.Z1_PV", "EX1.Z2_PV", "EX1.Z4_PV"];

  const areaData = useMemo(() => {
    if (!csvRows?.length) return [];
    const hasDate = csvRows[0]?.date || csvRows[0]?.Date || csvRows[0]?.timestamp;

    return csvRows.map((row, idx) => {
      const label = hasDate
        ? (row.date || row.Date || row.timestamp)
        : `#${idx + 1}`;

      const obj = { x: label };
      ZONE_KEYS.forEach((k) => {
        const v = Number(row[k]);
        if (Number.isFinite(v)) obj[k] = v;
      });
      return obj;
    });
  }, [csvRows]);

  const series = ZONE_KEYS.map((name) => ({ name, label: name }));

  if (ChakraAreaChart) {
    return (
      <div style={{ width: "100%", height: 280 }}>
        <div style={{ padding: "6px 0", color: "#9fb0c0", fontSize: 14 }}>{title}</div>
        <ChakraAreaChart
          data={areaData}
          xKey="x"
          series={series}
          tooltip
          legend
        />
      </div>
    );
  }

  // Fallback: Recharts
  return (
    <div style={{ width: "100%", height: 280 }}>
      <div style={{ padding: "6px 0", color: "#9fb0c0", fontSize: 14 }}>{title} (Recharts)</div>
      <ResponsiveContainer width="100%" height="100%">
        <RcAreaChart data={areaData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x" />
          <YAxis />
          <Tooltip />
          <Legend />
          {ZONE_KEYS.map((k) => (
            <Area key={k} type="monotone" dataKey={k} stackId="1" strokeWidth={2} />
          ))}
        </RcAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
