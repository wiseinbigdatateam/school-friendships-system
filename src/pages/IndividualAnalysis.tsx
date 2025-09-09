import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import NetworkGraph from "../components/NetworkGraph";
import { useAuth } from "../contexts/AuthContext";
import {
  generateStudentGuidanceReport,
  generateFallbackReport,
  StudentAnalysisData,
  GeneratedReport,
} from "../services/chatgptService";
import { generateAndSaveAIReport, getSavedAIReport, AIReportData } from '../services/aiReportService';

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

interface PythonAnalysisResult {
  student_id: string;
  analysis_timestamp: string;
  network_stats: {
    total_nodes: number;
    total_edges: number;
    network_density: number;
    average_clustering: number;
    communities_count: number;
  };
  individual_metrics: {
    student_id: string;
    degree: number;
    neighbors: string[];
    centrality_metrics: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
    };
    network_density: number;
    clustering_coefficient: number;
    friendship_type: string;
    community_id: number;
    isolation_risk: {
      level: string;
      score: number;
      description: string;
      factors: {
        connection_count: number;
        centrality: number;
        network_density: number;
      };
    };
    social_influence: {
      level: string;
      score: number;
      description: string;
      metrics: {
        degree: number;
        betweenness: number;
        closeness: number;
        eigenvector: number;
      };
    };
    total_nodes: number;
    total_edges: number;
  };
  recommendations: {
    immediate_actions: string[];
    short_term_goals: string[];
    long_term_goals: string[];
    monitoring_points: string[];
    intervention_level: string;
  };
  network_data: {
    nodes: Array<{
      id: string;
      name: string;
      grade: string;
      class: string;
      is_center: boolean;
      degree: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
      relationship_type: string;
    }>;
  };
  communities: { [student_id: string]: number };
}

const IndividualAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [individualNetworkData, setIndividualNetworkData] = useState<any[]>([]);
  const [maxSelections, setMaxSelections] = useState<number[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"core" | "ai" | "python">("core");
  const [aiReport, setAiReport] = useState<AIReportData | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [pythonAnalysisResult, setPythonAnalysisResult] = useState<PythonAnalysisResult | null>(null);
  const [pythonAnalysisLoading, setPythonAnalysisLoading] = useState(false);
  const [pythonAnalysisError, setPythonAnalysisError] = useState<string | null>(null);

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
  const generateIndividualNetworkData = useCallback(async (
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
      setMaxSelections(maxSelections);

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
  }, [students]);

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
  }, [selectedStudent, selectedSurvey, students, generateIndividualNetworkData]);

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  // Python 분석용 친구 관계 데이터 준비
  const prepareFriendshipDataForPython = useCallback(async () => {
    try {
      // 전체 학급의 설문 응답 데이터 조회 (선택된 학생만이 아닌 모든 학생)
      const { data: allResponses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", selectedSurvey);

      if (responseError || !allResponses || allResponses.length === 0) {
        return [];
      }

      // 설문 템플릿 메타데이터 조회
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select(`
          *,
          survey_templates!surveys_template_id_fkey(metadata)
        `)
        .eq("id", selectedSurvey)
        .single();

      if (surveyError || !surveyData) {
        return [];
      }

      const metadata = surveyData?.survey_templates?.metadata as any;
      const maxSelections = metadata?.max_selections || [];

      // 전체 학급의 친구 관계 데이터 변환
      const friendshipData: Array<{
        student_id: string;
        friend_student_id: string;
        relationship_type: string;
        strength_score: number;
      }> = [];
      
      // 모든 학생의 응답을 처리
      allResponses.forEach((response) => {
        if (response.responses && response.student_id) {
          const answers = typeof response.responses === "string"
            ? JSON.parse(response.responses)
            : response.responses;

          Object.entries(answers).forEach(([questionKey, answer]: [string, any]) => {
            const questionIndex = parseInt(questionKey.replace("q", "")) - 1;
            const maxSelection = maxSelections[questionIndex] || 10;

            if (Array.isArray(answer)) {
              const limitedAnswers = answer.slice(0, maxSelection);
              limitedAnswers.forEach((friendId: string) => {
                if (friendId && friendId !== response.student_id && response.student_id) {
                  friendshipData.push({
                    student_id: response.student_id,
                    friend_student_id: friendId,
                    relationship_type: 'friend',
                    strength_score: 1.0
                  });
                }
              });
            } else if (typeof answer === "string" && answer !== response.student_id && response.student_id) {
              if (maxSelection >= 1) {
                friendshipData.push({
                  student_id: response.student_id,
                  friend_student_id: answer,
                  relationship_type: 'friend',
                  strength_score: 1.0
                });
              }
            }
          });
        }
      });

      return friendshipData;
    } catch (error) {
      console.error("친구 관계 데이터 준비 오류:", error);
      return [];
    }
  }, [selectedSurvey]);

  // AI 리포트 생성 함수
  const generateAIReport = useCallback(async () => {
    if (!selectedStudentData || !individualNetworkData.length || !user) return;

    setAiReportLoading(true);

    try {
      // 먼저 저장된 리포트가 있는지 확인
      const savedReport = await getSavedAIReport(
        selectedStudent,
        selectedSurvey,
        user.id
      );

      if (savedReport) {
        setAiReport(savedReport);
        setAiReportLoading(false);
        return;
      }

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

      // AI 리포트 생성 및 저장
      const report = await generateAndSaveAIReport(
        selectedStudent,
        selectedSurvey,
        user.id,
        analysisData
      );
      
      setAiReport(report);
    } catch (error) {
      console.error("AI 리포트 생성 오류:", error);
      setAiReport(null);
    } finally {
      setAiReportLoading(false);
    }
  }, [selectedStudentData, individualNetworkData, selectedStudent, selectedSurvey, user]);

  // Python 네트워크 분석 실행 함수
  const runPythonAnalysis = useCallback(async () => {
    if (!selectedStudentData || !selectedSurvey) return;

    setPythonAnalysisLoading(true);
    setPythonAnalysisError(null);

    try {
      // 설문 응답 데이터를 Python 분석 형식으로 변환
      const friendshipData = await prepareFriendshipDataForPython();
      
      if (!friendshipData || friendshipData.length === 0) {
        throw new Error("분석할 친구 관계 데이터가 없습니다.");
      }

      // Python API 호출
      const response = await fetch('http://localhost:5001/api/individual-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: selectedStudent,
          friendship_data: friendshipData,
          student_info: students.map(student => ({
            id: student.id,
            name: student.name,
            grade: student.grade,
            class: student.class
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Python 분석 API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setPythonAnalysisResult(result.data);
      } else {
        throw new Error(result.error || 'Python 분석 실패');
      }

    } catch (error) {
      console.error("Python 분석 오류:", error);
      setPythonAnalysisError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setPythonAnalysisLoading(false);
    }
  }, [selectedStudentData, selectedSurvey, students, selectedStudent, prepareFriendshipDataForPython]);

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

  // Python 분석 탭이 활성화될 때 분석 실행
  useEffect(() => {
    if (
      activeTab === "python" &&
      selectedStudentData &&
      selectedSurvey
    ) {
      // 학생이 변경되면 기존 Python 분석 결과를 초기화하고 새로 분석
      if (selectedStudent) {
        setPythonAnalysisResult(null);
        runPythonAnalysis();
      }
    }
  }, [
    activeTab,
    selectedStudent,
    selectedStudentData,
    selectedSurvey,
    runPythonAnalysis,
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
                        ? "bg-blue-50 text-blue-900"
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
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                        <button
                          onClick={() => setActiveTab("core")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "core"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          핵심결과
                        </button>
                        <button
                          onClick={() => setActiveTab("ai")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "ai"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          AI리포트
                        </button>
                        <button
                          onClick={() => setActiveTab("python")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "python"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Python분석
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
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              네트워크 분석을 실행하는 중...
                            </p>
                          </div>
                        ) : individualNetworkData.length > 0 ? (
                          <div className="mx-auto w-fit">
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
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              AI 리포트를 생성하는 중...
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              진단 전문 LLM으로 개인별 분석 결과를 바탕으로
                              리포트를 작성하고 있습니다.
                            </p>
                          </div>
                        ) : aiReport ? (
                          <div className="ai-report-container">
                            <div 
                              dangerouslySetInnerHTML={{ 
                                __html: aiReport.html_content || '' 
                              }}
                              className="prose prose-sm max-w-none"
                            />
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

                    {activeTab === "python" && (
                      <div className="space-y-6">
                        {pythonAnalysisLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              Python 네트워크 분석을 실행하는 중...
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              NetworkX를 사용한 고급 네트워크 분석을 수행하고 있습니다.
                            </p>
                          </div>
                        ) : pythonAnalysisError ? (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-red-500">
                              <p className="mb-2 text-lg font-medium">
                                Python 분석 중 오류가 발생했습니다
                              </p>
                              <p className="text-sm">{pythonAnalysisError}</p>
                            </div>
                          </div>
                        ) : pythonAnalysisResult ? (
                          <div className="space-y-6">
                            {/* 네트워크 통계 */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-blue-800">
                                네트워크 통계
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-blue-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-blue-700">기본 정보</h5>
                                  <ul className="space-y-1 text-sm text-gray-700">
                                    <li>• 총 노드 수: {pythonAnalysisResult.network_stats.total_nodes}개</li>
                                    <li>• 총 연결 수: {pythonAnalysisResult.network_stats.total_edges}개</li>
                                    <li>• 네트워크 밀도: {(pythonAnalysisResult.network_stats.network_density * 100).toFixed(1)}%</li>
                                    <li>• 평균 클러스터링: {(pythonAnalysisResult.network_stats.average_clustering * 100).toFixed(1)}%</li>
                                    <li>• 총 커뮤니티 수: {pythonAnalysisResult.network_stats.communities_count}개</li>
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-blue-700">개별 지표</h5>
                                  <ul className="space-y-1 text-sm text-gray-700">
                                    <li>• 연결 수: {pythonAnalysisResult.individual_metrics.degree}개</li>
                                    <li>• 연결 중심성: {(pythonAnalysisResult.individual_metrics.centrality_metrics.degree * 100).toFixed(1)}%</li>
                                    <li>• 매개 중심성: {(pythonAnalysisResult.individual_metrics.centrality_metrics.betweenness * 100).toFixed(1)}%</li>
                                    <li>• 근접 중심성: {(pythonAnalysisResult.individual_metrics.centrality_metrics.closeness * 100).toFixed(1)}%</li>
                                    <li>• 소속 커뮤니티: {pythonAnalysisResult.individual_metrics.community_id + 1}번 그룹</li>
                                  </ul>
                                </div>
                              </div>
                            </div>

                            {/* 교우관계 유형 및 위험도 평가 */}
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-yellow-800">
                                교우관계 유형 및 위험도 평가
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-yellow-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-yellow-700">교우관계 유형</h5>
                                  <p className="text-lg font-medium text-gray-800">
                                    {pythonAnalysisResult.individual_metrics.friendship_type}
                                  </p>
                                </div>
                                <div className="rounded-lg border border-yellow-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-yellow-700">고립 위험도</h5>
                                  <div className="space-y-1">
                                    <p className="text-lg font-medium text-gray-800">
                                      {pythonAnalysisResult.individual_metrics.isolation_risk.level}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {pythonAnalysisResult.individual_metrics.isolation_risk.description}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      위험도 점수: {pythonAnalysisResult.individual_metrics.isolation_risk.score}/100
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 사회적 영향력 */}
                            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-green-800">
                                사회적 영향력 분석
                              </h4>
                              <div className="rounded-lg border border-green-100 bg-white p-4">
                                <div className="space-y-2">
                                  <p className="text-lg font-medium text-gray-800">
                                    영향력 수준: {pythonAnalysisResult.individual_metrics.social_influence.level}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {pythonAnalysisResult.individual_metrics.social_influence.description}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    영향력 점수: {pythonAnalysisResult.individual_metrics.social_influence.score.toFixed(1)}/100
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 맞춤형 지도 방안 */}
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-purple-800">
                                맞춤형 지도 방안
                              </h4>
                              <div className="space-y-4">
                                {pythonAnalysisResult.recommendations.immediate_actions.length > 0 && (
                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      즉시 조치 사항
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.immediate_actions.map((action, index) => (
                                        <li key={index} className="flex items-start">
                                          <span className="mr-2 mt-0.5 text-purple-600">•</span>
                                          <span>{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      단기 목표
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.short_term_goals.map((goal, index) => (
                                        <li key={index} className="flex items-start">
                                          <span className="mr-2 mt-0.5 text-purple-600">•</span>
                                          <span>{goal}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                  
                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      장기 목표
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.long_term_goals.map((goal, index) => (
                                        <li key={index} className="flex items-start">
                                          <span className="mr-2 mt-0.5 text-purple-600">•</span>
                                          <span>{goal}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-purple-100 bg-white p-4">
                                  <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                    모니터링 포인트
                                  </h5>
                                  <ul className="space-y-2 text-sm text-gray-600">
                                    {pythonAnalysisResult.recommendations.monitoring_points.map((point, index) => (
                                      <li key={index} className="flex items-start">
                                        <span className="mr-2 mt-0.5 text-purple-600">•</span>
                                        <span>{point}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-gray-500">
                              <p className="mb-2 text-lg font-medium">
                                Python 분석을 실행할 수 없습니다
                              </p>
                              <p className="text-sm">
                                학생과 설문을 선택한 후 다시 시도해주세요.
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
                            
                            // 실제 친구 관계 분석
                            const actualFriends = individualNetworkData.filter(
                              (s) => !s.isCenter && s.friendCount > 0
                            );
                            const mutualConnections = actualFriends.filter(friend => 
                              individualNetworkData.some(other => 
                                other.id !== centerStudent?.id && 
                                other.id !== friend.id && 
                                other.friendCount > 0
                              )
                            ).length;
                            
                            const groupDistribution =
                              connectedStudents.length > 0
                                ? `연결된 ${connectedStudents.length}명 중 ${mutualConnections}명이 상호 연결됨`
                                : "연결된 학생 없음";

                            // 개인화된 특성 분석
                            const studentName = centerStudent?.name || "학생";
                            const connectionStrength = mutualConnections / Math.max(connectedStudents.length, 1);
                            const isBridgeStudent = connectionStrength > 0.7; // 다른 학생들을 연결하는 역할
                            const isIsolated = connectedStudents.length <= 1;
                            const isCoreMember = centrality >= 0.6 && connectedStudents.length >= 3;
                            
                            // 개인화된 그룹 분류
                            let personalityType = "";
                            let personalityDescription = "";
                            
                            if (isIsolated) {
                              personalityType = "독립형";
                              personalityDescription = "소수의 깊은 관계를 선호하는 성향";
                            } else if (isBridgeStudent && isCoreMember) {
                              personalityType = "연결형 리더";
                              personalityDescription = "다른 학생들을 연결하는 중심 역할";
                            } else if (isCoreMember) {
                              personalityType = "활동형";
                              personalityDescription = "활발한 사회적 관계를 유지";
                            } else if (connectionStrength > 0.5) {
                              personalityType = "조화형";
                              personalityDescription = "균형잡힌 관계를 형성";
                            } else {
                              personalityType = "관찰형";
                              personalityDescription = "신중하게 관계를 형성";
                            }

                            return (
                              <div>
                                <h3 className="mb-4 text-lg font-medium text-gray-900">
                                  {studentName}의 개인별 요약 :{" "}
                                  <span className="text-md mb-2 bg-gradient-to-t from-yellow-200 from-50% to-transparent to-50% font-medium text-gray-800">
                                    {personalityType} ({personalityDescription})
                                  </span>
                                </h3>

                                <div className="space-y-4">
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-cyan-500">
                                      1. 현재 상태 (Current Status)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        • 사회적 연결도:{" "}
                                        {isBridgeStudent 
                                          ? "매우 높음 (다른 학생들을 연결하는 역할)"
                                          : isCoreMember
                                            ? "높음 (활발한 관계 유지)"
                                            : connectionStrength > 0.5
                                              ? "보통 (균형잡힌 관계)"
                                              : "낮음 (제한적 관계)"}
                                      </li>
                                      <li>
                                        • 관계의 질:{" "}
                                        {mutualConnections >= 3
                                          ? "매우 좋음 (상호 연결된 관계 많음)"
                                          : mutualConnections >= 1
                                            ? "좋음 (일부 상호 연결)"
                                            : "보통 (일방적 관계 위주)"}
                                      </li>
                                      <li>
                                        • 네트워크 위치:{" "}
                                        {isCoreMember
                                          ? "중심부 (핵심 멤버)"
                                          : isBridgeStudent
                                            ? "연결부 (다리 역할)"
                                            : "주변부 (참여자)"}
                                      </li>
                                      <li>
                                        • 사회적 성향:{" "}
                                        {personalityType === "독립형"
                                          ? "독립적 (소수 깊은 관계 선호)"
                                          : personalityType === "연결형 리더"
                                            ? "리더십 (다른 학생들 연결)"
                                            : personalityType === "활동형"
                                              ? "활동적 (다양한 관계 유지)"
                                              : personalityType === "조화형"
                                                ? "조화적 (균형잡힌 관계)"
                                                : "신중함 (관찰 후 관계 형성)"}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-sky-500">
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
                                    <h5 className="mb-2 text-sm font-medium text-blue-500">
                                      3. 개선방안 (Improvement Plan)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {personalityType === "독립형" && (
                                        <>
                                          <li>• 소규모 그룹 활동을 통한 깊은 관계 형성 기회 제공</li>
                                          <li>• 일대일 멘토링 프로그램 참여 권장</li>
                                          <li>• 관심사 기반 동아리 활동으로 자연스러운 관계 형성</li>
                                          <li>• 교사와의 정기적인 상담을 통한 사회적 기술 향상</li>
                                        </>
                                      )}
                                      {personalityType === "연결형 리더" && (
                                        <>
                                          <li>• 리더십 역할 강화 및 리더십 교육 프로그램 참여</li>
                                          <li>• 새로운 학생들의 네트워크 연결 지원 역할 부여</li>
                                          <li>• 또래 상담자 역할 수행 기회 제공</li>
                                          <li>• 긍정적 영향력 확산을 위한 프로젝트 리드</li>
                                        </>
                                      )}
                                      {personalityType === "활동형" && (
                                        <>
                                          <li>• 다양한 활동 참여로 경험 확장 및 리더십 기회 제공</li>
                                          <li>• 또래 상담자 역할 수행으로 사회적 책임감 향상</li>
                                          <li>• 새로운 학생들의 네트워크 연결 지원</li>
                                          <li>• 긍정적 영향력 확산을 위한 모델 역할</li>
                                        </>
                                      )}
                                      {personalityType === "조화형" && (
                                        <>
                                          <li>• 현재 관계 유지 및 점진적 확장 기회 제공</li>
                                          <li>• 조정자 역할을 통한 갈등 해결 능력 향상</li>
                                          <li>• 다양한 활동 참여로 경험 확장</li>
                                          <li>• 또래 상담자 역할 기회 제공</li>
                                        </>
                                      )}
                                      {personalityType === "관찰형" && (
                                        <>
                                          <li>• 신중한 관계 형성을 위한 소규모 그룹 활동 참여</li>
                                          <li>• 관심사 기반 동아리 활동으로 자연스러운 관계 형성</li>
                                          <li>• 교사와의 정기적인 상담을 통한 사회적 기술 향상</li>
                                          <li>• 점진적인 사회적 참여 기회 제공</li>
                                        </>
                                      )}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-indigo-500">
                                      4. 모니터링 포인트 (Monitoring Points)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        •{" "}
                                        {personalityType === "독립형"
                                          ? "월간 깊은 관계 형성 상황 및 만족도 점검"
                                          : personalityType === "연결형 리더"
                                            ? "주간 리더십 역할 수행 및 영향력 확산 평가"
                                            : personalityType === "활동형"
                                              ? "월간 다양한 활동 참여 및 리더십 발휘 평가"
                                              : personalityType === "조화형"
                                                ? "월간 관계 유지 및 조정 역할 수행 평가"
                                                : "월간 신중한 관계 형성 진행 상황 점검"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {mutualConnections < 2
                                          ? "새로운 상호 연결 관계 형성 여부 확인"
                                          : "기존 상호 연결 관계의 질적 향상 여부 확인"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {connectionStrength < 0.5
                                          ? "사회적 연결 강화를 위한 활동 참여 빈도 점검"
                                          : "네트워크 내 역할 수행 및 영향력 발휘 평가"}
                                      </li>
                                      <li>
                                        •{" "}
                                        {isCoreMember
                                          ? "리더십 기회 제공 및 역할 수행 평가"
                                          : isBridgeStudent
                                            ? "연결 역할 수행 및 네트워크 확장 평가"
                                            : "점진적 사회적 참여 확대 여부 확인"}
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
