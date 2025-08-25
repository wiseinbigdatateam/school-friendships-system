import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // 이미 로그인된 경우 대시보드로 리다이렉트
  React.useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, location]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 입력 시 에러 메시지 초기화
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 간단한 유효성 검사
      if (!formData.email || !formData.password) {
        throw new Error('이메일과 비밀번호를 모두 입력해주세요.');
      }

      // AuthContext의 login 함수 사용
      await login(formData.email, formData.password);
      
      // 로그인 성공 시 원래 가려던 페이지 또는 대시보드로 이동
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (error) {
      setError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLanding = () => {
    navigate('/');
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'test@school.com',
      password: 'pass1234'
    });
  };
  const handleDemoHeadLogin = () => {
    setFormData({
      email: 'test_head@school.com',
      password: 'pass1234'
    });
  };const handleDemoAdminLogin = () => {
    setFormData({
      email: 'test_admin@school.com',
      password: 'pass1234'
    });
  };
  const handleDemoDistrictLogin = () => {
    setFormData({
      email: 'test_district@school.com',
      password: 'pass1234'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <button
            onClick={handleBackToLanding}
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>홈으로 돌아가기</span>
          </button>
          
          <div className="flex justify-center mb-0">
            <div className="w-48 h-48 flex items-center justify-center">
              <img src="/logo_school.png" alt="WiseOn School Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-2 -mt-16">로그인</h2>
          <p className="text-gray-600">학생 교우관계 분석 시스템에 로그인하세요</p>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-8">
          {/* 데모 계정 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">데모 계정 정보</h4>
                <p className="text-sm text-blue-700 mb-2">
                  다음 계정을 클릭해서 시스템을 체험해보세요 <br/>(비밀번호: <strong>pass1234</strong>)
                </p>
                <div className="text-xs text-blue-800 space-y-1 mb-3">
                  <div className="bg-blue-100 rounded px-2 py-1">
                    <strong>📧 <button onClick={handleDemoLogin} className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                      test@school.com</button></strong> - (담임교사)
                  </div>
                  <div className="bg-blue-100 rounded px-2 py-1">
                    <strong>📧 <button onClick={handleDemoHeadLogin} className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                    test_head@school.com</button></strong> - (학년부장)
                  </div>
                  <div className="bg-blue-100 rounded px-2 py-1">
                    <strong>📧 <button onClick={handleDemoAdminLogin} className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                    test_admin@school.com</button></strong> - (학교관리자)
                  </div>
                  <div className="bg-blue-100 rounded px-2 py-1">
                    <strong>📧 <button onClick={handleDemoDistrictLogin} className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                    test_district@school.com</button></strong> - (교육청관리자)
                  </div>
                </div>
                            <div className="text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 mb-3">
              💡 <strong>실제 bcrypt 암호화된 패스워드로 로그인됩니다!</strong><br/>
              • 모든 데모 계정: pass1234<br/>
              • 회원가입 계정: 가입 시 설정한 비밀번호
            </div>
                </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 입력 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일 주소
              </label>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="이메일을 입력하세요"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-10"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 5.636L16.95 7.05M7.05 16.95L5.636 18.364" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  로그인 중...
                </>
              ) : (
                '로그인'
              )}
            </button>

            {/* 추가 옵션 */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-gray-600">로그인 상태 유지</span>
              </label>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                비밀번호 찾기
              </button>
            </div>
          </form>

          {/* 구분선 */}
          <div className="mt-8 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">또는</span>
              </div>
            </div>
          </div>

          {/* 소셜 로그인 (향후 구현 예정) */}
          <div className="space-y-3">
            <button
              type="button"
              disabled
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인 (준비 중)
            </button>
            
            <button
              type="button"
              disabled
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook으로 로그인 (준비 중)
            </button>
          </div>

          {/* 회원가입 링크 */}
          <div className="mt-8 text-center space-y-3">
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                회원가입
              </Link>
            </p>
            <p className="text-sm text-gray-600">
              문의사항이 있으신가요?{' '}
              <Link to="/contact" className="text-blue-600 hover:text-blue-700 font-medium">
                문의하기
              </Link>
            </p>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="mt-8 text-center text-sm text-gray-500 space-y-2">
          <p>
            로그인하시면{' '}
            <button className="text-blue-600 hover:text-blue-700 underline">이용약관</button>
            {' '}및{' '}
            <button className="text-blue-600 hover:text-blue-700 underline">개인정보처리방침</button>
            에 동의하는 것으로 간주됩니다.
          </p>
          <p className="text-xs">
            시스템 도입 문의:{' '}
            <Link to="/contact" className="text-blue-600 hover:text-blue-700 underline">
              고객지원센터
            </Link>
            {' | '}
            전화: 1588-0000
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
