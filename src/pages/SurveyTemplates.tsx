import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  purpose: "friendship" | "group" | "adaptation" | "conflict" | "custom";
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
  const [selectedTemplate, setSelectedTemplate] =
    useState<SurveyTemplate | null>(null);
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
            .from("users")
            .select("*")
            .eq("id", user.id)
            .single();

          if (!teacherError && teacherData) {
            setTeacherInfo(teacherData);
            console.log("담임교사 정보 로드:", teacherData);
            console.log("담임교사 학년/반 정보:", {
              grade_level: teacherData.grade_level,
              class_number: teacherData.class_number,
              school_id: teacherData.school_id,
              role: teacherData.role,
            });
          } else {
            console.error("담임교사 정보 조회 오류:", teacherError);
          }
        } catch (error) {
          console.error("담임교사 정보 조회 오류:", error);
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
          .from("survey_templates")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("템플릿 조회 오류:", error);
          return;
        }

        // 데이터베이스 데이터를 SurveyTemplate 인터페이스에 맞게 변환
        const convertedTemplates: SurveyTemplate[] =
          templatesData?.map((template) => {
            const maxSelections = (template.metadata as any)?.maxSelections || [
              1,
            ];
            console.log(
              `템플릿 "${template.name}" maxSelections:`,
              maxSelections,
            );
            return {
              id: template.id,
              title: template.name,
              description: template.description || "",
              purpose: (template.metadata as any)?.purpose || "custom",
              category: (template.metadata as any)?.category || "기타",
              questions: Array.isArray(template.questions)
                ? (template.questions as string[])
                : [],
              maxSelections: maxSelections,
              estimatedTime: (template.metadata as any)?.estimatedTime || 5,
              targetGrades: (template.metadata as any)?.targetGrades || [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
              ],
              useCount: (template.metadata as any)?.useCount || 0,
              createdAt: template.created_at || new Date().toISOString(),
              isDefault: (template.metadata as any)?.isDefault || false,
            };
          }) || [];

        // 교우관계 조사를 먼저 오도록 정렬
        const sortedTemplates = convertedTemplates.sort((a, b) => {
          if (a.category === "교우관계") return -1;
          if (b.category === "교우관계") return 1;
          return 0;
        });

        setTemplates(sortedTemplates);
        console.log("템플릿 데이터 로드 완료:", sortedTemplates);
      } catch (error) {
        console.error("템플릿 데이터 로드 오류:", error);
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
        alert("담임교사 정보를 불러올 수 없습니다. 다시 로그인해주세요.");
        return;
      }

      // 담임교사 정보 검증
      if (
        !teacherInfo.grade_level ||
        !teacherInfo.class_number ||
        !teacherInfo.school_id
      ) {
        console.error("담임교사 정보 불완전:", teacherInfo);
        alert(
          `담임교사 정보가 불완전합니다.\n학년: ${
            teacherInfo.grade_level || "없음"
          }\n반: ${teacherInfo.class_number || "없음"}\n학교: ${
            teacherInfo.school_id || "없음"
          }`,
        );
        return;
      }

      console.log("설문 생성 시 담임교사 정보:", {
        grade_level: teacherInfo.grade_level,
        class_number: teacherInfo.class_number,
        school_id: teacherInfo.school_id,
        role: teacherInfo.role,
      });

      // 담임교사의 학교 ID 사용
      const schoolId = teacherInfo.school_id;

      // 담임교사의 담당 반 학생들 조회
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, grade, class")
        .eq("current_school_id", schoolId)
        .eq("grade", teacherInfo.grade_level)
        .eq("class", teacherInfo.class_number)
        .eq("is_active", true);

      if (studentsError) {
        console.error("학생 조회 오류:", studentsError);
        alert("담당 반 학생 정보를 불러올 수 없습니다.");
        return;
      }

      console.log("담임교사 담당 학생들:", students);

      // 새 설문 데이터 생성 (실제 테이블 구조에 맞춤)
      const newSurvey = {
        title: surveyConfig.title,
        description: surveyConfig.description,
        school_id: schoolId,
        template_id: selectedTemplate.id, // 템플릿 ID
        target_grades: [teacherInfo.grade_level], // 대상 학년
        target_classes: [teacherInfo.class_number], // 대상 반
        start_date: surveyConfig.startDate,
        end_date: surveyConfig.endDate,
        status: "draft",
        questions: selectedTemplate.questions.map((question, index) => {
          const maxSelections = selectedTemplate.maxSelections[index] || 1;
          console.log(`질문 ${index + 1} maxSelections:`, maxSelections);
          return {
            id: `q${index + 1}`,
            text: question,
            type: "multiple_choice",
            required: true,
            max_selections: maxSelections,
          };
        }),
      };

      console.log("생성할 설문 데이터:", newSurvey);

      // Supabase에 설문 저장
      const { data: createdSurvey, error } = await supabase
        .from("surveys")
        .insert([newSurvey])
        .select()
        .single();

      if (error) {
        console.error("Error creating survey:", error);
        alert("설문 생성 중 오류가 발생했습니다.\n다시 시도해주세요.");
        return;
      }

      console.log("설문 생성 성공:", createdSurvey);

      // 템플릿 사용 횟수 증가
      try {
        // 현재 메타데이터 조회
        const { data: currentTemplate, error: fetchError } = await supabase
          .from("survey_templates")
          .select("metadata")
          .eq("id", selectedTemplate.id)
          .single();

        if (fetchError) {
          console.error("현재 템플릿 메타데이터 조회 오류:", fetchError);
        } else {
          // useCount 증가
          const currentMetadata = currentTemplate.metadata as any;
          const currentUseCount = currentMetadata?.useCount || 0;
          const newMetadata = {
            ...currentMetadata,
            useCount: currentUseCount + 1,
          };

          // 업데이트된 메타데이터 저장
          const { error: updateError } = await supabase
            .from("survey_templates")
            .update({ metadata: newMetadata })
            .eq("id", selectedTemplate.id);

          if (updateError) {
            console.error("템플릿 사용 횟수 업데이트 오류:", updateError);
          } else {
            console.log("템플릿 사용 횟수 증가 완료:", currentUseCount + 1);
          }
        }
      } catch (updateError) {
        console.error("템플릿 사용 횟수 업데이트 중 오류:", updateError);
      }

      // 성공 메시지
      alert(
        `✅ "${selectedTemplate.title}" 템플릿으로 새 설문이 생성되었습니다!\n\n📚 대상: ${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반\n👥 대상 학생: ${students.length}명\n\n📝 참고: 대상 학생 정보는 설문 응답 시 자동으로 필터링됩니다.\n\n설문 관리 페이지로 이동합니다.`,
      );

      // 모달 닫기
      setShowSurveyConfigModal(false);
      setSelectedTemplate(null);

      // 템플릿 목록 새로고침
      const fetchTemplates = async () => {
        try {
          const { data: templatesData, error } = await supabase
            .from("survey_templates")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (error) {
            console.error("템플릿 조회 오류:", error);
            return;
          }

          // 데이터베이스 데이터를 SurveyTemplate 인터페이스에 맞게 변환
          const convertedTemplates: SurveyTemplate[] =
            templatesData?.map((template) => ({
              id: template.id,
              title: template.name,
              description: template.description || "",
              purpose: (template.metadata as any)?.purpose || "custom",
              category: (template.metadata as any)?.category || "기타",
              questions: Array.isArray(template.questions)
                ? (template.questions as string[])
                : [],
              maxSelections: (template.metadata as any)?.maxSelections || [1],
              estimatedTime: (template.metadata as any)?.estimatedTime || 5,
              targetGrades: (template.metadata as any)?.targetGrades || [
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
              ],
              useCount: (template.metadata as any)?.useCount || 0,
              createdAt: template.created_at || new Date().toISOString(),
              isDefault: (template.metadata as any)?.isDefault || false,
            })) || [];

          // 교우관계 조사를 먼저 오도록 정렬
          const sortedTemplates = convertedTemplates.sort((a, b) => {
            if (a.category === "교우관계") return -1;
            if (b.category === "교우관계") return 1;
            return 0;
          });

          setTemplates(sortedTemplates);
        } catch (error) {
          console.error("템플릿 데이터 새로고침 오류:", error);
        }
      };

      fetchTemplates();

      // 설문 관리 페이지로 이동
      navigate("/survey-management");
    } catch (error) {
      console.error("Failed to create survey:", error);
      alert("설문 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  };

  const TemplateCard: React.FC<{ template: SurveyTemplate }> = ({
    template,
  }) => (
    <div className="flex h-full w-full flex-col rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md">
      <div className="flex-1">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-2 flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {template.title}
              </h3>
              <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {template.category}
              </span>
              {template.isDefault && (
                <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                  기본
                </span>
              )}
            </div>
            <p className="mb-3 text-sm text-gray-600">{template.description}</p>

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>📊 {template.questions.length}개 질문</span>
              <span className="hidden">⏱️ 약 {template.estimatedTime}분</span>
              <span className="hidden">
                🎯 {template.targetGrades.join(", ")}학년
              </span>
              <span>📈 {template.useCount}회 사용</span>
            </div>

            {/* 교우관계 설문인 경우 maxSelections 정보 표시 */}
            {template.category === "교우관계" && template.maxSelections && (
              <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2">
                <p className="mb-1 text-xs font-medium text-blue-800">
                  📝 질문별 최대 선택 가능 인원:
                </p>
                <div className="flex flex-wrap gap-1">
                  {template.maxSelections.map((max, index) => (
                    <span
                      key={index}
                      className="inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                    >
                      {index + 1}번: {max}명
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <button
          onClick={() => handleUseTemplate(template)}
          disabled={isCreating}
          className="w-full rounded-lg bg-[#3F80EA] px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="mr-1 h-3 w-3 animate-spin rounded-full border border-white border-t-transparent"></div>
              생성 중...
            </div>
          ) : (
            "사용하기"
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">설문 템플릿</h1>
          <p className="text-gray-600">
            목적에 맞는 설문 템플릿을 선택하여 교우관계 조사를 시작하세요.
          </p>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoadingTemplates && (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">설문 템플릿을 불러오는 중...</p>
        </div>
      )}

      {/* 템플릿 목록 */}
      {!isLoadingTemplates && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.length > 0 ? (
            templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg
                  className="h-8 w-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                검색 결과가 없습니다
              </h3>
              <p className="text-gray-500">
                다른 키워드로 검색하거나 새 템플릿을 만들어보세요.
              </p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  새 템플릿 만들기
                </h3>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="mb-6 text-gray-600">
                사용자 정의 템플릿 생성 기능은 준비 중입니다. 기존 템플릿을
                복사하여 수정하는 방식을 이용해주세요.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
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
}> = ({
  isOpen,
  onClose,
  template,
  onCreateSurvey,
  isCreating,
  teacherInfo,
  isLoadingTeacherInfo,
}) => {
  const [config, setConfig] = useState({
    title: "",
    description: "",
    targetGrades: ["3"],
    targetClasses: ["1"],
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  // 템플릿이 선택될 때 초기값 설정
  React.useEffect(() => {
    if (template) {
      setConfig({
        title: `${template.title} (${new Date().toLocaleDateString()})`,
        description: template.description,
        targetGrades:
          template.targetGrades.length > 0 ? template.targetGrades : ["3"],
        targetClasses: ["1"],
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      });
    }
  }, [template]);

  // 담임교사 정보가 있을 때 대상학년과 대상 반 자동 설정
  React.useEffect(() => {
    if (
      teacherInfo &&
      teacherInfo.role === "homeroom_teacher" &&
      teacherInfo.grade_level &&
      teacherInfo.class_number
    ) {
      setConfig((prev) => ({
        ...prev,
        targetGrades: [teacherInfo.grade_level],
        targetClasses: [teacherInfo.class_number],
      }));
      console.log(
        "담임교사 대상학년/반 자동 설정:",
        teacherInfo.grade_level,
        "학년",
        teacherInfo.class_number,
        "반",
      );
    }
  }, [teacherInfo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSurvey(config);
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">
                새 설문 생성
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* 템플릿 정보 */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="font-medium text-blue-800">
                대상: {teacherInfo.grade_level}학년 {teacherInfo.class_number}반
              </p>
            </div>

            {/* 질문 목록 */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-900">
                포함된 질문 ({template.questions.length}개)
              </h4>
              <div className="space-y-2">
                {template.questions.map((question, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className="min-w-[40px] text-sm font-medium text-gray-600">
                      Q{index + 1}.
                    </span>
                    <p className="flex-1 text-sm text-gray-700">{question}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* 설문 제목 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  설문 제목
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) =>
                    setConfig({ ...config, title: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* 설문 설명 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  설문 설명
                </label>
                <textarea
                  value={config.description}
                  onChange={(e) =>
                    setConfig({ ...config, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 설문 기간 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    시작일
                  </label>
                  <input
                    type="date"
                    value={config.startDate}
                    onChange={(e) =>
                      setConfig({ ...config, startDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    종료일
                  </label>
                  <input
                    type="date"
                    value={config.endDate}
                    onChange={(e) =>
                      setConfig({ ...config, endDate: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 p-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 버튼 */}
            <div className="mt-8 flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={
                  isCreating ||
                  !config.title ||
                  config.targetGrades.length === 0 ||
                  config.targetClasses.length === 0
                }
                className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    설문 생성 중...
                  </div>
                ) : (
                  "설문 생성하기"
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
