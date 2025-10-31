import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ChevronRightIcon, ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import NetworkGraph from "../components/NetworkGraph";
import { useAuth } from "../contexts/AuthContext";

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
  survey_templates?: {
    id: string;
    name: string;
    metadata: any;
  } | null;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  friendCount: number;
  isCenter?: boolean;
  network_metrics?: any;
}

interface ClassAnalysisResult {
  surveyId: string;
  surveyTitle: string;
  totalStudents: number;
  totalConnections: number;
  networkDensity: number;
  averageClustering: number;
  communitiesCount: number;
  students: Student[];
  networkData: {
    nodes: any[];
    edges: any[];
  };
  classMetrics: {
    averageCentrality: number;
    isolationRiskStudents: string[];
    popularStudents: string[];
    communityStructure: any[];
  };
}

interface IndividualAnalysisResult {
  studentId: string;
  studentName: string;
  centrality: number;
  communityId: number;
  isolationRisk: string;
  socialInfluence: string;
  friendshipType: string;
  recommendations: {
    immediate_actions: string[];
    short_term_goals: string[];
    long_term_goals: string[];
    monitoring_points: string[];
    intervention_level: string;
  };
  networkMetrics: any;
}

interface IntegratedAnalysisState {
  classAnalysis: ClassAnalysisResult | null;
  individualAnalyses: Map<string, IndividualAnalysisResult>;
  selectedStudent: string | null;
  currentView: "class" | "individual" | "comparison";
  navigationHistory: string[];
}

const IntegratedAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // 통합 분석 상태
  const [analysisState, setAnalysisState] = useState<IntegratedAnalysisState>({
    classAnalysis: null,
    individualAnalyses: new Map(),
    selectedStudent: null,
    currentView: "class",
    navigationHistory: []
  });

  // 설문 조회
  const fetchSurveys = useCallback(async () => {
    if (!teacherInfo) return;

    try {
      let query = supabase
        .from("surveys")
        .select(`
          *,
          survey_templates!inner(
            id,
            name,
            metadata
          )
        `)
        .eq("school_id", teacherInfo.school_id)
        .eq("status", "completed");

      // 담임교사인 경우 학년/반으로 추가 필터링
      if (teacherInfo.role === "homeroom_teacher" && teacherInfo.grade_level && teacherInfo.class_number) {
        // 모든 설문을 가져온 후 필터링
        const { data: allSurveys, error } = await query.order("created_at", { ascending: false });
        
        if (error) {
          console.error("Survey error:", error);
          throw error;
        }

        // 학년/반 매칭 필터링
        const filteredSurveys = allSurveys?.filter((survey: any) => {
          const targetGrades = survey.target_grades || [];
          const targetClasses = survey.target_classes || [];
          
          const gradeMatch = targetGrades.length === 0 || targetGrades.includes(teacherInfo.grade_level);
          const classMatch = targetClasses.length === 0 || targetClasses.includes(teacherInfo.class_number);
          
          return gradeMatch && classMatch;
        }) || [];

        if (filteredSurveys.length > 0) {
          setSurveys(filteredSurveys);
          setSelectedSurvey(filteredSurveys[0]);
        } else {
          setSurveys([]);
        }
        return;
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) {
        console.error("Survey error:", error);
        throw error;
      }

      if (data && data.length > 0) {
        setSurveys(data);
        setSelectedSurvey(data[0]);
      } else {
        setSurveys([]);
      }
    } catch (error) {
      console.error("❌ 통합 분석 - 설문 조회 오류:", error);
    }
  }, [teacherInfo]);

  // 사용자 정보 로드
  const fetchCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem("wiseon_user");
      if (!userStr) {
        console.error("❌ 사용자 정보가 없습니다");
        setLoading(false);
        return;
      }

      const user = JSON.parse(userStr);

      // 사용자 상세 정보 조회
      const { data: teacherData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("❌ 사용자 상세 정보 조회 오류:", error);
        setLoading(false);
        return;
      }

      setTeacherInfo(teacherData);
    } catch (error) {
      console.error("❌ 통합 분석 - 사용자 정보 로드 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 반 전체 분석 수행
  const performClassAnalysis = async (survey: Survey) => {
    try {
      setAnalysisLoading(true);

      // 학부모 개인정보 동의서 설문인지 확인 (분석 제외)
      const { data: surveyData, error: surveyCheckError } = await supabase
        .from("surveys")
        .select(`
          title,
          survey_templates!surveys_template_id_fkey(name)
        `)
        .eq("id", survey.id)
        .single();

      if (!surveyCheckError && surveyData) {
        const combinedTitle = `${surveyData.title || ""} ${(surveyData.survey_templates as any)?.name || ""}`;
        if (combinedTitle.includes("개인정보") && combinedTitle.includes("동의")) {
          alert("학부모 개인정보 수집·이용 동의서 설문은 분석 대상이 아닙니다.");
          setAnalysisLoading(false);
          return;
        }
      }

      // 설문 응답 데이터 조회
      const { data: responses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", survey.id);

      if (responseError) {
        throw responseError;
      }

      // 학생 정보 조회
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("current_school_id", teacherInfo.school_id);

      if (studentError) {
        throw studentError;
      }

      // 네트워크 데이터 생성
      const networkData = createClassNetworkData(responses, students);
      
      // 반 분석 결과 생성
      const classAnalysis: ClassAnalysisResult = {
        surveyId: survey.id,
        surveyTitle: survey.title,
        totalStudents: students.length,
        totalConnections: networkData.edges.length,
        networkDensity: calculateNetworkDensity(networkData),
        averageClustering: calculateAverageClustering(networkData),
        communitiesCount: detectCommunities(networkData).length,
        students: students.map(student => ({
          ...student,
          friendCount: networkData.edges.filter(edge => 
            edge.source === student.id || edge.target === student.id
          ).length,
          isCenter: false
        })),
        networkData,
        classMetrics: {
          averageCentrality: calculateAverageCentrality(networkData),
          isolationRiskStudents: identifyIsolationRiskStudents(networkData, students),
          popularStudents: identifyPopularStudents(networkData, students),
          communityStructure: detectCommunities(networkData)
        }
      };

      setAnalysisState(prev => ({
        ...prev,
        classAnalysis,
        currentView: "class"
      }));

    } catch (error) {
      console.error("❌ 반 전체 분석 오류:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 개별 학생 분석 수행
  const performIndividualAnalysis = async (studentId: string) => {
    try {
      setAnalysisLoading(true);

      const student = analysisState.classAnalysis?.students.find(s => s.id === studentId);
      if (!student) return;

      // 개별 분석 결과 생성 (실제로는 Python API 호출)
      const individualAnalysis: IndividualAnalysisResult = {
        studentId,
        studentName: student.name,
        centrality: calculateStudentCentrality(studentId, analysisState.classAnalysis?.networkData),
        communityId: getStudentCommunity(studentId, analysisState.classAnalysis?.networkData),
        isolationRisk: assessIsolationRisk(studentId, analysisState.classAnalysis?.networkData),
        socialInfluence: assessSocialInfluence(studentId, analysisState.classAnalysis?.networkData),
        friendshipType: classifyFriendshipType(studentId, analysisState.classAnalysis?.networkData),
        recommendations: generateRecommendations(studentId, analysisState.classAnalysis?.networkData),
        networkMetrics: {
          degree: student.friendCount,
          centrality: calculateStudentCentrality(studentId, analysisState.classAnalysis?.networkData),
          community_id: getStudentCommunity(studentId, analysisState.classAnalysis?.networkData)
        }
      };

      setAnalysisState(prev => ({
        ...prev,
        individualAnalyses: new Map(prev.individualAnalyses).set(studentId, individualAnalysis),
        selectedStudent: studentId,
        currentView: "individual",
        navigationHistory: [...prev.navigationHistory, "individual"]
      }));

    } catch (error) {
      console.error("❌ 개별 학생 분석 오류:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // 네트워크 데이터 생성 헬퍼 함수들
  const createClassNetworkData = (responses: any[], students: any[]) => {
    const nodes = students.map(student => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
      class: student.class,
      isCenter: false
    }));

    const edges = responses
      .filter(response => response.response_data && typeof response.response_data === 'object')
      .map(response => {
        const responseData = response.response_data;
        if (responseData.selected_students && Array.isArray(responseData.selected_students)) {
          return responseData.selected_students.map((friendId: string) => ({
            source: response.student_id,
            target: friendId,
            weight: 1
          }));
        }
        return [];
      })
      .flat()
      .filter(edge => edge.source && edge.target);

    return { nodes, edges };
  };

  const calculateNetworkDensity = (networkData: any) => {
    const n = networkData.nodes.length;
    const m = networkData.edges.length;
    return n > 1 ? (2 * m) / (n * (n - 1)) : 0;
  };

  const calculateAverageClustering = (networkData: any) => {
    // 간단한 클러스터링 계수 계산
    return 0.3; // 실제로는 더 복잡한 계산 필요
  };

  const detectCommunities = (networkData: any) => {
    // 간단한 커뮤니티 탐지
    return [{ id: 1, members: networkData.nodes.map((n: any) => n.id) }];
  };

  const calculateAverageCentrality = (networkData: any) => {
    const totalConnections = networkData.edges.length;
    const totalStudents = networkData.nodes.length;
    return totalStudents > 0 ? totalConnections / totalStudents : 0;
  };

  const identifyIsolationRiskStudents = (networkData: any, students: any[]) => {
    return students
      .filter(student => {
        const connections = networkData.edges.filter((edge: any) => 
          edge.source === student.id || edge.target === student.id
        ).length;
        return connections < 2;
      })
      .map(student => student.id);
  };

  const identifyPopularStudents = (networkData: any, students: any[]) => {
    return students
      .map(student => ({
        id: student.id,
        connections: networkData.edges.filter((edge: any) => 
          edge.source === student.id || edge.target === student.id
        ).length
      }))
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 3)
      .map(student => student.id);
  };

  const calculateStudentCentrality = (studentId: string, networkData: any) => {
    if (!networkData) return 0;
    const connections = networkData.edges.filter((edge: any) => 
      edge.source === studentId || edge.target === studentId
    ).length;
    return networkData.nodes.length > 1 ? connections / (networkData.nodes.length - 1) : 0;
  };

  const getStudentCommunity = (studentId: string, networkData: any) => {
    return 1; // 간단한 구현
  };

  const assessIsolationRisk = (studentId: string, networkData: any) => {
    const centrality = calculateStudentCentrality(studentId, networkData);
    return centrality < 0.2 ? "높음" : centrality < 0.5 ? "보통" : "낮음";
  };

  const assessSocialInfluence = (studentId: string, networkData: any) => {
    const centrality = calculateStudentCentrality(studentId, networkData);
    return centrality > 0.7 ? "높음" : centrality > 0.4 ? "보통" : "낮음";
  };

  const classifyFriendshipType = (studentId: string, networkData: any) => {
    const centrality = calculateStudentCentrality(studentId, networkData);
    const isolationRisk = assessIsolationRisk(studentId, networkData);
    
    if (isolationRisk === "높음") return "고립위험형";
    if (centrality > 0.7) return "주도형";
    if (centrality > 0.4) return "일반형";
    return "주변형";
  };

  const generateRecommendations = (studentId: string, networkData: any) => {
    const isolationRisk = assessIsolationRisk(studentId, networkData);
    const socialInfluence = assessSocialInfluence(studentId, networkData);
    
    if (isolationRisk === "높음") {
      return {
        immediate_actions: ["긴급 상담 연계", "소규모 그룹 활동 참여 유도"],
        short_term_goals: ["친구 관계 확장", "사회적 기술 향상"],
        long_term_goals: ["안정적인 교우관계 형성", "학교 적응도 향상"],
        monitoring_points: ["주간 상담 진행 상황", "새로운 친구 관계 형성 여부"],
        intervention_level: "높음"
      };
    }
    
    return {
      immediate_actions: ["현재 관계 유지", "점진적 관계 확장"],
      short_term_goals: ["리더십 기회 제공", "다양한 활동 참여"],
      long_term_goals: ["사회적 영향력 확대", "커뮤니티 리더 역할"],
      monitoring_points: ["월간 네트워크 변화", "리더십 발휘 기회"],
      intervention_level: "보통"
    };
  };

  // 네비게이션 함수들
  const navigateToClass = () => {
    setAnalysisState(prev => ({
      ...prev,
      currentView: "class",
      selectedStudent: null,
      navigationHistory: [...prev.navigationHistory, "class"]
    }));
  };

  const navigateToIndividual = (studentId: string) => {
    performIndividualAnalysis(studentId);
  };

  const navigateToComparison = () => {
    setAnalysisState(prev => ({
      ...prev,
      currentView: "comparison",
      navigationHistory: [...prev.navigationHistory, "comparison"]
    }));
  };

  const goBack = () => {
    setAnalysisState(prev => {
      const newHistory = [...prev.navigationHistory];
      newHistory.pop();
      const previousView = newHistory[newHistory.length - 1] || "class";
      
      return {
        ...prev,
        currentView: previousView as "class" | "individual" | "comparison",
        navigationHistory: newHistory,
        selectedStudent: previousView === "individual" ? prev.selectedStudent : null
      };
    });
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (teacherInfo) {
      fetchSurveys();
    }
  }, [teacherInfo, fetchSurveys]);

  useEffect(() => {
    if (selectedSurvey && teacherInfo) {
      performClassAnalysis(selectedSurvey);
    }
  }, [selectedSurvey, teacherInfo]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">통합 분석을 로딩하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">통합 교우관계 분석</h1>
              <p className="mt-1 text-sm text-gray-600">
                반 전체와 개별 학생의 교우관계를 연계하여 분석합니다
              </p>
            </div>
            
            {/* 네비게이션 컨트롤 */}
            <div className="flex items-center space-x-4">
              {analysisState.navigationHistory.length > 1 && (
                <button
                  onClick={goBack}
                  className="flex items-center space-x-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  <span>뒤로</span>
                </button>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={navigateToClass}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    analysisState.currentView === "class"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  반 전체 분석
                </button>
                
                {analysisState.selectedStudent && (
                  <button
                    onClick={() => navigateToIndividual(analysisState.selectedStudent!)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      analysisState.currentView === "individual"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    개별 분석
                  </button>
                )}
                
                {analysisState.classAnalysis && analysisState.selectedStudent && (
                  <button
                    onClick={navigateToComparison}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      analysisState.currentView === "comparison"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    비교 분석
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 설문 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            분석할 설문 선택
          </label>
          <select
            value={selectedSurvey?.id || ""}
            onChange={(e) => {
              const survey = surveys.find(s => s.id === e.target.value);
              setSelectedSurvey(survey || null);
            }}
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {surveys.map(survey => (
              <option key={survey.id} value={survey.id}>
                {survey.title} ({survey.created_at ? new Date(survey.created_at).toLocaleDateString() : ""})
              </option>
            ))}
          </select>
        </div>

        {/* 분석 결과 표시 */}
        {analysisLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="text-gray-600">분석을 수행하는 중...</p>
            </div>
          </div>
        ) : (
          <>
            {/* 반 전체 분석 뷰 */}
            {analysisState.currentView === "class" && analysisState.classAnalysis && (
              <ClassAnalysisView
                analysis={analysisState.classAnalysis}
                onStudentSelect={navigateToIndividual}
              />
            )}

            {/* 개별 분석 뷰 */}
            {analysisState.currentView === "individual" && analysisState.selectedStudent && (
              <IndividualAnalysisView
                studentId={analysisState.selectedStudent}
                analysis={analysisState.individualAnalyses.get(analysisState.selectedStudent)}
                classAnalysis={analysisState.classAnalysis}
                onBackToClass={navigateToClass}
              />
            )}

            {/* 비교 분석 뷰 */}
            {analysisState.currentView === "comparison" && analysisState.classAnalysis && analysisState.selectedStudent && (
              <ComparisonAnalysisView
                classAnalysis={analysisState.classAnalysis}
                individualAnalysis={analysisState.individualAnalyses.get(analysisState.selectedStudent)}
                studentId={analysisState.selectedStudent}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 반 전체 분석 뷰 컴포넌트
const ClassAnalysisView: React.FC<{
  analysis: ClassAnalysisResult;
  onStudentSelect: (studentId: string) => void;
}> = ({ analysis, onStudentSelect }) => {
  return (
    <div className="space-y-6">
      {/* 반 전체 통계 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">총 학생 수</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">{analysis.totalStudents}명</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">총 연결 수</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">{analysis.totalConnections}개</p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">네트워크 밀도</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {(analysis.networkDensity * 100).toFixed(1)}%
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">커뮤니티 수</h3>
          <p className="mt-2 text-3xl font-bold text-orange-600">{analysis.communitiesCount}개</p>
        </div>
      </div>

      {/* 네트워크 그래프 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">반 전체 네트워크</h3>
        <div className="flex justify-center">
          <NetworkGraph
            students={analysis.students}
            maxSelections={5}
            isInteractive={true}
            onStudentSelect={onStudentSelect}
          />
        </div>
      </div>

      {/* 학생 목록 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">학생 목록</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {analysis.students.map(student => (
            <div
              key={student.id}
              onClick={() => onStudentSelect(student.id)}
              className="cursor-pointer rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:bg-blue-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{student.name}</h4>
                  <p className="text-sm text-gray-600">
                    {student.grade}학년 {student.class}반
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600">{student.friendCount}명</p>
                  <p className="text-xs text-gray-500">친구 수</p>
                </div>
              </div>
              
              {/* 위험도 표시 */}
              {analysis.classMetrics.isolationRiskStudents.includes(student.id) && (
                <div className="mt-2 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                  고립 위험
                </div>
              )}
              
              {analysis.classMetrics.popularStudents.includes(student.id) && (
                <div className="mt-2 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  인기 학생
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// 개별 분석 뷰 컴포넌트
const IndividualAnalysisView: React.FC<{
  studentId: string;
  analysis: IndividualAnalysisResult | undefined;
  classAnalysis: ClassAnalysisResult | null;
  onBackToClass: () => void;
}> = ({ studentId, analysis, classAnalysis, onBackToClass }) => {
  if (!analysis) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">개별 분석 결과를 로딩하는 중...</p>
        </div>
      </div>
    );
  }

  const student = classAnalysis?.students.find(s => s.id === studentId);

  return (
    <div className="space-y-6">
      {/* 학생 정보 헤더 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{analysis.studentName}</h2>
            <p className="text-gray-600">
              {student?.grade}학년 {student?.class}반
            </p>
          </div>
          <button
            onClick={onBackToClass}
            className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>반 전체로 돌아가기</span>
          </button>
        </div>
      </div>

      {/* 개별 네트워크 그래프 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">개별 네트워크</h3>
        <div className="flex justify-center">
          <NetworkGraph
            students={classAnalysis?.students.map(s => ({
              ...s,
              isCenter: s.id === studentId
            })) || []}
            maxSelections={5}
            isInteractive={false}
          />
        </div>
      </div>

      {/* 개별 분석 결과 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 기본 지표 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">기본 지표</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">중심성 점수</p>
              <p className="text-2xl font-bold text-blue-600">
                {(analysis.centrality * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">교우관계 유형</p>
              <p className="text-lg font-medium text-gray-900">{analysis.friendshipType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">고립 위험도</p>
              <p className={`text-lg font-medium ${
                analysis.isolationRisk === "높음" ? "text-red-600" :
                analysis.isolationRisk === "보통" ? "text-yellow-600" : "text-green-600"
              }`}>
                {analysis.isolationRisk}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">사회적 영향력</p>
              <p className={`text-lg font-medium ${
                analysis.socialInfluence === "높음" ? "text-green-600" :
                analysis.socialInfluence === "보통" ? "text-yellow-600" : "text-red-600"
              }`}>
                {analysis.socialInfluence}
              </p>
            </div>
          </div>
        </div>

        {/* 맞춤형 추천사항 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">맞춤형 추천사항</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-blue-600">즉시 조치</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {analysis.recommendations.immediate_actions.map((action, index) => (
                  <li key={index}>• {action}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-green-600">단기 목표</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {analysis.recommendations.short_term_goals.map((goal, index) => (
                  <li key={index}>• {goal}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-purple-600">장기 목표</h4>
              <ul className="mt-2 space-y-1 text-sm text-gray-600">
                {analysis.recommendations.long_term_goals.map((goal, index) => (
                  <li key={index}>• {goal}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 비교 분석 뷰 컴포넌트
const ComparisonAnalysisView: React.FC<{
  classAnalysis: ClassAnalysisResult;
  individualAnalysis: IndividualAnalysisResult | undefined;
  studentId: string;
}> = ({ classAnalysis, individualAnalysis, studentId }) => {
  if (!individualAnalysis) return null;

  const student = classAnalysis.students.find(s => s.id === studentId);
  const classAverageCentrality = classAnalysis.classMetrics.averageCentrality;

  return (
    <div className="space-y-6">
      {/* 비교 헤더 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">
          {individualAnalysis.studentName} vs 반 전체 비교
        </h2>
        <p className="text-gray-600">
          개별 학생의 지표를 반 전체 평균과 비교하여 분석합니다
        </p>
      </div>

      {/* 비교 지표 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 중심성 비교 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">중심성 비교</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">개별 학생 중심성</p>
              <p className="text-2xl font-bold text-blue-600">
                {(individualAnalysis.centrality * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">반 전체 평균</p>
              <p className="text-2xl font-bold text-gray-600">
                {(classAverageCentrality * 100).toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">비교 결과</p>
              <p className={`text-lg font-medium ${
                individualAnalysis.centrality > classAverageCentrality ? "text-green-600" : "text-red-600"
              }`}>
                {individualAnalysis.centrality > classAverageCentrality ? "평균 이상" : "평균 이하"}
              </p>
            </div>
          </div>
        </div>

        {/* 위험도 비교 */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">위험도 분석</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">고립 위험도</p>
              <p className={`text-lg font-medium ${
                individualAnalysis.isolationRisk === "높음" ? "text-red-600" :
                individualAnalysis.isolationRisk === "보통" ? "text-yellow-600" : "text-green-600"
              }`}>
                {individualAnalysis.isolationRisk}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">반 내 고립 위험 학생 수</p>
              <p className="text-lg font-medium text-gray-900">
                {classAnalysis.classMetrics.isolationRiskStudents.length}명
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">위험도 순위</p>
              <p className="text-lg font-medium text-gray-900">
                {classAnalysis.classMetrics.isolationRiskStudents.includes(studentId) 
                  ? "고위험군" : "안전군"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 통합 추천사항 */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">통합 추천사항</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div>
            <h4 className="font-medium text-blue-600">개별 맞춤 조치</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {individualAnalysis.recommendations.immediate_actions.map((action, index) => (
                <li key={index}>• {action}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-green-600">반 전체 개선</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>• 고립 위험 학생 집중 관리</li>
              <li>• 전체 네트워크 밀도 향상</li>
              <li>• 커뮤니티 간 연결 강화</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-purple-600">모니터링 포인트</h4>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {individualAnalysis.recommendations.monitoring_points.map((point, index) => (
                <li key={index}>• {point}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedAnalysis;
