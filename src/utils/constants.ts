// 서울 시청 좌표 (맵 초기 중심점)
export const SEOUL_LAT = 37.5665;
export const SEOUL_LNG = 126.9780;

// 서울 행정구역 GeoJSON URL
export const SEOUL_GEOJSON_URL = 'https://raw.githubusercontent.com/southkorea/seoul-maps/master/kostat/2013/json/seoul_municipalities_geo_simple.json';

// 맵 이동 제한 영역 (경계)
export const BOUNDS = {
  MIN_LNG: 126.75, 
  MAX_LNG: 127.20, 
  MIN_LAT: 37.42, 
  MAX_LAT: 37.70
};

// 줌 레벨 설정
export const ZOOM_CONFIG = {
  INITIAL: 10.7,
  MIN: 10.7,
  MAX: 15
};

// 교통 상태 점수 (나중에 로직 수정 시 활용)
export const TRAFFIC_SCORES = {
  CONGESTED: 4,  // 정체
  SLOW: 2.5,     // 서행
  SMOOTH: 1      // 원활
} as const;