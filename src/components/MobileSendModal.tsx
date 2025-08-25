import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SurveyWithStats } from '../services/surveyService';

interface MobileSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  survey: SurveyWithStats | null;
  onSend: (sendOptions: any) => void;
}

const MobileSendModal: React.FC<MobileSendModalProps> = ({
  isOpen,
  onClose,
  survey,
  onSend
}) => {
  const [sendOptions, setSendOptions] = useState({
    method: 'kakao',
    includeQR: true,
    customMessage: ''
  });
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [targetStudents, setTargetStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && survey) {
      loadTeacherAndStudentInfo();
    }
  }, [isOpen, survey]);

  const loadTeacherAndStudentInfo = async () => {
    try {
      setIsLoading(true);
      
      // 현재 로그인한 사용자 정보 가져오기
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 사용자 상세 정보 가져오기
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        setTeacherInfo(userData);
        
        // 담임교사인 경우 해당 반 학생 정보 가져오기
        if (userData.role === 'homeroom_teacher' && userData.school_id && userData.grade_level && userData.class_number) {
          const { data: students, count } = await supabase
            .from('students')
            .select('id, name, grade, class, student_number, gender, is_active')
            .eq('current_school_id', userData.school_id)
            .eq('grade', userData.grade_level)
            .eq('class', userData.class_number)
            .eq('is_active', true)
            .order('name');
          
          setStudentCount(count || 0);
          setTargetStudents(students || []);
        } else if (userData.role === 'grade_teacher' && userData.school_id && userData.grade_level) {
          // 학년부장인 경우 해당 학년 전체 학생 정보 가져오기
          const { data: students, count } = await supabase
            .from('students')
            .select('id, name, grade, class, student_number, gender, is_active')
            .eq('current_school_id', userData.school_id)
            .eq('grade', userData.grade_level)
            .eq('is_active', true)
            .order('class')
            .order('name');
          
          setStudentCount(count || 0);
          setTargetStudents(students || []);
        } else if (userData.role === 'school_admin' && userData.school_id) {
          // 학교관리자인 경우 해당 학교 전체 학생 정보 가져오기
          const { data: students, count } = await supabase
            .from('students')
            .select('id, name, grade, class, student_number, gender, is_active')
            .eq('current_school_id', userData.school_id)
            .eq('is_active', true)
            .order('grade')
            .order('class')
            .order('name');
          
          setStudentCount(count || 0);
          setTargetStudents(students || []);
        }
      }
    } catch (error) {
      console.error('Error loading teacher and student info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!survey) return;
    
    onSend({
      survey,
      ...sendOptions
    });
    onClose();
  };

  if (!isOpen || !survey) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">모바일 설문 발송</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          {/* 설문 정보 */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">📊 설문 정보</h4>
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium text-gray-700">제목:</span>
                <p className="text-sm text-gray-900">{survey.title}</p>
              </div>
              {survey.description && (
                <div>
                  <span className="text-sm font-medium text-gray-700">설명:</span>
                  <p className="text-sm text-gray-600">{survey.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">상태:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                    survey.status === 'active' ? 'bg-green-100 text-green-800' :
                    survey.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    survey.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {survey.status === 'active' ? '진행중' :
                     survey.status === 'draft' ? '초안' :
                     survey.status === 'completed' ? '완료' : survey.status}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">응답률:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {survey.responseRate ? `${survey.responseRate}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 대상 정보 */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📋 설문 대상 정보</h4>
            
            {/* 담임교사인 경우 */}
            {teacherInfo?.role === 'homeroom_teacher' && (
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>대상:</strong> {teacherInfo?.grade_level || 'N/A'}학년 {teacherInfo?.class_number || 'N/A'}반
                </p>
                <p className="text-sm text-blue-800">
                  <strong>예상 수신자:</strong> {studentCount}명
                </p>
                <p className="text-sm text-blue-700">
                  <strong>설문 범위:</strong> 담당 반 전체 학생
                </p>
              </div>
            )}
            
            {/* 학년부장인 경우 */}
            {teacherInfo?.role === 'grade_teacher' && (
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>대상:</strong> {teacherInfo?.grade_level || 'N/A'}학년 전체
                </p>
                <p className="text-sm text-blue-800">
                  <strong>예상 수신자:</strong> {studentCount}명
                </p>
                <p className="text-sm text-blue-700">
                  <strong>설문 범위:</strong> 해당 학년 전체 학생
                </p>
              </div>
            )}
            
            {/* 학교관리자인 경우 */}
            {teacherInfo?.role === 'school_admin' && (
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>대상:</strong> 전체 학교
                </p>
                <p className="text-sm text-blue-800">
                  <strong>예상 수신자:</strong> {studentCount}명
                </p>
                <p className="text-sm text-blue-700">
                  <strong>설문 범위:</strong> 학교 전체 학생
                </p>
              </div>
            )}
            
            {/* 교육청관리자인 경우 */}
            {teacherInfo?.role === 'district_admin' && (
              <div className="space-y-2">
                <p className="text-sm text-blue-800">
                  <strong>대상:</strong> 전체 교육청
                </p>
                <p className="text-sm text-blue-800">
                  <strong>예상 수신자:</strong> {studentCount}명
                </p>
                <p className="text-sm text-blue-700">
                  <strong>설문 범위:</strong> 교육청 소속 전체 학생
                </p>
              </div>
            )}
          </div>

          {/* 발송 방법 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발송 방법
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="method"
                  value="kakao"
                  checked={sendOptions.method === 'kakao'}
                  onChange={(e) => setSendOptions(prev => ({ ...prev, method: e.target.value }))}
                  className="mr-2"
                />
                <span className="text-sm">카카오톡 알림톡</span>
              </label>
              <label className="flex items-center opacity-50">
                <input
                  type="radio"
                  name="method"
                  value="sms"
                  checked={false}
                  disabled
                  className="mr-2"
                />
                <span className="text-sm">SMS 문자 발송 (개발중)</span>
              </label>
              <label className="flex items-center opacity-50">
                <input
                  type="radio"
                  name="method"
                  value="app_push"
                  checked={false}
                  disabled
                  className="mr-2"
                />
                <span className="text-sm">앱 푸시 알림 (개발중)</span>
              </label>
            </div>
          </div>

          {/* 예상 수신자 상세 정보 */}
          {targetStudents.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">👥 예상 수신자 상세 정보</h4>
              
              {/* 역할별 요약 정보 */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="text-sm">
                  <span className="text-gray-600">총 학생 수:</span>
                  <span className="ml-2 font-medium text-gray-900">{studentCount}명</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">활성 학생:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {targetStudents.filter(s => s.is_active).length}명
                  </span>
                </div>
              </div>
              
              {/* 학년/반별 분포 (학교관리자 이상인 경우) */}
              {(teacherInfo?.role === 'school_admin' || teacherInfo?.role === 'district_admin') && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600 mb-2">학년/반별 분포:</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Array.from(new Set(targetStudents.map(s => `${s.grade}학년 ${s.class}반`))).sort().map(gradeClass => (
                      <div key={gradeClass} className="bg-white p-2 rounded border text-center">
                        <div className="font-medium text-gray-900">{gradeClass}</div>
                        <div className="text-gray-600">
                          {targetStudents.filter(s => `${s.grade}학년 ${s.class}반` === gradeClass).length}명
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 성별 분포 */}
              <div className="text-sm">
                <span className="text-gray-600">성별 분포:</span>
                <div className="flex space-x-4 mt-1">
                  <span className="text-blue-600">
                    남학생: {targetStudents.filter(s => s.gender === 'male').length}명
                  </span>
                  <span className="text-pink-600">
                    여학생: {targetStudents.filter(s => s.gender === 'female').length}명
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR 코드 포함 여부 */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={sendOptions.includeQR}
                onChange={(e) => setSendOptions(prev => ({ ...prev, includeQR: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm">QR 코드 포함</span>
            </label>
          </div>

          {/* 커스텀 메시지 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              커스텀 메시지 (선택사항)
            </label>
            <textarea
              value={sendOptions.customMessage}
              onChange={(e) => setSendOptions(prev => ({ ...prev, customMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="학생들에게 전달할 추가 메시지를 입력하세요"
            />
          </div>

          {/* 발송 버튼 */}
          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '로딩 중...' : '발송하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileSendModal;
