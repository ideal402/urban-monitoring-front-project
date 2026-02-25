import apiClient from './client';

/**
 * 현재 지도 데이터를 가져오는 API 호출 함수
 * @returns Promise<any> API 응답 데이터
 */
export const getCurrentMapData = async () => {
  // Postman에서 테스트하신 실제 엔드포인트 URL을 입력합니다.
  const response = await apiClient.get('/map/current');
  return response.data;
};

export const getRoadTrafficData = async (h3Indices: string[]) => {
  try {
    const response = await apiClient.post('/map/roads/traffic', h3Indices);
    
    return response.data;
  } catch (error) {
    console.error("도로 트래픽 데이터 호출 실패:", error);
    return [];
  }
};