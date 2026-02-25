import './Legend.css';
import { type LayerType } from './Navbar';

interface LegendProps {
  activeLayer: LayerType;
}

export function Legend({ activeLayer }: LegendProps) {
  // 레이어별 범례 데이터 정의
  const legendData = {
    population: [
      { label: '정체', color: 'rgb(231, 76, 60)' },
      { label: '서행', color: 'rgb(230, 126, 34)' },
      { label: '보통', color: 'rgb(241, 196, 15)' },
      { label: '원활', color: 'rgb(46, 204, 113)' },
    ],
    weather: [
      { label: '30°C 이상', color: 'rgb(231, 76, 60)' },
      { label: '20~30°C', color: 'rgb(230, 126, 34)' },
      { label: '10~20°C', color: 'rgb(46, 204, 113)' },
      { label: '0~10°C', color: 'rgb(52, 152, 219)' },
      { label: '0°C 미만', color: 'rgb(41, 128, 185)' },
    ],
    air: [
      { label: '매우나쁨', color: 'rgb(231, 76, 60)' },
      { label: '나쁨', color: 'rgb(230, 126, 34)' },
      { label: '보통', color: 'rgb(46, 204, 113)' },
      { label: '좋음', color: 'rgb(52, 152, 219)' },
    ],
    bus: [
      { label: '정체', color: 'rgb(231, 76, 60)' },
      { label: '서행', color: 'rgb(241, 196, 15)' },
      { label: '원활', color: 'rgb(46, 204, 113)' },
    ]
  };

  const currentLegend = legendData[activeLayer];
  
  const titleMap: Record<LayerType, string> = {
    population: '혼잡도',
    weather: '날씨',
    air: '대기질',
    bus: '도로 정체'
  };

  if (!currentLegend) return null;

  // 항목 개수가 4개 이하면 그 개수만큼만, 5개 이상이면 4열로 고정 (나머지는 다음 줄로 넘어감)
  const colCount = Math.min(4, currentLegend.length);

  return (
    <div className="legend-container">
      <h4 className="legend-title">{titleMap[activeLayer]}</h4>
      
      {/* 동적 Grid 레이아웃 적용 */}
      <div 
        className="legend-list" 
        style={{ gridTemplateColumns: `repeat(${colCount}, max-content)` }}
      >
        {currentLegend.map((item, idx) => (
          <div key={idx} className="legend-item">
            <div className="hexagon-icon" style={{ backgroundColor: item.color }} />
            <span className="legend-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}