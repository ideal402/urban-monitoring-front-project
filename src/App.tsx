// src/App.tsx 수정 코드
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/AuthRoute';
import { useAuth } from './context/AuthContext';

// 🚨 기존의 정적 Import 방식은 삭제 (또는 주석 처리)
// import { Home } from './pages/Home';
// import { Signup } from './pages/Signup';

// ✨ React.lazy를 활용한 동적 Import (해당 경로에 진입할 때만 JS 파일을 다운로드함)
const Home = React.lazy(() => import('./pages/Home'));
const Signup = React.lazy(() => import('./pages/Signup'));

export const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    /* ✨ Suspense로 감싸기: 동적 로딩이 완료될 때까지 보여줄 UI(fallback)를 설정 */
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading 화면...</div>}>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route element={<PublicRoute isAuthenticated={isAuthenticated} />}>
          <Route path="/signup" element={<Signup />} />
        </Route>

        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          {/* <Route path="/mypage" element={<MyPage />} /> */}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

export default App;