// src/pages/Home.tsx
// ✨ 수정 포인트 1: React를 명시적으로 임포트 (또는 lazy를 직접 가져옴)
import React, { useState, useEffect, useMemo, Suspense } from 'react';

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
import { createMapLayers } from '../layers/mapLayer'; 

// 3. UI 컴포넌트
import { ZoomControl } from '../components/ZoomControl';
import { Navbar, type LayerType } from '../components/Navbar';
import { Legend } from '../components/Legend';
import { RefreshControl } from '../components/RefrashControl'; // 파일명 오타(RefrashControl) 확인 필요
import './Home.css';

// ✨ MapContainer 지연 로딩
const MapContainer = React.lazy(() => 
  import('../components/MapContainer').then(module => ({ default: module.MapContainer }))
);

export function Home() {
  // --- [상태 관리] ---
  const [rawGeoJson, setRawGeoJson] = useState<any>(null);
  const [rawApiData, setRawApiData] = useState<any[]>([]);
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  const [activeLayer, setActiveLayer] = useState<LayerType>('population');
  
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
  const fetchRegionData = async () => {
    setIsRefreshing(true);
    try {
      const [geoRes, apiData] = await Promise.all([
        fetch(SEOUL_GEOJSON_URL).then(res => res.json()),
        getCurrentMapData()
      ]);
      
      setRawGeoJson(geoRes);
      setRawApiData(apiData);

      if (apiData && apiData.length > 0 && apiData[0].measurementTime) {
        setLastUpdated(new Date(apiData[0].measurementTime));
      } else {
        setLastUpdated(new Date()); 
      }

    } catch (error) {
      console.error("데이터 로드 중 오류 발생:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRegionData();
  }, []);

  // --- [비즈니스 로직 (Custom Hook)] ---
  const trafficMapData = useTrafficMap({
    viewStateZoom: viewState.zoom,
    rawGeoJson,
    rawApiData,
    centerLat: SEOUL_LAT,
    centerLng: SEOUL_LNG
  });

  // --- [레이어 생성] ---
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
  const handleViewStateChange = ({ viewState: nextViewState }: any) => {
    setViewState({
      ...nextViewState,
      longitude: Math.max(BOUNDS.MIN_LNG, Math.min(BOUNDS.MAX_LNG, nextViewState.longitude)),
      latitude: Math.max(BOUNDS.MIN_LAT, Math.min(BOUNDS.MAX_LAT, nextViewState.latitude))
    });
  };

  const handleZoomChange = (newZoom: number) => {
    setViewState((prev) => ({ ...prev, zoom: newZoom }));
  };

  // --- [렌더링] ---
  return (
    <div className="app-layout">
      <Navbar activeLayer={activeLayer} onLayerChange={setActiveLayer} />

      <div style={{
        position: 'absolute',
        top: '80px',
        right: '40px',
        display: 'flex',
        gap: '16px', 
        zIndex: 10,
        alignItems: 'flex-start' 
      }}>
        <RefreshControl 
          lastUpdated={lastUpdated} 
          onRefresh={fetchRegionData} 
          isRefreshing={isRefreshing} 
        />
        <Legend activeLayer={activeLayer} />
      </div>

      <div className="ui-layer" style={{ 
        position: 'absolute', 
        top: '80px', 
        left: '20px', 
        zIndex: 10, 
        pointerEvents: 'none' 
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
      <Suspense 
        fallback={
          <div style={{ 
            width: '100%', 
            height: '100vh', // ✨ 브라우저 화면을 꽉 채우도록 변경
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            fontSize: '1.2rem'
          }}>
            지도를 불러오는 중입니다...
          </div>
        }
      >
        <MapContainer
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          layers={layers}
        />
      </Suspense>

      <ZoomControl 
        zoom={viewState.zoom} 
        minZoom={viewState.minZoom} 
        maxZoom={viewState.maxZoom} 
        onZoomChange={handleZoomChange} 
      />
      
      {/* ✨ 수정 포인트 2: 불필요한 닫는 태그 </div> 삭제 */}
    </div>
  );
}

export default Home;