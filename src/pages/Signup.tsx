import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkEmail, signup } from '../api/authApi';
import './Signup.css';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    passwordConfirm: ''
  });

  // 에러 메시지 상태 관리
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    passwordConfirm: ''
  });

  const [isEmailChecked, setIsEmailChecked] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'email') {
      setIsEmailChecked(false);
    }

  };

  // 포커스가 벗어날 때(onBlur) 유효성 검사 실행
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let errorMsg = '';

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!value) errorMsg = '이메일을 입력해주세요.';
      else if (!emailRegex.test(value)) errorMsg = '유효한 이메일 형식이 아닙니다.';
    } 
    else if (name === 'password') {
      // 영문, 숫자 포함 6자리 이상 15자리 이하 정규식
      const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,15}$/;
      if (!value) errorMsg = '비밀번호를 입력해주세요.';
      else if (!passwordRegex.test(value)) errorMsg = '영문과 숫자를 포함하여 6~15자리로 입력해주세요.';
      
      // 비밀번호가 변경되었을 때, 확인란이 이미 있다면 일치 여부 재검사
      if (formData.passwordConfirm) {
        setErrors(prev => ({
          ...prev,
          passwordConfirm: value === formData.passwordConfirm ? '' : '비밀번호가 일치하지 않습니다.'
        }));
      }
    } 
    else if (name === 'passwordConfirm') {
      if (!value) errorMsg = '비밀번호를 다시 입력해주세요.';
      else if (value !== formData.password) errorMsg = '비밀번호가 일치하지 않습니다.';
    }

    setErrors(prev => ({ ...prev, [name]: errorMsg }));
  };

  const handleDuplicateCheck = async () => {
    if (!formData.email) {
      alert('이메일을 먼저 입력해주세요.');
      return;
    }
    if (errors.email) {
      alert('유효한 이메일 형식을 입력해주세요.');
      return;
    }
    console.log('중복 확인 요청 이메일:', formData.email);
    
    try {
      await checkEmail(formData.email);
      
      alert('사용 가능한 이메일입니다.');
      
      setIsEmailChecked(true);
      
    } catch (error) {
      // 백엔드에서 중복된 이메일로 판단하여 에러(예: 409 Conflict)를 반환했을 때 실행
      alert('이미 사용 중인 이메일입니다.');
      console.error('이메일 중복 확인 에러:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // 제출 시 전체 에러 체크
    if (errors.email || errors.password || errors.passwordConfirm) {
      alert('입력 양식을 다시 확인해주세요.');
      return;
    }

    if(!isEmailChecked){
      alert('이메일 중복확인을 해주세요');
      return;
    }
    
    console.log('회원가입 요청 데이터:', formData);

    try{
      await signup(formData.email, formData.password, formData.name);
      
      alert('회원가입이 완료되었습니다.');
      
      navigate('/')

    } catch(error){
      alert(error);
    }

  };

  return (
    <main className="signup-container">
      <section className="signup-card">
        <header className="signup-header">
          <img src="/logo.png" alt="UrbanFlowSeoul Logo" className="signup-logo" />
          <h2>회원가입</h2>
          <p>UrbanFlowSeoul의 서비스를 위해 정보를 입력해주세요.</p>
        </header>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="input-group">
            {/* Label과 에러 메시지를 나란히 배치 */}
            <div className="label-error-wrapper">
              <label htmlFor="email">이메일</label>
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="email-input-wrapper">
              <input 
                type="email" 
                id="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                onBlur={handleBlur}
                placeholder="email@example.com"
                required 
              />
              <button 
                type="button" 
                className="duplicate-check-btn" 
                onClick={handleDuplicateCheck}
              >
                중복확인
              </button>
            </div>
          </div>
          
          <div className="input-group">
            <div className="label-error-wrapper">
              <label htmlFor="name">이름</label>
            </div>
            <input 
              type="text" 
              id="name" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              placeholder="홍길동"
              required 
            />
          </div>

          <div className="input-group">
            <div className="label-error-wrapper">
              <label htmlFor="password">비밀번호</label>
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            <input 
              type="password" 
              id="password" 
              name="password" 
              value={formData.password} 
              onChange={handleChange} 
              onBlur={handleBlur}
              placeholder="영문, 숫자 포함 6~15자리"
              maxLength={15}
              required 
            />
          </div>

          <div className="input-group">
            <div className="label-error-wrapper">
              <label htmlFor="passwordConfirm">비밀번호 확인</label>
              {errors.passwordConfirm && <span className="error-text">{errors.passwordConfirm}</span>}
            </div>
            <input 
              type="password" 
              id="passwordConfirm" 
              name="passwordConfirm" 
              value={formData.passwordConfirm} 
              onChange={handleChange} 
              onBlur={handleBlur}
              placeholder="비밀번호를 다시 입력하세요"
              maxLength={15}
              required 
            />
          </div>
          
          <button type="submit" className="signup-submit-btn">가입하기</button>
        </form>

        <footer className="signup-footer">
          <span>이미 계정이 있으신가요?</span>
          <button 
            type="button" 
            className="link-btn" 
            onClick={() => navigate('/')} 
          >
            메인화면으로 이동
          </button>
        </footer>
      </section>
    </main>
  );
};