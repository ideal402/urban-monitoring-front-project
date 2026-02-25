import React, { useState } from 'react';
import './Navbar.css';
import { LoginModal } from './LoginModal';
import { useAuth } from '../context/AuthContext';

// 1. 허용되는 레이어 타입 정의 (Home 컴포넌트와 공유하기 위해 export)
export type LayerType = 'population' | 'weather' | 'air' | 'bus';

// 2. 부모 컴포넌트(Home)로부터 주입받을 Props 인터페이스 정의
interface NavbarProps {
  activeLayer: LayerType;
  onLayerChange: (layer: LayerType) => void;
}

// 3. 컴포넌트 파라미터로 Props 구조 분해 할당
export const Navbar: React.FC<NavbarProps> = ({ activeLayer, onLayerChange }) => {
  const { isAuthenticated, logout } = useAuth();
  
  // 기존 로컬 상태였던 const [activeLayer, setActiveLayer] = useState(...)는 제거합니다.
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // 버튼 배열의 id 타입을 LayerType으로 지정
  const toggleButtons: { id: LayerType; label: string; icon: string }[] = [
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
                // 4. 로컬 상태 변경 함수 대신 부모로부터 전달받은 onLayerChange 호출
                onClick={() => onLayerChange(btn.id)}
                title={btn.label}
              >
                <img src={btn.icon} className="hex-icon" />
              </button>
            ))}
          </div>
          
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

      {!isAuthenticated && (
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      )}
    </>
  );
};