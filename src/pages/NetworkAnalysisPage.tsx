// 분석 - 교우현황 페이지 (ResultMonitoring 구조 참고)
import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import NetworkChartComponent from "../components/NetworkChartComponent";
import {
  NetworkAnalysisData,
  NetworkMetrics,
} from "../types";
import { useAuth } from "../contexts/AuthContext";
import { networkAnalysisService } from "../services/networkAnalysisService";

interface SurveyProject {
  pid: string;
  name: string;
  created_at: string;
  status: "ready" | "progress" | "completed";
  response_count?: number;
  template_category?: string;
}

const NetworkAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);

  // 프로젝트 리스트 데이터
  const [projectsData, setProjectsData] = useState<SurveyProject[]>([]);

  // 클릭 기반 선택
  const [draggableItems, setDraggableItems] = useState<SurveyProject[]>([]);
  const [selectedItems, setSelectedItems] = useState<SurveyProject[]>([]);

  // ChartComponent 컴포넌트에 props전달할 데이터
  const [chartData, setChartData] = useState<NetworkAnalysisData[]>([]);

  // 탭 컴포넌트에 전달할 데이터
  const [activeTab, setActiveTab] = useState(1);
  
  // 설문별 응답자 수
  const [surveyResponseCounts, setSurveyResponseCounts] = useState<{[key: string]: number}>({});
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // 선택된 학생 상태
  const [selectedStudentData, setSelectedStudentData] = useState<any>(null);

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };


  // 노드 클릭 핸들러 - 학생 정보만 표시
  const handleNodeClick = useCallback((node: any) => {
    const studentId = node.id;
    
    // 해당 학생의 데이터 찾기
    const studentData = chartData[activeTab - 1]?.nodes.find((n: any) => n.id === studentId);
    if (studentData) {
      
      // 학생 정보만 설정 (네트워크 데이터 생성하지 않음)
      setSelectedStudentData({
        id: studentData.id,
        name: studentData.name,
        grade: studentData.grade,
        class: studentData.class,
        friendship_type: studentData.friendship_type,
        centrality: studentData.centrality || 0,
        degree: (studentData as any).degree || 0,
        connection_count: studentData.connection_count || 0
      });
    }
  }, [chartData, activeTab]);

  // 설문별 응답자 수 계산 함수
  const calculateResponseCounts = async (surveys: any[]) => {
    
    const counts: {[key: string]: number} = {};
    
    try {
      const surveyIds = surveys.map(survey => survey.id);
      
      const { data, error } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .in("survey_id", surveyIds);
      
      if (error) {
        console.error("❌ 응답자 수 조회 오류:", error);
        return;
      }
      
      
      surveyIds.forEach(surveyId => {
        const responseCount = data?.filter(response => response.survey_id === surveyId).length || 0;
        counts[surveyId] = responseCount;
      });
      
      setSurveyResponseCounts(counts);
      setForceUpdate(prev => prev + 1);
      
    } catch (error) {
      console.error("❌ 응답자 수 계산 중 오류:", error);
    }
  };

  // 사용자 정보 조회
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        if (!user) return;
        
        const { data: teacherData, error: teacherError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (teacherError) throw teacherError;
        setTeacherInfo(teacherData);

      } catch (error) {
        console.error("사용자 정보 조회 오류:", error);
      }
    };

    fetchCurrentUser();
  }, [user]);

  // 설문 조회
  useEffect(() => {
    const fetchSurveys = async () => {
      if (!teacherInfo) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        

        // 설문 템플릿에서 교우관계 또는 종합조사 템플릿 찾기
        const { data: templates, error: templateError } = await supabase
          .from("survey_templates")
          .select("id, name, metadata")
          .eq("is_active", true);

        if (templateError) {
          console.error("Template error:", templateError);
          throw templateError;
        }

        // 교우관계 또는 종합조사 템플릿 ID들
        const analysisTemplateIds = templates
          .filter((template: any) => {
            const metadata = template.metadata;
            return metadata && (metadata.category === "교우관계" || metadata.category === "종합조사");
          })
          .map((template: any) => template.id);

        if (analysisTemplateIds.length === 0) {
          setProjectsData([]);
          setDraggableItems([]);
          setLoading(false);
          return;
        }

        // 템플릿을 사용하는 완료된 설문들 조회
        let query = supabase
          .from("surveys")
          .select(`
            *,
            survey_templates!surveys_template_id_fkey(
              id,
              name,
              metadata
            )
          `)
          .in("template_id", analysisTemplateIds)
          .eq("status", "completed");

        // 학교 ID로 필터링
        if (teacherInfo.school_id) {
          query = query.eq("school_id", teacherInfo.school_id);
        }

        // 담임교사인 경우 학년/반으로 필터링
        if (teacherInfo.role === "homeroom_teacher" && teacherInfo.grade_level && teacherInfo.class_number) {
          
          const { data: allSurveys, error } = await query.order("created_at", { ascending: false });
          
          if (error) {
            console.error("Survey error:", error);
            throw error;
          }

          // 학년/반 매칭 필터링
          let filteredSurveys = allSurveys?.filter((survey: any) => {
            const targetGrades = survey.target_grades || [];
            const targetClasses = survey.target_classes || [];
            
            const gradeMatch = targetGrades.length === 0 || targetGrades.includes(teacherInfo.grade_level);
            const classMatch = targetClasses.length === 0 || targetClasses.includes(teacherInfo.class_number);
            
            return gradeMatch && classMatch;
          }) || [];

          // 날짜순으로 정렬 (최신이 먼저)
          filteredSurveys = filteredSurveys.sort((a: any, b: any) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          
          if (filteredSurveys.length > 0) {
            // SurveyProject 형태로 변환 (이미 정렬된 filteredSurveys 사용)
            const projectData: SurveyProject[] = filteredSurveys.map((survey: any) => ({
              pid: survey.id,
              name: survey.title,
              created_at: survey.created_at || new Date().toISOString(),
              status: "completed" as const,
              response_count: 0,
              template_category: survey.survey_templates?.metadata?.category || "분석가능"
            }));

            setProjectsData(projectData);
            setDraggableItems([...projectData]);
            
            // 응답자 수 계산
            await calculateResponseCounts(filteredSurveys);
          } else {
            setProjectsData([]);
            setDraggableItems([]);
          }
        } else {
          // 다른 역할의 경우 학교 전체 설문
          const { data, error } = await query.order("created_at", { ascending: false });

          if (error) {
            console.error("Survey error:", error);
            throw error;
          }

          if (data && data.length > 0) {
            // SurveyProject 형태로 변환
            const projectData: SurveyProject[] = data.map((survey: any) => ({
              pid: survey.id,
              name: survey.title,
              created_at: survey.created_at || new Date().toISOString(),
              status: "completed" as const,
              response_count: 0,
              template_category: survey.survey_templates?.metadata?.category || "분석가능"
            }));

            // 날짜순으로 정렬 (최신이 먼저)
            projectData.sort((a, b) => {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setProjectsData(projectData);
            setDraggableItems([...projectData]);
            
            // 응답자 수 계산
            await calculateResponseCounts(data);
          } else {
            setProjectsData([]);
            setDraggableItems([]);
          }
        }
      } catch (error) {
        console.error("Error fetching surveys:", error);
      } finally {
        setLoading(false);
      }
    };

    if (teacherInfo) {
      fetchSurveys();
    }
  }, [teacherInfo]);

  // 강제 리렌더링을 위한 useEffect
  useEffect(() => {
  }, [forceUpdate, surveyResponseCounts]);

  // 프로젝트 선택 (클릭 기반)
  const handleProjectSelect = (project: SurveyProject) => {
    if (selectedItems.length >= 2) {
      alert("최대 2개까지만 선택할 수 있습니다.");
      return;
    }

    if (!selectedItems.find((item) => item.pid === project.pid)) {
      setSelectedItems((prev) => [...prev, project]);
      setDraggableItems((prev) =>
        prev.filter((item) => item.pid !== project.pid),
      );
    }
  };

  // 프로젝트 선택 해제
  const handleProjectDeselect = (project: SurveyProject) => {
    setSelectedItems((prev) => prev.filter((item) => item.pid !== project.pid));
    setDraggableItems((prev) =>
      [...prev, project].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    );
  };

  // 분석하기 버튼
  const getAnalysisResult = async () => {
    setChartData([]); // 그래프 데이터 초기화

    if (selectedItems.length === 0) {
      alert("분석할 대상을 선택해주세요");
      return;
    }

    try {
      setLoading(true);

      const analysisResults: NetworkAnalysisData[] = [];

      for (const item of selectedItems) {

        try {
          // 실제 네트워크 분석 수행
          const result = await networkAnalysisService.analyzeNetwork(item.pid);


          // 외톨이형 수 계산
          const isolatedCount = result.nodes.filter((node: any) => node.friendship_type === "외톨이형").length;

          analysisResults.push({
            nodes: result.nodes.map((node) => ({
              ...node,
              grade: node.grade.toString(),
              class: node.class.toString(),
            })),
            edges: result.edges,
            metrics: {
              // 기본 속성들
              totalConnections: result.metrics?.total_relationships || 0,
              averageCentrality: result.metrics?.average_degree_centrality || 0,
              isolatedIndividuals: 0, // 기본값
              highCentralityIndividuals: 0, // 기본값
              clusterCount: Math.max(0, (result.metrics?.connected_components || 0) - isolatedCount),

              // 추가 속성들
              total_students:
                result.metrics?.total_students || result.nodes.length,
              total_relationships:
                result.metrics?.total_relationships || result.edges.length,
              total_nodes: result.nodes.length,
              total_edges: result.edges.length,
              density: result.metrics?.density || 0,
              network_density: result.metrics?.density || 0,
              average_degree: result.metrics?.average_degree || 0,
              average_path_length: result.metrics?.average_path_length || 0,
              clustering_coefficient:
                result.metrics?.clustering_coefficient || 0,
              modularity: result.metrics?.modularity || 0,
              connected_components: Math.max(0, (result.metrics?.connected_components || 0) - isolatedCount),
              average_degree_centrality:
                result.metrics?.average_degree_centrality || 0,
              average_closeness_centrality:
                result.metrics?.average_closeness_centrality || 0,
              average_betweenness_centrality:
                result.metrics?.average_betweenness_centrality || 0,
              average_eigenvector_centrality:
                result.metrics?.average_eigenvector_centrality || 0,
            } as NetworkMetrics,
            friendship_types: result.friendship_type_distribution || {
              외톨이형: 0,
              "소수 친구 학생": 0,
              "평균적인 학생": 0,
              "친구 많은 학생": 0,
              "사교 스타": 0,
            },
          });
        } catch (error) {
          console.error(`❌ 설문 분석 실패: ${item.name}`, error);

          // 분석 실패 시 기본 데이터로 대체
          analysisResults.push({
            nodes: [],
            edges: [],
            metrics: {
              // 기본 속성들
              totalConnections: 0,
              averageCentrality: 0,
              isolatedIndividuals: 0,
              highCentralityIndividuals: 0,
              clusterCount: 0,

              // 추가 속성들
              total_students: 0,
              total_relationships: 0,
              total_nodes: 0,
              total_edges: 0,
              density: 0,
              network_density: 0,
              average_degree: 0,
              average_path_length: 0,
              clustering_coefficient: 0,
              modularity: 0,
              connected_components: 0,
              average_degree_centrality: 0,
              average_closeness_centrality: 0,
              average_betweenness_centrality: 0,
              average_eigenvector_centrality: 0,
            } as NetworkMetrics,
            friendship_types: {
              외톨이형: 0,
              "소수 친구 학생": 0,
              "평균적인 학생": 0,
              "친구 많은 학생": 0,
              "사교 스타": 0,
            },
          });
        }
      }

      setChartData(analysisResults);

    } catch (error) {
      console.error("❌ 분석 중 오류 발생:", error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="flex flex-col">
        {/* 헤더 */}
        {/* <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            교우 현황 분석
          </h1>
          {user?.role === 'homeroom_teacher' && user?.grade && user?.class ? (
            <p className="text-gray-600">
              {user.grade}학년 {user.class}반 담임선생님 - 담당 반 설문 분석
            </p>
          ) : (
            <p className="text-gray-600">
              학교 전체 설문 분석
            </p>
          )}
        </div> */}

        {/* 선택 영역 - ResultMonitoring 스타일 적용 */}
        <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              학급내{" "}
              <span className="text-[#3F80EA]">교우관계 유형 변화 추이</span>{" "}
              결과 분석
              {teacherInfo?.role === "homeroom_teacher" && teacherInfo?.grade_level && teacherInfo?.class_number && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({teacherInfo.grade_level}학년 {teacherInfo.class_number}반 담임)
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>완료된 설문프로젝트를 클릭하여 선택해주세요.</span>
              <span className="font-medium text-[#3F80EA]">
                *최대 2개까지 가능
              </span>
              <span className="ml-2 text-xs text-gray-500">
                (응답자가 있는 완료된 설문만 분석 가능)
              </span>
              <span className="ml-auto text-xs text-gray-500">
                총 {projectsData.length}개 설문
              </span>
            </div>
          </div>

          {/* 선택 가능한 설문 - ResultMonitoring ListsBox 스타일 */}
          <div className="mb-3">
            <div className="flex min-h-16 items-center gap-3 overflow-x-auto rounded-lg border border-gray-300 bg-gray-50 p-4">
              {loading ? (
                <p className="flex-shrink-0 text-sm text-gray-500">
                  설문 데이터를 불러오는 중...
                </p>
              ) : draggableItems.length === 0 ? (
                <p className="flex-shrink-0 text-sm text-gray-500">
                  {teacherInfo?.role === "homeroom_teacher"
                    ? "담당 반의 완료된 교우현황 설문이 없습니다."
                    : "선택할 교우현황 설문이 없습니다."}
                </p>
              ) : (
                draggableItems
                  .filter((item) => {
                    const isCompleted = item.status === "completed";
                    const responseCount = surveyResponseCounts[item.pid] || 0;
                    return isCompleted && responseCount > 0;
                  })
                  .map((item) => {
                    const responseCount = surveyResponseCounts[item.pid] || 0;
                    
                    return (
                      <div
                        key={item.pid}
                        onClick={() => handleProjectSelect(item)}
                        className="flex-shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-3 transition-colors duration-200 hover:border-blue-500 hover:bg-blue-50"
                      >
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="mt-1 flex items-center space-x-2 text-xs text-gray-600">
                          <span>템플릿: {item.template_category || "분석가능"}</span>
                          <span>•</span>
                          <span>응답: {responseCount}명</span>
                          <span>•</span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* 선택된 아이템 영역 - ResultMonitoring SelectedBox 스타일 */}
          <div className="mb-3">
            <div className="flex min-h-16 items-center justify-center rounded-lg border border-dashed border-gray-400 bg-gray-100 p-4">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    분석할 설문을 선택해주세요.
                  </p>
                ) : (
                  selectedItems.map((item) => (
                    <button
                      key={item.pid}
                      onClick={() => handleProjectDeselect(item)}
                      className="cursor-pointer rounded-lg bg-[#3F80EA] px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-600"
                    >
                      {item.name}
                    </button>
                  ))
                )}
              </div>
              <button
                onClick={getAnalysisResult}
                disabled={selectedItems.length === 0 || loading}
                className={`ml-4 rounded-lg px-6 py-2 text-sm font-medium text-white transition-colors duration-200 ${
                  selectedItems.length === 0 || loading
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-[#3F80EA] hover:bg-blue-600"
                } `}
              >
                {loading ? "분석 중..." : "분석하기"}
              </button>
            </div>
          </div>
        </div>

        {/* 결과 : 그래프, 테이블 */}
        {chartData.length !== 0 && (
          <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            {/* 두 개의 차트를 비교할 때만 렌더링되는 탭 메뉴 */}
            {chartData.length === 2 && (
              <div className="flex items-center justify-between self-end px-6">
                <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setActiveTab(1)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 1
                        ? "bg-white text-[#3F80EA] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    첫 번째 설문
                  </button>
                  <button
                    onClick={() => setActiveTab(2)}
                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 2
                        ? "bg-white text-[#3F80EA] shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    두 번째 설문
                  </button>
                </div>
              </div>
            )}
            <NetworkChartComponent
              chartData={chartData}
              activeTab={activeTab}
              onNodeClick={handleNodeClick}
              selectedStudentData={selectedStudentData}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default NetworkAnalysisPage;
