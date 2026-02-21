import React, { useState } from 'react';
import './Navbar.css';
import { LoginModal } from './LoginModal';
import { useAuth } from '../context/AuthContext'; // 1. 전역 Hook 임포트

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  
  const [activeLayer, setActiveLayer] = useState<string>('population');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const toggleButtons = [
    { id: 'population', label: '인구밀집', icon: '/Users.svg' },
    { id: 'weather', label: '기상상태', icon: '/Sun.svg' },
    { id: 'air', label: '대기질', icon: '/Leaf.svg' },
    { id: 'bus', label: '버스유동인구', icon: '/Car_Auto.svg' },
  ];

  return (
    <>
      <nav className="navbar-container">
        <div className="navbar-left">
          <img src="/logo.png" alt="Logo" className="logo-img" style={{height:"56px", width: "56px"}}/>
          <button 
            className="logo-btn" 
            onClick={() => console.log('지도 홈으로 이동')}
          >
            <span className="logo-text">UrbanFlowSeoul</span>
          </button>
        </div>

        <div className="navbar-right">
          <div className="toggle-group">
            {toggleButtons.map((btn) => (
              <button
                key={btn.id}
                className={`hex-btn ${activeLayer === btn.id ? 'active' : ''}`}
                onClick={() => setActiveLayer(btn.id)}
                title={btn.label}
              >
                <img src={btn.icon} className="hex-icon" />
              </button>
            ))}
          </div>
          
          {/* 3. Context의 isAuthenticated 값에 따른 조건부 렌더링 */}
          {isAuthenticated ? (
            <button className="login-btn" onClick={logout}>
              로그아웃
            </button>
          ) : (
            <button className="login-btn" onClick={() => setIsLoginModalOpen(true)}>
              로그인
            </button>
          )}
        </div>
      </nav>

      {/* 인증되지 않았을 때만 로그인 모달 렌더링 */}
      {!isAuthenticated && (
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      )}
    </>
  );
};