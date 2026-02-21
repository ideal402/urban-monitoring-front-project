import { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import MapGL from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { latLngToCell, gridDisk, polygonToCells } from 'h3-js';
import { getCurrentMapData } from '../api/mapApi';
import { ZoomControl } from '../components/ZoomControl';
import { Navbar } from '../components/Navbar';
import './Home.css';


const SEOUL_LAT = 37.5665;
const SEOUL_LNG = 126.9780;
const SEOUL_GEOJSON_URL = 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json';

const BOUNDS = {
  MIN_LNG: 126.75, MAX_LNG: 127.20, MIN_LAT: 37.42, MAX_LAT: 37.70
};

export function Home() {
  // 1. 원본 데이터 상태 관리 (Fetch 후 한 번만 저장)
  const [rawGeoJson, setRawGeoJson] = useState<any>(null);
  const [rawApiData, setRawApiData] = useState<any[]>([]);

  const [viewState, setViewState] = useState({
    longitude: SEOUL_LNG,
    latitude: SEOUL_LAT,
    zoom: 10.7,
    pitch: 0,
    bearing: 0,
    minZoom: 10.7,   
    maxZoom: 15
  });

  // 2. 현재 줌 레벨을 기반으로 H3 해상도 및 반경(k) 계산
  const { resolution: currentRes, k: currentK } = useMemo(() => {
    if (viewState.zoom < 13.0) return { resolution: 8, k: 29 };
    return { resolution: 9, k: 81 };
  }, [viewState.zoom]);

  // 원본 데이터 Fetch (초기 마운트 시 1회 실행)
  useEffect(() => {
    const fetchData = async () => {
      try {
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
    fetchData();
  }, []);

  // 3. 해상도(currentRes) 변경 시 H3 인덱스 재계산 로직
  
  // 3-1. 전체 커버리지 H3 그리드 생성
  const hexData = useMemo(() => {
    const centerHex = latLngToCell(SEOUL_LAT, SEOUL_LNG, currentRes);
    const hexRing = gridDisk(centerHex, currentK); 
    return hexRing.map(hex => ({ hex }));
  }, [currentRes, currentK]);

  // 3-2. 서울시 바운더리 내부 H3 인덱스 Set 생성
  const seoulH3Set = useMemo(() => {
    if (!rawGeoJson) return new Set<string>();
    
    const validCells = new Set<string>();
    rawGeoJson.features.forEach((feature: any) => {
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        const cells = polygonToCells(geometry.coordinates, currentRes, true);
        cells.forEach(cell => validCells.add(cell));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          const cells = polygonToCells(polygon, currentRes, true);
          cells.forEach(cell => validCells.add(cell));
        });
      }
    });
    return validCells;
  }, [rawGeoJson, currentRes]);

  // 3-3. API 데이터 H3 매핑 Map 생성
  const congestionData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) return new Map<string, number>();
    
    const newCongestionMap = new Map<string, number>();
    rawApiData.forEach((item: any) => {
      if (item.latitude && item.longitude && item.congestionLevel) {
        const h3Index = latLngToCell(item.latitude, item.longitude, currentRes);
        newCongestionMap.set(h3Index, item.congestionLevel);
      }
    });
    return newCongestionMap;
  }, [rawApiData, currentRes]);

  const isDataLoaded = !!rawGeoJson && rawApiData.length > 0;

  // 4. deck.gl 레이어 설정
  const layers = [
    new H3HexagonLayer({
      id: 'h3-hexagon-layer',
      data: hexData,
      pickable: true,
      extruded: false, 
      getHexagon: (d: any) => d.hex,
      
      getFillColor: (d: any) => {
        if (!isDataLoaded) return [0, 0, 0, 0];

        if (!seoulH3Set.has(d.hex)) return [255, 255, 255, 0]; 

        const level = congestionData.get(d.hex);
        if (level !== undefined) {
          switch (level) {
            case 1: return [46, 204, 113, 200];  
            case 2: return [241, 196, 15, 200];  
            case 3: return [230, 126, 34, 200];  
            case 4: return [231, 76, 60, 200];   
            default: return [150, 150, 150, 50];
          }
        } else {
          return [150, 150, 150, 50];
        }
      },
      
      // 상태 업데이트 트리거
      updateTriggers: {
        getFillColor: [seoulH3Set, isDataLoaded, congestionData] 
      }
    })
  ];

  const handleViewStateChange = ({ viewState: nextViewState }: any) => {
    setViewState({
      ...nextViewState,
      longitude: Math.max(BOUNDS.MIN_LNG, Math.min(BOUNDS.MAX_LNG, nextViewState.longitude)),
      latitude: Math.max(BOUNDS.MIN_LAT, Math.min(BOUNDS.MAX_LAT, nextViewState.latitude))
    });
  };

  const handleZoomChange = (newZoom: number) => {
    setViewState((prev) => ({
      ...prev,
      zoom: newZoom
    }));
  };

  return (
    <div className="app-layout">
      <Navbar />

      <div className="ui-layer">
        {!isDataLoaded && (
          <p style={{ position: 'absolute', top: '80px', fontWeight: 'bold' }}>
            데이터를 불러오는 중...
          </p>
        )}
      </div>

      <div className="map-layer">
        <DeckGL
          initialViewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller={true}
          layers={layers}
        >
          <MapGL
            mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          />
        </DeckGL>
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