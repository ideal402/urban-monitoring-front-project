import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/AuthRoute';
import { Home } from './pages/Home';
import { Signup } from './pages/Signup';
import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {

  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 누구나 접근 가능한 기본 라우트 */}
      <Route path="/" element={<Home />} />

      {/* PublicRoute: 인증된 사용자는 접근 불가 (접근 시 '/'로 리다이렉트) */}
      <Route element={<PublicRoute isAuthenticated={isAuthenticated} />}>
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* ProtectedRoute: 인증된 사용자만 접근 가능 (접근 시 '/login'으로 리다이렉트) */}
      <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
        {/* <Route path="/mypage" element={<MyPage />} /> */}
      </Route>

      {/* 404 처리 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;