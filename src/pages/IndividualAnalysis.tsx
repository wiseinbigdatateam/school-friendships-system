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
import { AIReportService } from "../services/aiReportService";
import AIReportDisplay from "../components/AIReportDisplay";
import { useAuth } from "../contexts/AuthContext";
import { unifiedNetworkAnalysisService } from "../services/unifiedNetworkAnalysisService";
import { IndividualAnalysisResult } from "../types/unifiedNetworkTypes";
import { networkAnalysisService } from "../services/networkAnalysisService";
import { NetworkAnalysisData } from "../types";
import {
  StudentMetrics,
  CurrentStatus,
  NetworkStability,
  RecommendationPlan,
  MonitoringPoints,
  calculateCurrentStatus,
  calculateNetworkStability,
  generateRecommendationPlan,
  generateMonitoringPoints,
  assessRiskLevel,
} from "../utils/studentStatusCalculator";

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
  student_number: string;
  current_school_id?: string | null;
  lifelong_education_id?: string;
  birth_date?: string;
  gender?: string;
  enrolled_at?: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
  network_metrics?: any;
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
    current_status?: {
      school_satisfaction: string;
      teacher_relationship: string;
      peer_relationship: string;
      network_participation: string;
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [individualNetworkData, setIndividualNetworkData] = useState<any[]>([]);
  const [maxSelections, setMaxSelections] = useState<number[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"core" | "ai" | "python">("core");
  const [aiReport, setAiReport] = useState<GeneratedReport | null>(null);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [pythonAnalysisResult, setPythonAnalysisResult] = useState<PythonAnalysisResult | null>(null);
  const [pythonAnalysisLoading, setPythonAnalysisLoading] = useState(false);
  const [surveyResponseCounts, setSurveyResponseCounts] = useState<{[key: string]: number}>({});
  const [pythonAnalysisError, setPythonAnalysisError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [unifiedAnalysisResult, setUnifiedAnalysisResult] = useState<IndividualAnalysisResult | null>(null);
  const [unifiedAnalysisLoading, setUnifiedAnalysisLoading] = useState(false);
  const [networkAnalysisData, setNetworkAnalysisData] = useState<NetworkAnalysisData | null>(null);
  const [networkAnalysisLoading, setNetworkAnalysisLoading] = useState(false);

  // 통합 서비스를 사용한 개별 학생 분석
  const performUnifiedIndividualAnalysis = useCallback(async (surveyId: string, studentId: string) => {
    try {
      setUnifiedAnalysisLoading(true);
      console.log(`🔍 통합 개별 분석 시작: ${surveyId} - ${studentId}`);
      console.log(`📋 studentId 타입: ${typeof studentId}, 값: ${JSON.stringify(studentId)}`);
      
      const individualAnalysis = await unifiedNetworkAnalysisService.getIndividualAnalysis(
        surveyId,
        studentId
      );
      
      setUnifiedAnalysisResult(individualAnalysis);
      console.log(`✅ 통합 개별 분석 완료: ${studentId}`);
      
    } catch (error) {
      console.error("❌ 통합 개별 분석 오류:", error);
      setUnifiedAnalysisResult(null);
    } finally {
      setUnifiedAnalysisLoading(false);
    }
  }, []);

  // 전체 네트워크 분석 수행
  const performNetworkAnalysis = useCallback(async (surveyId: string) => {
    try {
      setNetworkAnalysisLoading(true);
      console.log(`🔍 전체 네트워크 분석 시작: ${surveyId}`);
      
      const result = await networkAnalysisService.analyzeNetwork(surveyId);
      
      const networkData: NetworkAnalysisData = {
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
          isolatedIndividuals: 0,
          highCentralityIndividuals: 0,
          clusterCount: result.metrics?.connected_components || 0,

          // 추가 속성들
          total_students: result.metrics?.total_students || result.nodes.length,
          total_relationships: result.metrics?.total_relationships || result.edges.length,
          total_nodes: result.nodes.length,
          total_edges: result.edges.length,
          density: result.metrics?.density || 0,
          network_density: result.metrics?.density || 0,
          average_degree: result.metrics?.average_degree || 0,
          average_path_length: result.metrics?.average_path_length || 0,
          clustering_coefficient: result.metrics?.clustering_coefficient || 0,
          modularity: result.metrics?.modularity || 0,
          connected_components: result.metrics?.connected_components || 0,
          average_degree_centrality: result.metrics?.average_degree_centrality || 0,
          average_closeness_centrality: result.metrics?.average_closeness_centrality || 0,
          average_betweenness_centrality: result.metrics?.average_betweenness_centrality || 0,
          average_eigenvector_centrality: result.metrics?.average_eigenvector_centrality || 0,
        },
        friendship_types: result.friendship_type_distribution || {
          외톨이형: 0,
          "소수 친구 학생": 0,
          "평균적인 학생": 0,
          "친구 많은 학생": 0,
          "사교 스타": 0,
        },
      };
      
      setNetworkAnalysisData(networkData);
      console.log(`✅ 전체 네트워크 분석 완료: ${surveyId}`);
      
    } catch (error) {
      console.error("❌ 전체 네트워크 분석 오류:", error);
      setNetworkAnalysisData(null);
    } finally {
      setNetworkAnalysisLoading(false);
    }
  }, []);

  // 설문별 응답자 수 계산 함수 - 더 간단하고 확실한 방법
  const calculateResponseCounts = async (surveys: Survey[]) => {
    console.log("📊 응답자 수 계산 시작:", surveys.length, "개 설문");
    
    const counts: {[key: string]: number} = {};
    
    // 모든 설문의 응답 수를 한 번에 조회
    try {
      const surveyIds = surveys.map(survey => survey.id);
      console.log("🔍 조회할 설문 ID들:", surveyIds);
      
      const { data, error } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .in("survey_id", surveyIds);
      
      if (error) {
        console.error("❌ 응답자 수 조회 오류:", error);
        return;
      }
      
      console.log("📋 조회된 응답 데이터:", data);
      console.log("📋 조회된 응답 데이터 개수:", data?.length || 0);
      
      // 설문별로 응답 수 계산
      surveyIds.forEach(surveyId => {
        const responseCount = data?.filter(response => response.survey_id === surveyId).length || 0;
        counts[surveyId] = responseCount;
        console.log(`✅ 설문 ${surveyId} 응답 수: ${responseCount}명`);
      });
      
      console.log("📊 최종 응답자 수 결과:", counts);
      
      // 상태 업데이트 - 강제로 즉시 반영
      setSurveyResponseCounts(counts);
      console.log("🔄 상태 업데이트 완료:", counts);
      
      // 강제 리렌더링 트리거
      setForceUpdate(prev => prev + 1);
      console.log("🔄 강제 리렌더링 트리거");
      
      // 상태 업데이트 완료 로그
      console.log("✅ 응답자 수 계산 완료");
      
    } catch (error) {
      console.error("❌ 응답자 수 계산 중 오류:", error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (teacherInfo) {
      fetchSurveys();
      fetchStudents();
    }
  }, [teacherInfo]);

  // 강제 리렌더링을 위한 useEffect
  useEffect(() => {
    console.log("🔄 강제 리렌더링 발생:", forceUpdate);
    console.log("📊 현재 surveyResponseCounts:", surveyResponseCounts);
  }, [forceUpdate, surveyResponseCounts]);

  // 선택된 학생이 변경될 때 개별 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey) {
      console.log("선택된 학생 변경됨, 개별 네트워크 데이터 생성:", selectedStudent);
      generateIndividualNetworkData(selectedStudent, selectedSurvey.id);
    }
  }, [selectedStudent, selectedSurvey]);

  // 네트워크 분석 데이터가 로드되면 학생 상태 업데이트를 위한 강제 리렌더링
  useEffect(() => {
    if (networkAnalysisData) {
      console.log("네트워크 분석 데이터 로드됨, 학생 상태 업데이트:", networkAnalysisData);
      setForceUpdate(prev => prev + 1);
    }
  }, [networkAnalysisData]);

  // 학생 선택 시 통합 분석 수행
  useEffect(() => {
    console.log(`🔄 useEffect 트리거: selectedStudent=${selectedStudent}, selectedSurvey=${selectedSurvey?.id}`);
    if (selectedStudent && selectedSurvey) {
      console.log(`📋 호출할 매개변수: surveyId=${selectedSurvey.id}, studentId=${selectedStudent}`);
      performUnifiedIndividualAnalysis(selectedSurvey.id, selectedStudent);
    }
  }, [selectedStudent, selectedSurvey, performUnifiedIndividualAnalysis]);

  // 설문 선택 시 전체 네트워크 분석 수행
  useEffect(() => {
    if (selectedSurvey) {
      console.log(`🔄 전체 네트워크 분석 트리거: selectedSurvey=${selectedSurvey.id}`);
      performNetworkAnalysis(selectedSurvey.id);
    }
  }, [selectedSurvey, performNetworkAnalysis]);

  const fetchCurrentUser = async () => {
    try {
      // 로컬 스토리지에서 사용자 정보 확인
      const userStr = localStorage.getItem("wiseon_user");
      const authToken = localStorage.getItem("wiseon_auth_token");

      if (!userStr || !authToken) {
        console.log("🔍 로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // 사용자의 담임 정보 조회
      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (teacherError) throw teacherError;
      setTeacherInfo(teacherData);

      console.log("🔍 IndividualAnalysis 사용자 정보 설정 완료:", {
        user,
        teacherData,
      });
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      // 에러 발생 시 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  const fetchSurveys = async () => {
    try {
      if (!teacherInfo) {
        console.log("교사 정보가 없습니다.");
        setSurveys([]);
        return;
      }

      console.log("🔍 IndividualAnalysis 설문 조회 시작:", {
        userId: teacherInfo.id,
        userRole: teacherInfo.role,
        schoolId: teacherInfo.school_id,
        gradeLevel: teacherInfo.grade_level,
        classNumber: teacherInfo.class_number
      });

      // 먼저 설문 템플릿에서 카테고리가 "교우관계" 또는 "종합조사"인 것 찾기
      const { data: templates, error: templateError } = await supabase
        .from("survey_templates")
        .select("id, name, metadata")
        .eq("is_active", true);

      if (templateError) {
        console.error("Template error:", templateError);
        throw templateError;
      }

      // 카테고리가 "교우관계" 또는 "종합조사"인 템플릿 ID들 찾기
      const analysisTemplateIds = templates
        .filter((template: any) => {
          const metadata = template.metadata;
          return metadata && (metadata.category === "교우관계" || metadata.category === "종합조사");
        })
        .map((template: any) => template.id);

      if (analysisTemplateIds.length === 0) {
        console.log("No analysis surveys found");
        setSurveys([]);
        return;
      }

      // 사용자 역할에 따른 설문 필터링
      // 해당 템플릿을 사용하는 완료된 설문들만 가져오기 (템플릿 정보 포함)
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
        console.log("🏫 학교 ID로 필터링:", teacherInfo.school_id);
      }

      // 담임교사인 경우 학년/반으로 추가 필터링
      if (teacherInfo.role === "homeroom_teacher" && teacherInfo.grade_level && teacherInfo.class_number) {
        console.log("👨‍🏫 담임교사 - 학년/반 필터링:", {
          gradeLevel: teacherInfo.grade_level,
          classNumber: teacherInfo.class_number
        });
        
        // 설문의 target_grades와 target_classes 확인
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
          
          console.log(`🔍 설문 "${survey.title}" 필터링 체크:`, {
            targetGrades,
            targetClasses,
            userGrade: teacherInfo.grade_level,
            userClass: teacherInfo.class_number,
            gradeMatch,
            classMatch,
            isMatch: gradeMatch && classMatch
          });
          
          return gradeMatch && classMatch;
        }) || [];

        console.log("🎯 필터링 후 분석 가능한 설문 개수:", filteredSurveys.length);
        
        if (filteredSurveys.length > 0) {
          console.log("📋 필터링된 설문들:", filteredSurveys.map(s => ({ id: s.id, title: s.title })));
          setSurveys(filteredSurveys);
          setSelectedSurvey(filteredSurveys[0]);
          // 응답자 수 계산
          console.log("🔄 응답자 수 계산 시작...");
          await calculateResponseCounts(filteredSurveys);
        } else {
          setSurveys([]);
        }
      } else {
        // 다른 역할의 경우 학교 전체 설문
        const { data, error } = await query.order("created_at", { ascending: false });

        if (error) {
          console.error("Survey error:", error);
          throw error;
        }

        if (data && data.length > 0) {
          console.log("📋 전체 설문들:", data.map(s => ({ id: s.id, title: s.title })));
          setSurveys(data);
          setSelectedSurvey(data[0]);
          // 응답자 수 계산
          console.log("🔄 응답자 수 계산 시작...");
          await calculateResponseCounts(data);
          
          // 즉시 테스트를 위한 추가 로그
          setTimeout(() => {
            console.log("🧪 상태 확인 - surveyResponseCounts:", surveyResponseCounts);
            console.log("🧪 첫 번째 설문 ID:", data[0]?.id);
            console.log("🧪 첫 번째 설문 응답 수:", surveyResponseCounts[data[0]?.id] || 0);
          }, 1000);
        } else {
          setSurveys([]);
        }
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!teacherInfo) {
        console.log("교사 정보가 없습니다.");
        setStudents([]);
        return;
      }

      console.log("👥 학생 조회 시작:", {
        userRole: teacherInfo.role,
        schoolId: teacherInfo.school_id,
        gradeLevel: teacherInfo.grade_level,
        classNumber: teacherInfo.class_number
      });

      let query = supabase.from("students").select("*");

      // 학교 ID로 필터링
      if (teacherInfo.school_id) {
        query = query.eq("current_school_id", teacherInfo.school_id);
        console.log("🏫 학교 ID로 필터링:", teacherInfo.school_id);
      }

      // 담임교사인 경우 학년/반으로 추가 필터링
      if (teacherInfo.role === "homeroom_teacher" && teacherInfo.grade_level && teacherInfo.class_number) {
        query = query
          .eq("grade", teacherInfo.grade_level)
          .eq("class", teacherInfo.class_number);
        console.log("👨‍🏫 담임교사 - 담당 학년/반 학생 조회:", {
          grade: teacherInfo.grade_level,
          class: teacherInfo.class_number
        });
      }

      const { data, error } = await query.order("student_number", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // 네트워크 분석 결과 조회 (StudentManagement.tsx와 동일한 방식)
        const { data: networkData, error: networkError } = await supabase
          .from("network_analysis_results")
          .select("*")
          .eq("analysis_type", "complete_network_analysis")
          .order("calculated_at", { ascending: false })
          .limit(1);

        if (networkError) {
          console.error("네트워크 분석 결과 조회 오류:", networkError);
        }

        // 학생 데이터에 네트워크 메트릭 연결
        const studentsWithMetrics = data.map((student) => {
          let metrics = null;
          if (networkData && networkData.length > 0) {
            const completeAnalysis = networkData[0];
            const recommendations = completeAnalysis.recommendations as any;
            const completeData = recommendations?.complete_analysis_data;

            if (completeData?.nodes) {
              const node = completeData.nodes.find(
                (n: any) =>
                  n.id === student.id ||
                  (n.name === student.name &&
                    n.grade === student.grade &&
                    n.class === student.class),
              );

              if (node) {
                metrics = {
                  centrality_scores: {
                    centrality: node.centrality,
                    degree: node.centrality, // 호환성을 위해 degree도 설정
                    betweenness: node.betweenness || 0,
                    closeness: node.closeness || 0,
                  },
                  community_membership: node.community || 0,
                  recommendations: node.recommendations || {},
                };
              }
            }
          }

          return {
            ...student,
            network_metrics: metrics,
          };
        });

        setStudents(studentsWithMetrics);
        setSelectedStudent(studentsWithMetrics[0].id);
        console.log("✅ 학생 데이터 조회 성공:", studentsWithMetrics.length, "명");
        console.log("📊 네트워크 메트릭 포함:", studentsWithMetrics.filter(s => s.network_metrics).length, "명");
      } else {
        setStudents([]);
        console.log("⚠️ 해당 조건의 학생이 없습니다.");
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

  // 학생 유형별 분류 함수들
  const getStudentType = (student: Student) => {
    // 전체 네트워크 분석 데이터에서 해당 학생의 유형 찾기 (우선순위 1)
    if (networkAnalysisData) {
      const networkNode = networkAnalysisData.nodes.find(n => n.id === student.id);
      if (networkNode && networkNode.friendship_type) {
        switch (networkNode.friendship_type) {
          case "외톨이형": return "isolated";
          case "소수 친구 학생": return "few_friends";
          case "평균적인 학생": return "average";
          case "친구 많은 학생": return "many_friends";
          case "사교 스타": return "social_star";
        }
      }
    }

    // 네트워크 메트릭이 있으면 사용 (우선순위 2)
    if (student.network_metrics) {
      const centrality =
        student.network_metrics.centrality_scores?.centrality ||
        student.network_metrics.centrality_scores?.degree ||
        0;
      
      const totalStudents = students.length;
      const maxPossibleConnections = totalStudents - 1;
      const normalizedCentrality = centrality / Math.max(maxPossibleConnections, 1);
      
      if (normalizedCentrality < 0.1) return "isolated";      // 외톨이형
      if (normalizedCentrality < 0.3) return "few_friends";   // 소수 친구 학생
      if (normalizedCentrality < 0.6) return "average";       // 평균적인 학생
      if (normalizedCentrality < 0.8) return "many_friends";  // 친구 많은 학생
      return "social_star";                                    // 사교 스타
    }

    // 개별 네트워크 데이터에서 계산 (우선순위 3)
    if (individualNetworkData.length > 0) {
      const studentData = individualNetworkData.find(s => s.id === student.id);
      if (studentData) {
        const totalStudents = individualNetworkData.length;
        const maxPossibleConnections = totalStudents - 1;
        const normalizedCentrality = studentData.friendCount / Math.max(maxPossibleConnections, 1);
        
        if (normalizedCentrality < 0.1) return "isolated";
        if (normalizedCentrality < 0.3) return "few_friends";
        if (normalizedCentrality < 0.6) return "average";
        if (normalizedCentrality < 0.8) return "many_friends";
        return "social_star";
      }
    }

    // 기본값: 평균적인 학생
    return "average";
  };

  const getStudentTypeColor = (type: string) => {
    switch (type) {
      case "isolated":
        return "text-white"; // #FF6B6B 외톨이형
      case "few_friends":
        return "text-white"; // #4ECDC4 소수 친구 학생
      case "average":
        return "text-white"; // #45B7D1 평균적인 학생
      case "many_friends":
        return "text-white"; // #96CEB4 친구 많은 학생
      case "social_star":
        return "text-gray-800"; // #FFEAA7 사교 스타
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStudentTypeBgColor = (type: string) => {
    switch (type) {
      case "isolated":
        return "#FF6B6B"; // 외톨이형 - 빨간색
      case "few_friends":
        return "#4ECDC4"; // 소수 친구 학생 - 청록색
      case "average":
        return "#45B7D1"; // 평균적인 학생 - 파란색
      case "many_friends":
        return "#96CEB4"; // 친구 많은 학생 - 민트색
      case "social_star":
        return "#FFEAA7"; // 사교 스타 - 노란색
      default:
        return "#94a3b8";
    }
  };

  const getStudentTypeLabel = (type: string) => {
    switch (type) {
      case "isolated":
        return "외톨이형";
      case "few_friends":
        return "소수 친구 학생";
      case "average":
        return "평균적인 학생";
      case "many_friends":
        return "친구 많은 학생";
      case "social_star":
        return "사교 스타";
      default:
        return "평균적인 학생";
    }
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
        .maybeSingle();

      if (responseError) {
        console.error("설문 응답 조회 오류:", responseError);
        return [];
      }

      if (!studentResponse) {
        console.log("해당 학생의 설문 응답이 없습니다:", { studentId, surveyId });
        return [];
      }

      // 3. 학생 데이터 조회
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("*");

      if (studentsError) throw studentsError;

      // 4. 템플릿 메타데이터에서 max_selections 추출
      const metadata = surveyData?.survey_templates?.metadata as any;
      const maxSelections = metadata?.max_selections || [];
      setMaxSelections(maxSelections);

      // 5. 모든 학생들의 응답을 조회하여 양방향 관계 고려
      const { data: allResponses, error: allResponsesError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId);

      if (allResponsesError) throw allResponsesError;

      const studentMap = new Map(studentsData.map((s) => [s.id, s]));
      const selectedFriends = new Set<string>();

      // 선택된 학생의 응답에서 친구 추출 (선택된 학생이 선택한 친구)
      if (studentResponse && studentResponse.responses) {
        const answers =
          typeof studentResponse.responses === "string"
            ? JSON.parse(studentResponse.responses)
            : studentResponse.responses;

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

      // 다른 학생들의 응답에서 선택된 학생을 선택한 경우도 추가 (양방향 관계)
      allResponses?.forEach((response) => {
        if (response.student_id !== studentId && response.responses) {
          const answers =
            typeof response.responses === "string"
              ? JSON.parse(response.responses)
              : response.responses;

          Object.entries(answers).forEach(
            ([questionKey, answer]: [string, any]) => {
              const questionIndex = parseInt(questionKey.replace("q", "")) - 1;
              const maxSelection = maxSelections[questionIndex] || 10;

              if (Array.isArray(answer)) {
                const limitedAnswers = answer.slice(0, maxSelection);
                if (limitedAnswers.includes(studentId) && response.student_id) {
                  selectedFriends.add(response.student_id);
                }
              } else if (answer === studentId && maxSelection >= 1 && response.student_id) {
                selectedFriends.add(response.student_id);
              }
            },
          );
        }
      });

      // 6. 개별 네트워크 데이터 생성 (선택된 학생 + 선택한 친구들만)
      const individualNetworkData = [];

      // 전체 네트워크 분석 데이터에서 friendship_type 가져오기
      const getFriendshipTypeFromNetwork = (studentId: string) => {
        if (networkAnalysisData) {
          const networkNode = networkAnalysisData.nodes.find(n => n.id === studentId);
          if (networkNode && networkNode.friendship_type) {
            return networkNode.friendship_type;
          }
        }
        return "평균적인 학생"; // 기본값
      };

      // 선택된 학생 추가
      individualNetworkData.push({
        id: selectedStudentData.id,
        name: selectedStudentData.name,
        grade: selectedStudentData.grade,
        class: selectedStudentData.class,
        friends: Array.from(selectedFriends),
        friendCount: selectedFriends.size,
        isCenter: true, // 중심 학생 표시
        friendship_type: getFriendshipTypeFromNetwork(selectedStudentData.id), // 전체 네트워크 데이터에서 가져오기
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
            friendship_type: getFriendshipTypeFromNetwork(friendId), // 전체 네트워크 데이터에서 가져오기
          });
        }
      });

      console.log("개별 네트워크 데이터 생성 완료:", {
        studentName: selectedStudentData.name,
        friendCount: selectedFriends.size,
        totalNodes: individualNetworkData.length
      });

      return individualNetworkData;
    } catch (error) {
      console.error("Error in generateIndividualNetworkData:", error);
      return [];
    }
  }, [students, networkAnalysisData]);

  // 학생 또는 설문 선택 시 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey && students.length > 0) {
      setNetworkLoading(true);

      // 개별 네트워크 데이터 생성
      generateIndividualNetworkData(selectedStudent, selectedSurvey.id)
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
    if (!selectedSurvey) return [];
    
    try {
      // 전체 학급의 설문 응답 데이터 조회 (선택된 학생만이 아닌 모든 학생)
      const { data: allResponses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", selectedSurvey.id);

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
        .eq("id", selectedSurvey.id)
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

  // 추가 설문 데이터 수집 함수 (다른 설문들의 내용도 참조)
  const prepareAdditionalSurveyData = useCallback(async () => {
    if (!selectedStudentData) return null;

    try {
      // 해당 학생의 모든 설문 응답 조회
      const { data: allResponses, error } = await supabase
        .from('survey_responses')
        .select(`
          *,
          surveys (
            id,
            title,
            questions
          )
        `)
        .eq('student_id', selectedStudentData.id);

      if (error) throw error;

      // 설문 응답을 구조화된 데이터로 변환
      const surveyData = allResponses?.map(response => ({
        surveyTitle: response.surveys?.title || '알 수 없는 설문',
        responses: response.responses,
        questions: response.surveys?.questions || [],
        submittedAt: response.submitted_at
      })) || [];

      return {
        studentName: selectedStudentData.name,
        totalSurveys: surveyData.length,
        surveys: surveyData
      };
    } catch (error) {
      console.error('추가 설문 데이터 수집 오류:', error);
      return null;
    }
  }, [selectedStudentData]);

  // AI 리포트 생성 함수
  const generateAIReport = useCallback(async () => {
    if (!selectedStudentData || !individualNetworkData.length || !selectedSurvey) return;

    setAiReportLoading(true);

    try {
      // 먼저 기존 리포트가 있는지 확인
      const existingReport = await AIReportService.getAIReport(
        selectedStudentData.id,
        selectedSurvey.id
      );

      if (existingReport) {
        // 기존 리포트가 있으면 DB에서 로드
        setAiReport(existingReport.report_data || null);
        setAiReportLoading(false);
        return;
      }

      // 네트워크 분석 결과에서 데이터 추출 - 더 구체적인 메트릭 사용
      const centerStudent = individualNetworkData.find((s) => s.isCenter);
      const totalNodes = individualNetworkData.length;
      const maxPossibleConnections = totalNodes - 1;
      
      // 기본 중앙성 계산
      const basicCentrality = centerStudent
        ? centerStudent.friendCount / Math.max(maxPossibleConnections, 1)
        : 0;
      
      // 네트워크 메트릭에서 더 정확한 데이터 추출
      const networkMetrics = selectedStudentData.network_metrics;
      let refinedCentrality = basicCentrality;
      let communityId = 0;
      let isolationRisk = "보통";
      let friendshipDevelopment = "보통";
      let communityIntegration = "보통";
      
      if (networkMetrics) {
        // Python 분석 결과가 있으면 더 정확한 메트릭 사용
        const centralityMetrics = networkMetrics.centrality_metrics;
        if (centralityMetrics) {
          // 정규화된 중앙성 점수 사용 (0-1 범위)
          refinedCentrality = Math.min(centralityMetrics.degree / maxPossibleConnections, 1);
        }
        
        // 커뮤니티 ID 사용
        communityId = networkMetrics.community_id || 0;
        
        // 격리 위험도 분석 결과 사용
        if (networkMetrics.isolation_risk) {
          isolationRisk = networkMetrics.isolation_risk.level || "보통";
        }
        
        // 사회적 영향력 분석 결과 사용
        if (networkMetrics.social_influence) {
          const influenceLevel = networkMetrics.social_influence.level;
          friendshipDevelopment = influenceLevel === "높음" ? "양호" : 
                                 influenceLevel === "보통" ? "보통" : "개선 필요";
          communityIntegration = influenceLevel === "높음" ? "높음" : 
                                influenceLevel === "보통" ? "보통" : "낮음";
        }
      } else {
        // 네트워크 메트릭이 없으면 기본 계산 사용
        isolationRisk = refinedCentrality < 0.3 ? "높음" : refinedCentrality < 0.6 ? "보통" : "낮음";
        friendshipDevelopment = refinedCentrality < 0.3 ? "개선 필요" : refinedCentrality < 0.6 ? "보통" : "양호";
        communityIntegration = refinedCentrality < 0.3 ? "낮음" : refinedCentrality < 0.6 ? "보통" : "높음";
      }

      const analysisData: StudentAnalysisData = {
        studentName: selectedStudentData.name,
        grade: parseInt(selectedStudentData.grade),
        class: parseInt(selectedStudentData.class),
        centrality: refinedCentrality,
        community: communityId,
        totalRelationships: centerStudent?.friendCount || 0,
        isolationRisk: isolationRisk,
        friendshipDevelopment: friendshipDevelopment,
        communityIntegration: communityIntegration,
      };

      // 디버깅을 위한 분석 데이터 출력
      console.log("🔍 개별 리포트 분석 데이터:", {
        studentName: analysisData.studentName,
        centrality: analysisData.centrality,
        community: analysisData.community,
        totalRelationships: analysisData.totalRelationships,
        isolationRisk: analysisData.isolationRisk,
        friendshipDevelopment: analysisData.friendshipDevelopment,
        communityIntegration: analysisData.communityIntegration,
        hasNetworkMetrics: !!networkMetrics,
        networkMetricsKeys: networkMetrics ? Object.keys(networkMetrics) : []
      });

      // 추가 설문 데이터 수집 (다른 설문들의 내용도 참조)
      const additionalSurveyData = await prepareAdditionalSurveyData();

      // ChatGPT API 호출
      const report = await generateStudentGuidanceReport(analysisData, additionalSurveyData);
      
      // DB에 저장
      await AIReportService.saveAIReport(
        selectedStudentData.id,
        selectedSurvey.id,
        report
      );
      
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
      
      // 대체 리포트도 DB에 저장
      if (selectedSurvey) {
        try {
          await AIReportService.saveAIReport(
            selectedStudentData.id,
            selectedSurvey.id,
            fallbackReport
          );
        } catch (saveError) {
          console.error("대체 리포트 저장 오류:", saveError);
        }
      }
      
      setAiReport(fallbackReport);
    } finally {
      setAiReportLoading(false);
    }
  }, [selectedStudentData, individualNetworkData, selectedSurvey]);

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
              {teacherInfo?.role === "homeroom_teacher" && teacherInfo?.grade_level && teacherInfo?.class_number && (
                <span className="ml-2 text-sm font-normal text-gray-600">
                  ({teacherInfo.grade_level}학년 {teacherInfo.class_number}반 담임)
                </span>
              )}
            </h2>

            <div className="flex h-fit w-full gap-2 overflow-x-scroll">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`h-36 min-w-72 cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedSurvey?.id === survey.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSurvey(survey)}
                >
                  <h3 className="mb-2 font-medium text-gray-900">
                    {survey.title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>템플릿형: {survey.survey_templates?.metadata?.category || '분석가능'}</p>
                    <p>평가인원: {surveyResponseCounts[survey.id] || 0}명</p>
                    <p>상태: <span className={`font-medium ${survey.status === 'completed' ? 'text-green-600' : survey.status === 'active' ? 'text-blue-600' : 'text-gray-600'}`}>
                      {survey.status === 'completed' ? '완료' : survey.status === 'active' ? '진행중' : survey.status}
                    </span></p>
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
                {teacherInfo?.role === "homeroom_teacher" && teacherInfo?.grade_level && teacherInfo?.class_number 
                  ? `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 총 ${students.length}명`
                  : `학생 총 ${students.length}명`
                }
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
                      <div className="flex items-center space-x-2">
                        <span className="truncate text-sm font-medium">
                          {index + 1}번) {student.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStudentTypeColor(
                            getStudentType(student)
                          )}`}
                          style={{ backgroundColor: getStudentTypeBgColor(getStudentType(student)) }}
                        >
                          {getStudentTypeLabel(getStudentType(student))}
                        </span>
                      </div>
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
                        {/* <button
                          onClick={() => setActiveTab("python")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "python"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Python분석
                        </button> */}
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
                          <div className="space-y-4">
                            {/* 재생성 버튼 */}
                            <div className="flex justify-end">
                              <button
                                onClick={async () => {
                                  // 기존 리포트 삭제 후 재생성
                                  setAiReport(null);
                                  setAiReportLoading(true);
                                  
                                  try {
                                    // DB에서 기존 리포트 삭제
                                    if (selectedStudentData && selectedSurvey) {
                                      await AIReportService.deleteAIReportByStudentSurvey(
                                        selectedStudentData.id,
                                        selectedSurvey.id
                                      );
                                    }
                                    
                                    // 새 리포트 생성
                                    await generateAIReport();
                                  } catch (error) {
                                    console.error("리포트 재생성 오류:", error);
                                    setAiReportLoading(false);
                                  }
                                }}
                                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                              >
                                <svg 
                                  className="h-4 w-4" 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth={2} 
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                                  />
                                </svg>
                                <span>리포트 재생성</span>
                              </button>
                            </div>
                            
                            {/* AI 리포트 표시 */}
                            <AIReportDisplay aiReport={aiReport} />
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-gray-500">
                              AI 리포트를 생성하려면 "AI리포트 생성" 버튼을 클릭하세요.
                            </p>
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

                  {/* 통합 분석 결과 - 주석처리 */}
                  {/* {unifiedAnalysisResult && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        통합 네트워크 분석 결과
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {unifiedAnalysisResult.centralityMetrics.degree.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">연결 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {unifiedAnalysisResult.centralityMetrics.betweenness.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">중개 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {unifiedAnalysisResult.centralityMetrics.closeness.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">근접 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {unifiedAnalysisResult.communityMembership}
                          </div>
                          <div className="text-sm text-gray-600">커뮤니티</div>
                        </div>
                      </div>

                      위험도 및 영향력
                      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-gray-50 p-4">
                          <h4 className="mb-2 font-medium text-gray-900">고립 위험도</h4>
                          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            unifiedAnalysisResult.isolationRisk.level === 'high' ? 'bg-red-100 text-red-800' :
                            unifiedAnalysisResult.isolationRisk.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {unifiedAnalysisResult.isolationRisk.level === 'high' ? '높음' :
                             unifiedAnalysisResult.isolationRisk.level === 'medium' ? '보통' : '낮음'}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {unifiedAnalysisResult.isolationRisk.description}
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-gray-50 p-4">
                          <h4 className="mb-2 font-medium text-gray-900">사회적 영향력</h4>
                          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            unifiedAnalysisResult.socialInfluence.level === 'high' ? 'bg-blue-100 text-blue-800' :
                            unifiedAnalysisResult.socialInfluence.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {unifiedAnalysisResult.socialInfluence.level === 'high' ? '높음' :
                             unifiedAnalysisResult.socialInfluence.level === 'medium' ? '보통' : '낮음'}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {unifiedAnalysisResult.socialInfluence.description}
                          </p>
                        </div>
                      </div>

                      네트워크 위치
                      <div className="mt-6">
                        <h4 className="mb-3 font-medium text-gray-900">관계에서의 위치</h4>
                        <div className="flex flex-wrap gap-2">
                          {unifiedAnalysisResult.networkPosition.isCenter && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                              중심 인물
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isBridge && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              연결자
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isIsolated && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                              고립 위험
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isPeripheral && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                              주변 인물
                            </span>
                          )}
                          {!unifiedAnalysisResult.networkPosition.isCenter && 
                           !unifiedAnalysisResult.networkPosition.isBridge && 
                           !unifiedAnalysisResult.networkPosition.isIsolated && 
                           !unifiedAnalysisResult.networkPosition.isPeripheral && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                              일반 구성원
                            </span>
                          )}
                        </div>
                      </div>

                      권장사항
                      {unifiedAnalysisResult.recommendations && (
                        <div className="mt-6">
                          <h4 className="mb-3 font-medium text-gray-900">개선 권장사항</h4>
                          <div className="space-y-4">
                            {unifiedAnalysisResult.recommendations.immediate_actions.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-blue-600">즉시 실행 가능한 조치</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.immediate_actions.map((action, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {unifiedAnalysisResult.recommendations.short_term_goals.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-green-600">단기 목표</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.short_term_goals.map((goal, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {unifiedAnalysisResult.recommendations.long_term_goals.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-purple-600">장기 목표</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.long_term_goals.map((goal, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}

                  {/* 통합 분석 로딩 상태 */}
                  {unifiedAnalysisLoading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="mr-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-gray-600">통합 네트워크 분석을 수행하는 중...</p>
                      </div>
                    </div>
                  )}

                  {/* 전체 네트워크 분석 결과 */}
                  {/* {networkAnalysisData && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        학급 전체 교우관계 분석
                      </h3>
                      
                      교우관계 유형 분포
                      <div className="mb-6">
                        <h4 className="mb-3 font-medium text-gray-900">교우관계 유형 분포</h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#FF6B6B" }}>
                              {networkAnalysisData.friendship_types.외톨이형 || 0}
                            </div>
                            <div className="text-sm text-gray-600">외톨이형</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#4ECDC4" }}>
                              {networkAnalysisData.friendship_types["소수 친구 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">소수 친구 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#45B7D1" }}>
                              {networkAnalysisData.friendship_types["평균적인 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">평균적인 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#96CEB4" }}>
                              {networkAnalysisData.friendship_types["친구 많은 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">친구 많은 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#FFEAA7" }}>
                              {networkAnalysisData.friendship_types["사교 스타"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">사교 스타</div>
                          </div>
                        </div>
                      </div>

                      네트워크 메트릭
                      <div className="mb-6">
                        <h4 className="mb-3 font-medium text-gray-900">네트워크 구조 지표</h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                              {(networkAnalysisData.metrics.network_density * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">네트워크 밀도</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {networkAnalysisData.metrics.average_degree.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">평균 연결 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">
                              {networkAnalysisData.metrics.connected_components}
                            </div>
                            <div className="text-sm text-gray-600">연결 그룹 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                              {networkAnalysisData.metrics.clustering_coefficient.toFixed(3)}
                            </div>
                            <div className="text-sm text-gray-600">클러스터링 계수</div>
                          </div>
                        </div>
                      </div>

                      전체 통계 요약
                      <div className="rounded-lg bg-gray-50 p-4">
                        <h4 className="mb-2 font-medium text-gray-900">학급 전체 요약</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-3">
                          <div>• 총 학생 수: {networkAnalysisData.metrics.total_students}명</div>
                          <div>• 총 관계 수: {networkAnalysisData.metrics.total_relationships}개</div>
                          <div>• 평균 중심성: {(networkAnalysisData.metrics.average_degree_centrality * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* 전체 네트워크 분석 로딩 상태 */}
                  {networkAnalysisLoading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="mr-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-gray-600">전체 네트워크 분석을 수행하는 중...</p>
                      </div>
                    </div>
                  )}

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
                            
                            // 통합 분석 결과 우선 사용
                            let centrality = centerStudent
                              ? centerStudent.friendCount / Math.max(maxPossibleConnections, 1)
                              : 0;
                            let friendCount = centerStudent?.friendCount || 0;
                            let networkDensity = 0;
                            let isolationRiskLevel = "보통";
                            let socialInfluenceLevel = "보통";
                            let communityId = 0;
                            let friendshipType = "평균적인 학생";
                            let recommendations = null;
                            
                            // 전체 네트워크 분석 데이터에서 해당 학생의 정보 가져오기
                            if (networkAnalysisData) {
                              const networkNode = networkAnalysisData.nodes.find(n => n.id === selectedStudent);
                              if (networkNode) {
                                // 전체 네트워크에서의 실제 데이터 사용
                                centrality = networkNode.centrality || centrality;
                                friendCount = networkNode.connection_count || friendCount;
                                communityId = networkNode.community || 0;
                                friendshipType = networkNode.friendship_type || friendshipType;
                                
                                // 네트워크 밀도는 전체 분석 결과 사용
                                networkDensity = networkAnalysisData.metrics.network_density || 0;
                                
                                // 전체 학생 수 기준으로 정규화된 위험도 계산
                                const totalClassStudents = networkAnalysisData.nodes.length;
                                const normalizedCentrality = centrality / Math.max(totalClassStudents - 1, 1);
                                
                                isolationRiskLevel = normalizedCentrality < 0.2 ? "높음" : 
                                                   normalizedCentrality < 0.5 ? "보통" : "낮음";
                                socialInfluenceLevel = normalizedCentrality < 0.2 ? "낮음" : 
                                                     normalizedCentrality < 0.5 ? "보통" : "높음";
                              }
                            }
                            
                            // 통합 분석 결과가 있으면 추가 정보 사용 (우선순위 낮음)
                            if (unifiedAnalysisResult) {
                              // 추천사항만 통합 분석 결과 사용
                              recommendations = unifiedAnalysisResult.recommendations;
                            }
                            
                            // 기본 계산 (fallback)
                            if (!networkAnalysisData) {
                              const totalConnections = individualNetworkData.reduce(
                                (sum, student) => sum + student.friendCount, 0
                              ) / 2;
                              networkDensity = totalConnections / ((totalStudents * (totalStudents - 1)) / 2);
                              
                              isolationRiskLevel = centrality < 0.3 ? "높음" : centrality < 0.6 ? "보통" : "낮음";
                              socialInfluenceLevel = centrality < 0.3 ? "낮음" : centrality < 0.6 ? "보통" : "높음";
                            }
                            
                            // 그룹 분석 (전체 네트워크에서의 실제 커뮤니티 정보 사용)
                            const connectedStudents = individualNetworkData.filter(
                              (s) => !s.isCenter && s.friendCount > 0,
                            );
                            
                            // 전체 네트워크에서 같은 커뮤니티의 학생 수 계산
                            let groupSize = 1; // 최소 본인 포함
                            if (networkAnalysisData) {
                              groupSize = networkAnalysisData.nodes.filter(n => n.community === communityId).length;
                            }
                            
                            const groupDistribution = connectedStudents.length > 0
                              ? `연결된 ${connectedStudents.length}명 (커뮤니티 ${communityId + 1}, 총 ${groupSize}명)`
                              : `커뮤니티 ${communityId + 1} (총 ${groupSize}명)`;

                            return (
                              <div>
                                <h3 className="mb-4 text-lg font-medium text-gray-900">
                                  개인별 요약 :{" "}
                                  <span className="text-md mb-2 bg-gradient-to-t from-yellow-200 from-50% to-transparent to-50% font-medium text-gray-800">
                                    {friendshipType} ({socialInfluenceLevel} 영향력)
                                  </span>
                                </h3>

                                <div className="space-y-4">
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-cyan-500">
                                      1. 현재 상황
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // 전체 네트워크 분석 데이터에서 해당 학생의 실제 상태 계산
                                        let currentStatus: CurrentStatus;
                                        
                                        if (pythonAnalysisResult?.individual_metrics?.current_status) {
                                          const pyStatus = pythonAnalysisResult.individual_metrics.current_status;
                                          currentStatus = {
                                            schoolSatisfaction: pyStatus.school_satisfaction,
                                            teacherRelationship: pyStatus.teacher_relationship,
                                            peerRelationship: pyStatus.peer_relationship,
                                            networkParticipation: pyStatus.network_participation,
                                          };
                                        } else {
                                          // 학생별 실제 데이터를 기반으로 계산
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence: socialInfluenceLevel,
                                            totalStudents: networkAnalysisData?.nodes.length || totalStudents,
                                            communityId,
                                          };
                                          currentStatus = calculateCurrentStatus(metrics);
                                        }
                                        
                                        return (
                                          <>
                                            <li>• 학교생활 만족도: {currentStatus.schoolSatisfaction}</li>
                                            <li>• 선생님과의 관계: {currentStatus.teacherRelationship}</li>
                                            <li>• 친구들과의 관계: {currentStatus.peerRelationship}</li>
                                            <li>• 학급 참여도: {currentStatus.networkParticipation}</li>
                                          </>
                                        );
                                      })()}
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-sky-500">
                                      2. 친구 관계 분석
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        • 인기도 점수:{" "}
                                        {(centrality * 100).toFixed(1)}%
                                      </li>
                                      <li>
                                        • 친구 수: {friendCount}명 (전체{" "}
                                        {totalStudents}명 중)
                                      </li>
                                      <li>
                                        • 학급 친밀도:{" "}
                                        {(networkDensity * 100).toFixed(1)}%
                                      </li>
                                      <li>• 소속 그룹: {groupDistribution}</li>
                                      <li>
                                        • 외톨이 위험도:{" "}
                                        {isolationRiskLevel}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-blue-500">
                                      3. 도움 방안
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // 학생별 실제 데이터를 기반으로 개인화된 추천사항 생성
                                        let recommendationPlan: RecommendationPlan;
                                        
                                        if (recommendations) {
                                          recommendationPlan = {
                                            immediate: recommendations.immediate_actions || [],
                                            shortTerm: recommendations.short_term_goals || [],
                                            longTerm: recommendations.long_term_goals || [],
                                            interventionLevel: recommendations.intervention_level || "관찰",
                                          };
                                        } else {
                                          // 학생별 실제 메트릭을 기반으로 개인화된 추천사항 생성
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence: socialInfluenceLevel,
                                            totalStudents: networkAnalysisData?.nodes.length || totalStudents,
                                            communityId,
                                          };
                                          recommendationPlan = generateRecommendationPlan(metrics);
                                        }
                                        
                                        return (
                                          <>
                                            {recommendationPlan.immediate.length > 0 && (
                                              <>
                                                <li className="font-medium text-blue-600">지금 바로 할 수 있는 것:</li>
                                                {recommendationPlan.immediate.map((action, index) => (
                                                  <li key={index}>• {action}</li>
                                                ))}
                                              </>
                                            )}
                                            
                                            {recommendationPlan.shortTerm.length > 0 && (
                                              <>
                                                <li className="font-medium text-green-600">짧은 기간 목표 (1-3개월):</li>
                                                {recommendationPlan.shortTerm.map((goal, index) => (
                                                  <li key={index}>• {goal}</li>
                                                ))}
                                              </>
                                            )}
                                            
                                            {recommendationPlan.longTerm.length > 0 && (
                                              <>
                                                <li className="font-medium text-purple-600">긴 기간 목표 (3-6개월):</li>
                                                {recommendationPlan.longTerm.map((goal, index) => (
                                                  <li key={index}>• {goal}</li>
                                                ))}
                                              </>
                                            )}
                                            
                                            <li className="font-medium text-orange-600">
                                              도움 필요도: {(() => {
                                                const level = recommendationPlan.interventionLevel;
                                                switch (level) {
                                                  case "urgent": return "긴급";
                                                  case "high": return "높음";
                                                  case "medium": return "보통";
                                                  case "moderate": return "보통";
                                                  case "low": return "낮음";
                                                  case "observation": return "관찰";
                                                  default: return level;
                                                }
                                              })()}
                                            </li>
                                          </>
                                        );
                                      })()}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-indigo-500">
                                      4. 주의해서 볼 점
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // 학생별 실제 데이터를 기반으로 개인화된 모니터링 포인트 생성
                                        let monitoringPoints: string[];
                                        
                                        if (recommendations?.monitoring_points && recommendations.monitoring_points.length > 0) {
                                          monitoringPoints = recommendations.monitoring_points;
                                        } else {
                                          // 학생별 실제 메트릭을 기반으로 개인화된 모니터링 포인트 생성
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence: socialInfluenceLevel,
                                            totalStudents: networkAnalysisData?.nodes.length || totalStudents,
                                            communityId,
                                          };
                                          monitoringPoints = generateMonitoringPoints(metrics).points;
                                        }
                                        
                                        return monitoringPoints.map((point, index) => (
                                          <li key={index}>• {point}</li>
                                        ));
                                      })()}
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





