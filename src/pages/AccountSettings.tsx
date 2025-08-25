import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validatePassword = (password: string) => {
    // 최소 8자, 영문/숫자/특수문자 조합
    const minLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasLetter && hasNumber && hasSpecial;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 입력 검증
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('새 비밀번호와 확인 비밀번호가 일치하지 않습니다.');
      }

      if (!validatePassword(passwordData.newPassword)) {
        throw new Error('새 비밀번호는 최소 8자 이상이며, 영문/숫자/특수문자를 포함해야 합니다.');
      }

      if (!user?.id) {
        throw new Error('사용자 정보를 찾을 수 없습니다.');
      }

      // 현재 비밀번호 확인 (임시로 하드코딩된 비밀번호 사용)
      // TODO: 실제 비밀번호 해시 시스템 구현 필요
      const currentPassword = '1q2w3e4r'; // 임시 하드코딩
      
      if (passwordData.currentPassword !== currentPassword) {
        throw new Error('현재 비밀번호가 올바르지 않습니다.');
      }

      // 새 비밀번호 해시화
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(passwordData.newPassword, saltRounds);

      // 비밀번호 업데이트 (임시로 contact_info에 저장)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          contact_info: { password_hash: newPasswordHash },
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setMessage({
        type: 'success',
        text: '비밀번호가 성공적으로 변경되었습니다!'
      });

      // 폼 초기화
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error);
      setMessage({
        type: 'error',
        text: error.message || '비밀번호 변경에 실패했습니다. 다시 시도해주세요.'
      });
    } finally {
      setLoading(false);
    }
  };



  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">로그인이 필요합니다.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            뒤로 가기
          </button>
          <h1 className="text-3xl font-bold text-gray-900">계정 설정</h1>
          <p className="mt-2 text-gray-600">계정 보안과 관련된 설정을 관리하세요.</p>
        </div>

        {/* 메시지 표시 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* 비밀번호 변경 */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">비밀번호 변경</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {/* 현재 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  현재 비밀번호 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.current ? 'text' : 'password'}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="현재 비밀번호를 입력하세요"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('current')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword.current ? (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 새 비밀번호 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.new ? 'text' : 'password'}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="새 비밀번호를 입력하세요"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('new')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword.new ? (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  최소 8자 이상, 영문/숫자/특수문자 조합
                </p>
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인 *
                </label>
                <div className="relative">
                  <input
                    type={showPassword.confirm ? 'text' : 'password'}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="새 비밀번호를 다시 입력하세요"
                    />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('confirm')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword.confirm ? (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* 버튼 */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '변경 중...' : '비밀번호 변경'}
                </button>
              </div>
            </form>
          </div>
        </div>


      </div>
    </div>
  );
};

export default AccountSettings;
