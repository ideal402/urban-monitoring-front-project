// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
import apiClient from '../api/client';

// 1. Context에서 관리할 타입 정의
interface AuthContextType {
  isAuthenticated: boolean | null; // null: 로딩 중, true: 로그인, false: 비로그인
  checkSession: () => Promise<void>;
  login: () => void;
  logout: () => Promise<void>;
}

// 2. Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. 전역으로 상태를 제공할 Provider 컴포넌트
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 세션 확인 함수
  const checkSession = async () => {
    try {
      await apiClient.get('/auth/status');
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // 로그아웃 함수
  const logout = async () => {
    try {
      await apiClient.post('/auth/signout');
      setIsAuthenticated(false);
      alert('로그아웃 되었습니다.');
    } catch (error) {
      console.error('Logout Error:', error);
      alert('로그아웃 처리 중 문제가 발생했습니다.');
    }
  };

  // 수동 로그인 처리 (모달에서 로그인 성공 시 호출)
  const login = () => setIsAuthenticated(true);

  // 앱 최초 실행 시 1회 세션 확인
  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, checkSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 4. 다른 컴포넌트에서 쉽게 꺼내 쓸 수 있도록 Custom Hook 생성
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};