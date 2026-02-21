import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import './LoginModal.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // 1. 입력 폼 상태 관리
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // 페이지 새로고침 방지
    setIsLoading(true);

    try {
      // 백엔드 signin 엔드포인트로 데이터 전송
      await apiClient.post('/auth/signin', {
        email: formData.email,
        password: formData.password
      });

      alert('로그인에 성공했습니다.');
      
      login(); 
      
      onClose();
      setFormData({ email: '', password: '' });
      
    } catch (error: any) {
      const message = error.response?.data?.message || '이메일 또는 비밀번호를 확인해주세요.';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        <div className="modal-header">
          <img src="/logo.png" alt="Logo" className="modal-logo" />
          <h3>UrbanFlowSeoul</h3>
          <p>서울의 실시간 흐름을 확인해보세요</p>
        </div>

        {/* 4. form 태그로 감싸서 제출 이벤트 연결 */}
        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="login-email">이메일</label>
            <input 
              id="login-email"
              name="email"
              type="email" 
              placeholder="email@example.com" 
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="login-password">비밀번호</label>
            <input 
              id="login-password"
              name="password"
              type="password" 
              placeholder="비밀번호를 입력하세요" 
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="modal-footer">
          <span>
            계정이 없으신가요? 
            {/* 5. <a> 태그 대신 navigate를 사용하여 SPA 라우팅 유지 */}
            <button 
              className="link-btn-simple" 
              onClick={() => { onClose(); navigate('/signup'); }}
            >
              회원가입
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};