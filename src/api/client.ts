import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// 1. Axios 인스턴스 생성
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, 
});

// 2. 요청 인터셉터 (Request Interceptor)
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 세션 인증은 브라우저가 자동으로 쿠키를 전송하므로 
    // Authorization 헤더를 수동으로 주입할 필요가 없습니다.
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// 3. 응답 인터셉터 (Response Interceptor)
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status } = error.response;
      
      switch (status) {
        case 401:
          console.error('Unauthorized: 세션이 만료되었거나 인증되지 않은 사용자입니다.');
          break;
        case 403:
          console.error('Forbidden: 접근 권한이 없습니다.');
          break;
        case 500:
          console.error('Internal Server Error: 서버 내부에서 오류가 발생했습니다.');
          break;
        default:
          console.error(`Error ${status}: API 호출 중 문제가 발생했습니다.`);
      }
    } else if (error.request) {
      console.error('네트워크 오류: 서버로부터 응답을 받지 못했습니다.');
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;