import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { hashPassword } from '../utils/password';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
    role: 'homeroom_teacher', // 기본값
    schoolCode: '',
    gradeLevel: '',
    classNumber: '',
    department: '',
    phone: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 단계별 회원가입 (1: 약관동의, 2: 기본정보, 3: 상세정보)
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState<'service' | 'privacy' | 'third_party' | null>(null);
  const [agreements, setAgreements] = useState({
    serviceTerms: false,
    privacyPolicy: false,
    thirdParty: false,
    allAgreed: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 클리어
    if (error) setError(null);
  };

  const handleAgreementChange = (name: keyof typeof agreements) => {
    if (name === 'allAgreed') {
      const newValue = !agreements.allAgreed;
      setAgreements({
        serviceTerms: newValue,
        privacyPolicy: newValue,
        thirdParty: newValue,
        allAgreed: newValue
      });
    } else {
      const newAgreements = {
        ...agreements,
        [name]: !agreements[name]
      };
      // 필수 약관이 모두 체크되었는지 확인
      newAgreements.allAgreed = newAgreements.serviceTerms && newAgreements.privacyPolicy;
      setAgreements(newAgreements);
    }
    if (error) setError(null);
  };

  const validateStep1 = () => {
    if (!agreements.serviceTerms) {
      setError('서비스 이용약관에 동의해주세요.');
      return false;
    }
    if (!agreements.privacyPolicy) {
      setError('개인정보 수집 및 이용에 동의해주세요.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.name.trim()) {
      setError('이름을 입력해주세요.');
      return false;
    }
    if (!formData.email.trim()) {
      setError('이메일을 입력해주세요.');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return false;
    }
    if (!formData.employeeId.trim()) {
      setError('교직원 번호를 입력해주세요.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.password) {
      setError('비밀번호를 입력해주세요.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    if (!formData.schoolCode.trim()) {
      setError('학교 코드를 입력해주세요.');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setError(null);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setError(null);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep3()) return;
    
    setLoading(true);
    setError(null);

    try {
      // 1. 학교 코드로 학교 정보 조회
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .select('id, district_id')
        .eq('code', formData.schoolCode)
        .single();

      if (schoolError || !schoolData) {
        throw new Error('유효하지 않은 학교 코드입니다. 학교 코드를 확인해주세요.');
      }

      // 2. 이메일 중복 확인
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email)
        .single();

      if (existingUser) {
        throw new Error('이미 등록된 이메일입니다.');
      }

      // 3. 교직원 번호 중복 확인
      const { data: existingEmployee, error: empCheckError } = await supabase
        .from('users')
        .select('employee_id')
        .eq('employee_id', formData.employeeId)
        .single();

      if (existingEmployee) {
        throw new Error('이미 등록된 교직원 번호입니다.');
      }

      // 4. 권한 설정
      const getPermissions = (role: string): string[] => {
        const basePermissions = ['read_students', 'read_surveys', 'read_analysis'];
        
        switch (role) {
          case 'school_admin':
            return [...basePermissions, 'write_students', 'write_surveys', 'write_memos', 'manage_school', 'manage_users', 'view_reports'];
          case 'grade_teacher':
            return [...basePermissions, 'write_students', 'write_surveys', 'write_memos', 'manage_grade'];
          case 'homeroom_teacher':
            return [...basePermissions, 'write_students', 'write_surveys', 'write_memos'];
          case 'district_admin':
            return [...basePermissions, 'write_students', 'write_surveys', 'write_memos', 'manage_school', 'manage_users', 'view_reports', 'manage_district'];
          default:
            return basePermissions;
        }
      };

      // 5. 패스워드 해시화
      const hashedPassword = await hashPassword(formData.password);

      // 6. 새 사용자 데이터 생성
      const newUser = {
        school_id: schoolData.id,
        district_id: schoolData.district_id,
        employee_id: formData.employeeId,
        name: formData.name,
        email: formData.email,
        password_hash: hashedPassword, // bcrypt로 해시화된 패스워드
        role: formData.role,
        permissions: getPermissions(formData.role),
        grade_level: formData.gradeLevel || null,
        class_number: formData.classNumber || null,
        department: formData.department || null,
        contact_info: {
          phone: formData.phone,
          email: formData.email
        },
        is_active: false
      };

      // 디버깅: 실제 전송되는 데이터 확인
      console.log('🔍 전송되는 사용자 데이터:', newUser);
      console.log('🔍 Role 값:', formData.role);

      // 7. Supabase에 사용자 등록
      const { data: userData, error: insertError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (insertError) {
        console.error('User insert error:', insertError);
        throw new Error('사용자 등록에 실패했습니다. 관리자에게 문의하세요.');
      }

      // 8. 성공 메시지 및 로그인 페이지로 이동
      alert('회원가입이 완료되었습니다!\n관리자 승인 후 로그인이 가능합니다.\n승인 상태는 이메일로 안내드립니다.');
      navigate('/login');
      
    } catch (error: any) {
      console.error('Signup failed:', error);
      setError(error.message || '회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/login" className="flex justify-center">
            <div className="h-fit w-fit self-start">
              <img src="/logo_school.png" alt="WiseOn School Logo" />
            </div>
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            교직원 회원가입
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            교우관계 분석 시스템에 오신 것을 환영합니다
          </p>
          
          {/* 회원가입 안내 */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">회원가입 전 준비사항</p>
                <ul className="space-y-1 text-xs">
                  <li>• 교직원 번호 (인사담당자 또는 관리자에게 문의)</li>
                  <li>• 학교 코드 (NEIS 시스템 또는 교무실에서 확인)</li>
                  <li>• 학교에서 사용하는 이메일 주소</li>
                  <li>• 담당 학년/반 정보 (해당되는 경우)</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* 진행 상태 표시 */}
          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
              <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500 px-4">
            <span>약관동의</span>
            <span>기본정보</span>
            <span>상세정보</span>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">이용약관 동의</h3>
              
              {/* 전체 동의 */}
              <div className="p-4 border-2 border-blue-600 rounded-lg bg-blue-50">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreements.allAgreed}
                    onChange={() => handleAgreementChange('allAgreed')}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-3 text-base font-semibold text-gray-900">
                    전체 약관에 동의합니다
                  </span>
                </label>
              </div>

              {/* 개별 약관 */}
              <div className="space-y-3 pl-2">
                {/* 서비스 이용약관 (필수) */}
                <div className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={agreements.serviceTerms}
                        onChange={() => handleAgreementChange('serviceTerms')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        [필수] 서비스 이용약관
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal('service')}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      전문보기
                    </button>
                  </div>
                </div>

                {/* 개인정보 수집 및 이용 동의 (필수) */}
                <div className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={agreements.privacyPolicy}
                        onChange={() => handleAgreementChange('privacyPolicy')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-900">
                        [필수] 개인정보 수집 및 이용 동의
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal('privacy')}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      전문보기
                    </button>
                  </div>
                </div>

                {/* 제3자 제공 동의 (선택) */}
                <div className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={agreements.thirdParty}
                        onChange={() => handleAgreementChange('thirdParty')}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        [선택] 개인정보 제3자 제공 동의
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal('third_party')}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      전문보기
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs text-gray-600">
                  • 필수 항목에 동의하지 않으실 경우, 서비스 이용이 제한될 수 있습니다.<br />
                  • 선택 항목은 동의하지 않아도 서비스를 이용하실 수 있습니다.
                </p>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                disabled={!agreements.serviceTerms || !agreements.privacyPolicy}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음 단계
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="성명을 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="example@school.edu"
                />
              </div>

              <div>
                <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
                  교직원 번호 *
                  <span className="ml-2 text-xs text-gray-500">
                    💡 학교에서 발급받은 고유번호
                  </span>
                </label>
                <input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  required
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="예: T202400123, EMP-2024-001"
                />
                <p className="mt-1 text-xs text-gray-500">
                  • 인사담당자나 관리자에게 문의하세요<br />
                  • 보통 'T' + 연도 + 순번 또는 'EMP-' + 연도 + 순번 형식
                </p>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  직책 *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                >
                  <option value="homeroom_teacher">담임교사</option>
                  <option value="grade_teacher">학년부장</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="mr-2 w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  이전
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  다음 단계
                  <svg className="ml-2 w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 *
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="8자 이상 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  비밀번호 확인 *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="schoolCode" className="block text-sm font-medium text-gray-700 mb-1">
                  학교 코드 *
                  <span className="ml-2 text-xs text-gray-500">
                    🏫 교육청에서 부여한 학교 고유코드
                  </span>
                </label>
                <input
                  id="schoolCode"
                  name="schoolCode"
                  type="text"
                  required
                  value={formData.schoolCode}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="예: B100000123, 7530120, SEOUL-E-001"
                />
                <p className="mt-1 text-xs text-gray-500">
                  • NEIS 시스템의 학교코드 또는 교육청 부여 코드<br />
                  • 행정실이나 교무실에서 확인 가능<br />
                  • 모르시면 <button type="button" onClick={() => setShowSchoolSearch(true)} className="text-blue-600 hover:text-blue-700 underline">여기</button>에서 검색하세요
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700 mb-1">
                    담당 학년
                  </label>
                  <input
                    id="gradeLevel"
                    name="gradeLevel"
                    type="text"
                    value={formData.gradeLevel}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                    placeholder="예: 3"
                  />
                </div>

                <div>
                  <label htmlFor="classNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    담당 반
                  </label>
                  <input
                    id="classNumber"
                    name="classNumber"
                    type="text"
                    value={formData.classNumber}
                    onChange={handleInputChange}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                    placeholder="예: 1"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                  부서/교과
                </label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="예: 국어과, 학생부"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  연락처
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10"
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="mr-2 w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  이전
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      가입 중...
                    </div>
                  ) : (
                    '회원가입 완료'
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="text-center">
            <span className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                로그인
              </Link>
            </span>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          <p className="text-orange-600 font-medium">⚠️ 관리자 승인 후 로그인이 가능합니다.</p>
          <p>승인 상태는 이메일로 안내드립니다.</p>
        </div>
      </div>

      {/* 약관 모달 */}
      {showTermsModal && (
        <TermsModal 
          type={showTermsModal}
          onClose={() => setShowTermsModal(null)}
        />
      )}

      {/* 학교 검색 모달 */}
      {showSchoolSearch && (
        <SchoolSearchModal 
          onClose={() => setShowSchoolSearch(false)}
          onSelectSchool={(schoolCode: string) => {
            setFormData(prev => ({ ...prev, schoolCode }));
            setShowSchoolSearch(false);
          }}
        />
      )}
    </div>
  );
};

// 약관 모달 컴포넌트
const TermsModal: React.FC<{
  type: 'service' | 'privacy' | 'third_party';
  onClose: () => void;
}> = ({ type, onClose }) => {
  const getTitle = () => {
    switch (type) {
      case 'service': return '서비스 이용약관';
      case 'privacy': return '개인정보 수집 및 이용 동의';
      case 'third_party': return '개인정보 제3자 제공 동의';
    }
  };

  const getContent = () => {
    switch (type) {
      case 'service':
        return `
제1조 (목적)
본 약관은 (주)와이즈인컴퍼니(이하 "회사")가 제공하는 WiseOn School 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (용어의 정의)
1. "서비스"란 구현되는 단말기(PC, TV, 휴대형 단말기 등의 각종 유무선 장치를 포함)와 상관없이 "이용자"가 이용할 수 있는 교우관계 분석 관련 제반 서비스를 의미합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
3. "회원"이라 함은 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며, 회사가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.

제3조 (약관의 게시와 개정)
1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.
3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 업무를 수행합니다.
   - 교우관계 분석 서비스 제공
   - 설문 조사 관리 및 분석
   - 학생 관리 및 모니터링 서비스
   - 기타 회사가 정하는 업무

제5조 (서비스의 중단)
1. 회사는 컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.

제6조 (회원가입)
1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.
2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
   - 가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우
   - 등록 내용에 허위, 기재누락, 오기가 있는 경우

제7조 (회원 탈퇴 및 자격 상실 등)
1. 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.
2. 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.
   - 가입 신청 시에 허위 내용을 등록한 경우
   - 다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자상거래 질서를 위협하는 경우
   - 서비스를 이용하여 법령 또는 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우

제8조 (회원에 대한 통지)
1. 회사가 회원에 대한 통지를 하는 경우, 회원이 회사와 미리 약정하여 지정한 전자우편 주소로 할 수 있습니다.

제9조 (개인정보보호)
1. 회사는 이용자의 정보 수집 시 구매계약 이행에 필요한 최소한의 정보를 수집합니다.
2. 회사는 관련 법령이 정하는 바에 따라서 이용자 등록정보를 포함한 이용자의 개인정보를 보호하기 위해 노력합니다.

제10조 (책임제한)
1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
        `;
      case 'privacy':
        return `
개인정보 수집 및 이용 동의

(주)와이즈인컴퍼니(이하 "회사")는 개인정보 보호법에 따라 이용자의 개인정보 보호 및 권익을 보호하고 개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.

1. 개인정보의 수집 및 이용 목적
회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.
   - 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산
   - 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인 식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달
   - 교우관계 분석 서비스 제공
   - 설문 조사 및 통계 분석
   - 신규 서비스 개발 및 마케팅·광고에의 활용

2. 수집하는 개인정보 항목
회사는 회원가입, 원활한 고객상담, 각종 서비스의 제공을 위해 최초 회원가입 당시 아래와 같은 개인정보를 수집하고 있습니다.

[필수 수집 항목]
   - 이름, 이메일 주소, 교직원 번호, 비밀번호
   - 학교 정보, 직책, 담당 학년/반

[선택 수집 항목]
   - 부서/교과, 연락처

3. 개인정보의 보유 및 이용기간
원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.

   - 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
   - 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
   - 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)
   - 본인확인에 관한 기록: 6개월 (정보통신망 이용촉진 및 정보보호 등에 관한 법률)
   - 방문에 관한 기록: 3개월 (통신비밀보호법)

4. 개인정보의 파기절차 및 방법
회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.

[파기절차]
   - 회원님이 회원가입 등을 위해 입력하신 정보는 목적이 달성된 후 별도의 DB로 옮겨져(종이의 경우 별도의 서류함) 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라(보유 및 이용기간 참조) 일정 기간 저장된 후 파기되어집니다.

[파기방법]
   - 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.
   - 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.

5. 이용자 및 법정대리인의 권리와 그 행사방법
   - 이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다.
   - 이용자의 개인정보 조회, 수정을 위해서는 '개인정보변경'(또는 '회원정보수정' 등)을, 가입해지(동의철회)를 위해서는 "회원탈퇴"를 클릭하여 본인 확인 절차를 거치신 후 직접 열람, 정정 또는 탈퇴가 가능합니다.

6. 개인정보 보호책임자
회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

[개인정보 보호책임자]
   - 이름: 김진성
   - 이메일: jinseong-kim@wiseinc.co.kr
        `;
      case 'third_party':
        return `
개인정보 제3자 제공 동의

(주)와이즈인컴퍼니(이하 "회사")는 이용자의 개인정보를 "개인정보 수집 및 이용 동의"에서 고지한 범위 내에서 사용하며, 이용자의 사전 동의 없이는 동 범위를 초과하여 이용하거나 원칙적으로 이용자의 개인정보를 외부에 공개하지 않습니다. 

다만, 아래의 경우에는 예외로 합니다.

1. 개인정보를 제공받는 자
   - 교육청 및 교육부
   - 학교 행정 시스템 (NEIS 등)
   - 교육 통계 기관

2. 제공하는 개인정보 항목
   - 이름, 소속 학교, 직책
   - 교우관계 분석 결과 데이터 (통계 처리된 데이터)

3. 개인정보를 제공받는 자의 이용 목적
   - 교육 정책 수립 및 개선
   - 학교 교육 환경 개선
   - 교육 통계 작성 및 연구
   - 학생 지도 및 상담 자료

4. 개인정보를 제공받는 자의 보유 및 이용기간
   - 제공 목적 달성 시까지
   - 관련 법령에 따른 보존 기간

5. 동의를 거부할 권리 및 동의 거부에 따른 불이익
   - 이용자는 개인정보의 제3자 제공에 대한 동의를 거부할 수 있습니다.
   - 다만, 동의를 거부할 경우 일부 서비스 이용이 제한될 수 있습니다.
   - 이 항목은 선택사항이며, 동의하지 않으셔도 기본 서비스 이용은 가능합니다.

본 동의는 회원가입 시점부터 효력이 발생하며, 회원 탈퇴 또는 동의 철회 시까지 유효합니다.
        `;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">{getTitle()}</h3>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
            {getContent()}
          </pre>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

// 학교 검색 모달 컴포넌트
const SchoolSearchModal: React.FC<{
  onClose: () => void;
  onSelectSchool: (schoolCode: string) => void;
}> = ({ onClose, onSelectSchool }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 컴포넌트 마운트 시 학교 데이터 로드
  React.useEffect(() => {
    const loadSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('code, name, address')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setSchools(data || []);
      } catch (error) {
        console.error('학교 데이터 로드 실패:', error);
        // 오류 시 샘플 데이터 사용
        setSchools([
          { code: 'SL001001', name: '서울중앙초등학교', address: '서울특별시 중구 명동길 123' },
          { code: 'SL001002', name: '서울중앙중학교', address: '서울특별시 중구 명동길 456' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadSchools();
  }, []);

  const filteredSchools = schools.filter(school => 
    (school.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (school.address?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (school.code?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">학교 검색</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="학교명, 지역, 또는 코드로 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">학교 정보를 불러오는 중...</span>
              </div>
            ) : filteredSchools.length > 0 ? (
              <div className="space-y-2">
                {filteredSchools.map((school) => (
                  <div
                    key={school.code}
                    onClick={() => onSelectSchool(school.code)}
                    className="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{school.name || '학교명 없음'}</h4>
                        <p className="text-sm text-gray-600">{school.address || '주소 정보 없음'}</p>
                      </div>
                      <span className="text-sm font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {school.code || '코드 없음'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>검색 결과가 없습니다.</p>
                <p className="text-sm mt-1">다른 검색어를 시도해보세요.</p>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-yellow-700">
                <p className="font-medium">찾으시는 학교가 없나요?</p>
                <p>• 정확한 학교명으로 다시 검색해보세요</p>
                <p>• 행정실(교무실)에 문의하여 정확한 학교코드를 확인하세요</p>
                <p>• 문의하기를 통해 도움을 요청하실 수 있습니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
