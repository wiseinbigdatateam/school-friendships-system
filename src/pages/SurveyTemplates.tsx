import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  purpose: 'friendship' | 'group' | 'adaptation' | 'conflict' | 'custom';
  category: string;
  questions: string[];
  maxSelections: number[]; // 각 질문별 최대 선택 가능한 친구 수
  estimatedTime: number; // 예상 소요 시간 (분)
  targetGrades: string[];
  useCount: number;
  createdAt: string;
  isDefault: boolean;
}

const SurveyTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);
  const [showSurveyConfigModal, setShowSurveyConfigModal] = useState(false);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [isLoadingTeacherInfo, setIsLoadingTeacherInfo] = useState(true);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchTeacherInfo = async () => {
      if (user?.id) {
        try {
          setIsLoadingTeacherInfo(true);
          const { data: teacherData, error: teacherError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (!teacherError && teacherData) {
            setTeacherInfo(teacherData);
            console.log('담임교사 정보 로드:', teacherData);
            console.log('담임교사 학년/반 정보:', {
              grade_level: teacherData.grade_level,
              class_number: teacherData.class_number,
              school_id: teacherData.school_id,
              role: teacherData.role
            });
          } else {
            console.error('담임교사 정보 조회 오류:', teacherError);
          }
        } catch (error) {
          console.error('담임교사 정보 조회 오류:', error);
        } finally {
          setIsLoadingTeacherInfo(false);
        }
      } else {
        setIsLoadingTeacherInfo(false);
      }
    };

    fetchTeacherInfo();
  }, [user]);

  // 설문 템플릿 상태
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);

  // 설문 템플릿 데이터 가져오기
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoadingTemplates(true);
        const { data: templatesData, error } = await supabase
          .from('survey_templates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('템플릿 조회 오류:', error);
          return;
        }

        // 데이터베이스 데이터를 SurveyTemplate 인터페이스에 맞게 변환
        const convertedTemplates: SurveyTemplate[] = templatesData?.map(template => ({
          id: template.id,
          title: template.name,
          description: template.description || '',
          purpose: (template.metadata as any)?.purpose || 'custom',
          category: (template.metadata as any)?.category || '기타',
          questions: Array.isArray(template.questions) ? (template.questions as string[]) : [],
          maxSelections: (template.metadata as any)?.maxSelections || [1],
          estimatedTime: (template.metadata as any)?.estimatedTime || 5,
          targetGrades: (template.metadata as any)?.targetGrades || ['1', '2', '3', '4', '5', '6'],
          useCount: (template.metadata as any)?.useCount || 0,
          createdAt: template.created_at || new Date().toISOString(),
          isDefault: (template.metadata as any)?.isDefault || false
        })) || [];

        // 교우관계 조사를 먼저 오도록 정렬
        const sortedTemplates = convertedTemplates.sort((a, b) => {
          if (a.category === '교우관계') return -1;
          if (b.category === '교우관계') return 1;
          return 0;
        });

        setTemplates(sortedTemplates);
        console.log('템플릿 데이터 로드 완료:', sortedTemplates);
      } catch (error) {
        console.error('템플릿 데이터 로드 오류:', error);
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleUseTemplate = (template: SurveyTemplate) => {
    setSelectedTemplate(template);
    setShowSurveyConfigModal(true);
  };

  const handleCreateSurvey = async (surveyConfig: any) => {
    try {
      setIsCreating(true);
      
      if (!selectedTemplate) return;
      
      if (!teacherInfo) {
        alert('담임교사 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
        return;
      }
      
      // 담임교사 정보 검증
      if (!teacherInfo.grade_level || !teacherInfo.class_number || !teacherInfo.school_id) {
        console.error('담임교사 정보 불완전:', teacherInfo);
        alert(`담임교사 정보가 불완전합니다.\n학년: ${teacherInfo.grade_level || '없음'}\n반: ${teacherInfo.class_number || '없음'}\n학교: ${teacherInfo.school_id || '없음'}`);
        return;
      }
      
      console.log('설문 생성 시 담임교사 정보:', {
        grade_level: teacherInfo.grade_level,
        class_number: teacherInfo.class_number,
        school_id: teacherInfo.school_id,
        role: teacherInfo.role
      });
      
      // 담임교사의 학교 ID 사용
      const schoolId = teacherInfo.school_id;
      
      // 담임교사의 담당 반 학생들 조회
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, grade, class')
        .eq('current_school_id', schoolId)
        .eq('grade', teacherInfo.grade_level)
        .eq('class', teacherInfo.class_number)
        .eq('is_active', true);
      
      if (studentsError) {
        console.error('학생 조회 오류:', studentsError);
        alert('담당 반 학생 정보를 불러올 수 없습니다.');
        return;
      }
      
      console.log('담임교사 담당 학생들:', students);
      
      // 새 설문 데이터 생성 (실제 테이블 구조에 맞춤)
      const newSurvey = {
        title: surveyConfig.title,
        description: surveyConfig.description,
        school_id: schoolId,
        template_id: selectedTemplate.id,        // 템플릿 ID
        target_grades: [teacherInfo.grade_level], // 대상 학년
        target_classes: [teacherInfo.class_number], // 대상 반
        start_date: surveyConfig.startDate,
        end_date: surveyConfig.endDate,
        status: 'draft',
        questions: selectedTemplate.questions.map((question, index) => ({
          id: `q${index + 1}`,
          text: question,
          type: 'multiple_choice',
          required: true,
          max_selections: selectedTemplate.maxSelections[index] || 1
        }))
      };

      console.log('생성할 설문 데이터:', newSurvey);
      
      // Supabase에 설문 저장
      const { data: createdSurvey, error } = await supabase
        .from('surveys')
        .insert([newSurvey])
        .select()
        .single();

      if (error) {
        console.error('Error creating survey:', error);
        alert('설문 생성 중 오류가 발생했습니다.\n다시 시도해주세요.');
        return;
      }
      
      console.log('설문 생성 성공:', createdSurvey);

      // 템플릿 사용 횟수 증가
      try {
        // 현재 메타데이터 조회
        const { data: currentTemplate, error: fetchError } = await supabase
          .from('survey_templates')
          .select('metadata')
          .eq('id', selectedTemplate.id)
          .single();

        if (fetchError) {
          console.error('현재 템플릿 메타데이터 조회 오류:', fetchError);
        } else {
          // useCount 증가
          const currentMetadata = currentTemplate.metadata as any;
          const currentUseCount = currentMetadata?.useCount || 0;
          const newMetadata = {
            ...currentMetadata,
            useCount: currentUseCount + 1
          };

          // 업데이트된 메타데이터 저장
          const { error: updateError } = await supabase
            .from('survey_templates')
            .update({ metadata: newMetadata })
            .eq('id', selectedTemplate.id);

          if (updateError) {
            console.error('템플릿 사용 횟수 업데이트 오류:', updateError);
          } else {
            console.log('템플릿 사용 횟수 증가 완료:', currentUseCount + 1);
          }
        }
      } catch (updateError) {
        console.error('템플릿 사용 횟수 업데이트 중 오류:', updateError);
      }

      // 성공 메시지
      alert(`✅ "${selectedTemplate.title}" 템플릿으로 새 설문이 생성되었습니다!\n\n📚 대상: ${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반\n👥 대상 학생: ${students.length}명\n\n📝 참고: 대상 학생 정보는 설문 응답 시 자동으로 필터링됩니다.\n\n설문 관리 페이지로 이동합니다.`);
      
      // 모달 닫기
      setShowSurveyConfigModal(false);
      setSelectedTemplate(null);
      
      // 템플릿 목록 새로고침
      const fetchTemplates = async () => {
        try {
          const { data: templatesData, error } = await supabase
            .from('survey_templates')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('템플릿 조회 오류:', error);
            return;
          }

          // 데이터베이스 데이터를 SurveyTemplate 인터페이스에 맞게 변환
          const convertedTemplates: SurveyTemplate[] = templatesData?.map(template => ({
            id: template.id,
            title: template.name,
            description: template.description || '',
            purpose: (template.metadata as any)?.purpose || 'custom',
            category: (template.metadata as any)?.category || '기타',
            questions: Array.isArray(template.questions) ? (template.questions as string[]) : [],
            maxSelections: (template.metadata as any)?.maxSelections || [1],
            estimatedTime: (template.metadata as any)?.estimatedTime || 5,
            targetGrades: (template.metadata as any)?.targetGrades || ['1', '2', '3', '4', '5', '6'],
            useCount: (template.metadata as any)?.useCount || 0,
            createdAt: template.created_at || new Date().toISOString(),
            isDefault: (template.metadata as any)?.isDefault || false
          })) || [];

          // 교우관계 조사를 먼저 오도록 정렬
          const sortedTemplates = convertedTemplates.sort((a, b) => {
            if (a.category === '교우관계') return -1;
            if (b.category === '교우관계') return 1;
            return 0;
          });

          setTemplates(sortedTemplates);
        } catch (error) {
          console.error('템플릿 데이터 새로고침 오류:', error);
        }
      };

      fetchTemplates();
      
      // 설문 관리 페이지로 이동
      navigate('/survey-management');
      
    } catch (error) {
      console.error('Failed to create survey:', error);
      alert('설문 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const TemplateCard: React.FC<{ template: SurveyTemplate }> = ({ template }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{template.title}</h3>
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                {template.category}
              </span>
              {template.isDefault && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">기본</span>
              )}
            </div>
            <p className="text-gray-600 text-sm mb-3">{template.description}</p>
            
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>📊 {template.questions.length}개 질문</span>
              <span>⏱️ 약 {template.estimatedTime}분</span>
              <span>🎯 {template.targetGrades.join(', ')}학년</span>
              <span>📈 {template.useCount}회 사용</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-auto pt-4">
        <button
          onClick={() => handleUseTemplate(template)}
          disabled={isCreating}
          className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
              생성 중...
            </div>
          ) : (
            '사용하기'
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">설문 템플릿</h1>
            <p className="text-gray-600">목적에 맞는 설문 템플릿을 선택하여 교우관계 조사를 시작하세요.</p>
          </div>
        </div>

        {/* 로딩 상태 */}
        {isLoadingTemplates && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">설문 템플릿을 불러오는 중...</p>
          </div>
        )}

        {/* 템플릿 목록 */}
        {!isLoadingTemplates && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length > 0 ? (
              templates.map(template => (
                <TemplateCard key={template.id} template={template} />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
                <p className="text-gray-500">다른 키워드로 검색하거나 새 템플릿을 만들어보세요.</p>
              </div>
            )}
          </div>
        )}

        {/* 설문 설정 모달 */}
        <SurveyConfigModal
          isOpen={showSurveyConfigModal}
          onClose={() => {
            setShowSurveyConfigModal(false);
            setSelectedTemplate(null);
          }}
          template={selectedTemplate}
          onCreateSurvey={handleCreateSurvey}
          isCreating={isCreating}
          teacherInfo={teacherInfo}
          isLoadingTeacherInfo={isLoadingTeacherInfo}
        />

        {/* 템플릿 생성 모달 (향후 구현) */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">새 템플릿 만들기</h3>
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  사용자 정의 템플릿 생성 기능은 준비 중입니다.
                  기존 템플릿을 복사하여 수정하는 방식을 이용해주세요.
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 설문 설정 모달 컴포넌트
const SurveyConfigModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  template: SurveyTemplate | null;
  onCreateSurvey: (config: any) => void;
  isCreating: boolean;
  teacherInfo: any;
  isLoadingTeacherInfo: boolean;
}> = ({ isOpen, onClose, template, onCreateSurvey, isCreating, teacherInfo, isLoadingTeacherInfo }) => {
  const [config, setConfig] = useState({
    title: '',
    description: '',
    targetGrades: ['3'],
    targetClasses: ['1'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  // 템플릿이 선택될 때 초기값 설정
  React.useEffect(() => {
    if (template) {
      setConfig({
        title: `${template.title} (${new Date().toLocaleDateString()})`,
        description: template.description,
        targetGrades: template.targetGrades.length > 0 ? template.targetGrades : ['3'],
        targetClasses: ['1'],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
  }, [template]);

  // 담임교사 정보가 있을 때 대상학년과 대상 반 자동 설정
  React.useEffect(() => {
    if (teacherInfo && teacherInfo.role === 'homeroom_teacher' && teacherInfo.grade_level && teacherInfo.class_number) {
      setConfig(prev => ({
        ...prev,
        targetGrades: [teacherInfo.grade_level],
        targetClasses: [teacherInfo.class_number]
      }));
      console.log('담임교사 대상학년/반 자동 설정:', teacherInfo.grade_level, '학년', teacherInfo.class_number, '반');
    }
  }, [teacherInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSurvey(config);
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">새 설문 생성</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 템플릿 정보 */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-blue-800 font-medium">대상: {teacherInfo.grade_level}학년 {teacherInfo.class_number}반</p>
            </div>

            {/* 질문 목록 */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-3">포함된 질문 ({template.questions.length}개)</h4>
              <div className="space-y-2">
                {template.questions.map((question, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="text-sm font-medium text-gray-600 min-w-[40px]">Q{index + 1}.</span>
                    <p className="text-sm text-gray-700 flex-1">{question}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* 설문 제목 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">설문 제목</label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => setConfig({...config, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* 설문 설명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">설문 설명</label>
                <textarea
                  value={config.description}
                  onChange={(e) => setConfig({...config, description: e.target.value})}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              

          

              {/* 설문 기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig({...config, startDate: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">종료일</label>
                  <input
                    type="date"
                    value={config.endDate}
                    onChange={(e) => setConfig({...config, endDate: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex space-x-3 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isCreating || !config.title || config.targetGrades.length === 0 || config.targetClasses.length === 0}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    설문 생성 중...
                  </div>
                ) : (
                  '설문 생성하기'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SurveyTemplates;