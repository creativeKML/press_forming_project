import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout.jsx";
import LoginModule from "./login.js";

function RequireAuth({ children }) {
  const authed = localStorage.getItem("auth") === "1";
  return authed ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* 기본 진입 /login 으로 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      {/* 로그인 */}
      <Route path="/login" element={<LoginModule />} />
      {/* 대시보드: 로그인된 경우에만 */}
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
