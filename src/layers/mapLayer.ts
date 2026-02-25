import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { PathLayer, GeoJsonLayer } from '@deck.gl/layers';
import { type LayerType } from '../components/Navbar'; // Navbar에서 만든 타입 임포트

// 1. Deck.gl에서 요구하는 Color 튜플 타입 명시
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

const getAirQualityColor = (level: number): RGBAColor => {
  if (level >= 3.5) return [231, 76, 60, 200]; 
  if (level >= 2.5) return [230, 126, 34, 200]; 
  if (level >= 1.5) return [46, 204, 113, 200]; 
  return [52, 152, 219, 200]; 
};

const getTemperatureColor = (temp: number): RGBAColor => {
  if (temp >= 30) return [231, 76, 60, 200];      // 30도 이상: 빨강 (더움)
  if (temp >= 20) return [230, 126, 34, 200];     // 20도 이상: 주황 (따뜻함)
  if (temp >= 10) return [46, 204, 113, 200];     // 10도 이상: 초록 (선선함)
  if (temp >= 0)  return [52, 152, 219, 200];      // 0도 이상: 하늘색 (쌀쌀함)
  return [41, 128, 185, 200];                     // 0도 미만: 파란색 (추움)
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

  switch (activeLayer) {
    case 'population':
      layers.push(
        // @ts-ignore - H3HexagonLayer의 getFillColor 속성 상속 누락 우회
        new H3HexagonLayer({
          id: 'population-hex-layer',
          data: hexData,
          pickable: true,
          extruded: false, 
          getHexagon: (d: any) => d.hex,
          // 3. getFillColor의 반환 타입을 RGBAColor로 명시
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded || !displaySeoulH3Set.has(d.hex)) return [0, 0, 0, 0];
            const data = displayDataMap.get(d.hex);
            if (data && data.congestion !== undefined) {
              if (data.congestion >= 3.5) return [231, 76, 60, 200];      
              if (data.congestion >= 2.5) return [230, 126, 34, 200];      
              if (data.congestion >= 1.5) return [241, 196, 15, 200];      
              return [46, 204, 113, 200];                        
            }
            return [150, 150, 150, 50]; 
          },
          updateTriggers: { getFillColor: [displaySeoulH3Set, isDataLoaded, displayDataMap] }
        })
      );
      break;

    case 'weather':
      layers.push(
        // @ts-ignore
        new H3HexagonLayer({
          id: 'weather-hex-layer',
          data: hexData,
          pickable: true,
          extruded: false,
          getHexagon: (d: any) => d.hex,
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded || !displaySeoulH3Set.has(d.hex)) return [0, 0, 0, 0];
            const data = displayDataMap.get(d.hex);
            
            if (data && data.weather !== undefined) {
              return getTemperatureColor(data.weather); 
            }
            return [0, 0, 0, 0];
          },
          updateTriggers: { getFillColor: [displaySeoulH3Set, isDataLoaded, displayDataMap] }
        })
      );
      break;

    case 'air':
      layers.push(
        // @ts-ignore
        new H3HexagonLayer({
          id: 'air-hex-layer',
          data: hexData,
          pickable: true,
          extruded: false,
          getHexagon: (d: any) => d.hex,
          getFillColor: (d: any): RGBAColor => {
            if (!isDataLoaded || !displaySeoulH3Set.has(d.hex)) return [0, 0, 0, 0];
            const data = displayDataMap.get(d.hex);
            
            // 수정된 부분: data.air가 명시적으로 존재할 때만 색상을 매핑
            if (data && data.air !== undefined) {
              return getAirQualityColor(data.air);
            }
            return [0, 0, 0, 0]; // 데이터가 없으면 투명하게 처리
          },
          updateTriggers: { getFillColor: [displaySeoulH3Set, isDataLoaded, displayDataMap] }
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
          getPath: (d: any) => d.path,
          // PathLayer의 getColor도 명시 (deck.gl의 PathLayer가 요구함)
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