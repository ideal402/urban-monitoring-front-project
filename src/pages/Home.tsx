import { useState, useEffect, useMemo } from 'react';

// 1. API 및 상수, 유틸리티
import { getCurrentMapData } from '../api/mapApi';
import { 
  SEOUL_LAT, 
  SEOUL_LNG, 
  SEOUL_GEOJSON_URL, 
  BOUNDS, 
  ZOOM_CONFIG 
} from '../utils/constants';

// 2. Hooks 및 Layers
import { useTrafficMap } from '../hooks/useTrafficMap';
import { createMapLayers } from '../layers/mapLayer'; // 파일명 주의 (mapLayers.ts)

// 3. UI 컴포넌트
import { MapContainer } from '../components/MapContainer';
import { ZoomControl } from '../components/ZoomControl';
import { Navbar, type LayerType } from '../components/Navbar';
import { Legend } from '../components/Legend';
import './Home.css';

export function Home() {
  // --- [상태 관리] ---
  const [rawGeoJson, setRawGeoJson] = useState<any>(null);
  const [rawApiData, setRawApiData] = useState<any[]>([]);
  
  // 현재 활성화된 레이어 상태 (초기값: 인구밀집)
  const [activeLayer, setActiveLayer] = useState<LayerType>('population');
  
  // 지도 뷰 상태 (줌, 위치)
  const [viewState, setViewState] = useState({
    longitude: SEOUL_LNG,
    latitude: SEOUL_LAT,
    zoom: ZOOM_CONFIG.INITIAL,
    pitch: 0,
    bearing: 0,
    minZoom: ZOOM_CONFIG.MIN,   
    maxZoom: ZOOM_CONFIG.MAX
  });

  // --- [데이터 페칭] ---
  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        // Promise.all을 사용하여 GeoJSON과 실시간 데이터를 병렬로 요청
        const [geoRes, apiData] = await Promise.all([
          fetch(SEOUL_GEOJSON_URL).then(res => res.json()),
          getCurrentMapData()
        ]);
        setRawGeoJson(geoRes);
        setRawApiData(apiData);
      } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
      }
    };
    fetchRegionData();
  }, []);

  // --- [비즈니스 로직 (Custom Hook)] ---
  // 공간 데이터 연산 및 데이터 가공을 Hook에 위임
  const trafficMapData = useTrafficMap({
    viewStateZoom: viewState.zoom,
    rawGeoJson,
    rawApiData,
    centerLat: SEOUL_LAT,
    centerLng: SEOUL_LNG
  });

  // --- [레이어 생성] ---
  // activeLayer 상태를 전달하여 필요한 레이어만 생성
  const layers = useMemo(() => {
  return createMapLayers({
    isDataLoaded: trafficMapData.isDataLoaded,
    hexData: trafficMapData.hexData,
    parsedRoadData: trafficMapData.parsedRoadData,
    rawGeoJson,
    displaySeoulH3Set: trafficMapData.displaySeoulH3Set,
    displayDataMap: trafficMapData.displayDataMap,
    activeLayer 
  });
}, [trafficMapData, rawGeoJson, activeLayer]);

  // --- [이벤트 핸들러] ---
  
  // 1. 뷰 상태 변경 (드래그, 줌 등) - 경계 제한(BOUNDS) 적용
  const handleViewStateChange = ({ viewState: nextViewState }: any) => {
    setViewState({
      ...nextViewState,
      longitude: Math.max(BOUNDS.MIN_LNG, Math.min(BOUNDS.MAX_LNG, nextViewState.longitude)),
      latitude: Math.max(BOUNDS.MIN_LAT, Math.min(BOUNDS.MAX_LAT, nextViewState.latitude))
    });
  };

  // 2. 줌 컨트롤 버튼 클릭 시 처리
  const handleZoomChange = (newZoom: number) => {
    setViewState((prev) => ({ ...prev, zoom: newZoom }));
  };


  // --- [렌더링] ---
  return (
    <div className="app-layout">
      <Navbar activeLayer={activeLayer} onLayerChange={setActiveLayer} />

      <Legend activeLayer={activeLayer} />

      <div className="ui-layer" style={{ 
        position: 'absolute', 
        top: '80px', 
        left: '20px', 
        zIndex: 10, 
        pointerEvents: 'none' // 지도를 가리지 않도록 클릭 이벤트 통과
      }}>
        
        {!trafficMapData.isDataLoaded && (
          <div style={{ 
            backgroundColor: 'rgba(0,0,0,0.6)', 
            color: '#ffcc00', 
            padding: '8px 12px', 
            borderRadius: '4px',
            fontWeight: 'bold',
            display: 'inline-block'
          }}>
            데이터를 불러오는 중...
          </div>
        )}
      </div>

      {/* 지도 영역 */}
      <div className="map-layer">
        <MapContainer
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          layers={layers}
        />
        <ZoomControl 
          zoom={viewState.zoom} 
          minZoom={viewState.minZoom} 
          maxZoom={viewState.maxZoom} 
          onZoomChange={handleZoomChange} 
        />
      </div>
    </div>
  );
}

export default Home;