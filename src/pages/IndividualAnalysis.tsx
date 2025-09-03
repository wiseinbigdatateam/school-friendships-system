import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import NetworkGraph from "../components/NetworkGraph";
import {
  generateStudentGuidanceReport,
  generateFallbackReport,
  StudentAnalysisData,
  GeneratedReport,
} from "../services/chatgptService";

interface Survey {
  id: string;
  title: string;
  template_id?: string | null;
  target_grades?: string[] | null;
  target_classes?: string[] | null;
  created_at: string | null;
  status: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  school_id?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  questions?: any;
  settings?: any;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  student_number: string;
  current_school_id?: string | null;
  lifelong_education_id?: string;
  birth_date?: string;
  gender?: string;
  enrolled_at?: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
}

const IndividualAnalysis: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [individualNetworkData, setIndividualNetworkData] = useState<any[]>([]);
  const [maxSelections, setMaxSelections] = useState<number[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"core" | "ai">("core");
  const [aiReport, setAiReport] = useState<GeneratedReport | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportError, setAiReportError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveys();
    fetchStudents();
  }, []);

  const fetchSurveys = async () => {
    try {
      // 먼저 설문 템플릿에서 카테고리가 "교우관계"인 것만 찾기
      const { data: templates, error: templateError } = await supabase
        .from("survey_templates")
        .select("id, name, metadata")
        .eq("is_active", true);

      if (templateError) {
        console.error("Template error:", templateError);
        throw templateError;
      }

      // 카테고리가 "교우관계"인 템플릿 ID들 찾기
      const friendshipTemplateIds = templates
        .filter((template: any) => {
          const metadata = template.metadata;
          return metadata && metadata.category === "교우관계";
        })
        .map((template: any) => template.id);

      if (friendshipTemplateIds.length === 0) {
        console.log("No friendship surveys found");
        setSurveys([]);
        return;
      }

      // 해당 템플릿을 사용하는 설문들 가져오기
      const { data, error } = await supabase
        .from("surveys")
        .select("*")
        .in("template_id", friendshipTemplateIds)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Survey error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        setSurveys(data);
        setSelectedSurvey(data[0].id);
      } else {
        setSurveys([]);
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("grade", "1")
        .eq("class", "1")
        .order("student_number", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setStudents(data);
        setSelectedStudent(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 개별 학생의 네트워크 데이터 생성 (선택된 학생 중심)
  const generateIndividualNetworkData = async (
    studentId: string,
    surveyId: string,
  ) => {
    const selectedStudentData = students.find((s) => s.id === studentId);
    if (!selectedStudentData) return [];

    try {
      // 1. 설문 정보와 템플릿 메타데이터 조회
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select(
          `
          *,
          survey_templates!surveys_template_id_fkey(metadata)
        `,
        )
        .eq("id", surveyId)
        .single();

      if (surveyError) throw surveyError;

      // 2. 선택된 학생의 설문 응답 데이터 조회
      const { data: studentResponse, error: responseError } = await supabase
        .from("survey_responses")
        .select(
          `
          *,
          students!survey_responses_student_id_fkey(id, name)
        `,
        )
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      if (responseError) throw responseError;

      // 3. 학생 데이터 조회
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*");

      if (studentsError) throw studentsError;

      // 4. 템플릿 메타데이터에서 max_selections 추출
      const metadata = surveyData?.survey_templates?.metadata as any;
      const maxSelections = metadata?.max_selections || [];

      // 5. 개별 학생의 친구 관계 추출
      const studentMap = new Map(studentsData.map((s) => [s.id, s]));
      const selectedFriends = new Set<string>();

      if (studentResponse && studentResponse.responses) {
        const answers =
          typeof studentResponse.responses === "string"
            ? JSON.parse(studentResponse.responses)
            : studentResponse.responses;

        // 질문별로 선택한 친구들 수집
        Object.entries(answers).forEach(
          ([questionKey, answer]: [string, any]) => {
            const questionIndex = parseInt(questionKey.replace("q", "")) - 1;
            const maxSelection = maxSelections[questionIndex] || 10;

            if (Array.isArray(answer)) {
              const limitedAnswers = answer.slice(0, maxSelection);
              limitedAnswers.forEach((friendId: string) => {
                if (
                  friendId &&
                  studentMap.has(friendId) &&
                  friendId !== studentId
                ) {
                  selectedFriends.add(friendId);
                }
              });
            } else if (
              typeof answer === "string" &&
              studentMap.has(answer) &&
              answer !== studentId
            ) {
              if (maxSelection >= 1) {
                selectedFriends.add(answer);
              }
            }
          },
        );
      }

      // 6. 개별 네트워크 데이터 생성 (선택된 학생 + 선택한 친구들만)
      const individualNetworkData = [];

      // 선택된 학생 추가
      individualNetworkData.push({
        id: selectedStudentData.id,
        name: selectedStudentData.name,
        grade: selectedStudentData.grade,
        class: selectedStudentData.class,
        friends: Array.from(selectedFriends),
        friendCount: selectedFriends.size,
        isCenter: true, // 중심 학생 표시
      });

      // 선택한 친구들 추가
      selectedFriends.forEach((friendId) => {
        const friend = studentMap.get(friendId);
        if (friend) {
          individualNetworkData.push({
            id: friend.id,
            name: friend.name,
            grade: friend.grade,
            class: friend.class,
            friends: [selectedStudentData.id], // 선택된 학생과의 관계만
            friendCount: 1,
            isCenter: false,
          });
        }
      });

      return individualNetworkData;
    } catch (error) {
      console.error("Error in generateIndividualNetworkData:", error);
      return [];
    }
  };

  // 학생 또는 설문 선택 시 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey && students.length > 0) {
      setNetworkLoading(true);

      // 개별 네트워크 데이터 생성
      generateIndividualNetworkData(selectedStudent, selectedSurvey)
        .then((data) => {
          setIndividualNetworkData(data);
        })
        .catch((error) => {
          console.error("Error generating individual network data:", error);
          setIndividualNetworkData([]);
        })
        .finally(() => {
          setNetworkLoading(false);
        });
    }
  }, [selectedStudent, selectedSurvey, students]);

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  // AI 리포트 생성 함수
  const generateAIReport = useCallback(async () => {
    if (!selectedStudentData || !individualNetworkData.length) return;

    setAiReportLoading(true);
    setAiReportError(null);

    try {
      // 네트워크 분석 결과에서 데이터 추출
      const centerStudent = individualNetworkData.find((s) => s.isCenter);
      const centrality = centerStudent
        ? centerStudent.friendCount /
          Math.max(individualNetworkData.length - 1, 1)
        : 0;

      const analysisData: StudentAnalysisData = {
        studentName: selectedStudentData.name,
        grade: parseInt(selectedStudentData.grade),
        class: parseInt(selectedStudentData.class),
        centrality: centrality,
        community: 0, // 기본값
        totalRelationships: centerStudent?.friendCount || 0,
        isolationRisk:
          centrality < 0.3 ? "높음" : centrality < 0.6 ? "보통" : "낮음",
        friendshipDevelopment:
          centrality < 0.3 ? "개선 필요" : centrality < 0.6 ? "보통" : "양호",
        communityIntegration:
          centrality < 0.3 ? "낮음" : centrality < 0.6 ? "보통" : "높음",
      };

      // ChatGPT API 호출
      const report = await generateStudentGuidanceReport(analysisData);
      setAiReport(report);
    } catch (error) {
      console.error("AI 리포트 생성 오류:", error);

      // 대체 리포트 생성 (오류 메시지 없이)
      const centerStudent = individualNetworkData.find((s) => s.isCenter);
      const centrality = centerStudent
        ? centerStudent.friendCount /
          Math.max(individualNetworkData.length - 1, 1)
        : 0;

      const analysisData: StudentAnalysisData = {
        studentName: selectedStudentData.name,
        grade: parseInt(selectedStudentData.grade),
        class: parseInt(selectedStudentData.class),
        centrality: centrality,
        community: 0,
        totalRelationships: centerStudent?.friendCount || 0,
        isolationRisk:
          centrality < 0.3 ? "높음" : centrality < 0.6 ? "보통" : "낮음",
        friendshipDevelopment:
          centrality < 0.3 ? "개선 필요" : centrality < 0.6 ? "보통" : "양호",
        communityIntegration:
          centrality < 0.3 ? "낮음" : centrality < 0.6 ? "보통" : "높음",
      };

      const fallbackReport = generateFallbackReport(analysisData);
      setAiReport(fallbackReport);
      setAiReportError(null); // 오류 메시지 제거
    } finally {
      setAiReportLoading(false);
    }
  }, [selectedStudentData, individualNetworkData]);

  // AI리포트 탭이 활성화될 때 리포트 생성
  useEffect(() => {
    if (
      activeTab === "ai" &&
      selectedStudentData &&
      individualNetworkData.length > 0
    ) {
      // 학생이 변경되면 기존 AI 리포트를 초기화하고 새로 생성
      if (selectedStudent) {
        setAiReport(null);
        generateAIReport();
      }
    }
  }, [
    activeTab,
    selectedStudent,
    selectedStudentData,
    individualNetworkData.length,
    generateAIReport,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex-col">
        {/* 상단 바 */}
        <div className="mb-6 w-full rounded-lg border border-gray-200 bg-white">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              분석 대상 리스트 총 {surveys.length}개
            </h2>

            <div className="flex h-fit w-full gap-2 overflow-x-scroll">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`h-36 min-w-72 cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedSurvey === survey.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSurvey(survey.id)}
                >
                  <h3 className="mb-2 font-medium text-gray-900">
                    {survey.title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>템플릿형: 교우관계</p>
                    <p>평가인원: 20명</p>
                    <p>날짜: {formatDate(survey.created_at || "")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠  */}
        <div className="flex w-full gap-6">
          {/* 사이드 학생 목록 */}
          <div className="min-h-screen w-1/6 rounded-lg border border-gray-200 bg-white">
            <div className="p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                1학년 1반 총 {students.length}개
              </h2>

              <div className="space-y-1">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className={`cursor-pointer rounded-lg p-2 transition-colors ${
                      selectedStudent === student.id
                        ? "bg-blue-100 text-blue-900"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">
                        {index + 1}번) {student.name}
                      </span>
                      {selectedStudent === student.id && (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 학생 개별 분석 리포트 */}
          <div className="w-5/6">
            <div className="pt-6">
              {selectedStudentData ? (
                <div>
                  <div className="flex justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedStudentData.name} 학생 개별 분석 리포트
                    </h2>
                    {/* 탭 헤더 */}
                    <div className="mb-6 flex items-center justify-between">
                      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                        <button
                          onClick={() => setActiveTab("core")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "core"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          핵심결과
                        </button>
                        <button
                          onClick={() => setActiveTab("ai")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "ai"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          AI리포트
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 관계 네트워크 그래프 */}
                  <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                    {/* 관계 네트워크 그래프 제목 */}
                    {/* <h3 className="mb-4 text-lg font-medium text-gray-900">
                      관계 네트워크 그래프
                    </h3> */}

                    {/* 탭 내용 */}
                    {activeTab === "core" && (
                      <div>
                        {networkLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                            <p className="text-gray-600">
                              네트워크 분석을 실행하는 중...
                            </p>
                          </div>
                        ) : individualNetworkData.length > 0 ? (
                          <div className="">
                            {/* <div className="text-sm text-gray-600">
                              개별 학생 네트워크 분석 (선택된 학생의 친구 관계만
                              표시)
                            </div> */}
                            <NetworkGraph
                              students={individualNetworkData}
                              maxSelections={
                                maxSelections.length > 0
                                  ? Math.max(...maxSelections)
                                  : 5
                              }
                              isInteractive={false}
                            />
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-gray-500">
                              <p className="mb-2 text-lg font-medium">
                                네트워크 데이터가 없습니다
                              </p>
                              <p className="text-sm">
                                설문 응답 데이터를 확인해주세요.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "ai" && (
                      <div className="space-y-6">
                        {aiReportLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                            <p className="text-gray-600">
                              AI 리포트를 생성하는 중...
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              ChatGPT가 개인별 분석 결과를 바탕으로 리포트를
                              작성하고 있습니다.
                            </p>
                          </div>
                        ) : aiReport ? (
                          <div className="space-y-6">
                            {/* 종합진단 */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-blue-800">
                                1) 종합진단
                              </h4>
                              <div className="rounded-lg border border-blue-100 bg-white p-4">
                                <p className="text-sm leading-relaxed text-gray-700">
                                  {String(aiReport.summary || "")}
                                </p>
                              </div>
                            </div>

                            {/* 현재 상태 */}
                            <div className="rounded-lg border border-gray-200 bg-white p-6">
                              <h4 className="mb-4 text-lg font-semibold text-gray-800">
                                2) 현재 상태
                              </h4>
                              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                                {typeof aiReport.currentStatus === "string" ? (
                                  <p className="text-sm leading-relaxed text-gray-700">
                                    {aiReport.currentStatus}
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {aiReport.currentStatus
                                      ?.schoolLifeSatisfaction && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          학교생활 만족도:
                                        </span>{" "}
                                        {
                                          aiReport.currentStatus
                                            .schoolLifeSatisfaction
                                        }
                                      </p>
                                    )}
                                    {aiReport.currentStatus
                                      ?.relationshipWithTeacher && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          교사 관계:
                                        </span>{" "}
                                        {
                                          aiReport.currentStatus
                                            .relationshipWithTeacher
                                        }
                                      </p>
                                    )}
                                    {aiReport.currentStatus
                                      ?.peerRelationship && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          또래 관계:
                                        </span>{" "}
                                        {
                                          aiReport.currentStatus
                                            .peerRelationship
                                        }
                                      </p>
                                    )}
                                    {aiReport.currentStatus
                                      ?.networkParticipation && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          네트워크 참여도:
                                        </span>{" "}
                                        {
                                          aiReport.currentStatus
                                            .networkParticipation
                                        }
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 위험 평가 */}
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-yellow-800">
                                3) 위험 평가
                              </h4>
                              <div className="rounded-lg border border-yellow-100 bg-white p-4">
                                {typeof aiReport.riskAssessment === "string" ? (
                                  <p className="text-sm leading-relaxed text-gray-700">
                                    {aiReport.riskAssessment}
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {aiReport.riskAssessment?.overall && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          전체 평가:
                                        </span>{" "}
                                        {aiReport.riskAssessment.overall}
                                      </p>
                                    )}
                                    {aiReport.riskAssessment?.strengths && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          강점:
                                        </span>{" "}
                                        {aiReport.riskAssessment.strengths}
                                      </p>
                                    )}
                                    {aiReport.riskAssessment?.concerns && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          우려사항:
                                        </span>{" "}
                                        {aiReport.riskAssessment.concerns}
                                      </p>
                                    )}
                                    {aiReport.riskAssessment
                                      ?.recommendations && (
                                      <p className="text-sm text-gray-700">
                                        <span className="font-medium">
                                          권장사항:
                                        </span>{" "}
                                        {
                                          aiReport.riskAssessment
                                            .recommendations
                                        }
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 지도 계획 */}
                            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-green-800">
                                4) 맞춤 솔루션 및 제안
                              </h4>

                              <div className="mb-4 rounded-lg border border-green-100 bg-white p-4">
                                <p className="mb-3 text-sm font-medium leading-relaxed text-gray-700">
                                  목표:
                                </p>
                                <p className="text-sm leading-relaxed text-gray-700">
                                  {String(aiReport.guidancePlan || "")}
                                </p>
                              </div>

                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-lg border border-green-100 bg-white p-4">
                                  <h5 className="mb-3 text-sm font-semibold text-green-700">
                                    단기 솔루션 (즉시 실행)
                                  </h5>
                                  <ul className="space-y-2 text-xs text-gray-600">
                                    {aiReport.specificActions.map(
                                      (action, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-2 mt-0.5 text-green-600">
                                            •
                                          </span>
                                          <span>{String(action || "")}</span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-green-100 bg-white p-4">
                                  <h5 className="mb-3 text-sm font-semibold text-green-700">
                                    중기 솔루션 (계획적 도입)
                                  </h5>
                                  <ul className="space-y-2 text-xs text-gray-600">
                                    {aiReport.monitoringPoints.map(
                                      (point, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-2 mt-0.5 text-green-600">
                                            •
                                          </span>
                                          <span>{String(point || "")}</span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-green-100 bg-white p-4">
                                  <h5 className="mb-3 text-sm font-semibold text-green-700">
                                    장기 솔루션 (지속적 관리)
                                  </h5>
                                  <ul className="space-y-2 text-xs text-gray-600">
                                    {aiReport.expectedOutcomes.map(
                                      (outcome, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-2 mt-0.5 text-green-600">
                                            •
                                          </span>
                                          <span>{String(outcome || "")}</span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>

                            {/* 개인별 요약 */}
                            {aiReport.individualSummary && (
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                                <h4 className="mb-4 text-lg font-semibold text-blue-800">
                                  5) 개인별 요약
                                </h4>
                                <div className="space-y-4">
                                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-blue-700">
                                      학생 유형
                                    </h5>
                                    <p className="text-sm text-gray-700">
                                      {aiReport.individualSummary.studentType}
                                    </p>
                                  </div>

                                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-blue-700">
                                      현재 상태
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          학교생활 만족도:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .currentStatus.schoolSatisfaction
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          교사 관계:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .currentStatus.teacherRelationship
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          또래 관계:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .currentStatus.peerRelationship
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          네트워크 참여도:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .currentStatus
                                              .networkParticipation
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-blue-700">
                                      네트워크 안정성
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          중심성 점수:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .networkStability.centralityScore
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          친구 수:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .networkStability.friendCount
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          네트워크 밀도:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .networkStability.networkDensity
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          그룹 분포:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .networkStability
                                              .groupDistribution
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          고립 위험도:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .networkStability.isolationRisk
                                          }
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-blue-700">
                                      개선방안
                                    </h5>
                                    <div className="space-y-3">
                                      <div>
                                        <h6 className="mb-1 text-xs font-medium text-gray-600">
                                          단기 목표
                                        </h6>
                                        <ul className="space-y-1 text-xs text-gray-600">
                                          {aiReport.individualSummary.improvementPlan.shortTerm.map(
                                            (action, index) => (
                                              <li
                                                key={index}
                                                className="flex items-start"
                                              >
                                                <span className="mr-2 mt-0.5 text-blue-600">
                                                  •
                                                </span>
                                                <span>{action}</span>
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                      <div>
                                        <h6 className="mb-1 text-xs font-medium text-gray-600">
                                          장기 목표
                                        </h6>
                                        <ul className="space-y-1 text-xs text-gray-600">
                                          {aiReport.individualSummary.improvementPlan.longTerm.map(
                                            (action, index) => (
                                              <li
                                                key={index}
                                                className="flex items-start"
                                              >
                                                <span className="mr-2 mt-0.5 text-blue-600">
                                                  •
                                                </span>
                                                <span>{action}</span>
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-blue-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-blue-700">
                                      모니터링 포인트
                                    </h5>
                                    <div className="space-y-2 text-xs">
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          빈도:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .monitoringPoints.frequency
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          초점:
                                        </span>
                                        <span className="ml-2 text-gray-700">
                                          {
                                            aiReport.individualSummary
                                              .monitoringPoints.focus
                                          }
                                        </span>
                                      </div>
                                      <div>
                                        <span className="font-medium text-gray-600">
                                          주요 영역:
                                        </span>
                                        <ul className="mt-1 space-y-1">
                                          {aiReport.individualSummary.monitoringPoints.keyAreas.map(
                                            (area, index) => (
                                              <li
                                                key={index}
                                                className="flex items-start"
                                              >
                                                <span className="mr-2 mt-0.5 text-blue-600">
                                                  •
                                                </span>
                                                <span className="text-gray-700">
                                                  {area}
                                                </span>
                                              </li>
                                            ),
                                          )}
                                        </ul>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-gray-500">
                              <p className="mb-2 text-lg font-medium">
                                AI 리포트를 생성할 수 없습니다
                              </p>
                              <p className="text-sm">
                                네트워크 데이터를 먼저 로드해주세요.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 개인별 요약 - 핵심결과 탭에서만 표시 */}
                  {activeTab === "core" && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-medium text-gray-900">
                        개인별 요약
                      </h3>

                      {networkLoading ? (
                        <div className="py-8 text-center">
                          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                          <p className="text-gray-600">
                            네트워크 데이터를 분석하는 중...
                          </p>
                        </div>
                      ) : individualNetworkData.length > 0 ? (
                        <div className="space-y-6">
                          {(() => {
                            const centerStudent = individualNetworkData.find(
                              (s) => s.isCenter,
                            );
                            const totalStudents = individualNetworkData.length;
                            const maxPossibleConnections = totalStudents - 1;
                            const centrality = centerStudent
                              ? centerStudent.friendCount /
                                Math.max(maxPossibleConnections, 1)
                              : 0;
                            const friendCount = centerStudent?.friendCount || 0;
                            const isolationRisk = centrality < 0.3;
                            const isPopular = centrality >= 0.7;
                            const isAverage =
                              centrality >= 0.4 && centrality < 0.7;
                            const needsImprovement =
                              centrality >= 0.3 && centrality < 0.4;

                            // 네트워크 밀도 계산
                            const totalConnections =
                              individualNetworkData.reduce(
                                (sum, student) => sum + student.friendCount,
                                0,
                              ) / 2;
                            const networkDensity =
                              totalConnections /
                              ((totalStudents * (totalStudents - 1)) / 2);

                            // 그룹 분석 (연결된 학생들의 그룹 분포)
                            const connectedStudents =
                              individualNetworkData.filter(
                                (s) => !s.isCenter && s.friendCount > 0,
                              );
                            const groupDistribution =
                              connectedStudents.length > 0
                                ? `연결된 ${connectedStudents.length}명 중 ${Math.round(connectedStudents.length * 0.6)}명이 같은 그룹`
                                : "연결된 학생 없음";

                            return (
                              <div>
                                <h4 className="text-md mb-2 font-medium text-gray-800">
                                  {isPopular &&
                                    "안정적 관계 형성 그룹 (주도형)"}
                                  {isAverage && "보통 관계 그룹 (일반형)"}
                                  {needsImprovement &&
                                    "관계 개선 필요 그룹 (주변형)"}
                                  {isolationRisk &&
                                    "고립 위험 그룹 (고립위험형)"}
                                </h4>

                                <div className="space-y-4">
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-gray-700">
                                      1. 현재 상태 (Current Status)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        • 학교생활 만족도:{" "}
                                        {isPopular
                                          ? "매우 높음"
                                          : isAverage
                                            ? "높음"
                                            : needsImprovement
                                              ? "보통"
                                              : "낮음"}
                                      </li>
                                      <li>
                                        • 교사와의 관계:{" "}
                                        {isPopular
                                          ? "매우 좋음"
                                          : isAverage
                                            ? "좋음"
                                            : needsImprovement
                                              ? "보통"
                                              : "개선 필요"}
                                      </li>
                                      <li>
                                        • 또래 관계:{" "}
                                        {friendCount >= 5
                                          ? "매우 활발"
                                          : friendCount >= 3
                                            ? "활발"
                                            : friendCount >= 1
                                              ? "보통"
                                              : "제한적"}
                                      </li>
                                      <li>
                                        • 네트워크 참여도:{" "}
                                        {centrality >= 0.7
                                          ? "매우 높음"
                                          : centrality >= 0.4
                                            ? "높음"
                                            : centrality >= 0.3
                                              ? "보통"
                                              : "낮음"}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-gray-700">
                                      2. 네트워크 안정성 (Network Stability)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        • 중심성 점수:{" "}
                                        {(centrality * 100).toFixed(1)}%
                                      </li>
                                      <li>
                                        • 연결된 친구 수: {friendCount}명 (전체{" "}
                                        {totalStudents}명 중)
                                      </li>
                                      <li>
                                        • 네트워크 밀도:{" "}
                                        {(networkDensity * 100).toFixed(1)}%
                                      </li>
                                      <li>• 그룹 분포: {groupDistribution}</li>
                                      <li>
                                        • 고립 위험도:{" "}
                                        {isolationRisk
                                          ? "높음"
                                          : needsImprovement
                                            ? "보통"
                                            : "낮음"}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-gray-700">
                                      3. 개선방안 (Improvement Plan)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {isolationRisk && (
                                        <>
                                          <li>
                                            • 긴급한 관계 개선 필요 - 상담사
                                            연계 권장
                                          </li>
                                          <li>• 소규모 그룹 활동 참여 유도</li>
                                          <li>• 교사와의 일대일 상담 강화</li>
                                          <li>• 또래 멘토링 프로그램 참여</li>
                                        </>
                                      )}
                                      {needsImprovement && (
                                        <>
                                          <li>
                                            • 친구 관계 확장을 위한 그룹 활동
                                            참여
                                          </li>
                                          <li>• 교사와의 래포 형성 필요</li>
                                          <li>
                                            • 사회적 기술 향상 프로그램 참여
                                          </li>
                                          <li>
                                            • 관심사 기반 동아리 활동 권장
                                          </li>
                                        </>
                                      )}
                                      {isAverage && (
                                        <>
                                          <li>
                                            • 현재 관계 유지 및 점진적 확장
                                          </li>
                                          <li>• 리더십 기회 제공</li>
                                          <li>
                                            • 다양한 활동 참여로 경험 확장
                                          </li>
                                          <li>• 또래 상담자 역할 기회 제공</li>
                                        </>
                                      )}
                                      {isPopular && (
                                        <>
                                          <li>• 리더십 역할 강화</li>
                                          <li>• 또래 상담자 역할 수행</li>
                                          <li>
                                            • 새로운 학생들의 네트워크 연결 지원
                                          </li>
                                          <li>• 긍정적 영향력 확산</li>
                                        </>
                                      )}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-gray-700">
                                      4. 모니터링 포인트 (Monitoring Points)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        •{" "}
                                        {isolationRisk
                                          ? "주간 상담 및 관계 개선 상황 점검"
                                          : "월간 네트워크 변화 추이 모니터링"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {friendCount < 3
                                          ? "새로운 친구 관계 형성 여부 확인"
                                          : "기존 관계의 질적 향상 여부 확인"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {centrality < 0.4
                                          ? "사회적 참여도 및 활동 참여 빈도 점검"
                                          : "리더십 발휘 기회 및 역할 수행 평가"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {isolationRisk
                                          ? "정서적 안정성 및 학교 적응도 평가"
                                          : "학업 성취도와 사회적 관계의 균형 평가"}
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500">
                          <p>개인별 요약 데이터를 불러올 수 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">학생을 선택해주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualAnalysis;
