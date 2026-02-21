import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface AuthRouteProps {
  isAuthenticated: boolean | null; // null은 API 응답 대기(로딩) 상태를 의미
}

// 1. 로그인한 사용자만 접근 불가능한 라우트 (예: 로그인, 회원가입)
export const PublicRoute: React.FC<AuthRouteProps> = ({ isAuthenticated }) => {
  if (isAuthenticated === null) return <div>인증 확인 중...</div>;
  
  // 이미 인증된 상태에서 접근 시 메인 홈페이지('/')로 리다이렉트
  return !isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

// 2. 로그인한 사용자만 접근 가능한 라우트 (예: 마이페이지, 설정)
export const ProtectedRoute: React.FC<AuthRouteProps> = ({ isAuthenticated }) => {
  if (isAuthenticated === null) return <div>인증 확인 중...</div>;
  
  // 미인증 상태에서 접근 시 로그인 페이지('/login')로 리다이렉트
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};