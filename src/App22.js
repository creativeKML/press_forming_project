import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

function App() {
  const [predictions, setPredictions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const [parsedData, setParsedData] = useState([]);
  const rowIndexRef = useRef(0);

  // API 엔드포인트 (프록시 사용)
  const API_URL = "/predict";

  // -----------------------------------------------------
  // 🚀 이 부분이 수정되었습니다! 🚀
  // -----------------------------------------------------
  useEffect(() => {
    if (parsedData.length === 0 || isLoading === false) {
      return;
    }

    rowIndexRef.current = 0;

    const intervalId = setInterval(async () => {
      const currentIndex = rowIndexRef.current;

      if (currentIndex >= parsedData.length) {
        clearInterval(intervalId);
        setIsLoading(false);
        console.log("모든 행 예측 완료!");
        return;
      }

      const rowData = parsedData[currentIndex];

      if (
        !rowData ||
        typeof rowData !== "object" ||
        !rowData.hasOwnProperty("EX5.MELT_TEMP")
      ) {
        console.log("Skipping invalid row:", rowData);
        rowIndexRef.current = currentIndex + 1;
        return;
      }

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rowData),
        });

        if (!response.ok) {
          console.error("서버 오류:", await response.json());
          clearInterval(intervalId);
          setIsLoading(false);
          return;
        }

        const result = await response.json();

        // --- 🚀 'setPredictions' 로직 수정 ---
        setPredictions((prev) => {
          // 1. 새 예측 결과 객체 생성
          const newPrediction = {
            name: `Row ${rowIndexRef.current + 1}`, // ref를 사용해 정확한 행 번호
            결과: result.prediction,
            라벨: result.label,
            확률: (result.probability * 100).toFixed(2) + "%",
          };

          // 2. 새 예측을 포함한 배열 생성
          const updatedArray = [...prev, newPrediction];

          // 3. 배열의 길이가 10개를 초과하면, 가장 오래된 (첫 번째) 항목을 제거
          if (updatedArray.length > 10) {
            return updatedArray.slice(1); // 🚀 1번 인덱스부터 끝까지(최신 10개) 반환
          }

          // 4. 10개 이하면 그냥 반환
          return updatedArray;
        });
        // --- 🚀 수정 끝 ---
      } catch (error) {
        console.error("API 요청 오류:", error);
        clearInterval(intervalId);
        setIsLoading(false);
      }

      rowIndexRef.current = currentIndex + 1;
    }, 1000); // 1초 간격

    return () => {
      clearInterval(intervalId);
    };
  }, [parsedData, isLoading]);

  // -----------------------------------------------------
  // (파일 업로드 핸들러 - 수정 없음)
  // -----------------------------------------------------
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setIsLoading(true);
      setPredictions([]);
      setParsedData([]);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,

        complete: (results) => {
          console.log(
            "Parsing complete. Total rows found:",
            results.data.length
          );
          setParsedData(results.data);
        },
        error: (err) => {
          setIsLoading(false);
          console.error("CSV 파싱 오류:", err);
        },
      });
    }
  };

  // -----------------------------------------------------
  // (JSX 'return' 부분 - 수정 없음)
  // -----------------------------------------------------
  return (
    <div className="App">
      <header className="App-header">
        <h2>XGBoost 모델 실시간 예측</h2>
        <p>예측할 CSV 파일을 업로드하세요.</p>
        <p>모델 피처: 16개 (EX5.MELT_TEMP, ...)</p>

        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={isLoading}
        />

        {isLoading && <p className="loading">예측 중... (파일: {fileName})</p>}

        {!isLoading && predictions.length > 0 && (
          <p>예측 완료! (총 {predictions.length}개 행)</p>
        )}

        <div className="chart-container">
          <LineChart
            width={1000}
            height={400}
            data={predictions}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              label={{
                value: "데이터 행(Row)",
                position: "insideBottom",
                offset: -10,
              }}
            />
            <YAxis
              label={{ value: "예측 결과", angle: -90, position: "insideLeft" }}
              ticks={[0, 1]}
              domain={[0, 1]}
              tickFormatter={(tick) => (tick === 0 ? "양품(0)" : "불량(1)")}
            />
            <Tooltip
              formatter={(value, name, props) => [
                `${props.payload.라벨} (${value})`,
                `확률: ${props.payload.확률}`,
              ]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="결과"
              stroke="#ff0000"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </div>
      </header>
    </div>
  );
}

export default App;
