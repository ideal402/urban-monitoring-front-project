import React from 'react';
import './ZoomControl.css';

interface ZoomControlProps {
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (newZoom: number) => void;
}

export const ZoomControl: React.FC<ZoomControlProps> = ({ 
  zoom, 
  minZoom, 
  maxZoom, 
  onZoomChange 
}) => {
  // 버튼 클릭 시 0.5 단계로 줌 인/아웃
  const handleZoomIn = () => onZoomChange(Math.min(zoom + 0.5, maxZoom));
  const handleZoomOut = () => onZoomChange(Math.max(zoom - 0.5, minZoom));
  
  // 슬라이더 조작 시 뷰포트 업데이트
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onZoomChange(parseFloat(e.target.value));
  };

  return (
    <div className="zoom-control-container">
      <button onClick={handleZoomIn} className="zoom-btn">+</button>
      <div className="slider-wrapper">
        <input
          type="range"
          min={minZoom}
          max={maxZoom}
          step="0.1"
          value={zoom}
          onChange={handleSliderChange}
          className="zoom-slider"
        />
      </div>
      <button onClick={handleZoomOut} className="zoom-btn">-</button>
    </div>
  );
};