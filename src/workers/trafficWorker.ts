// src/workers/trafficWorker.ts
import { latLngToCell, gridDisk, polygonToCells, gridPathCells, cellToLatLng, cellToParent } from 'h3-js';
import { getHaversineDistance } from '../utils/GeoUtils';

const BASE_RES = 9;
let cachedBaseSeoulH3Set: Set<string> | null = null; // 워커 메모리에 캐싱

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  try {
    // 1. 초기 GeoJSON 파싱 (무거운 작업 1)
    if (type === 'GET_BASE_H3_SET') {
      const { rawGeoJson } = payload;
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
      
      cachedBaseSeoulH3Set = validCells;
      self.postMessage({ type: 'BASE_H3_SET_RESULT', payload: Array.from(validCells) });
    }

    // 2. 전체 데이터 공간 연산 및 보간 (가장 무거운 작업 2)
    if (type === 'CALCULATE_ALL') {
      const { rawApiData, rawRoadData, currentRes } = payload;
      
      if (!cachedBaseSeoulH3Set) throw new Error("Base H3 Set이 초기화되지 않았습니다.");

      // ✨ 이후 블록에서는 오직 validBaseSet만 사용합니다!
      const validBaseSet = cachedBaseSeoulH3Set;

      // [1] 관측점 데이터 맵핑
      const observedData = new Map<string, any>();
      rawApiData.forEach((item: any) => {
        if (item.latitude && item.longitude) {
          const h3Index = latLngToCell(item.latitude, item.longitude, BASE_RES);
          observedData.set(h3Index, {
            congestion: item.congestionLevel,
            weather: item.weatherCode, 
            air: item.airQualityLevel          
          });
        }
      });

      // [2] 도로 데이터 파싱
      const parsedRoadData = (rawRoadData || []).map((road: any) => {
        if (!road.xyList) return { ...road, path: [] };
        const pathCoordinates = road.xyList.split('|').map((point: string) => {
          const [lng, lat] = point.split('_');
          return [parseFloat(lng), parseFloat(lat)];
        });
        return { ...road, path: pathCoordinates };
      }).filter((road: any) => road.path.length > 1);

      // [3] 도로 선형 데이터 맵핑
      const roadHexMap = new Map<string, number>();
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
            lineCells.forEach(cell => roadHexMap.set(cell, score));
          } catch (e) {
            roadHexMap.set(startHex, score);
            roadHexMap.set(endHex, score);
          }
        }
      });

      // [4] 카테고리별 IDW 보간 연산
      const INTERPOLATION_CONFIG = {
        congestion: { method: 'idw', p: 2, maxDist: 0.7, maxK: 3, minPoints: 1 }, 
        weather:    { method: 'idw', p: 2, maxDist: 5.0, maxK: 5, minPoints: 1 },
        air:        { method: 'idw', p: 2, maxDist: 5.0, maxK: 5, minPoints: 1 }, 
      };

      const knownData = {
        congestion: new Map<string, { lat: number, lng: number, val: number }>(),
        weather: new Map<string, { lat: number, lng: number, val: number }>(),
        air: new Map<string, { lat: number, lng: number, val: number }>(),
      };

      // 🚨 교체 1: validBaseSet 사용
      validBaseSet.forEach(hex => {
        const obs = observedData.get(hex);
        const roadScore = roadHexMap.get(hex);
        const [lat, lng] = cellToLatLng(hex);

        const cVal = obs?.congestion !== undefined ? obs.congestion : roadScore;
        if (cVal !== undefined) knownData.congestion.set(hex, { lat, lng, val: cVal });

        if (obs?.weather !== undefined) knownData.weather.set(hex, { lat, lng, val: obs.weather });
        if (obs?.air !== undefined) knownData.air.set(hex, { lat, lng, val: obs.air });
      });

      const processSpatialData = (
        knownMap: Map<string, { lat: number, lng: number, val: number }>,
        config: any
      ) => {
        const resultMap = new Map<string, number>();
        const tempIdwMap = new Map<string, { num: number, den: number, count: number }>();
        const tempNnMap = new Map<string, { minDist: number, val: number }>();

        knownMap.forEach((obsData, obsHex) => {
          resultMap.set(obsHex, obsData.val);

          const neighbors = gridDisk(obsHex, config.maxK);
          neighbors.forEach(neighborHex => {
            // 🚨 교체 2: validBaseSet 사용
            if (!validBaseSet.has(neighborHex)) return; 
            if (knownMap.has(neighborHex)) return; 

            const [nLat, nLng] = cellToLatLng(neighborHex);
            const dist = getHaversineDistance(obsData.lat, obsData.lng, nLat, nLng);

            if (dist > 0 && dist <= config.maxDist) {
              if (config.method === 'idw') {
                const weight = 1 / Math.pow(dist, config.p);
                const current = tempIdwMap.get(neighborHex) || { num: 0, den: 0, count: 0 };
                current.num += obsData.val * weight;
                current.den += weight;
                current.count += 1;
                tempIdwMap.set(neighborHex, current);
              } else if (config.method === 'nn') {
                const current = tempNnMap.get(neighborHex);
                if (!current || dist < current.minDist) {
                  tempNnMap.set(neighborHex, { minDist: dist, val: obsData.val });
                }
              }
            }
          });
        });

        if (config.method === 'idw') {
          tempIdwMap.forEach((data, hex) => {
            if (data.count >= config.minPoints && data.den > 0) {
              resultMap.set(hex, data.num / data.den);
            }
          });
        } else if (config.method === 'nn') {
          tempNnMap.forEach((data, hex) => {
            resultMap.set(hex, data.val);
          });
        }
        return resultMap;
      };

      const processedCongestion = processSpatialData(knownData.congestion, INTERPOLATION_CONFIG.congestion);
      const processedWeather = processSpatialData(knownData.weather, INTERPOLATION_CONFIG.weather);
      const processedAir = processSpatialData(knownData.air, INTERPOLATION_CONFIG.air);

      const baseInterpolatedMap = new Map<string, any>();
      
      // 🚨 교체 3: validBaseSet 사용
      validBaseSet.forEach(hex => {
        const c = processedCongestion.get(hex);
        const w = processedWeather.get(hex);
        const a = processedAir.get(hex);

        if (c !== undefined || w !== undefined || a !== undefined) {
          baseInterpolatedMap.set(hex, { congestion: c, weather: w, air: a });
        }
      });

      // [5] 화면 렌더링 해상도에 맞춘 데이터 집계
      let displayDataMap = new Map<string, any>();
      
      if (currentRes === BASE_RES) {
        displayDataMap = baseInterpolatedMap; 
      } else {
        const aggregatedMap = new Map<string, { 
          sumCong: number, countCong: number,
          sumWeather: number, countWeather: number,
          sumAir: number, countAir: number 
        }>();
        
        baseInterpolatedMap.forEach((val, hex9) => {
          const parentHex8 = cellToParent(hex9, currentRes);
          const current = aggregatedMap.get(parentHex8) || { 
            sumCong: 0, countCong: 0, sumWeather: 0, countWeather: 0, sumAir: 0, countAir: 0 
          };
          
          if (val.congestion !== undefined) { current.sumCong += val.congestion; current.countCong += 1; }
          if (val.weather !== undefined) { current.sumWeather += val.weather; current.countWeather += 1; }
          if (val.air !== undefined) { current.sumAir += val.air; current.countAir += 1; }
          
          aggregatedMap.set(parentHex8, current);
        });

        aggregatedMap.forEach((data, hex8) => {
          displayDataMap.set(hex8, { 
            congestion: data.countCong > 0 ? data.sumCong / data.countCong : undefined,
            weather: data.countWeather > 0 ? data.sumWeather / data.countWeather : undefined, 
            air: data.countAir > 0 ? data.sumAir / data.countAir : undefined,
          });
        });
      }

      // [6] 화면 렌더링용 서울 경계 필터 집합 변환
      const displaySeoulH3Set = new Set<string>();
      if (currentRes === BASE_RES) {
        // 🚨 교체 4: validBaseSet 사용
        validBaseSet.forEach(hex => displaySeoulH3Set.add(hex));
      } else {
        // 🚨 교체 5: validBaseSet 사용
        validBaseSet.forEach(hex9 => displaySeoulH3Set.add(cellToParent(hex9, currentRes)));
      }

      // Map과 Set을 Array로 직렬화하여 메인 스레드로 전송
      self.postMessage({ 
        type: 'CALCULATE_ALL_RESULT', 
        payload: {
          parsedRoadData,
          displayDataMap: Array.from(displayDataMap.entries()),
          displaySeoulH3Set: Array.from(displaySeoulH3Set)
        }
      });
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', payload: error.message });
  }
};