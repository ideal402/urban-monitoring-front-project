/**
 * 두 좌표(위도, 경도) 간의 거리를 계산합니다 (Haversine 공식).
 * @param lat1 출발지 위도
 * @param lon1 출발지 경도
 * @param lat2 도착지 위도
 * @param lon2 도착지 경도
 * @returns 두 지점 사이의 거리 (단위: km)
 */
export const getHaversineDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // 지구의 반지름 (km)
  const toRad = (value: number) => value * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
};