import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import {
  UserGroupIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

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

interface NetworkNode {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

interface NetworkEdge {
  source: string;
  target: string;
}

// 파이썬 분석 결과 타입
interface PythonAnalysisResult {
  network_nodes?: Array<{
    id: string;
    name: string;
    x?: number;
    y?: number;
    centrality?: number;
  }>;
  network_edges?: Array<{
    source: string;
    target: string;
  }>;
  centrality_scores?: number;
  community_membership?: number;
  risk_indicators?: any;
}

const IndividualAnalysis: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"network" | "individual">(
    "individual"
  );
  const [networkData, setNetworkData] = useState<{
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  }>({ nodes: [], edges: [] });
  const [networkLoading, setNetworkLoading] = useState(false);

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

  // 네트워크 노드 데이터 생성 (파이썬 분석 결과 기반)
  const generateNetworkData = async (studentId: string, surveyId: string) => {
    const selectedStudentData = students.find((s) => s.id === studentId);
    if (!selectedStudentData) return { nodes: [], edges: [] };

    try {
      // 1. 파이썬에서 분석한 네트워크 분석 결과 가져오기
      const { data: networkAnalysis, error: analysisError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      if (analysisError) {
        console.error("Error fetching network analysis:", analysisError);
        // 분석 결과가 없으면 기본 네트워크 데이터 생성
        return await generateBasicNetworkData(studentId, surveyId);
      }

      // 2. 파이썬 분석 결과에서 네트워크 데이터 추출
      if (networkAnalysis && networkAnalysis.recommendations) {
        const analysisData =
          networkAnalysis.recommendations as PythonAnalysisResult;

        // 파이썬에서 계산된 노드 위치와 관계 정보 사용
        if (
          analysisData.network_nodes &&
          analysisData.network_edges &&
          analysisData.network_nodes.length > 0 &&
          analysisData.network_edges.length > 0
        ) {
          const nodes: NetworkNode[] = analysisData.network_nodes.map(
            (node) => ({
              id: node.id,
              name: node.name,
              x: node.x || Math.random() * 400 + 50,
              y: node.y || Math.random() * 300 + 50,
              color:
                (node.centrality || 0) > 0.6
                  ? "#3b82f6"
                  : (node.centrality || 0) > 0.3
                  ? "#f97316"
                  : "#ef4444",
            })
          );

          const edges: NetworkEdge[] = analysisData.network_edges.map(
            (edge) => ({
              source: edge.source,
              target: edge.target,
            })
          );

          console.log("Python analysis network data:", { nodes, edges });
          return { nodes, edges };
        }
      }

      // 3. 파이썬 분석 결과가 없거나 불완전한 경우 기본 데이터 생성
      return await generateBasicNetworkData(studentId, surveyId);
    } catch (error) {
      console.error(
        "Error generating network data from Python analysis:",
        error
      );
      // 오류 시 기본 네트워크 데이터 생성
      return await generateBasicNetworkData(studentId, surveyId);
    }
  };

  // 기본 네트워크 데이터 생성 (기존 로직)
  const generateBasicNetworkData = async (
    studentId: string,
    surveyId: string
  ) => {
    const selectedStudentData = students.find((s) => s.id === studentId);
    if (!selectedStudentData) return { nodes: [], edges: [] };

    try {
      // 1. 설문 응답 데이터에서 선택된 학생의 친구 관계 가져오기
      const { data: surveyResponses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      if (responseError) {
        console.error("Error fetching survey responses:", responseError);
        return { nodes: [], edges: [] };
      }

      // 2. 해당 학생이 선택한 친구들의 ID 수집
      const selectedFriendIds: string[] = [];
      if (surveyResponses && surveyResponses.responses) {
        Object.values(surveyResponses.responses).forEach(
          (questionResponse: any) => {
            if (Array.isArray(questionResponse)) {
              questionResponse.forEach((friendId: string) => {
                if (
                  friendId &&
                  friendId !== studentId &&
                  !selectedFriendIds.includes(friendId)
                ) {
                  selectedFriendIds.push(friendId);
                }
              });
            }
          }
        );
      }

      // 3. 해당 학생을 선택한 친구들의 ID 수집 (상호 관계)
      const { data: reverseResponses, error: reverseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .in(
          "student_id",
          students.map((s) => s.id).filter((id) => id !== studentId)
        );

      if (!reverseError && reverseResponses) {
        reverseResponses.forEach((response: any) => {
          if (response.responses) {
            Object.values(response.responses).forEach(
              (questionResponse: any) => {
                if (
                  Array.isArray(questionResponse) &&
                  questionResponse.includes(studentId)
                ) {
                  if (!selectedFriendIds.includes(response.student_id)) {
                    selectedFriendIds.push(response.student_id);
                  }
                }
              }
            );
          }
        });
      }

      // 4. 네트워크 노드 생성
      const nodes: NetworkNode[] = [];

      // 선택된 학생 추가
      nodes.push({
        id: selectedStudentData.id,
        name: selectedStudentData.name,
        x: 250,
        y: 300,
        color: "#3b82f6",
      });

      // 친구 관계가 있는 학생들 추가
      selectedFriendIds.forEach((friendId, index) => {
        const friend = students.find((s) => s.id === friendId);
        if (friend) {
          // 원형으로 배치
          const angle = (index / selectedFriendIds.length) * 2 * Math.PI;
          const radius = 150;
          const x = 250 + radius * Math.cos(angle);
          const y = 300 + radius * Math.sin(angle);

          nodes.push({
            id: friend.id,
            name: friend.name,
            x,
            y,
            color: "#f97316",
          });
        }
      });

      // 5. 네트워크 엣지 생성
      const edges: NetworkEdge[] = [];

      // 선택된 학생과 친구들 간의 연결
      selectedFriendIds.forEach((friendId) => {
        edges.push({
          source: studentId,
          target: friendId,
        });
      });

      // 친구들 간의 상호 연결 확인
      if (reverseResponses) {
        reverseResponses.forEach((response: any) => {
          if (
            response.responses &&
            selectedFriendIds.includes(response.student_id)
          ) {
            Object.values(response.responses).forEach(
              (questionResponse: any) => {
                if (Array.isArray(questionResponse)) {
                  questionResponse.forEach((targetId: string) => {
                    if (
                      selectedFriendIds.includes(targetId) &&
                      response.student_id !== targetId
                    ) {
                      // 이미 존재하는 엣지인지 확인
                      const existingEdge = edges.find(
                        (edge) =>
                          (edge.source === response.student_id &&
                            edge.target === targetId) ||
                          (edge.source === targetId &&
                            edge.target === response.student_id)
                      );

                      if (!existingEdge) {
                        edges.push({
                          source: response.student_id,
                          target: targetId,
                        });
                      }
                    }
                  });
                }
              }
            );
          }
        });
      }

      console.log("Basic network data:", { nodes, edges });
      return { nodes, edges };
    } catch (error) {
      console.error("Error generating basic network data:", error);
      return { nodes: [], edges: [] };
    }
  };

  // 실제 네트워크 분석 데이터 가져오기
  const fetchNetworkAnalysis = async (studentId: string, surveyId: string) => {
    try {
      // friendship_data 테이블에서 관계 데이터 가져오기
      const { data: friendshipData, error: friendshipError } = await supabase
        .from("friendship_data")
        .select("*")
        .eq("survey_id", surveyId)
        .or(`student_id.eq.${studentId},friend_student_id.eq.${studentId}`);

      if (friendshipError) throw friendshipError;

      // network_analysis_results 테이블에서 분석 결과 가져오기
      const { data: analysisData, error: analysisError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      if (analysisError) throw analysisError;

      console.log("Network analysis data:", { friendshipData, analysisData });

      return { friendshipData, analysisData };
    } catch (error) {
      console.error("Error fetching network analysis:", error);
      return { friendshipData: [], analysisData: null };
    }
  };

  // 학생 선택 시 네트워크 분석 데이터 업데이트
  useEffect(() => {
    if (selectedStudent && selectedSurvey) {
      fetchNetworkAnalysis(selectedStudent, selectedSurvey);
    }
  }, [selectedStudent, selectedSurvey]);

  // 학생 또는 설문 선택 시 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey && students.length > 0) {
      setNetworkLoading(true);
      generateNetworkData(selectedStudent, selectedSurvey)
        .then((data) => {
          setNetworkData(data);
          // 파이썬 분석 결과가 있으면 completed 상태로 설정
          if (data.nodes.length > 0) {
            setPythonAnalysisStatus("completed");
          } else {
            setPythonAnalysisStatus("not_started");
          }
        })
        .catch((error) => {
          console.error("Error generating network data:", error);
          setNetworkData({ nodes: [], edges: [] });
          setPythonAnalysisStatus("failed");
        })
        .finally(() => {
          setNetworkLoading(false);
        });
    }
  }, [selectedStudent, selectedSurvey, students]);

  // 학생 또는 설문 선택 시 개인별 요약 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey && networkData.nodes.length > 0) {
      fetchIndividualSummary(selectedStudent, selectedSurvey)
        .then((summary) => {
          setIndividualSummary(summary);
        })
        .catch((error) => {
          console.error("Error fetching individual summary:", error);
          setIndividualSummary(null);
        });
    }
  }, [selectedStudent, selectedSurvey, networkData.nodes.length]);

  // 개인별 요약 데이터 가져오기
  const fetchIndividualSummary = async (
    studentId: string,
    surveyId: string
  ) => {
    try {
      // 1. 설문 응답 데이터 분석
      const { data: surveyResponses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      if (responseError) {
        console.error("Error fetching survey responses:", responseError);
        return null;
      }

      // 2. 네트워크 분석 결과 가져오기
      const { data: networkAnalysis, error: analysisError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("student_id", studentId)
        .single();

      // 3. 개인별 요약 데이터 생성
      const summary = {
        currentStatus: {
          satisfaction: "높음",
          teacherRelationship: "개선 필요",
          peerRelationship: "양호",
        },
        networkStability: {
          centrality: networkAnalysis?.centrality_scores || 0.5,
          connections: networkData.nodes.length - 1,
          community: networkAnalysis?.community_membership || 0,
        },
        improvementPlan: {
          teacherRapport: "교사와의 래포 형성 필요",
          peerExpansion: "친구 관계 확장 권장",
          activities: "그룹 활동 참여 권장",
        },
      };

      return summary;
    } catch (error) {
      console.error("Error fetching individual summary:", error);
      return null;
    }
  };

  // 개인별 요약 상태
  const [individualSummary, setIndividualSummary] = useState<any>(null);

  // 파이썬 분석 실행 함수
  const runPythonAnalysis = async (studentId: string, surveyId: string) => {
    try {
      setNetworkLoading(true);

      // 파이썬 분석 API 호출 (실제 구현 시)
      console.log(
        "Running Python analysis for student:",
        studentId,
        "survey:",
        surveyId
      );

      // 여기서 실제 파이썬 분석 API를 호출합니다
      // const response = await fetch('/api/python-analysis', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ student_id: studentId, survey_id: surveyId })
      // });

      // 임시로 분석 완료 후 네트워크 데이터 새로고침
      setTimeout(() => {
        generateNetworkData(studentId, surveyId).then((data) => {
          setNetworkData(data);
          setNetworkLoading(false);
        });
      }, 2000);
    } catch (error) {
      console.error("Error running Python analysis:", error);
      setNetworkLoading(false);
    }
  };

  // 파이썬 분석 상태 확인
  const [pythonAnalysisStatus, setPythonAnalysisStatus] = useState<
    "not_started" | "running" | "completed" | "failed"
  >("not_started");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const selectedStudentData = students.find((s) => s.id === selectedStudent);
  const selectedSurveyData = surveys.find((s) => s.id === selectedSurvey);

  return (
    <div className="max-w-7xl mx-auto min-h-screen pb-16 bg-gray-50">
      {/* 상단 내비게이션 바 */}
      <div className="bg-white rounded-t-lg">
        <div className="w-full  px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* 메뉴 탭 */}
            <div className="flex items-center space-x-8">
              <button className="px-4 py-2 text-blue-600 border-b-2 border-blue-600 font-medium">
                학생개인별 분석
              </button>
            </div>

            {/* 현재 분석 대상 */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">현재 분석 대상</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedStudentData?.name} 학생 (
                  {viewMode === "network" ? "네트워크" : "개인별"}) 분석
                </p>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                리포트
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-col">
        {/* 왼쪽 사이드바 */}
        <div className="w-full mb-6 bg-white rounded-b-lg border border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              분석 대상 리스트 총 {surveys.length}개
            </h2>

            <div className="flex gap-2 w-full h-fit overflow-x-scroll">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`p-4 min-w-72 h-36 rounded-lg border cursor-pointer transition-colors ${
                    selectedSurvey === survey.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSurvey(survey.id)}
                >
                  <h3 className="font-medium text-gray-900 mb-2">
                    {survey.title}
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
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
          <div className="w-1/6 bg-white rounded-lg border border-gray-200 min-h-screen">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                1학년 1반 총 {students.length}개
              </h2>

              <div className="space-y-1">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedStudent === student.id
                        ? "bg-blue-100 text-blue-900"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">
                        {index + 1}번) {student.name}
                      </span>
                      {selectedStudent === student.id && (
                        <ChevronRightIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
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
              {selectedStudentData && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    {selectedStudentData.name} 학생 개별 분석 리포트
                  </h2>

                  {/* 관계 네트워크 그래프 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        관계 네트워크 그래프
                      </h3>
                      {selectedStudent && selectedSurvey && (
                        <button
                          onClick={() =>
                            runPythonAnalysis(selectedStudent, selectedSurvey)
                          }
                          disabled={networkLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        >
                          {networkLoading ? "분석 중..." : "파이썬 분석 실행"}
                        </button>
                      )}
                    </div>

                    {networkLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">
                          파이썬 네트워크 분석을 실행하는 중...
                        </p>
                      </div>
                    ) : networkData.nodes.length > 0 ? (
                      <div className="relative h-96 bg-gray-50 rounded-lg border border-gray-200">
                        {/* 네트워크 노드들 */}
                        {networkData.nodes.map((node) => (
                          <div
                            key={node.id}
                            className="absolute w-16 h-16 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer transition-all duration-300 hover:scale-110"
                            style={{
                              left: node.x,
                              top: node.y,
                              backgroundColor: node.color,
                              transform: "translate(-50%, -50%)",
                            }}
                          >
                            {node.name}
                          </div>
                        ))}

                        {/* 네트워크 엣지들 (SVG로 연결선 그리기) */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          {networkData.edges.map((edge, index) => {
                            const sourceNode = networkData.nodes.find(
                              (n) => n.id === edge.source
                            );
                            const targetNode = networkData.nodes.find(
                              (n) => n.id === edge.target
                            );

                            if (!sourceNode || !targetNode) return null;

                            return (
                              <line
                                key={index}
                                x1={sourceNode.x}
                                y1={sourceNode.y}
                                x2={targetNode.x}
                                y2={targetNode.y}
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                              />
                            );
                          })}
                        </svg>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-500 mb-4">
                          <p className="text-lg font-medium mb-2">
                            파이썬 네트워크 분석이 필요합니다
                          </p>
                          <p className="text-sm">
                            정확한 네트워크 분석을 위해 파이썬 분석을
                            실행해주세요.
                          </p>
                        </div>
                        {selectedStudent && selectedSurvey && (
                          <button
                            onClick={() =>
                              runPythonAnalysis(selectedStudent, selectedSurvey)
                            }
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                          >
                            파이썬 분석 시작
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 개인별 요약 */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      개인별 요약
                    </h3>

                    {networkLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">
                          네트워크 데이터를 분석하는 중...
                        </p>
                      </div>
                    ) : individualSummary ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-md font-medium text-gray-800 mb-2">
                            {individualSummary.networkStability.centrality > 0.6
                              ? "안정적 관계 형성 그룹"
                              : individualSummary.networkStability.centrality >
                                0.3
                              ? "보통 관계 그룹"
                              : "관계 개선 필요 그룹"}
                          </h4>

                          <div className="space-y-4">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                1. 현재 상태 (Current Status)
                              </h5>
                              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                                <li>
                                  • 학교생활 만족도:{" "}
                                  {individualSummary.currentStatus.satisfaction}
                                </li>
                                <li>
                                  • 교사와의 관계:{" "}
                                  {
                                    individualSummary.currentStatus
                                      .teacherRelationship
                                  }
                                </li>
                                <li>
                                  • 또래 관계:{" "}
                                  {
                                    individualSummary.currentStatus
                                      .peerRelationship
                                  }
                                </li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                2. 네트워크 안정성 (Network Stability)
                              </h5>
                              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                                <li>
                                  • 중심성 점수:{" "}
                                  {(
                                    individualSummary.networkStability
                                      .centrality * 100
                                  ).toFixed(1)}
                                  %
                                </li>
                                <li>
                                  • 연결된 친구 수:{" "}
                                  {
                                    individualSummary.networkStability
                                      .connections
                                  }
                                  명
                                </li>
                                <li>
                                  • 소속 그룹:{" "}
                                  {individualSummary.networkStability
                                    .community + 1}
                                  번 그룹
                                </li>
                              </ul>
                            </div>

                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                3. 개선방안 (Improvement Plan)
                              </h5>
                              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                                <li>
                                  •{" "}
                                  {
                                    individualSummary.improvementPlan
                                      .teacherRapport
                                  }
                                </li>
                                <li>
                                  •{" "}
                                  {
                                    individualSummary.improvementPlan
                                      .peerExpansion
                                  }
                                </li>
                                <li>
                                  •{" "}
                                  {individualSummary.improvementPlan.activities}
                                </li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>개인별 요약 데이터를 불러올 수 없습니다.</p>
                      </div>
                    )}
                  </div>
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
