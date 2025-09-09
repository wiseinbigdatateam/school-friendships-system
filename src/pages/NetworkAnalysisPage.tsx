// 분석 - 교우현황 페이지 (ResultMonitoring 구조 참고)
import React, { useEffect, useState } from "react";
import NetworkChartComponent from "../components/NetworkChartComponent";
import {
  NetworkNode,
  NetworkEdge,
  NetworkAnalysisData,
  NetworkMetrics,
} from "../types";
import { SurveyService, SurveyWithStats } from "../services/surveyService";
import { useAuth } from "../contexts/AuthContext";
import { networkAnalysisService } from "../services/networkAnalysisService";

interface SurveyProject {
  pid: string;
  name: string;
  created_at: string;
  status: "ready" | "progress" | "completed";
  response_count?: number;
}

const NetworkAnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // 프로젝트 리스트 데이터 (실제로는 API에서 가져올 데이터)
  const [projectsData, setProjectsData] = useState<SurveyProject[]>([]);

  // Drag & Drop 관련 (클릭 기반으로 변경)
  const [draggableItems, setDraggableItems] = useState<SurveyProject[]>([]);
  const [selectedItems, setSelectedItems] = useState<SurveyProject[]>([]);

  // ChartComponent 컴포넌트에 props전달할 데이터
  const [chartData, setChartData] = useState<NetworkAnalysisData[]>([]);
  const [selectedData, setSelectedData] = useState<SurveyProject[]>([]);

  // 초기 데이터 설정
  useEffect(() => {
    const fetchSurveys = async () => {
      if (!user?.school_id) {
        console.error("사용자 학교 ID가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("🔍 설문 데이터 조회 시작:", {
          schoolId: user.school_id,
          userRole: user.role,
          gradeLevel: user.grade,
          classNumber: user.class,
        });

        let surveys;

        // 사용자 역할에 따라 다른 방식으로 설문 조회
        if (user.role === "homeroom_teacher" && user.grade && user.class) {
          // 담임선생님인 경우: 담당 학년/반의 설문만 조회
          console.log("🔍 담임선생님 - 담당 학년/반 설문 조회:", {
            grade: user.grade,
            class: user.class,
          });

          surveys = await SurveyService.getSurveysBySchoolGradeClass(
            user.school_id,
            user.grade,
            user.class,
          );

          // 완료된 설문만 필터링
          surveys = surveys.filter((survey) => survey.status === "completed");
        } else {
          // 관리자나 다른 역할인 경우: 학교의 모든 완료된 설문 조회
          console.log("🔍 관리자/기타 역할 - 전체 설문 조회");
          surveys = await SurveyService.getSurveysByStatus(
            user.school_id,
            "completed",
          );
        }

        // 교우관계 카테고리만 필터링 (키워드 기반)
        surveys = surveys.filter((survey) => {
          const title = survey.title?.toLowerCase() || "";
          const description = survey.description?.toLowerCase() || "";
          return (
            title.includes("교우관계") ||
            title.includes("친구") ||
            title.includes("관계") ||
            description.includes("교우관계") ||
            description.includes("친구") ||
            description.includes("관계")
          );
        });

        console.log("🔍 교우관계 필터링 후 설문:", surveys.length, "개");

        console.log("🔍 조회된 설문 데이터:", surveys);

        // SurveyWithStats를 SurveyProject 형태로 변환
        const projectData: SurveyProject[] = surveys.map((survey) => ({
          pid: survey.id,
          name: survey.title,
          created_at: survey.created_at || new Date().toISOString(),
          status: "completed" as const,
          response_count: survey.response_count || 0,
        }));

        setProjectsData(projectData);
        setDraggableItems([...projectData]);

        console.log("✅ 설문 데이터 로드 완료:", projectData);
      } catch (error) {
        console.error("❌ 설문 데이터 조회 실패:", error);
        alert("설문 데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchSurveys();
  }, [user?.school_id, user?.role, user?.grade, user?.class]);

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
      [...prev, project].sort((a, b) => a.pid.localeCompare(b.pid)),
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
      console.log("🔍 네트워크 분석 시작:", selectedItems);

      const analysisResults: NetworkAnalysisData[] = [];

      for (const item of selectedItems) {
        console.log(`🔍 설문 분석 중: ${item.name} (${item.pid})`);

        try {
          // 실제 네트워크 분석 수행
          const result = await networkAnalysisService.analyzeNetwork(item.pid);

          console.log(`✅ 설문 분석 완료: ${item.name}`, result);

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
              clusterCount: result.metrics?.connected_components || 0,

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
              connected_components: result.metrics?.connected_components || 0,
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
              소수친구학생: 0,
              평균적인학생: 0,
              친구많은학생: 0,
              사교스타: 0,
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
              소수친구학생: 0,
              평균적인학생: 0,
              친구많은학생: 0,
              사교스타: 0,
            },
          });
        }
      }

      setChartData(analysisResults);
      setSelectedData([...selectedItems]);

      console.log("✅ 모든 분석 완료:", analysisResults);
    } catch (error) {
      console.error("❌ 분석 중 오류 발생:", error);
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="">
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
            </h2>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>설문프로젝트를 클릭하여 선택해주세요.</span>
              <span className="font-medium text-[#3F80EA]">
                *최대 2개까지 가능
              </span>
            </div>
          </div>

          {/* 선택 가능한 설문 - ResultMonitoring ListsBox 스타일 */}
          <div className="mb-3">
            <div className="flex min-h-16 flex-wrap items-center justify-center gap-3 rounded-lg border border-gray-300 bg-gray-50 p-4">
              {loading ? (
                <p className="text-sm text-gray-500">
                  설문 데이터를 불러오는 중...
                </p>
              ) : draggableItems.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {user?.role === "homeroom_teacher"
                    ? "담당 반의 완료된 교우현황 설문이 없습니다."
                    : "선택할 교우현황 설문이 없습니다."}
                </p>
              ) : (
                draggableItems.map((item) => (
                  <button
                    key={item.pid}
                    onClick={() => handleProjectSelect(item)}
                    className="cursor-pointer rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium transition-colors duration-200 hover:border-blue-500 hover:text-blue-600"
                  >
                    {item.name}
                    {item.response_count && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({item.response_count}명 응답)
                      </span>
                    )}
                  </button>
                ))
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
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <NetworkChartComponent chartData={chartData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAnalysisPage;
