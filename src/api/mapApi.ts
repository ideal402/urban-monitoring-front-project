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