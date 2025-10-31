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
    "verify" | "consent" | "survey" | "complete" | "already_responded"
  >("verify");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [verificationError, setVerificationError] = useState<string | null>(
    null,
  );
  const [existingResponse, setExistingResponse] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  const [forceParentConsent, setForceParentConsent] = useState<boolean>(false);

  // 개인정보동의 관련 상태
  const [isUnder14, setIsUnder14] = useState<boolean>(false);
  const [studentConsent, setStudentConsent] = useState<boolean>(false);
  const [consentError, setConsentError] = useState<string | null>(null);
  // 특정 설문(학부모 개인정보 수집·이용 동의서)은 동의 페이지를 건너뛰고 바로 설문 진행
  const [isParentConsentSurvey, setIsParentConsentSurvey] = useState<boolean>(false);
  
  // 학부모 개인정보 동의서 상태
  const [consentStep, setConsentStep] = useState<number>(1); // 1: 동의서 전문, 2: 학생정보, 3: 보호자정보, 4: 최종확인
  const [privacyConsent, setPrivacyConsent] = useState<string>(""); // 예/아니오
  const [studentInfo, setStudentInfo] = useState({
    name: "",
    birthDate: "",
    gradeClass: ""
  });
  const [parentInfo, setParentInfo] = useState({
    name: "",
    relationship: "", // 부/모/기타
    relationshipOther: ""
  });
  const [finalConsent, setFinalConsent] = useState({
    parentName: "",
    date: new Date().toISOString().split("T")[0]
  });

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

          // 학교 이름 조회
          if (surveyData.school_id) {
            try {
              const { data: schoolData, error: schoolError } = await supabase
                .from("schools")
                .select("name")
                .eq("id", surveyData.school_id)
                .single();

              if (!schoolError && schoolData) {
                setSchoolName(schoolData.name);
              } else {
                setSchoolName("알 수 없는 학교");
              }
            } catch (schoolError) {
              console.error("학교 이름 조회 오류:", schoolError);
              setSchoolName("알 수 없는 학교");
            }
          }

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
                
                // 종합조사 설문의 경우 settings에서 카테고리 정보 가져오기
                let metadata = templateData.metadata as any;
                if (surveyData.settings && (surveyData.settings as any).surveyType === "comprehensive") {
                  metadata = {
                    ...metadata,
                    category: "종합조사",
                    questionCategories: ["교우관계", "만족도", "만족도", "만족도", "만족도", "학교폭력", "학교폭력", "학교폭력", "주관식"],
                    questionTypes: ["multiple_choice", "yes_no", "yes_no", "yes_no", "yes_no", "scale", "scale", "scale", "text"],
                    questionOptions: [
                      ["아무도 없다"],
                      ["예", "아니오"], ["예", "아니오"], ["예", "아니오"], ["예", "아니오"],
                      ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
                      ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
                      ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
                      []
                    ]
                  };
                }
                
                
                setSurveyTemplate({
                  id: templateData.id,
                  name: templateData.name,
                  metadata: metadata,
                });
                const combinedTitle = `${surveyData.title || ""} ${templateData.name || ""}`;
                if (combinedTitle.includes("개인정보") && combinedTitle.includes("동의")) {
                  setIsParentConsentSurvey(true);
                } else {
                  setIsParentConsentSurvey(false);
                }
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
            // 템플릿의 max_selections 값을 각 질문에 복사 (교우관계 및 종합조사 카테고리)
            const questionsWithMaxSelections = surveyData.questions.map(
              (question: any, index: number) => {
                // 교우관계 또는 종합조사 카테고리일 때 템플릿의 max_selections 배열에서 해당 질문의 값 가져오기
                if (
                  (templateData?.metadata?.category === "교우관계" || 
                   templateData?.metadata?.category === "종합조사") &&
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
                  // 교우관계나 종합조사가 아니면 원본 질문 그대로 사용
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

            // 종합조사 설문의 경우 question.options를 answer_options로 변환
            if (templateData?.metadata?.category === "종합조사") {
              surveyData.questions = surveyData.questions.map((question: any, index: number) => {
                if (question.options && Array.isArray(question.options) && question.options.length > 0) {
                  // options 배열을 answer_options 객체로 변환
                  const answerOptions: any = {};
                  question.options.forEach((option: string, optionIndex: number) => {
                    answerOptions[`option_${optionIndex + 1}`] = option;
                  });
                  
                  return {
                    ...question,
                    answer_options: answerOptions
                  };
                }
                return question;
              });
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
              .select("id, name, grade, class, current_school_id, birth_date, parent_consent")
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

  // URL ?forceConsent=1 이 있으면 학부모 동의서 강제 노출
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const force = params.get("forceConsent");
      if (force === "1" || force === "true") {
        setForceParentConsent(true);
      }
    } catch (e) {
      // ignore
    }
  }, []);

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
        // 학부모 동의서 설문인 경우 새 테이블 확인, 일반 설문인 경우 기존 테이블 확인
        const tableName = isParentConsentSurvey 
          ? "parent_consent_survey_responses" 
          : "survey_responses";
        
        const { data: existingResponse, error } = await (supabase as any)
          .from(tableName)
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

        // 응답하지 않은 경우에만 동의 단계로 진행
        setSelectedStudent(matchedStudent);
        
        // 나이 계산 (14세 미만 여부 확인)
        const today = new Date();
        const birthDateObj = new Date(matchedStudent.birth_date);
        let age = today.getFullYear() - birthDateObj.getFullYear();
        const monthDiff = today.getMonth() - birthDateObj.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
          age -= 1;
        }
        setIsUnder14(age < 14);
        
        // 학부모 동의서 설문인 경우 최종 동의 날짜를 오늘 날짜로 초기화
        if (isParentConsentSurvey) {
          setFinalConsent({
            parentName: "",
            date: new Date().toISOString().split("T")[0]
          });
        }
        
        // 동의 단계 건너뛰기: 학부모 개인정보 수집·이용 동의서 설문은 바로 설문으로 이동
        setCurrentStep(isParentConsentSurvey ? "survey" : "consent");
        setVerificationError(null);
        setSearchTerm(""); // 동의 단계로 이동할 때 검색어 초기화
        setQuestionSearchTerms({}); // 질문별 검색어도 초기화
      } catch (error) {
        console.error("응답 확인 중 오류:", error);
        setVerificationError(
          "응답 상태를 확인할 수 없습니다. 다시 시도해주세요.",
        );
      }
    } else {
      // 개발/테스트용: 강제 동의서 노출 시 학생 매칭이 없어도 동의 단계로 진입
      if (forceParentConsent) {
        const mockStudent = {
          id: "mock-student-id",
          name: searchTerm || "테스트학생",
          birth_date: birthDate || "2015-01-01",
          grade: "3",
          class: "1",
          parent_consent: false,
        } as any;

        setSelectedStudent(mockStudent);
        setIsUnder14(true);
        setCurrentStep("consent");
        setVerificationError(null);
        setSearchTerm("");
        setQuestionSearchTerms({});
        return;
      }

      setVerificationError(
        "일치하는 학생 정보를 찾을 수 없습니다. 이름과 생년월일을 다시 확인해주세요.",
      );
    }
  };

  // 개인정보동의 처리 - 기존 방식 (14세 이상 또는 학부모 동의 완료된 경우)
  const handleConsentSubmit = () => {
    // 14세 미만이고 학부모 동의가 없는 경우 학부모 동의서 양식으로 이동
    if ((isUnder14 && !selectedStudent.parent_consent) || forceParentConsent) {
      setConsentStep(1);
      setPrivacyConsent("");
      setStudentInfo({
        name: selectedStudent.name || "",
        birthDate: selectedStudent.birth_date || "",
        gradeClass: `${selectedStudent.grade}학년 ${selectedStudent.class}반`
      });
      // 최종 동의 날짜를 오늘 날짜로 설정
      setFinalConsent({
        parentName: "",
        date: new Date().toISOString().split("T")[0]
      });
      return;
    }
    
    // 학생 본인 동의 확인
    if (!studentConsent) {
      setConsentError("개인정보 수집·이용에 대한 동의가 필요합니다.");
      return;
    }
    
    setConsentError(null);
    setCurrentStep("survey");
  };

  // 학부모 동의서 단계별 처리
  const handleParentConsentStep = async () => {
    if (consentStep === 1) {
      // 1단계: 동의 여부 확인
      if (!privacyConsent) {
        setConsentError("개인정보 수집 이용에 동의 여부를 선택해주세요.");
        return;
      }
      if (privacyConsent === "아니오") {
        alert("개인정보 수집·이용에 동의하지 않으시면 설문에 참여하실 수 없습니다.");
        navigate("/");
        return;
      }
      setConsentStep(2);
      setConsentError(null);
    } else if (consentStep === 2) {
      // 2단계: 학생정보 확인
      if (!studentInfo.name || !studentInfo.birthDate || !studentInfo.gradeClass) {
        setConsentError("모든 학생정보를 입력해주세요.");
        return;
      }
      setConsentStep(3);
      setConsentError(null);
    } else if (consentStep === 3) {
      // 3단계: 보호자정보 확인
      if (!parentInfo.name || !parentInfo.relationship) {
        setConsentError("보호자 이름과 관계를 입력해주세요.");
        return;
      }
      if (parentInfo.relationship === "기타" && !parentInfo.relationshipOther) {
        setConsentError("학생과의 관계를 입력해주세요.");
        return;
      }
      setConsentStep(4);
      setConsentError(null);
      setFinalConsent({
        ...finalConsent,
        parentName: parentInfo.name,
        date: new Date().toISOString().split("T")[0]
      });
    } else if (consentStep === 4) {
      // 4단계: 최종 동의 확인 및 저장
      if (!finalConsent.parentName || !finalConsent.date) {
        setConsentError("보호자 성명과 날짜를 입력해주세요.");
        return;
      }
      try {
        // 1) parent_consents 테이블에 동의 레코드 저장
        const parentContact = {
          relationship: parentInfo.relationship,
          relationship_other: parentInfo.relationship === "기타" ? parentInfo.relationshipOther : null,
        };

        const { error: insertConsentError } = await supabase
          .from("parent_consents")
          .insert({
            student_id: selectedStudent.id,
            consent_given: true,
            consent_type: "survey_privacy",
            consent_date: finalConsent.date,
            parent_name: finalConsent.parentName,
            parent_contact: parentContact,
          });

        if (insertConsentError) {
          console.error("학부모 동의 저장 오류:", insertConsentError);
          setConsentError("동의 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
          return;
        }

        // 2) 학생 테이블의 parent_consent 플래그 업데이트
        const { error: updateStudentError } = await supabase
          .from("students")
          .update({ parent_consent: true })
          .eq("id", selectedStudent.id);

        if (updateStudentError) {
          console.error("학생 동의 플래그 업데이트 오류:", updateStudentError);
          setConsentError("동의 상태 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.");
          return;
        }

        // UI 상태 반영
        setSelectedStudent({ ...selectedStudent, parent_consent: true });
        setStudentConsent(true);
        setConsentError(null);
        setCurrentStep("survey");
      } catch (e) {
        console.error("동의 처리 중 예외:", e);
        setConsentError("동의 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
  };

  // 이전 단계로 돌아가기
  const handlePrevStep = () => {
    if (consentStep > 1) {
      setConsentStep(consentStep - 1);
      setConsentError(null);
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

  // 필수 항목 검증 (실시간 버튼 활성화용)
  const isAllRequiredFieldsCompleted = () => {
    if (!survey || !survey.questions) return true;

    const requiredQuestions = survey.questions.filter(
      (question: any) => question.required,
    );

    for (const question of requiredQuestions) {
      const response = responses[question.id];

      if (question.type === "multiple_choice") {
        // 교우관계 카테고리인 경우 배열이 비어있으면 안됨
        if (surveyTemplate?.metadata?.category === "교우관계") {
          if (!response || !Array.isArray(response) || response.length === 0) {
            return false;
          }
        } else {
          // 다른 카테고리인 경우 빈 문자열이면 안됨
          if (!response || response === "") {
            return false;
          }
        }
      } else if (question.type === "text") {
        // 텍스트 답변인 경우 빈 문자열이면 안됨
        if (!response || response.trim() === "") {
          return false;
        }
      }
    }

    return true;
  };

  // 필수 항목 검증 (제출 시 상세 검증용)
  const validateRequiredFields = () => {
    if (!survey || !survey.questions)
      return { isValid: true, firstMissingQuestionId: null };

    const requiredQuestions = survey.questions.filter(
      (question: any) => question.required,
    );

    for (const question of requiredQuestions) {
      const response = responses[question.id];

      if (question.type === "multiple_choice") {
        // 교우관계 카테고리인 경우 배열이 비어있으면 안됨
        if (surveyTemplate?.metadata?.category === "교우관계") {
          if (!response || !Array.isArray(response) || response.length === 0) {
            return { isValid: false, firstMissingQuestionId: question.id };
          }
        } else {
          // 다른 카테고리인 경우 빈 문자열이면 안됨
          if (!response || response === "") {
            return { isValid: false, firstMissingQuestionId: question.id };
          }
        }
      } else if (question.type === "text") {
        // 텍스트 답변인 경우 빈 문자열이면 안됨
        if (!response || response.trim() === "") {
          return { isValid: false, firstMissingQuestionId: question.id };
        }
      }
    }

    return { isValid: true, firstMissingQuestionId: null };
  };

  // 설문 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!survey || !surveyId || !selectedStudent) return;

    // 학부모 개인정보 수집·이용 동의서 설문일 경우, 상단 동의서 내용을 우선 DB에 반영
    if (isParentConsentSurvey) {
      // 동의 여부 확인
      if (privacyConsent !== "예") {
        alert("개인정보 수집·이용에 동의(예)해주셔야 설문을 제출할 수 있습니다.");
        return;
      }
      if (!finalConsent.parentName || !finalConsent.date) {
        alert("보호자 성명과 날짜를 입력해주세요.");
        return;
      }

      try {
        // 기존 동의 기록 삭제 (동일 학생, 동일 유형)
        await supabase
          .from("parent_consents")
          .delete()
          .eq("student_id", selectedStudent.id)
          .eq("consent_type", "survey_privacy");

        // 신규 동의 기록 저장
        const parentContact = {
          relationship: parentInfo.relationship || null,
          relationship_other:
            parentInfo.relationship === "기타" ? parentInfo.relationshipOther || null : null,
          student_info: {
            name: studentInfo.name || selectedStudent.name,
            birthDate: studentInfo.birthDate || selectedStudent.birth_date,
            gradeClass: studentInfo.gradeClass || `${selectedStudent.grade}학년 ${selectedStudent.class}반`,
          },
        };

        const { error: insertConsentError } = await supabase
          .from("parent_consents")
          .insert({
            student_id: selectedStudent.id,
            consent_given: true,
            consent_type: "survey_privacy",
            consent_date: finalConsent.date,
            parent_name: finalConsent.parentName,
            parent_contact: parentContact,
          });

        if (insertConsentError) {
          console.error("학부모 동의 저장 오류:", insertConsentError);
          alert("동의서 저장 중 오류가 발생했습니다. 다시 시도해주세요.");
          return;
        }

        // 학생 플래그 업데이트
        const { error: updateStudentError } = await supabase
          .from("students")
          .update({ parent_consent: true })
          .eq("id", selectedStudent.id);

        if (updateStudentError) {
          console.error("학생 동의 플래그 업데이트 오류:", updateStudentError);
          alert("동의 상태 업데이트 중 오류가 발생했습니다. 다시 시도해주세요.");
          return;
        }
      } catch (err) {
        console.error("동의 처리 중 예외:", err);
        alert("동의 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
    }

    try {
      setSubmitting(true);

      // 학부모 개인정보 수집·이용 동의서 설문인 경우
      if (isParentConsentSurvey) {
        // 기존 동의 기록 삭제
        await supabase
          .from("parent_consents")
          .delete()
          .eq("student_id", selectedStudent.id)
          .eq("consent_type", "survey_privacy");

        // 기존 설문 응답 기록도 삭제 (있다면)
        await (supabase as any)
          .from("parent_consent_survey_responses")
          .delete()
          .eq("survey_id", surveyId)
          .eq("student_id", selectedStudent.id);

        // 새 테이블에 저장
        const { error: insertError } = await (supabase as any)
          .from("parent_consent_survey_responses")
          .insert({
            survey_id: surveyId,
            student_id: selectedStudent.id,
            privacy_consent: privacyConsent || "예",
            student_info: {
              name: studentInfo.name || selectedStudent.name,
              birth_date: studentInfo.birthDate || selectedStudent.birth_date,
              grade_class: studentInfo.gradeClass || `${selectedStudent.grade}학년 ${selectedStudent.class}반`,
            },
            parent_info: {
              name: parentInfo.name,
              relationship: parentInfo.relationship,
              relationship_other: parentInfo.relationship === "기타" ? parentInfo.relationshipOther : null,
            },
            final_consent: {
              parent_name: finalConsent.parentName,
              date: finalConsent.date,
            },
            submitted_at: new Date().toISOString(),
          });

        if (insertError) throw insertError;

        // parent_consents 테이블에도 저장 (기존 로직 유지)
        const parentContact = {
          relationship: parentInfo.relationship || null,
          relationship_other:
            parentInfo.relationship === "기타" ? parentInfo.relationshipOther || null : null,
          student_info: {
            name: studentInfo.name || selectedStudent.name,
            birthDate: studentInfo.birthDate || selectedStudent.birth_date,
            gradeClass: studentInfo.gradeClass || `${selectedStudent.grade}학년 ${selectedStudent.class}반`,
          },
        };

        await supabase.from("parent_consents").insert({
          student_id: selectedStudent.id,
          consent_given: true,
          consent_type: "survey_privacy",
          consent_date: finalConsent.date,
          parent_name: finalConsent.parentName,
          parent_contact: parentContact,
        });

        // 학생 플래그 업데이트
        await supabase
          .from("students")
          .update({ parent_consent: true })
          .eq("id", selectedStudent.id);

        // 완료 알림
        alert(
          `✅ 학부모 개인정보 수집·이용 동의서가 완료되었습니다!\n\n📝 동의서 내용이 성공적으로 저장되었습니다.\n👋 감사합니다!`,
        );

        // 알림 생성
        try {
          if (survey.created_by) {
            await NotificationService.createNotification({
              user_id: survey.created_by,
              title: "학부모 동의서 완료",
              message: `${selectedStudent.name} 학생의 학부모 개인정보 수집·이용 동의서가 완료되었습니다.`,
              type: "success",
              category: "응답",
            });
          }
        } catch (error) {
          console.error("알림 생성 오류:", error);
        }

        setCurrentStep("complete");
        return;
      }

      // 일반 설문 응답 저장 (기존 로직)
      // 필수 항목 검증
      const validation = validateRequiredFields();
      if (!validation.isValid) {
        alert("필수 항목을 모두 입력해주세요.");

        // 누락된 질문으로 스크롤
        if (validation.firstMissingQuestionId) {
          const element = document.getElementById(
            `question-${validation.firstMissingQuestionId}`,
          );
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            // 시각적 강조를 위해 잠시 하이라이트
            element.classList.add("ring-2", "ring-red-500", "ring-opacity-50");
            setTimeout(() => {
              element.classList.remove(
                "ring-2",
                "ring-red-500",
                "ring-opacity-50",
              );
            }, 3000);
          }
        }
        setSubmitting(false);
        return;
      }
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
        {/* 배경 이미지 */}
        <div
          className="absolute top-0 z-0 h-full w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/mask_bg.png')`,
          }}
        ></div>
        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        <div className="absolute inset-0 z-10 h-full w-full bg-black/40"></div>

        <div className="z-50">
          <div className="mb-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold shadow-sm">
            {schoolName || "OO 초등학교"}
          </div>
          {/* 설문 헤더 */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-center text-lg font-bold text-gray-900">
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
              확인
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

  // 개인정보동의 단계
  if (currentStep === "consent") {
    // 14세 미만이고 학부모 동의가 없는 경우 - 새로운 학부모 동의서 양식
    if (isUnder14 && !selectedStudent.parent_consent) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 py-8">
          {/* 배경 이미지 */}
          <div
            className="absolute top-0 z-0 h-full w-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/mask_bg.png')`,
            }}
          ></div>
          {/* 어두운 오버레이로 텍스트 가독성 향상 */}
          <div className="absolute inset-0 z-10 h-full w-full bg-black/40"></div>

          <div className="z-50 w-full max-w-4xl px-4">
            <div className="mb-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold shadow-sm">
              {schoolName || "OO 초등학교"}
            </div>
            
            {/* 설문 헤더 */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h1 className="mb-4 text-center text-lg font-bold text-gray-900">
                {survey.title}
              </h1>
            </div>

            {/* 학부모 개인정보 수집 이용 동의서 */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-center text-xl font-semibold text-gray-900">
                개인정보 수집·이용 동의서
              </h2>

              {/* 1단계: 개인정보 수집 이용 동의서 전문 */}
              {consentStep === 1 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">
                      [개인정보 수집·이용 동의서 전문]
                    </h3>
                    <div className="space-y-3 text-sm text-gray-700">
                      <div>
                        <p className="mb-2 font-semibold">1. 수집·이용 목적</p>
                        <p className="ml-4">학생의 교우관계·학교생활 관련 설문 응답 수집 및 분석, 학급·개별 리포트 제공, 교육지원 및 상담 참고 자료 활용</p>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">2. 수집 항목</p>
                        <p className="ml-4">(필수) 학생 이름, 생년월일, 학급/학번, 설문 응답</p>
                        <p className="ml-4">(필수-운영) 보호자 성명, 보호자 이메일(연락처)</p>
                        <p className="ml-4">(선택) 보호자 휴대폰(알림·전화확인용)</p>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">3. 보유·이용 기간</p>
                        <p className="ml-4">수집일부터 학기 종료 후 6개월 보관, 이후 즉시 파기 (단, 법령에 따른 보관 의무가 있을 경우 해당 기간 준수)</p>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">4. 개인정보 처리 위탁</p>
                        <p className="ml-4">위탁받는 자(수탁자): (주)와이즈인컴퍼니</p>
                        <p className="ml-4">위탁 업무의 내용: 설문 시스템 운영, 응답 데이터 저장·분석, 학급/개별 리포트 생성, 시스템 유지보수</p>
                        <p className="ml-4">위탁 항목: 학생(이름, 생년월일, 학급/번호, 설문 응답), 보호자(성명, 이메일, 휴대폰번호[선택])</p>
                        <p className="ml-4">위탁 처리 기간: 수집일부터 학기 종료 후 6개월까지 보관 후 즉시 파기 (법령상 별도 보관 의무가 있는 경우 해당 기간 준수)</p>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">5. 동의 거부 권리 및 불이익</p>
                        <p className="ml-4">귀하는 동의를 거부할 권리가 있으나, 동의 거부 시 본 설문에 따른 학급·개별 리포트 제공이 제한될 수 있습니다. 다만, 수업 참여 자체에는 영향이 없습니다.</p>
                      </div>
                      <div>
                        <p className="mb-2 font-semibold">6. 권리 행사</p>
                        <p className="ml-4">법정대리인은 열람·정정·삭제·처리정지·동의철회를 요청할 수 있으며, 문의·청구는 위 문의처로 해 주시기 바랍니다.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-4 text-base font-semibold text-gray-900">
                      개인정보 수집 이용에 동의합십니까?
                    </p>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="privacyConsent"
                          value="예"
                          checked={privacyConsent === "예"}
                          onChange={(e) => setPrivacyConsent(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">예</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="privacyConsent"
                          value="아니오"
                          checked={privacyConsent === "아니오"}
                          onChange={(e) => setPrivacyConsent(e.target.value)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">아니오</span>
                      </label>
                    </div>
                  </div>

                  {consentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{consentError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleParentConsentStep}
                      className="flex-1 rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}

              {/* 2단계: 학생정보 입력 */}
              {consentStep === 2 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">
                      2번 물음: 학생정보를 입력해주세요
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          학생이름
                        </label>
                        <input
                          type="text"
                          value={studentInfo.name}
                          onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="학생 이름을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          생년월일
                        </label>
                        <input
                          type="date"
                          value={studentInfo.birthDate}
                          onChange={(e) => setStudentInfo({ ...studentInfo, birthDate: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          학년반
                        </label>
                        <input
                          type="text"
                          value={studentInfo.gradeClass}
                          onChange={(e) => setStudentInfo({ ...studentInfo, gradeClass: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="예: 3학년 1반"
                        />
                      </div>
                    </div>
                  </div>

                  {consentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{consentError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handlePrevStep}
                      className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      이전
                    </button>
                    <button
                      onClick={handleParentConsentStep}
                      className="flex-1 rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}

              {/* 3단계: 보호자 정보 입력 */}
              {consentStep === 3 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">
                      3번 물음: 보호자(법정대리인) 정보를 입력해주세요
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          보호자이름
                        </label>
                        <input
                          type="text"
                          value={parentInfo.name}
                          onChange={(e) => setParentInfo({ ...parentInfo, name: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="보호자 이름을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          학생과의 관계
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="relationship"
                              value="부"
                              checked={parentInfo.relationship === "부"}
                              onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value, relationshipOther: "" })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">부</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="relationship"
                              value="모"
                              checked={parentInfo.relationship === "모"}
                              onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value, relationshipOther: "" })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">모</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="relationship"
                              value="기타"
                              checked={parentInfo.relationship === "기타"}
                              onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">기타</span>
                            {parentInfo.relationship === "기타" && (
                              <input
                                type="text"
                                value={parentInfo.relationshipOther}
                                onChange={(e) => setParentInfo({ ...parentInfo, relationshipOther: e.target.value })}
                                className="ml-2 rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="관계를 입력하세요"
                              />
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {consentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{consentError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handlePrevStep}
                      className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      이전
                    </button>
                    <button
                      onClick={handleParentConsentStep}
                      className="flex-1 rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
                    >
                      다음
                    </button>
                  </div>
                </div>
              )}

              {/* 4단계: 최종 확인 */}
              {consentStep === 4 && (
                <div className="space-y-6">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="mb-4 text-base font-semibold text-gray-900">
                      최종 확인
                    </h3>
                    <div className="space-y-4">
                      <p className="text-sm text-gray-700">
                        위 요약 고지 및 전문을 확인하였고, 법정대리인으로서 자녀의 설문 응답 수집·이용에 동의합니다.
                      </p>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          보호자 성명
                        </label>
                        <input
                          type="text"
                          value={finalConsent.parentName}
                          onChange={(e) => setFinalConsent({ ...finalConsent, parentName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="보호자 성명을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          날짜
                        </label>
                        <input
                          type="date"
                          value={finalConsent.date}
                          onChange={(e) => setFinalConsent({ ...finalConsent, date: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {consentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{consentError}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handlePrevStep}
                      className="flex-1 rounded-lg border border-gray-300 bg-white py-3 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      이전
                    </button>
                    <button
                      onClick={handleParentConsentStep}
                      className="flex-1 rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
                    >
                      동의하고 설문 시작하기
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 14세 이상이거나 학부모 동의가 완료된 경우 - 기존 방식
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 py-8">
        {/* 배경 이미지 */}
        <div
          className="absolute top-0 z-0 h-full w-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/mask_bg.png')`,
          }}
        ></div>
        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        <div className="absolute inset-0 z-10 h-full w-full bg-black/40"></div>

        <div className="z-50">
          <div className="mb-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold shadow-sm">
            {schoolName || "OO 초등학교"}
          </div>
          
          {/* 설문 헤더 */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="mb-4 text-center text-lg font-bold text-gray-900">
              {survey.title}
            </h1>
            <div className="text-sm text-gray-500">
              <p>응답자: {selectedStudent.name}</p>
            </div>
          </div>

          {/* 개인정보동의 */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-center text-xl font-semibold text-gray-900">
              개인정보 수집·이용 동의
            </h2>

            {/* 개인정보 수집·이용 안내 */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-3 text-sm font-semibold text-gray-900">
                개인정보 수집·이용 안내
              </h3>
              <div className="space-y-2 text-xs text-gray-600">
                <p><strong>수집 목적:</strong> 교우관계 분석 및 학교생활 만족도 조사</p>
                <p><strong>수집 항목:</strong> 이름, 학년, 반, 설문 응답 내용</p>
                <p><strong>보유 기간:</strong> 설문 완료 후 1년</p>
                <p><strong>처리 방법:</strong> 암호화하여 안전하게 보관</p>
                <p><strong>제3자 제공:</strong> 없음</p>
              </div>
            </div>

            {/* 만 14세 이상인 경우 안내 */}
            {!isUnder14 && (
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-blue-800">
                      만 14세 이상 학생
                    </h3>
                    <p className="mt-1 text-sm text-blue-700">
                      만 14세 이상 학생은 본인 동의만으로 설문에 참여할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 학부모 동의 완료 안내 */}
            {isUnder14 && selectedStudent.parent_consent && (
              <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-semibold text-green-800">
                      학부모 동의 완료
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      학부모 동의가 완료되어 설문에 참여할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 학생 본인 동의 */}
            <div className="mb-6">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={studentConsent}
                  onChange={(e) => setStudentConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    개인정보 수집·이용 동의 (필수)
                  </span>
                  <p className="mt-1 text-gray-600">
                    위 개인정보 수집·이용에 동의합니다.
                  </p>
                </div>
              </label>
            </div>

            {/* 에러 메시지 */}
            {consentError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-600">{consentError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 동의 버튼 */}
            <button
              onClick={handleConsentSubmit}
              className="w-full rounded-lg bg-[#3F80EA] py-3 text-white transition-colors hover:bg-blue-600"
            >
              동의하고 설문 시작하기
            </button>

            {/* 도움말 */}
            <div className="mt-4 text-left text-xs text-gray-500">
              <p>• 개인정보는 설문 목적 외에 사용되지 않습니다</p>
              <p>• 동의하지 않을 경우 설문 참여가 제한될 수 있습니다</p>
              <p>• 문의사항은 담임선생님께 연락해주세요</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 설문 응답 단계
  if (currentStep === "survey") {
    return (
      <div
        className="relative min-h-screen bg-gray-50 bg-cover bg-center bg-no-repeat py-8"
        // style={{
        //   backgroundImage: `url('/mask_bg.png')`,
        // }}
      >
        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        {/* <div className="absolute inset-0 z-10 h-full w-full bg-black/40"></div> */}

        <div className="relative z-50 mx-auto max-w-4xl px-4">
          <div className="mb-2 rounded-lg border border-gray-200 bg-white px-6 py-3 text-base font-semibold shadow-sm">
            {schoolName || "OO 초등학교"}
          </div>
          {/* 설문 헤더 */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isParentConsentSurvey ? "학부모 개인정보 수집·이용 동의서" : survey.title}
                </h1>
                {!isParentConsentSurvey && survey.description && (
                  <p className="mt-2 text-sm text-gray-600">
                    {survey.description}
                  </p>
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

          {/* 학부모 개인정보 수집·이용 동의서 - 설문 상단에 표시 (동의 단계 스킵 시) */}
          {isParentConsentSurvey && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
              
              <div className="space-y-4 text-sm text-amber-900">
                <div className="rounded-lg border border-amber-200 bg-white p-4">
                  <p className="mb-2 font-semibold">[개인정보 수집·이용 동의서 전문]</p>
                  <div className="space-y-2">
                    <p><span className="font-semibold">1. 수집·이용 목적</span> 학생의 교우관계·학교생활 관련 설문 응답 수집 및 분석, 학급·개별 리포트 제공, 교육지원 및 상담 참고 자료 활용</p>
                    <p><span className="font-semibold">2. 수집 항목</span> (필수) 학생 이름, 생년월일, 학급/학번, 설문 응답 / (필수-운영) 보호자 성명, 보호자 이메일(연락처) / (선택) 보호자 휴대폰(알림·전화확인용)</p>
                    <p><span className="font-semibold">3. 보유·이용 기간</span> 수집일부터 학년 종료 후 6개월 보관, 이후 즉시 파기 (단, 법령에 따른 보관 의무가 있을 경우 해당 기간 준수)</p>
                    <p><span className="font-semibold">4. 개인정보 처리 위탁</span> (주)와이즈인컴퍼니, 설문 시스템 운영·저장·분석·리포트 생성·유지보수, 보관기간 동일</p>
                    <p><span className="font-semibold">5. 동의 거부 권리 및 불이익</span> 동의 거부 시 학급·개별 리포트 제공 제한 (수업 참여에는 영향 없음)</p>
                    <p><span className="font-semibold">6. 권리 행사</span> 법정대리인은 열람·정정·삭제·처리정지·동의철회 가능</p>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-white p-4">
                  <p className="mb-3 font-medium">개인정보 수집·이용에 동의합십니까?</p>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="privacyConsentInline"
                        value="예"
                        checked={privacyConsent === "예"}
                        onChange={(e) => setPrivacyConsent(e.target.value)}
                        className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span>예</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="privacyConsentInline"
                        value="아니오"
                        checked={privacyConsent === "아니오"}
                        onChange={(e) => setPrivacyConsent(e.target.value)}
                        className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                      />
                      <span>아니오</span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-amber-200 bg-white p-4">
                    <p className="mb-3 font-medium">학생정보</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={studentInfo.name}
                        onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                        placeholder="학생이름"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="date"
                        value={studentInfo.birthDate}
                        onChange={(e) => setStudentInfo({ ...studentInfo, birthDate: e.target.value })}
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                      <input
                        type="text"
                        value={studentInfo.gradeClass}
                        onChange={(e) => setStudentInfo({ ...studentInfo, gradeClass: e.target.value })}
                        placeholder="학년반 (예: 3학년 1반)"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-white p-4">
                    <p className="mb-3 font-medium">보호자(법정대리인) 정보</p>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={parentInfo.name}
                        onChange={(e) => setParentInfo({ ...parentInfo, name: e.target.value })}
                        placeholder="보호자 성명"
                        className="w-full rounded-md border border-gray-300 px-3 py-2"
                      />
                      <div className="flex flex-wrap gap-4">
                        {(["부","모","기타"] as const).map((rel) => (
                          <label key={rel} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="relationshipInline"
                              value={rel}
                              checked={parentInfo.relationship === rel}
                              onChange={(e) => setParentInfo({ ...parentInfo, relationship: e.target.value, relationshipOther: rel!=="기타"?"":parentInfo.relationshipOther })}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500"
                            />
                            <span>{rel}</span>
                          </label>
                        ))}
                      </div>
                      {parentInfo.relationship === "기타" && (
                        <input
                          type="text"
                          value={parentInfo.relationshipOther}
                          onChange={(e) => setParentInfo({ ...parentInfo, relationshipOther: e.target.value })}
                          placeholder="관계 입력"
                          className="w-full rounded-md border border-gray-300 px-3 py-2"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-white p-4">
                  <p className="mb-3 text-sm">
                    위 요약 고지 및 전문을 확인하였고, 법정대리인으로서 자녀의 설문 응답 수집·이용에 동의합니다.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={finalConsent.parentName}
                      onChange={(e) => setFinalConsent({ ...finalConsent, parentName: e.target.value })}
                      placeholder="보호자 성명"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                    <input
                      type="date"
                      value={finalConsent.date}
                      onChange={(e) => setFinalConsent({ ...finalConsent, date: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 설문 폼 */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            {!isParentConsentSurvey && survey.questions &&
              Array.isArray(survey.questions) &&
              survey.questions.map((question: any, index) => (
                <div
                  key={question.id}
                  id={`question-${question.id}`}
                  className="mb-8"
                >
                  <h3 className="mb-3 text-lg font-medium text-gray-900">
                    {index + 1}. {question.text || question.question}
                    {question.required && (
                      <span className="ml-1 text-red-500">*</span>
                    )}
                  </h3>

                  {question.type === "multiple_choice" && (
                    <div className="space-y-4">
                      {/* 첫 번째 질문: 학생 선택 */}
                      {index === 0 ? (
                        <>
                          <p className="mb-3 text-sm text-gray-600">
                            최근 한달 동안 가장 많이 함께 한 친구들을 선택해주세요
                            {(() => {
                              let maxSelections = 1; // 기본값
                              
                              // 종합조사 설문의 첫 번째 질문인 경우 3명 선택 가능
                              if (surveyTemplate?.metadata?.category === "종합조사" && index === 0) {
                                maxSelections = 3;
                              } else if (question.maxSelections) {
                                maxSelections = question.maxSelections;
                              } else if (question.max_selections) {
                                maxSelections = typeof question.max_selections === 'string' 
                                  ? parseInt(question.max_selections) || 1 
                                  : question.max_selections;
                              }

                              return maxSelections > 1 ? (
                                <span className="font-medium text-[#3F80EA]">
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
                                  {responses[question.id].includes("none") 
                                    ? "선택된 답변:"
                                    : "선택된 친구들:"
                                  }
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {responses[question.id].map(
                                    (studentId: string) => {
                                      if (studentId === "none") {
                                        return (
                                          <span
                                            key="none"
                                            className="inline-block rounded bg-red-100 px-2 py-1 text-xs text-red-700"
                                          >
                                            아무도 없다
                                          </span>
                                        );
                                      }
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
                            {/* 아무도 없다 옵션 */}
                            <label
                              className={`flex cursor-pointer items-center rounded-lg border p-2 transition-colors ${
                                responses[question.id] && responses[question.id].includes("none")
                                  ? "border-red-300 bg-red-50"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={responses[question.id] && responses[question.id].includes("none")}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // "아무도 없다" 선택 시 다른 선택 모두 해제
                                    handleResponseChange(question.id, ["none"]);
                                  } else {
                                    // "아무도 없다" 해제
                                    handleResponseChange(question.id, []);
                                  }
                                }}
                                className="mr-2 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="overflow-hidden truncate whitespace-nowrap text-sm font-medium text-gray-900">
                                  아무도 없다
                                </p>
                              </div>
                            </label>
                            
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

                                // 질문의 maxSelections 값 사용
                                let maxSelections = 1; // 기본값
                                
                                // 종합조사 설문의 첫 번째 질문인 경우 3명 선택 가능
                                if (surveyTemplate?.metadata?.category === "종합조사" && index === 0) {
                                  maxSelections = 3;
                                } else if (question.maxSelections) {
                                  maxSelections = question.maxSelections;
                                } else if (question.max_selections) {
                                  maxSelections = typeof question.max_selections === 'string' 
                                    ? parseInt(question.max_selections) || 1 
                                    : question.max_selections;
                                }
                                

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
                                            // "아무도 없다" 옵션이 선택되어 있다면 제거
                                            const filteredValues = currentValues.filter(
                                              (id: string) => id !== "none"
                                            );
                                            handleResponseChange(question.id, [
                                              ...filteredValues,
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
                        // 나머지 모든 질문: 답변 옵션
                        <>
                          <p className="mb-3 text-sm text-gray-600">
                            아래 옵션 중 하나를 선택해주세요
                          </p>
                          
                          <div className="space-y-1">
                            {(() => {
                             
                              
                              // answer_options가 있는 경우 사용
                              if (question.answer_options && typeof question.answer_options === 'object') {
                                return Object.entries(question.answer_options).map(([key, value]) => (
                                  <label
                                    key={key}
                                    className="flex cursor-pointer items-center rounded-lg p-3 transition-colors hover:bg-gray-50"
                                  >
                                    <input
                                      type="radio"
                                      name={question.id}
                                      value={String(value)}
                                      checked={responses[question.id] === String(value)}
                                      onChange={(e) =>
                                        handleResponseChange(
                                          question.id,
                                          e.target.value,
                                        )
                                      }
                                      className="mr-3 h-4 w-4 border-gray-300 text-[#3F80EA] focus:ring-blue-500"
                                      required={question.required}
                                    />
                                    <span className="text-gray-900">
                                      {String(value)}
                                    </span>
                                  </label>
                                ));
                              }
                              
                              // answer_options가 없는 경우 하드코딩된 옵션 사용
                              let options: string[] = [];
                              if (index >= 1 && index <= 4) {
                                // 2~5번 질문 (만족도)
                                options = ["예", "아니오"];
                              } else if (index >= 5 && index <= 7) {
                                // 6~8번 질문 (학교폭력)
                                options = ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"];
                              } else {
                                // 기본 선택지
                                options = ["예", "아니오"];
                              }
                              
                              
                              return options.map((option: string) => (
                                <label
                                  key={option}
                                  className="flex cursor-pointer items-center rounded-lg p-3 transition-colors hover:bg-gray-50"
                                >
                                  <input
                                    type="radio"
                                    name={question.id}
                                    value={option}
                                    checked={responses[question.id] === option}
                                    onChange={(e) =>
                                      handleResponseChange(
                                        question.id,
                                        e.target.value,
                                      )
                                    }
                                    className="mr-3 h-4 w-4 border-gray-300 text-[#3F80EA] focus:ring-blue-500"
                                    required={question.required}
                                  />
                                  <span className="text-gray-900">
                                    {option}
                                  </span>
                                </label>
                              ));
                            })()}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {(question.type === "yes_no" || question.type === "scale") && (
                    <div className="space-y-4">
                      <p className="mb-3 text-sm text-gray-600">
                        아래 옵션 중 하나를 선택해주세요
                      </p>
                      
                      <div className="space-y-1">
                        {(() => {
                          
                          
                          // answer_options가 있는 경우 사용
                          if (question.answer_options && typeof question.answer_options === 'object') {
                            return Object.entries(question.answer_options).map(([key, value]) => (
                              <label
                                key={key}
                                className="flex cursor-pointer items-center rounded-lg p-3 transition-colors hover:bg-gray-50"
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={String(value)}
                                  checked={responses[question.id] === String(value)}
                                  onChange={(e) =>
                                    handleResponseChange(
                                      question.id,
                                      e.target.value,
                                    )
                                  }
                                  className="mr-3 h-4 w-4 border-gray-300 text-[#3F80EA] focus:ring-blue-500"
                                  required={question.required}
                                />
                                <span className="text-gray-900">
                                  {String(value)}
                                </span>
                              </label>
                            ));
                          }
                          
                          // answer_options가 없는 경우 하드코딩된 옵션 사용
                          let options: string[] = [];
                          if (question.type === "yes_no") {
                            options = ["예", "아니오"];
                          } else if (question.type === "scale") {
                            options = ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"];
                          }
                          
                          
                          return options.map((option: string) => (
                            <label
                              key={option}
                              className="flex cursor-pointer items-center rounded-lg p-3 transition-colors hover:bg-gray-50"
                            >
                              <input
                                type="radio"
                                name={question.id}
                                value={option}
                                checked={responses[question.id] === option}
                                onChange={(e) =>
                                  handleResponseChange(
                                    question.id,
                                    e.target.value,
                                  )
                                }
                                className="mr-3 h-4 w-4 border-gray-300 text-[#3F80EA] focus:ring-blue-500"
                                required={question.required}
                              />
                              <span className="text-gray-900">
                                {option}
                              </span>
                            </label>
                          ));
                        })()}
                      </div>
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

            <hr className="mb-6 w-full border-t border-gray-200" />
            {/* 제출 버튼 */}
            <div className="self-end">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-[#3F80EA] px-6 py-3 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "📤 제출 중..."
                  : isParentConsentSurvey
                    ? "동의 완료하기"
                    : !isAllRequiredFieldsCompleted()
                      ? "⚠️ 필수 항목을 완료해주세요"
                      : "🎯 설문 제출하기"}
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
              className="h-8 w-8 text-[#3F80EA]"
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
          <h2 className="mb-3 text-2xl font-bold text-[#3F80EA]">
            📝 이미 응답 완료!
          </h2>
          <p className="mb-4 text-lg text-gray-700">
            <span className="font-semibold text-[#3F80EA]">
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
              className="w-full rounded-lg bg-[#3F80EA] px-6 py-3 text-white hover:bg-blue-600"
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
    // 학부모 개인정보 수집·이용 동의서 설문인 경우
    if (isParentConsentSurvey) {
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-green-600">
              학부모 개인정보 수집·이용 동의 완료
            </h2>
            <p className="mb-4 text-lg text-gray-700">
              <span className="font-semibold text-[#3F80EA]">
                {selectedStudent.name}
              </span>
              학생의 학부모 개인정보 수집·이용 동의가 성공적으로 완료되었습니다.
            </p>
            <div className="mb-6 space-y-2 text-sm text-gray-600">
              <p className="flex items-center justify-center">
                
                - 동의서 내용이 안전하게 저장되었습니다
              </p>
              <p className="flex items-center justify-center">
                
                - 학생 등록/관리 페이지에 자동으로 반영되었습니다
              </p>
              <p className="flex items-center justify-center">
                
                - 개인정보는 관련 법령에 따라 안전하게 관리됩니다
              </p>
              <p className="flex items-center justify-center">
                
                - 동의해주셔서 정말 감사합니다!
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="rounded-lg bg-[#3F80EA] px-6 py-3 text-white hover:bg-blue-600"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      );
    }

    // 일반 설문 완료 페이지
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
            <span className="font-semibold text-[#3F80EA]">
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
            className="rounded-lg bg-[#3F80EA] px-6 py-3 text-white hover:bg-blue-600"
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
