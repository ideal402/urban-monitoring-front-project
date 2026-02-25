import { useState, useEffect, useMemo } from 'react';
import { latLngToCell, gridDisk, polygonToCells, gridPathCells, cellToLatLng, cellToParent } from 'h3-js';
import { getRoadTrafficData } from '../api/mapApi';
import { getHaversineDistance } from '../utils/GeoUtils'; 

interface UseTrafficMapProps {
  viewStateZoom: number;
  rawGeoJson: any;
  rawApiData: any[];
  centerLat: number; 
  centerLng: number; 
}


export function useTrafficMap({ viewStateZoom, rawGeoJson, rawApiData, centerLat, centerLng }: UseTrafficMapProps) {
  const BASE_RES = 9;
  
  const [rawRoadData, setRawRoadData] = useState<any[]>([]);

  // 1. 줌 레벨에 따른 currentRes 계산
  const { resolution: currentRes, k: currentK } = useMemo(() => {
    return viewStateZoom < 11.0 ? { resolution: 8, k: 29 } : { resolution: 9, k: 81 };
  }, [viewStateZoom]);

  // 화면 렌더링용 빈 육각형 배열
  const hexData = useMemo(() => {
    const centerHex = latLngToCell(centerLat, centerLng, currentRes);
    const hexRing = gridDisk(centerHex, currentK); 
    return hexRing.map(hex => ({ hex }));
  }, [currentRes, currentK, centerLat, centerLng]);

  // 1. 베이스 해상도(9) 기준의 서울 H3 인덱스 집합 생성
  const baseSeoulH3Set = useMemo(() => {
    if (!rawGeoJson) return new Set<string>();
    const validCells = new Set<string>();
    rawGeoJson.features.forEach((feature: any) => {
      const geometry = feature.geometry;
      if (geometry.type === 'Polygon') {
        const cells = polygonToCells(geometry.coordinates, BASE_RES, true);
        cells.forEach(cell => validCells.add(cell));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          const cells = polygonToCells(polygon, BASE_RES, true);
          cells.forEach(cell => validCells.add(cell));
        });
      }
    });
    return validCells;
  }, [rawGeoJson]);

  // 2. 도로 데이터 페치
  useEffect(() => {
    if (baseSeoulH3Set.size === 0) return;
    const fetchRoadData = async () => {
      try {
        const h3IndicesArray = Array.from(baseSeoulH3Set);
        const roadData = await getRoadTrafficData(h3IndicesArray);
        setRawRoadData(roadData);
      } catch (error) {
        console.error("도로 데이터 로드 실패:", error);
      }
    };
    fetchRoadData();
  }, [baseSeoulH3Set]);

  // 3. 관측점 데이터 맵핑 (BASE_RES 고정)
  const observedData = useMemo(() => {
    if (!rawApiData || rawApiData.length === 0) return new Map<string, any>();
    const newObservedMap = new Map<string, any>();
    
    rawApiData.forEach((item: any) => {
      if (item.latitude && item.longitude) {
        const h3Index = latLngToCell(item.latitude, item.longitude, BASE_RES);
        newObservedMap.set(h3Index, {
          congestion: item.congestionLevel,
          weather: item.weatherCode, 
          air: item.airQualityLevel          
        });
      }
    });
    return newObservedMap;
  }, [rawApiData]);

  // 도로 데이터 파싱
  const parsedRoadData = useMemo(() => {
    if (!rawRoadData || rawRoadData.length === 0) return [];
    return rawRoadData.map((road: any) => {
      if (!road.xyList) return { ...road, path: [] };
      const pathCoordinates = road.xyList.split('|').map((point: string) => {
        const [lng, lat] = point.split('_');
        return [parseFloat(lng), parseFloat(lat)];
      });
      return { ...road, path: pathCoordinates };
    }).filter((road: any) => road.path.length > 1); 
  }, [rawRoadData]);

  // 4. 도로 선형 데이터 맵핑 (BASE_RES 고정)
  const roadHexMap = useMemo(() => {
    const map = new Map<string, number>();
    if (parsedRoadData.length === 0) return map;
    const trafficToScore = { '정체': 4, '서행': 2.5, '원활': 1 };

    parsedRoadData.forEach((road: any) => {
      const path = road.path;
      const score = trafficToScore[road.trafficIdx as keyof typeof trafficToScore] || 1;
      for (let i = 0; i < path.length - 1; i++) {
        const [lng1, lat1] = path[i];
        const [lng2, lat2] = path[i + 1];
        
        const startHex = latLngToCell(lat1, lng1, BASE_RES);
        const endHex = latLngToCell(lat2, lng2, BASE_RES);
        try {
          const lineCells = gridPathCells(startHex, endHex);
          lineCells.forEach(cell => map.set(cell, score));
        } catch (e) {
          map.set(startHex, score);
          map.set(endHex, score);
        }
      }
    });
    return map;
  }, [parsedRoadData]);

  // 5. 카테고리별 IDW 보간 연산 및 최종 병합 (BASE_RES 고정)
  const baseInterpolatedMap = useMemo(() => {
    if (baseSeoulH3Set.size === 0) return new Map<string, any>();

    const INTERPOLATION_CONFIG = {
      congestion: { method: 'idw', p: 2, maxDist: 0.7, maxK: 3, minPoints: 1 }, 
      weather:    { method: 'idw', p: 2, maxDist: 5.0, maxK: 5, minPoints: 1 },
      air:        { method: 'idw', p: 2, maxDist: 5.0, maxK: 5, minPoints: 1 }, 
    };

    // 5-1. 관측값을 카테고리별로 분리 및 좌표 캐싱
    const knownData = {
      congestion: new Map<string, { lat: number, lng: number, val: number }>(),
      weather: new Map<string, { lat: number, lng: number, val: number }>(),
      air: new Map<string, { lat: number, lng: number, val: number }>(),
    };

    baseSeoulH3Set.forEach(hex => {
      const obs = observedData.get(hex);
      const roadScore = roadHexMap.get(hex);
      const [lat, lng] = cellToLatLng(hex);

      const cVal = obs?.congestion !== undefined ? obs.congestion : roadScore;
      if (cVal !== undefined) knownData.congestion.set(hex, { lat, lng, val: cVal });

      if (obs?.weather !== undefined) knownData.weather.set(hex, { lat, lng, val: obs.weather });
      if (obs?.air !== undefined) knownData.air.set(hex, { lat, lng, val: obs.air });
    });

    // 5-2. 범용 공간 연산 헬퍼 함수 (IDW & NN 지원)
    const processSpatialData = (
      knownMap: Map<string, { lat: number, lng: number, val: number }>,
      config: any
    ) => {
      const resultMap = new Map<string, number>();
      const tempIdwMap = new Map<string, { num: number, den: number, count: number }>();
      const tempNnMap = new Map<string, { minDist: number, val: number }>();

      knownMap.forEach((obsData, obsHex) => {
        resultMap.set(obsHex, obsData.val); // 기존 관측값 보존

        const neighbors = gridDisk(obsHex, config.maxK);
        neighbors.forEach(neighborHex => {
          if (!baseSeoulH3Set.has(neighborHex)) return; 
          if (knownMap.has(neighborHex)) return; 

          const [nLat, nLng] = cellToLatLng(neighborHex);
          const dist = getHaversineDistance(obsData.lat, obsData.lng, nLat, nLng);

          if (dist > 0 && dist <= config.maxDist) {
            if (config.method === 'idw') {
              // IDW (Inverse Distance Weighting) 연산
              const weight = 1 / Math.pow(dist, config.p);
              const current = tempIdwMap.get(neighborHex) || { num: 0, den: 0, count: 0 };
              current.num += obsData.val * weight;
              current.den += weight;
              current.count += 1;
              tempIdwMap.set(neighborHex, current);
            } else if (config.method === 'nn') {
              // NN (Nearest Neighbor) 연산: 가장 가까운 거리의 원본 값(코드) 유지
              const current = tempNnMap.get(neighborHex);
              if (!current || dist < current.minDist) {
                tempNnMap.set(neighborHex, { minDist: dist, val: obsData.val });
              }
            }
          }
        });
      });

      // 최종 결과 맵에 계산 결과 반영
      if (config.method === 'idw') {
        tempIdwMap.forEach((data, hex) => {
          if (data.count >= config.minPoints && data.den > 0) {
            resultMap.set(hex, data.num / data.den); // 평균 계산
          }
        });
      } else if (config.method === 'nn') {
        tempNnMap.forEach((data, hex) => {
          resultMap.set(hex, data.val); // 평균 내지 않고 원본 코드 그대로 대입
        });
      }

      return resultMap;
    };

    // 5-3. 설정된 파라미터로 각각 공간 연산 실행
    const processedCongestion = processSpatialData(knownData.congestion, INTERPOLATION_CONFIG.congestion);
    const processedWeather = processSpatialData(knownData.weather, INTERPOLATION_CONFIG.weather);
    const processedAir = processSpatialData(knownData.air, INTERPOLATION_CONFIG.air);

    // 5-4. 결과를 최종 객체 형태 Map으로 병합
    const finalMap = new Map<string, any>();
    baseSeoulH3Set.forEach(hex => {
      const c = processedCongestion.get(hex);
      const w = processedWeather.get(hex);
      const a = processedAir.get(hex);

      if (c !== undefined || w !== undefined || a !== undefined) {
        finalMap.set(hex, {
          congestion: c,
          weather: w,
          air: a
        });
      }
    });

    return finalMap;
  }, [baseSeoulH3Set, observedData, roadHexMap]);

  // 6. 화면 렌더링 해상도(currentRes)에 맞춘 데이터 집계
 const displayDataMap = useMemo(() => {
    if (currentRes === BASE_RES) {
      return baseInterpolatedMap; 
    } 

    const aggregatedMap = new Map<string, { 
      sumCong: number, countCong: number,
      sumWeather: number, countWeather: number, // ✨ 다시 합계/개수 방식으로 복구
      sumAir: number, countAir: number 
    }>();
    
    baseInterpolatedMap.forEach((val, hex9) => {
      const parentHex8 = cellToParent(hex9, currentRes);
      const current = aggregatedMap.get(parentHex8) || { 
        sumCong: 0, countCong: 0, 
        sumWeather: 0, countWeather: 0, 
        sumAir: 0, countAir: 0 
      };
      
      if (val.congestion !== undefined) {
        current.sumCong += val.congestion;
        current.countCong += 1;
      }
      if (val.weather !== undefined) {
        current.sumWeather += val.weather; // 온도를 합산
        current.countWeather += 1;
      }
      if (val.air !== undefined) {
        current.sumAir += val.air;
        current.countAir += 1;
      }
      
      aggregatedMap.set(parentHex8, current);
    });

    const formattedMap = new Map<string, any>();
    aggregatedMap.forEach((data, hex8) => {
      formattedMap.set(hex8, { 
        congestion: data.countCong > 0 ? data.sumCong / data.countCong : undefined,
        // ✨ 온도 평균값 계산
        weather: data.countWeather > 0 ? data.sumWeather / data.countWeather : undefined, 
        air: data.countAir > 0 ? data.sumAir / data.countAir : undefined,
      });
    });
    
    return formattedMap;
  }, [baseInterpolatedMap, currentRes]);

  // 7. 화면 렌더링용 서울 경계 필터 집합 변환
  const displaySeoulH3Set = useMemo(() => {
    if (currentRes === BASE_RES) return baseSeoulH3Set;
    const set = new Set<string>();
    baseSeoulH3Set.forEach(hex9 => set.add(cellToParent(hex9, currentRes)));
    return set;
  }, [baseSeoulH3Set, currentRes]);

  const isDataLoaded = !!rawGeoJson && rawApiData.length > 0;

  return {
    isDataLoaded,
    hexData,
    parsedRoadData,
    displaySeoulH3Set,
    displayDataMap,
  };
}