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
  const [step, setStep] = useState(1); // 단계별 회원가입
  const [showSchoolSearch, setShowSchoolSearch] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 에러 클리어
    if (error) setError(null);
  };

  const validateStep1 = () => {
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

  const validateStep2 = () => {
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
    }
  };

  const handlePrevStep = () => {
    setStep(1);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
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
            <div className="text-3xl font-bold text-blue-600 mb-2">📚 WiseOn School</div>
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
            <div className="flex items-center space-x-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                1
              </div>
              <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                2
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>기본 정보</span>
            <span>상세 정보</span>
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

              <button
                type="button"
                onClick={handleNextStep}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
          <p>회원가입 시 개인정보 수집 및 이용에 동의하는 것으로 간주됩니다.</p>
          <p className="text-orange-600 font-medium">⚠️ 관리자 승인 후 로그인이 가능합니다.</p>
          <p>승인 상태는 이메일로 안내드립니다.</p>
        </div>
      </div>

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
