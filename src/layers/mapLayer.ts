import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { PathLayer, GeoJsonLayer } from '@deck.gl/layers';
import { type LayerType } from '../components/Navbar';

type RGBAColor = [number, number, number, number];

interface MapLayerProps {
  isDataLoaded: boolean;
  hexData: any[];
  parsedRoadData: any[];
  rawGeoJson: any;
  displaySeoulH3Set: Set<string>;
  displayDataMap: Map<string, any>;
  activeLayer: LayerType;
}

// ✨ 최적화 1: 불변(Immutable) 접근자 함수 외부 분리 (참조 고정)
const getHexagon = (d: any) => d.hex;
const getPath = (d: any) => d.path;

const getAirQualityColor = (level: number): RGBAColor => {
  if (level >= 3.5) return [231, 76, 60, 200]; 
  if (level >= 2.5) return [230, 126, 34, 200]; 
  if (level >= 1.5) return [46, 204, 113, 200]; 
  return [52, 152, 219, 200]; 
};

const getTemperatureColor = (temp: number): RGBAColor => {
  if (temp >= 30) return [231, 76, 60, 200];
  if (temp >= 20) return [230, 126, 34, 200];
  if (temp >= 10) return [46, 204, 113, 200];
  if (temp >= 0)  return [52, 152, 219, 200];
  return [41, 128, 185, 200];
};

export const createMapLayers = ({
  isDataLoaded,
  hexData,
  parsedRoadData,
  rawGeoJson,
  displaySeoulH3Set,
  displayDataMap,
  activeLayer
}: MapLayerProps) => {
  const layers = [];

  // ✨ 최적화 2: 유효한 서울 H3 셀만 사전 필터링 (Deck.gl의 속성 생성 루프 모수 대폭 감소)
  const validHexData = hexData.filter(d => displaySeoulH3Set.has(d.hex));

  switch (activeLayer) {
    case 'population':
      layers.push(
        // @ts-ignore
        new H3HexagonLayer({
          id: 'population-hex-layer',
          data: validHexData, // 필터링된 데이터 주입
          pickable: true,
          extruded: false, 
          getHexagon, // 외부 정적 참조 사용
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded) return [150, 150, 150, 50];
            const data = displayDataMap.get(d.hex);
            if (data && data.congestion !== undefined) {
              if (data.congestion >= 3.5) return [231, 76, 60, 200];      
              if (data.congestion >= 2.5) return [230, 126, 34, 200];      
              if (data.congestion >= 1.5) return [241, 196, 15, 200];      
              return [46, 204, 113, 200];                        
            }
            return [150, 150, 150, 50]; 
          },
          updateTriggers: { getFillColor: [isDataLoaded, displayDataMap] }
        })
      );
      break;

    case 'weather':
      layers.push(
        // @ts-ignore
        new H3HexagonLayer({
          id: 'weather-hex-layer',
          data: validHexData,
          pickable: true,
          extruded: false,
          getHexagon,
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded) return [0, 0, 0, 0];
            const data = displayDataMap.get(d.hex);
            if (data && data.weather !== undefined) {
              return getTemperatureColor(data.weather); 
            }
            return [0, 0, 0, 0];
          },
          updateTriggers: { getFillColor: [isDataLoaded, displayDataMap] }
        })
      );
      break;

    case 'air':
      layers.push(
        // @ts-ignore
        new H3HexagonLayer({
          id: 'air-hex-layer',
          data: validHexData,
          pickable: true,
          extruded: false,
          getHexagon,
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded) return [0, 0, 0, 0];
            const data = displayDataMap.get(d.hex);
            if (data && data.air !== undefined) {
              return getAirQualityColor(data.air);
            }
            return [0, 0, 0, 0];
          },
          updateTriggers: { getFillColor: [isDataLoaded, displayDataMap] }
        })
      );
      break;

    case 'bus':
      layers.push(
        new PathLayer({
          id: 'bus-traffic-layer',
          data: parsedRoadData,
          pickable: true,
          widthScale: 1,
          widthMinPixels: 3, 
          getPath,
          getColor: (d: any): RGBAColor => {
            switch (d.trafficIdx) {
              case '정체': return [231, 76, 60, 255]; 
              case '서행': return [241, 196, 15, 255]; 
              case '원활': return [46, 204, 113, 255]; 
              default: return [150, 150, 150, 200];    
            }
          },
          getWidth: 4, 
          updateTriggers: { getColor: [parsedRoadData] }
        })
      );
      break;
  }

  if (rawGeoJson) {
    layers.push(
      new GeoJsonLayer({
        id: 'seoul-boundary-layer',
        data: rawGeoJson,
        pickable: false, 
        stroked: true,
        filled: false,
        lineWidthMinPixels: 1,
        getLineColor: [255, 255, 255, 120],
        getLineWidth: 1.5,
      })
    );
  }

  return layers;
};