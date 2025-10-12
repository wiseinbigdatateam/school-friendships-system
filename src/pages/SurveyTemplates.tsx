import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface SurveyTemplate {
  id: string;
  title: string;
  description: string;
  purpose: "friendship" | "group" | "adaptation" | "conflict" | "custom" | "comprehensive";
  category: string;
  questions: string[];
  maxSelections: number[]; // 각 질문별 최대 선택 가능한 친구 수
  estimatedTime: number; // 예상 소요 시간 (분)
  targetGrades: string[];
  useCount: number;
  createdAt: string;
  isDefault: boolean;
  // 추가 메타데이터 필드들
  questionCategories?: string[];
  questionTypes?: string[];
  questionOptions?: string[][];
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
        
        // 데이터베이스에서 템플릿 조회
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
            const metadata = template.metadata as any;
            const maxSelections = metadata?.maxSelections || [1];
            
            console.log(`템플릿 "${template.name}" 로드:`, {
              id: template.id,
              category: metadata?.category,
              questionCount: Array.isArray(template.questions) ? template.questions.length : 0,
              hasCategories: !!metadata?.questionCategories
            });
            
            return {
              id: template.id,
              title: template.name,
              description: template.description || "",
              purpose: metadata?.purpose || "custom",
              category: metadata?.category || "기타",
              questions: Array.isArray(template.questions)
                ? (template.questions as string[])
                : [],
              maxSelections: maxSelections,
              estimatedTime: metadata?.estimatedTime || 5,
              targetGrades: metadata?.targetGrades || [
                "1", "2", "3", "4", "5", "6"
              ],
              useCount: metadata?.useCount || 0,
              createdAt: template.created_at || new Date().toISOString(),
              isDefault: metadata?.isDefault || false,
              // 추가 메타데이터 정보
              questionCategories: metadata?.questionCategories || [],
              questionTypes: metadata?.questionTypes || [],
              questionOptions: metadata?.questionOptions || []
            };
          }) || [];

        // 교우관계조사, 학교생활 만족도 조사, 학교 폭력 조사 템플릿 제외
        const filteredTemplates = convertedTemplates.filter((template) => {
          const excludeCategories = ["교우관계", "만족도", "학교폭력"];
          return !excludeCategories.includes(template.category);
        });

        // 종합조사를 먼저 오도록 정렬
        const sortedTemplates = filteredTemplates.sort((a, b) => {
          if (a.category === "종합조사") return -1;
          if (b.category === "종합조사") return 1;
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

  // 설문 상태 결정 함수
  const getSurveyStatus = (startDate: string, endDate: string): string => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 현재 날짜가 시작일보다 이전이면 "대기중"
    if (now < start) {
      return "waiting";
    }

    // 현재 날짜가 시작일과 종료일 사이에 있으면 "진행중"
    if (now >= start && now <= end) {
      return "active";
    }

    // 현재 날짜가 종료일보다 이후면 "종료"
    return "completed";
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
        template_id: selectedTemplate.id, // 실제 데이터베이스의 템플릿 ID 사용
        target_grades: [teacherInfo.grade_level], // 대상 학년
        target_classes: [teacherInfo.class_number], // 대상 반
        start_date: surveyConfig.startDate,
        end_date: surveyConfig.endDate,
        status: getSurveyStatus(surveyConfig.startDate, surveyConfig.endDate), // 기간에 따른 상태 설정
        questions: selectedTemplate.questions.map((question, index) => {
          const maxSelections = selectedTemplate.maxSelections[index] || 1;
          const category = (selectedTemplate as any).questionCategories?.[index] || "기타";
          const questionType = (selectedTemplate as any).questionTypes?.[index] || "multiple_choice";
          const options = (selectedTemplate as any).questionOptions?.[index] || [];
          
          console.log(`질문 ${index + 1} 정보:`, {
            text: question,
            category,
            type: questionType,
            maxSelections,
            options
          });
          
          return {
            id: `q${index + 1}`,
            text: question,
            type: questionType,
            category: category, // 카테고리 추가
            required: true,
            max_selections: maxSelections,
            options: options, // 선택지 추가
          };
        }),
        // 설문 설정에 카테고리 정보 추가
        settings: {
          surveyType: "comprehensive",
          categories: {
            friendship: "교우관계",
            satisfaction: "만족도", 
            violence: "학교폭력",
            subjective: "주관식"
          },
          questionCount: selectedTemplate.questions.length,
          estimatedTime: selectedTemplate.estimatedTime
        }
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
      const statusText =
        getSurveyStatus(surveyConfig.startDate, surveyConfig.endDate) ===
        "waiting"
          ? "대기중"
          : getSurveyStatus(surveyConfig.startDate, surveyConfig.endDate) ===
              "active"
            ? "진행중"
            : "완료";

      alert(
        `✅ "${selectedTemplate.title}" 템플릿으로 새 설문이 생성되었습니다!\n\n📚 대상: ${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반\n👥 대상 학생: ${students.length}명\n📅 기간: ${surveyConfig.startDate} ~ ${surveyConfig.endDate}\n📊 상태: ${statusText}\n\n📝 참고: 대상 학생 정보는 설문 응답 시 자동으로 필터링됩니다.\n\n설문 관리 페이지로 이동합니다.`,
      );

      // 모달 닫기
      setShowSurveyConfigModal(false);
      setSelectedTemplate(null);

      // 템플릿 목록 새로고침 (데이터베이스에서 다시 조회)
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
            templatesData?.map((template) => {
              const metadata = template.metadata as any;
              const maxSelections = metadata?.maxSelections || [1];
              
              return {
                id: template.id,
                title: template.name,
                description: template.description || "",
                purpose: metadata?.purpose || "custom",
                category: metadata?.category || "기타",
                questions: Array.isArray(template.questions)
                  ? (template.questions as string[])
                  : [],
                maxSelections: maxSelections,
                estimatedTime: metadata?.estimatedTime || 5,
                targetGrades: metadata?.targetGrades || [
                  "1", "2", "3", "4", "5", "6"
                ],
                useCount: metadata?.useCount || 0,
                createdAt: template.created_at || new Date().toISOString(),
                isDefault: metadata?.isDefault || false,
                // 추가 메타데이터 정보
                questionCategories: metadata?.questionCategories || [],
                questionTypes: metadata?.questionTypes || [],
                questionOptions: metadata?.questionOptions || []
              };
            }) || [];

          // 교우관계조사, 학교생활 만족도 조사, 학교 폭력 조사 템플릿 제외
          const filteredTemplates = convertedTemplates.filter((template) => {
            const excludeCategories = ["교우관계", "만족도", "학교폭력"];
            return !excludeCategories.includes(template.category);
          });

          // 종합조사를 먼저 오도록 정렬
          const sortedTemplates = filteredTemplates.sort((a, b) => {
            if (a.category === "종합조사") return -1;
            if (b.category === "종합조사") return 1;
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

            {/* 종합조사 설문인 경우 카테고리별 정보 표시 */}
            {/*template.category === "종합조사" && (template as any).questionCategories && (
              <div className="mt-2 rounded-lg bg-green-50 p-2">
                <p className="mb-1 text-xs font-medium text-green-800">
                  📊 문항별 카테고리 분류:
                </p>
                <div className="flex flex-wrap gap-1">
                  {(template as any).questionCategories.map((category: string, index: number) => (
                    <span
                      key={index}
                      className={`inline-block rounded px-2 py-1 text-xs ${
                        category === "교우관계" ? "bg-blue-100 text-blue-700" :
                        category === "만족도" ? "bg-green-100 text-green-700" :
                        category === "학교폭력" ? "bg-red-100 text-red-700" :
                        category === "주관식" ? "bg-purple-100 text-purple-700" :
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      Q{index + 1}: {category}
                    </span>
                  ))}
                </div>
              </div>
            )*/}

            {/* 질문 목록 */}
            <div className="mt-2 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 text-xs font-medium text-gray-900">
                포함된 질문 ({template.questions.length}개)
              </h4>
              <div className="space-y-2">
                {template.questions.map((question, index) => {
                  const category = (template as any).questionCategories?.[index];
                  const questionType = (template as any).questionTypes?.[index];
                  const options = (template as any).questionOptions?.[index];
                  
                  return (
                    <div key={index} className="flex items-start space-x-3">
                      <span className="text-xs font-medium text-gray-600">
                        Q{index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-700">{question}</p>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className={`inline-block rounded px-2 py-1 text-xs ${
                            category === "교우관계" ? "bg-blue-100 text-blue-700" :
                            category === "만족도" ? "bg-green-100 text-green-700" :
                            category === "학교폭력" ? "bg-red-100 text-red-700" :
                            category === "주관식" ? "bg-purple-100 text-purple-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {category}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({questionType === "multiple_choice" ? "다중선택" :
                              questionType === "yes_no" ? "예/아니오" :
                              questionType === "scale" ? "척도" :
                              questionType === "text" ? "주관식" : questionType})
                          </span>
                          {options && options.length > 0 && (
                            <span className="text-xs text-gray-500">
                              선택지: {options.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
          <h1 className="mb-2 text-2xl font-bold text-gray-900">설문 생성</h1>
          <p className="text-gray-600">
            목적에 맞는 설문 템플릿을 선택하여 교우관계 조사를 시작하세요.
          </p>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoadingTemplates && (
        <div className="py-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
          <p className="mt-2 text-gray-600">설문 템플릿을 불러오는 중...</p>
        </div>
      )}

      {/* 템플릿 목록 */}
      {!isLoadingTemplates && (
        <div className="grid grid-cols-1 gap-4">
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
                className="w-full rounded-lg bg-[#3F80EA] px-4 py-2 text-white hover:bg-blue-600"
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
    surveyPeriod: 7, // 설문 기간 (일수)
  });

  // 캘린더 관련 상태
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(null);

  // 템플릿이 선택될 때 초기값 설정
  React.useEffect(() => {
    if (template) {
      const startDate = new Date().toISOString().split("T")[0];
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      
      setConfig({
        title: `${template.title} (${new Date().toLocaleDateString()})`,
        description: template.description,
        targetGrades:
          template.targetGrades.length > 0 ? template.targetGrades : ["3"],
        targetClasses: ["1"],
        startDate: startDate,
        endDate: endDate,
        surveyPeriod: 7,
      });

      // 캘린더 초기값 설정
      setSelectedStartDate(new Date(startDate));
      setSelectedEndDate(new Date(endDate));
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

  // 설문 기간이 변경될 때 종료일 자동 계산
  React.useEffect(() => {
    const startDate = new Date(config.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + config.surveyPeriod);
    
    setConfig((prev) => ({
      ...prev,
      endDate: endDate.toISOString().split("T")[0],
    }));
  }, [config.startDate, config.surveyPeriod]);

  // 캘린더 유틸리티 함수들
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      if (direction === 'prev') {
        newMonth.setMonth(prev.getMonth() - 1);
      } else {
        newMonth.setMonth(prev.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDateClick = (day: number, month: Date) => {
    const clickedDate = new Date(month.getFullYear(), month.getMonth(), day);
    
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      // 시작일 선택 또는 새로운 범위 시작
      setSelectedStartDate(clickedDate);
      setSelectedEndDate(null);
    } else if (selectedStartDate && !selectedEndDate) {
      // 종료일 선택
      if (clickedDate >= selectedStartDate) {
        setSelectedEndDate(clickedDate);
        // config 업데이트
        const startDateStr = selectedStartDate.toISOString().split('T')[0];
        const endDateStr = clickedDate.toISOString().split('T')[0];
        const diffTime = Math.abs(clickedDate.getTime() - selectedStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        setConfig(prev => ({
          ...prev,
          startDate: startDateStr,
          endDate: endDateStr,
          surveyPeriod: diffDays
        }));
        
        // 종료일 선택 후 캘린더 닫기
        setTimeout(() => {
          setShowCalendar(false);
        }, 300); // 약간의 지연을 주어 사용자가 선택을 확인할 수 있도록
      } else {
        // 종료일이 시작일보다 이전이면 시작일을 다시 설정
        setSelectedStartDate(clickedDate);
        setSelectedEndDate(null);
      }
    }
  };

  const isDateInRange = (day: number, month: Date): boolean => {
    if (!selectedStartDate || !selectedEndDate) return false;
    
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return date >= selectedStartDate && date <= selectedEndDate;
  };

  const isDateSelected = (day: number, month: Date): boolean => {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    return (selectedStartDate !== null && date.getTime() === selectedStartDate.getTime()) ||
           (selectedEndDate !== null && date.getTime() === selectedEndDate.getTime());
  };

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
            {/* <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h4 className="mb-3 font-medium text-gray-900">
                질문 ({template.questions.length}개)
              </h4>
              <div className="space-y-3">
                {template.questions.map((question, index) => {
                  const category = (template as any).questionCategories?.[index];
                  const questionType = (template as any).questionTypes?.[index];
                  const options = (template as any).questionOptions?.[index];
                  
                  return (
                    <div key={index} className="rounded-lg bg-white p-3">
                      <div className="flex items-start space-x-3">
                        <span className="min-w-[40px] text-sm font-medium text-gray-600">
                          Q{index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{question}</p>
                          <div className="mt-2 flex items-center space-x-2">
                            <span className={`inline-block rounded px-2 py-1 text-xs ${
                              category === "교우관계" ? "bg-blue-100 text-blue-700" :
                              category === "만족도" ? "bg-green-100 text-green-700" :
                              category === "학교폭력" ? "bg-red-100 text-red-700" :
                              category === "주관식" ? "bg-purple-100 text-purple-700" :
                              "bg-gray-100 text-gray-700"
                            }`}>
                              {category}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({questionType === "multiple_choice" ? "다중선택" :
                                questionType === "yes_no" ? "예/아니오" :
                                questionType === "scale" ? "척도" :
                                questionType === "text" ? "주관식" : questionType})
                            </span>
                            {options && options.length > 0 && (
                              <span className="text-xs text-gray-500">
                                선택지: {options.join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div> */}

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

              {/* 설문 기간 설정 */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  설문 기간 설정
                </label>
                
                {/* 선택된 날짜 범위 표시 */}
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex items-center rounded-lg border border-gray-300 bg-white p-3 text-left hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {selectedStartDate ? formatDate(selectedStartDate) : "시작일 선택"}
                      </span>
                    </button>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCalendar(!showCalendar)}
                      className="w-full flex items-center rounded-lg border border-gray-300 bg-white p-3 text-left hover:bg-gray-50 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                    >
                      <svg className="mr-2 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-gray-700">
                        {selectedEndDate ? formatDate(selectedEndDate) : "종료일 선택"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 캘린더 */}
                {showCalendar && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => navigateMonth('prev')}
                        className="rounded-lg p-2 hover:bg-gray-100"
                      >
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                      </h3>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => navigateMonth('next')}
                          className="rounded-lg p-2 hover:bg-gray-100"
                        >
                          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCalendar(false)}
                          className="rounded-lg p-2 hover:bg-gray-100"
                        >
                          <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* 요일 헤더 */}
                    <div className="mb-2 grid grid-cols-7 gap-1">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                        <div key={day} className="py-2 text-center text-sm font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* 날짜 그리드 */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                        <div key={`empty-${i}`} className="py-2"></div>
                      ))}
                      {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                        const day = i + 1;
                        const isInRange = isDateInRange(day, currentMonth);
                        const isSelected = isDateSelected(day, currentMonth);
                        const isToday = new Date().toDateString() === new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).toDateString();
                        
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDateClick(day, currentMonth)}
                            className={`
                              relative py-2 text-sm transition-colors hover:bg-blue-50
                              ${isToday ? 'bg-blue-100 font-semibold text-blue-800' : ''}
                              ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                              ${isInRange && !isSelected ? 'bg-blue-100 text-blue-700' : ''}
                              ${!isInRange && !isSelected && !isToday ? 'text-gray-700 hover:bg-gray-100' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {/* 선택된 기간 표시 */}
                    {selectedStartDate && selectedEndDate && (
                      <div className="mt-4 rounded-lg bg-blue-50 p-3">
                        <p className="text-sm text-blue-800">
                          📅 선택된 기간: <span className="font-medium">{config.surveyPeriod}일</span>
                          <span className="ml-2 text-blue-600">
                            ({config.startDate} ~ {config.endDate})
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
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
                className="flex-1 rounded-lg bg-[#3F80EA] px-4 py-3 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
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
