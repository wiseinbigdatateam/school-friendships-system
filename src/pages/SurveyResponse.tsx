import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { NotificationService } from "../services/notificationService";

interface Survey {
  id: string;
  title: string;
  description: string | null;
  questions: any;
  target_grades: string[] | null;
  target_classes: string[] | null;
  start_date: string;
  end_date: string;
  status: string;
  created_by?: string | null;
  school_id?: string | null;
  template_id?: string | null; // template_id 추가
}

interface SurveyTemplate {
  id: string;
  name: string;
  metadata: {
    category: string;
    answer_options?: any;
    maxSelections?: number[];
  };
}

const SurveyResponse: React.FC = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [surveyTemplate, setSurveyTemplate] = useState<SurveyTemplate | null>(
    null,
  ); // 템플릿 정보 추가

  // 학생 본인 확인 상태
  const [currentStep, setCurrentStep] = useState<
    "verify" | "survey" | "complete" | "already_responded"
  >("verify");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [existingResponse, setExistingResponse] = useState<any>(null);

  // 각 질문별 검색어 상태 추가
  const [questionSearchTerms, setQuestionSearchTerms] = useState<
    Record<string, string>
  >({});

  // 설문 정보와 학생 목록 로드
  useEffect(() => {
    const fetchSurveyAndStudents = async () => {
      if (!surveyId) return;

      try {
        setLoading(true);

        // 1. 설문 정보 로드
        const { data: surveyData, error: surveyError } = await supabase
          .from("surveys")
          .select("*")
          .eq("id", surveyId)
          .single();

        if (surveyError) throw surveyError;

        if (surveyData) {
          // 설문 상태 확인
          if (surveyData.status === "waiting") {
            setError(
              "이 설문은 아직 시작되지 않았습니다. 설문 시작일을 확인해주세요.",
            );
            setLoading(false);
            return;
          }

          if (surveyData.status === "completed") {
            setError("이 설문은 이미 종료되었습니다.");
            setLoading(false);
            return;
          }

          // 설문 데이터에 이미 max_selections이 포함되어 있음
          setSurvey(surveyData);

          let templateData: any = null;

          // 1-1. 설문 템플릿 정보 로드 (카테고리, 답변옵션, maxSelections 확인용)
          if (surveyData.template_id) {
            try {
              const { data: templateDataResult, error: templateError } =
                await supabase
                  .from("survey_templates")
                  .select("id, name, metadata")
                  .eq("id", surveyData.template_id)
                  .single();

              if (!templateError && templateDataResult) {
                templateData = templateDataResult;
                setSurveyTemplate({
                  id: templateData.id,
                  name: templateData.name,
                  metadata: templateData.metadata as any,
                });
              } else {
                console.error("템플릿 데이터 로드 실패:", templateError);
              }
            } catch (error) {
              console.error("템플릿 정보 로드 실패:", error);
            }
          }

          // 응답 폼 초기화 (카테고리에 따라 다르게)
          const initialResponses: Record<string, any> = {};
          if (surveyData.questions && Array.isArray(surveyData.questions)) {
            // 템플릿의 max_selections 값을 각 질문에 복사 (교우관계 카테고리만)
            const questionsWithMaxSelections = surveyData.questions.map(
              (question: any, index: number) => {
                // 교우관계 카테고리일 때만 템플릿의 max_selections 배열에서 해당 질문의 값 가져오기
                if (
                  templateData?.metadata?.category === "교우관계" &&
                  (templateData?.metadata as any)?.max_selections &&
                  Array.isArray(
                    (templateData?.metadata as any)?.max_selections,
                  ) &&
                  (templateData?.metadata as any)?.max_selections[index] !==
                    undefined
                ) {
                  const maxSelections = (templateData?.metadata as any)
                    ?.max_selections[index];

                  return {
                    ...question,
                    maxSelections: maxSelections,
                  };
                } else {
                  // 교우관계가 아니면 원본 질문 그대로 사용
                  return question;
                }
              },
            );

            // 수정된 질문 배열로 surveyData 업데이트
            surveyData.questions = questionsWithMaxSelections;

            // 학교폭력/만족도 카테고리의 경우 answer_options 적용
            if (
              templateData?.metadata?.category !== "교우관계" &&
              templateData?.metadata?.answer_options
            ) {
              surveyData.questions = surveyData.questions.map(
                (question: any, index: number) => {
                  // answer_options가 객체인 경우 (학교폭력, 만족도)
                  if (
                    templateData.metadata.answer_options &&
                    typeof templateData.metadata.answer_options === "object" &&
                    !Array.isArray(templateData.metadata.answer_options)
                  ) {
                    return {
                      ...question,
                      answer_options: templateData.metadata.answer_options,
                    };
                  }
                  // answer_options가 배열인 경우 (기타 카테고리)
                  else if (
                    templateData.metadata.answer_options &&
                    Array.isArray(templateData.metadata.answer_options) &&
                    templateData.metadata.answer_options[index]
                  ) {
                    return {
                      ...question,
                      answer_options:
                        templateData.metadata.answer_options[index],
                    };
                  }
                  return question;
                },
              );
            }

            surveyData.questions.forEach((question: any) => {
              if (question.type === "multiple_choice") {
                // 카테고리에 따라 초기값 설정
                if (templateData?.metadata?.category === "교우관계") {
                  initialResponses[question.id] = []; // 학생 ID 배열로 초기화
                } else {
                  initialResponses[question.id] = ""; // 단일 선택값으로 초기화
                }
              } else {
                initialResponses[question.id] = "";
              }
            });
          }
          setResponses(initialResponses);

          // 2. 설문 대상 학생들 로드
          if (
            surveyData.target_grades &&
            surveyData.target_classes &&
            surveyData.school_id
          ) {
            const { data: studentsData, error: studentsError } = await supabase
              .from("students")
              .select("id, name, grade, class, current_school_id, birth_date")
              .eq("current_school_id", surveyData.school_id)
              .in("grade", surveyData.target_grades)
              .in("class", surveyData.target_classes)
              .eq("is_active", true);

            if (!studentsError && studentsData) {
              setStudents(studentsData);
            }
          }
        }
      } catch (error) {
        console.error("설문 및 학생 로드 오류:", error);
        setError("설문을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyAndStudents();
  }, [surveyId]);

  // 학생 본인 확인
  const handleStudentVerification = async () => {
    if (!searchTerm.trim() || !birthDate) {
      setVerificationError("이름과 생년월일을 모두 입력해주세요.");
      return;
    }

    // 생년월일 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(birthDate)) {
      setVerificationError(
        "생년월일은 YYYY-MM-DD 형식으로 입력해주세요. (예: 2005-03-15)",
      );
      return;
    }

    // 유효한 날짜인지 확인
    const inputDate = new Date(birthDate);
    const today = new Date();

    if (isNaN(inputDate.getTime())) {
      setVerificationError("올바른 날짜를 입력해주세요.");
      return;
    }

    if (inputDate > today) {
      setVerificationError("미래의 날짜는 입력할 수 없습니다.");
      return;
    }

    // 이름과 생년월일로 학생 검증
    const matchedStudent = students.find((student) => {
      const nameMatch = student.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const birthMatch = student.birth_date === birthDate;
      return nameMatch && birthMatch;
    });

    if (matchedStudent) {
      // 이미 응답했는지 확인
      try {
        const { data: existingResponse, error } = await supabase
          .from("survey_responses")
          .select("id, submitted_at")
          .eq("survey_id", surveyId)
          .eq("student_id", matchedStudent.id)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116는 데이터가 없는 경우
          console.error("응답 확인 오류:", error);
          setVerificationError(
            "응답 상태를 확인할 수 없습니다. 다시 시도해주세요.",
          );
          return;
        }

        if (existingResponse) {
          // 이미 응답한 경우
          setSelectedStudent(matchedStudent);
          setExistingResponse(existingResponse);
          setCurrentStep("already_responded");
          return;
        }

        // 응답하지 않은 경우에만 설문 단계로 진행
        setSelectedStudent(matchedStudent);
        setCurrentStep("survey");
        setVerificationError(null);
        setSearchTerm(""); // 설문 단계로 이동할 때 검색어 초기화
        setQuestionSearchTerms({}); // 질문별 검색어도 초기화
      } catch (error) {
        console.error("응답 확인 중 오류:", error);
        setVerificationError(
          "응답 상태를 확인할 수 없습니다. 다시 시도해주세요.",
        );
      }
    } else {
      setVerificationError(
        "일치하는 학생 정보를 찾을 수 없습니다. 이름과 생년월일을 다시 확인해주세요.",
      );
    }
  };

  // 응답 처리
  const handleResponseChange = (questionId: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    // 교우관계 질문에서 친구를 선택할 때 검색어 초기화
    if (surveyTemplate?.metadata?.category === "교우관계") {
      setQuestionSearchTerms((prev) => ({
        ...prev,
        [questionId]: "",
      }));
    }
  };

  // 설문 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!survey || !surveyId || !selectedStudent) return;

    try {
      setSubmitting(true);

      // 응답 데이터 저장
      const { error } = await supabase.from("survey_responses").insert({
        survey_id: surveyId,
        student_id: selectedStudent.id,
        responses: responses,
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;

      // 설문 상태 자동 업데이트 (응답 완료 체크)
      try {
        const { SurveyService } = await import("../services/surveyService");
        await SurveyService.updateSurveyStatusByCompletion(surveyId);
      } catch (error) {
        console.error("설문 상태 자동 업데이트 오류:", error);
      }

      // 완료 알림 표시
      alert(
        `🎉 ${selectedStudent.name}님, 설문 응답이 완료되었습니다!\n\n📝 응답 내용이 성공적으로 저장되었습니다.\n👋 감사합니다!`,
      );

      // 설문 응답 완료 알림 생성 (담임교사에게)
      try {
        // 설문 정보에서 담임교사 ID 찾기
        if (survey.created_by) {
          await NotificationService.createNotification({
            user_id: survey.created_by,
            title: "설문 응답 완료",
            message: `${selectedStudent.name} 학생이 "${survey.title}" 설문에 응답했습니다.`,
            type: "success",
            category: "응답",
          });
        }
      } catch (error) {
        console.error("알림 생성 오류:", error);
      }

      setCurrentStep("complete");
    } catch (error) {
      console.error("응답 제출 오류:", error);
      alert("응답 제출에 실패했습니다. 다시 시도해주세요.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            설문을 찾을 수 없습니다
          </h1>
          <p className="mb-6 text-gray-600">
            {error || "요청하신 설문이 존재하지 않습니다."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-[#3F80EA] px-4 py-2 text-white hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 학생 본인 확인 단계
  if (currentStep === "verify") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4">
          {/* 설문 헤더 */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-center text-2xl font-bold text-gray-900">
              {survey.title}
            </h1>
            {survey.description && (
              <p className="mb-4 text-gray-600">{survey.description}</p>
            )}
            <div className="text-sm text-gray-500">
              <p>
                기간: {survey.start_date} ~ {survey.end_date}
              </p>
              <p>
                대상: {survey.target_grades?.join(", ")}학년{" "}
                {survey.target_classes?.join(", ")}반
              </p>
            </div>
          </div>

          {/* 학생 본인 확인 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-center text-xl font-semibold text-gray-900">
              본인 확인
            </h2>

            {/* 이름 입력 */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                이름
              </label>
              <input
                type="text"
                placeholder="이름을 입력하세요"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 생년월일 입력 */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                생년월일
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="YYYY-MM-DD (예: 2005-03-15)"
                  value={birthDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 숫자와 하이픈만 허용
                    const sanitizedValue = value.replace(/[^0-9-]/g, "");

                    // YYYY-MM-DD 형식으로 자동 포맷팅
                    let formattedValue = sanitizedValue;
                    if (
                      sanitizedValue.length >= 4 &&
                      !sanitizedValue.includes("-")
                    ) {
                      formattedValue =
                        sanitizedValue.slice(0, 4) +
                        "-" +
                        sanitizedValue.slice(4);
                    }
                    if (
                      formattedValue.length >= 7 &&
                      formattedValue.split("-").length === 2
                    ) {
                      formattedValue =
                        formattedValue.slice(0, 7) +
                        "-" +
                        formattedValue.slice(7);
                    }

                    // 최대 길이 제한 (YYYY-MM-DD = 10자)
                    if (formattedValue.length <= 10) {
                      setBirthDate(formattedValue);
                    }
                  }}
                  maxLength={10}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 cursor-pointer opacity-0"
                  style={{ pointerEvents: "auto" }}
                />
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 본인 확인 버튼 */}
            <button
              onClick={handleStudentVerification}
              className="mb-4 w-full rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
            >
              본인 확인
            </button>

            {/* 에러 메시지 */}
            {verificationError && (
              <div
                className={`rounded-lg border p-4 ${
                  verificationError.includes("이미 설문에 응답하셨습니다")
                    ? "border-blue-200 bg-blue-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {verificationError.includes(
                      "이미 설문에 응답하셨습니다",
                    ) ? (
                      <svg
                        className="h-5 w-5 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5 text-red-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="ml-3">
                    <p
                      className={`text-sm ${
                        verificationError.includes("이미 설문에 응답하셨습니다")
                          ? "text-blue-700"
                          : "text-red-600"
                      }`}
                    >
                      {verificationError.split("\n").map((line, index) => (
                        <span key={index}>
                          {line}
                          {index < verificationError.split("\n").length - 1 && (
                            <br />
                          )}
                        </span>
                      ))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 도움말 */}
            <div className="text-left text-xs text-gray-500">
              <p>• 정확한 이름과 생년월일을 입력해주세요</p>
              <p>
                • 생년월일은 직접 입력하거나 달력 아이콘을 클릭하여 선택할 수
                있습니다
              </p>
              <p>• 입력 형식: YYYY-MM-DD (예: 2005-03-15)</p>
              <p>• 숫자만 입력하면 자동으로 하이픈이 추가됩니다</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 설문 응답 단계
  if (currentStep === "survey") {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4">
          {/* 설문 헤더 */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {survey.title}
                </h1>
                {survey.description && (
                  <p className="mt-2 text-gray-600">{survey.description}</p>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <p>
                기간: {survey.start_date} ~ {survey.end_date}
              </p>
              <p>
                대상: {survey.target_grades?.join(", ")}학년{" "}
                {survey.target_classes?.join(", ")}반
              </p>
              <p>응답자: {selectedStudent.name}</p>
            </div>
          </div>

          {/* 설문 폼 */}
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            {survey.questions &&
              Array.isArray(survey.questions) &&
              survey.questions.map((question: any, index) => (
                <div key={question.id} className="mb-8">
                  <h3 className="mb-3 text-lg font-medium text-gray-900">
                    {index + 1}. {question.text || question.question}
                    {question.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </h3>

                  {question.type === "multiple_choice" && (
                    <div className="space-y-4">
                      {/* 카테고리에 따른 답변 방식 결정 */}
                      {surveyTemplate?.metadata?.category === "교우관계" ? (
                        // 교우관계: 학생 선택 방식
                        <>
                          <p className="mb-3 text-sm text-gray-600">
                            질문에 해당하는 친구들을 선택해주세요
                            {(() => {
                              // surveys 테이블의 questions에서 max_selections 값을 우선적으로 가져오기
                              let maxSelections = 1; // 기본값

                              // 먼저 surveyTemplate의 max_selections 배열에서 해당 질문의 값 가져오기 (우선순위 1)
                              if (
                                (surveyTemplate?.metadata as any)
                                  ?.max_selections &&
                                Array.isArray(
                                  (surveyTemplate?.metadata as any)
                                    ?.max_selections,
                                ) &&
                                (surveyTemplate?.metadata as any)
                                  ?.max_selections[index] !== undefined
                              ) {
                                maxSelections = (
                                  surveyTemplate?.metadata as any
                                )?.max_selections[index];
                              } else if (
                                surveyTemplate?.metadata?.maxSelections &&
                                Array.isArray(
                                  surveyTemplate.metadata.maxSelections,
                                ) &&
                                surveyTemplate.metadata.maxSelections[index] !==
                                  undefined
                              ) {
                                maxSelections =
                                  surveyTemplate.metadata.maxSelections[index];
                              } else if (
                                question.max_selections !== undefined &&
                                question.max_selections !== null
                              ) {
                                // 문자열인 경우 숫자로 변환
                                if (
                                  typeof question.max_selections === "string"
                                ) {
                                  maxSelections =
                                    parseInt(question.max_selections) || 1;
                                } else {
                                  maxSelections = question.max_selections;
                                }
                              } else if (
                                question.maxSelections !== undefined &&
                                question.maxSelections !== null
                              ) {
                                maxSelections = question.maxSelections;
                              }

                              // 숫자가 아닌 경우 기본값 사용
                              if (
                                typeof maxSelections !== "number" ||
                                isNaN(maxSelections)
                              ) {
                                maxSelections = 1;
                              }

                              return maxSelections > 1 ? (
                                <span className="font-medium text-blue-600">
                                  {" "}
                                  (최대 {maxSelections}명 선택 가능)
                                </span>
                              ) : (
                                <span className="font-medium text-gray-500">
                                  {" "}
                                  (1명 선택)
                                </span>
                              );
                            })()}
                          </p>

                          {/* 학생 검색 */}
                          <div className="mb-4">
                            <input
                              type="text"
                              placeholder="친구 이름으로 검색..."
                              value={questionSearchTerms[question.id] || ""}
                              onChange={(e) =>
                                setQuestionSearchTerms((prev) => ({
                                  ...prev,
                                  [question.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          {/* 선택된 친구들 표시 */}
                          {responses[question.id] &&
                            responses[question.id].length > 0 && (
                              <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-2">
                                <p className="mb-1 text-xs font-medium text-blue-800">
                                  선택된 친구들:
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {responses[question.id].map(
                                    (studentId: string) => {
                                      const student = students.find(
                                        (s) => s.id === studentId,
                                      );
                                      return student ? (
                                        <span
                                          key={studentId}
                                          className="inline-block rounded bg-blue-100 px-2 py-1 text-xs text-blue-700"
                                        >
                                          {student.name}
                                        </span>
                                      ) : null;
                                    },
                                  )}
                                </div>
                              </div>
                            )}

                          {/* 학생 선택 목록 */}
                          <div className="grid max-h-80 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-gray-200 p-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                            {students
                              .filter(
                                (student) => student.id !== selectedStudent.id,
                              ) // 자기 자신 제외
                              .filter((student) => {
                                const currentSearchTerm =
                                  questionSearchTerms[question.id] || "";
                                return (
                                  currentSearchTerm === "" ||
                                  student.name
                                    .toLowerCase()
                                    .includes(currentSearchTerm.toLowerCase())
                                );
                              }) // 검색 필터링
                              .map((student) => {
                                const currentValues =
                                  responses[question.id] || [];
                                const isSelected = currentValues.includes(
                                  student.id,
                                );

                                // 질문의 maxSelections 값 사용 (이미 템플릿 값으로 수정됨)
                                const maxSelections =
                                  question.maxSelections || 1;

                                const isDisabled =
                                  !isSelected &&
                                  currentValues.length >= maxSelections;

                                return (
                                  <label
                                    key={student.id}
                                    className={`flex cursor-pointer items-center rounded-lg border p-2 transition-colors ${
                                      isSelected
                                        ? "border-blue-300 bg-blue-50"
                                        : isDisabled
                                          ? "cursor-not-allowed border-gray-200 bg-gray-100 opacity-50"
                                          : "border-gray-200 hover:bg-gray-50"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      disabled={isDisabled}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          // 선택 제한 확인
                                          if (
                                            currentValues.length < maxSelections
                                          ) {
                                            handleResponseChange(question.id, [
                                              ...currentValues,
                                              student.id,
                                            ]);
                                          }
                                        } else {
                                          handleResponseChange(
                                            question.id,
                                            currentValues.filter(
                                              (id: string) => id !== student.id,
                                            ),
                                          );
                                        }
                                      }}
                                      className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="overflow-hidden truncate whitespace-nowrap text-sm font-medium text-gray-900">
                                        {student.name}
                                      </p>
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                        </>
                      ) : (
                        // 학교폭력, 만족도: answer_options 표시
                        <>
                          <p className="mb-3 text-sm text-gray-600">
                            아래 옵션 중 하나를 선택해주세요
                          </p>

                          {/* 답변 옵션 */}
                          <div className="space-y-3">
                            {question.answer_options &&
                              Object.entries(question.answer_options).map(
                                ([key, value]) => (
                                  <label
                                    key={key}
                                    className="flex cursor-pointer items-center rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                                  >
                                    <input
                                      type="radio"
                                      name={question.id}
                                      value={key}
                                      checked={responses[question.id] === key}
                                      onChange={(e) =>
                                        handleResponseChange(
                                          question.id,
                                          e.target.value,
                                        )
                                      }
                                      className="mr-3 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                                      required={question.required}
                                    />
                                    <span className="text-gray-900">
                                      {String(value)}
                                    </span>
                                  </label>
                                ),
                              )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {question.type === "text" && (
                    <textarea
                      value={responses[question.id] || ""}
                      onChange={(e) =>
                        handleResponseChange(question.id, e.target.value)
                      }
                      required={question.required}
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="답변을 입력하세요..."
                    />
                  )}
                </div>
              ))}

            {/* 제출 버튼 */}
            <div className="flex justify-between border-t border-gray-200 pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#3F80EA] px-6 py-3 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "📤 제출 중..." : "🎯 설문 제출하기"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 이미 응답한 경우
  if (currentStep === "already_responded") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-blue-600">
            📝 이미 응답 완료!
          </h2>
          <p className="mb-4 text-lg text-gray-700">
            <span className="font-semibold text-blue-600">
              {selectedStudent.name}
            </span>
            님은 이미 이 설문에 응답하셨습니다.
          </p>
          <div className="mb-6 space-y-2 text-sm text-gray-600">
            <p className="flex items-center justify-center">
              <span className="mr-2">⏰</span>
              응답 시간:{" "}
              {new Date(existingResponse.submitted_at).toLocaleString("ko-KR")}
            </p>
            <p className="flex items-center justify-center">
              <span className="mr-2">✅</span>
              응답 내용이 안전하게 저장되었습니다
            </p>
            <p className="flex items-center justify-center">
              <span className="mr-2">🚫</span>
              중복 응답은 불가능합니다
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => {
                setCurrentStep("verify");
                setSearchTerm("");
                setBirthDate("");
                setVerificationError(null);
                setExistingResponse(null);
              }}
              className="w-full rounded-lg bg-gray-100 px-6 py-3 text-gray-700 hover:bg-gray-200"
            >
              🔄 다른 학생으로 확인하기
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              🏠 홈으로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 완료 단계
  if (currentStep === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-green-600">
            🎉 설문 완료!
          </h2>
          <p className="mb-4 text-lg text-gray-700">
            <span className="font-semibold text-blue-600">
              {selectedStudent.name}
            </span>
            님, 설문 응답이 성공적으로 완료되었습니다!
          </p>
          <div className="mb-6 space-y-2 text-sm text-gray-600">
            <p className="flex items-center justify-center">
              <span className="mr-2">✅</span>
              응답 내용이 안전하게 저장되었습니다
            </p>
            <p className="flex items-center justify-center">
              <span className="mr-2">📊</span>
              담임선생님이 결과를 확인 후 안내해드릴 예정입니다
            </p>
            <p className="flex items-center justify-center">
              <span className="mr-2">👋</span>
              참여해주셔서 정말 감사합니다!
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SurveyResponse;
