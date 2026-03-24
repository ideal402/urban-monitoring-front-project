// src/hooks/useTrafficMap.ts
import { useState, useEffect, useMemo, useRef } from 'react';
import { latLngToCell, gridDisk } from 'h3-js';
import { getRoadTrafficData } from '../api/mapApi';
import TrafficWorker from '../workers/trafficWorker?worker'; // Vite의 워커 임포트 방식

interface UseTrafficMapProps {
  viewStateZoom: number;
  rawGeoJson: any;
  rawApiData: any[];
  centerLat: number; 
  centerLng: number; 
}

export function useTrafficMap({ viewStateZoom, rawGeoJson, rawApiData, centerLat, centerLng }: UseTrafficMapProps) {
  const BASE_RES = 9;
  
  // Worker 상태 관리
  const workerRef = useRef<Worker | null>(null);
  const [isWorkerCalculating, setIsWorkerCalculating] = useState(false);
  
  // 데이터 상태 관리
  const [baseSeoulH3Set, setBaseSeoulH3Set] = useState<Set<string>>(new Set());
  const [rawRoadData, setRawRoadData] = useState<any[]>([]);
  
  // 최종 렌더링 결과 상태
  const [workerResult, setWorkerResult] = useState({
    parsedRoadData: [],
    displayDataMap: new Map<string, any>(),
    displaySeoulH3Set: new Set<string>()
  });

  // 1. 줌 레벨에 따른 currentRes 계산 (이건 가벼우니 메인 스레드 유지)
  const { resolution: currentRes, k: currentK } = useMemo(() => {
    return viewStateZoom < 11.0 ? { resolution: 8, k: 29 } : { resolution: 9, k: 81 };
  }, [viewStateZoom]);

  // 2. 빈 육각형 배열 계산 (이것도 가벼우니 유지)
  const hexData = useMemo(() => {
    const centerHex = latLngToCell(centerLat, centerLng, currentRes);
    const hexRing = gridDisk(centerHex, currentK); 
    return hexRing.map(hex => ({ hex }));
  }, [currentRes, currentK, centerLat, centerLng]);

  // 3. Worker 초기화 및 이벤트 리스너 등록
  useEffect(() => {
    workerRef.current = new TrafficWorker();

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'BASE_H3_SET_RESULT') {
        // 워커에서 계산된 기본 H3 Set 결과 수신
        setBaseSeoulH3Set(new Set(payload));
      }

      if (type === 'CALCULATE_ALL_RESULT') {

        console.log("🔥 워커에서 받은 원본 payload:", payload); // 데이터가 비어있는지 확인!
        // 워커에서 최종 연산 결과 수신
        setWorkerResult({
          parsedRoadData: payload.parsedRoadData,
          displayDataMap: new Map(payload.displayDataMap), // Array를 Map으로 복구
          displaySeoulH3Set: new Set(payload.displaySeoulH3Set) // Array를 Set으로 복구
        });
        setIsWorkerCalculating(false);
      }
     
      if (type === 'ERROR') {
        console.error("Worker Error:", payload);
        setIsWorkerCalculating(false);
      }
    };

    return () => {
      workerRef.current?.terminate(); // 컴포넌트 언마운트 시 워커 종료
    };
  }, []);

  // 4. rawGeoJson이 들어오면 워커에 첫 번째 작업(H3 Set 생성) 지시
  useEffect(() => {
    if (rawGeoJson && workerRef.current) {
      workerRef.current.postMessage({
        type: 'GET_BASE_H3_SET',
        payload: { rawGeoJson }
      });
    }
  }, [rawGeoJson]);

  // 5. baseSeoulH3Set이 준비되면 도로 데이터 페치
  useEffect(() => {
    if (baseSeoulH3Set.size === 0) return;
    const fetchRoadData = async () => {
      try {
        const roadData = await getRoadTrafficData(Array.from(baseSeoulH3Set));
        setRawRoadData(roadData);
      } catch (error) {
        console.error("도로 데이터 로드 실패:", error);
      }
    };
    fetchRoadData();
  }, [baseSeoulH3Set]);

  // 6. 모든 데이터가 준비되면 워커에 두 번째 작업(최종 연산) 지시
  useEffect(() => {
    if (baseSeoulH3Set.size > 0 && rawApiData.length > 0 && rawRoadData.length > 0 && workerRef.current) {
      setIsWorkerCalculating(true);
      workerRef.current.postMessage({
        type: 'CALCULATE_ALL',
        payload: {
          rawApiData,
          rawRoadData,
          currentRes
        }
      });
    }
  }, [baseSeoulH3Set, rawApiData, rawRoadData, currentRes]);

  // 연산이 진행 중이거나 데이터가 없으면 로딩 상태로 간주
  const isDataLoaded = baseSeoulH3Set.size > 0 && rawApiData.length > 0 && !isWorkerCalculating;

  return {
    isDataLoaded,
    hexData,
    parsedRoadData: workerResult.parsedRoadData,
    displaySeoulH3Set: workerResult.displaySeoulH3Set,
    displayDataMap: workerResult.displayDataMap,
  };
}