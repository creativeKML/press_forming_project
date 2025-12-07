// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./layout.jsx";      // 대시보드
import LoginModule from "./login.js";   // 로그인

import "./layout.css"; // 전역 스타일(있으면)

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* 최초 진입은 로그인으로 */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginModule />} />
        <Route path="/dashboard" element={<Layout />} />

        {/* 기존 “/”가 대시보드여야 하면 아래 라우트 하나만 두세요
            <Route path="/" element={<Layout />} />
            <Route path="/login" element={<LoginModule />} />
        */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
