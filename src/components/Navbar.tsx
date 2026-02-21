import React, { useState } from 'react';
import './Navbar.css';

export const Navbar: React.FC = () => {
  // 현재 선택된 토글 상태 (추후 App.tsx의 props로 분리 가능)
  const [activeLayer, setActiveLayer] = useState<string>('population');

  // 토글 버튼 배열 (id, 레이블, 아이콘 매핑)
  const toggleButtons = [
    { id: 'population', label: '인구밀집', icon: '👥' },
    { id: 'weather', label: '기상상태', icon: '⛅' },
    { id: 'air', label: '대기질', icon: '🍃' },
    { id: 'bus', label: '버스유동인구', icon: '🚌' },
  ];

  return (
    <nav className="navbar-container">
      {/* 좌측 영역 */}
      <div className="navbar-left">
        <img src="../../public/logo.png" alt="Logo" className="logo-img" style={{height:"56px", width: "56px"}}/>
        <button 
          className="logo-btn" 
          onClick={() => console.log('지도 홈으로 이동')}
        >
          <span className="logo-text">UrbanFlowSeoul</span>
        </button>
      </div>

      {/* 우측 영역 */}
      <div className="navbar-right">
        {/* 내부 좌측: 육각형 토글 버튼 그룹 */}
        <div className="toggle-group">
          {toggleButtons.map((btn) => (
            <button
              key={btn.id}
              className={`hex-btn ${activeLayer === btn.id ? 'active' : ''}`}
              onClick={() => setActiveLayer(btn.id)}
              title={btn.label}
            >
              <span className="hex-icon">{btn.icon}</span>
            </button>
          ))}
        </div>
        
        {/* 내부 우측: 로그인 버튼 */}
        <button className="login-btn">로그인</button>
      </div>
    </nav>
  );
};