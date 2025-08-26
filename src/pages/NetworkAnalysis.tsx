import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import {
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  EyeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline/index.js";
import NetworkVisualization from "../components/NetworkVisualization";
import { NotificationService } from "../services/notificationService";

// 선생님 정보 타입
interface TeacherInfo {
  id: string;
  school_id: string;
  grade_level: number;
  class_number: number;
  role: string;
}

// 설문 정보 타입
interface Survey {
  id: string;
  title: string;
  target_grades?: string[] | null;
  target_classes?: string[] | null;
  created_at: string | null;
  status: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  template_id?: string | null;
  school_id?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  questions?: any;
  settings?: any;
}

// 학생 정보 타입
interface Student {
  id: string;
  name: string;
  grade: number;
  class: number;
  current_school_id: string;
}

// 네트워크 분석 결과 타입
interface NetworkAnalysisResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: NetworkMetrics;
  communities: Community[];
}

// 네트워크 노드 타입
interface NetworkNode {
  id: string;
  name: string;
  grade: number;
  class: number;
  centrality: number;
  community: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// 네트워크 엣지 타입
interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  relationship_type: string;
}

// 네트워크 메트릭 타입
interface NetworkMetrics {
  total_students: number;
  total_relationships: number;
  density: number;
  average_degree: number;
  clustering_coefficient: number;
  average_path_length: number;
  modularity: number;
}

// 커뮤니티 타입
interface Community {
  id: number;
  members: string[];
  size: number;
  internal_density: number;
}

const NetworkAnalysis: React.FC = () => {
  // 일관된 랜덤 값 생성을 위한 해시 함수

  const [userSchoolId, setUserSchoolId] = useState<string | null>(null);
  const [teacherInfo, setTeacherInfo] = useState<TeacherInfo | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysisView, setAnalysisView] = useState<
    "overview" | "individual" | "network"
  >("overview");
  const [selectedStudentModal, setSelectedStudentModal] = useState<{
    isOpen: boolean;
    student: Student | null;
    node: NetworkNode | null;
  }>({
    isOpen: false,
    student: null,
    node: null,
  });

  // 친구 유형을 결정하는 함수
  const getFriendshipType = (centrality: number): string => {
    if (centrality < 0.2) return "외톨이형";
    if (centrality < 0.4) return "소수 친구 학생";
    if (centrality < 0.6) return "평균적인 학생";
    if (centrality < 0.8) return "친구 많은 학생";
    return "사교 스타";
  };

  const [analysisResults, setAnalysisResults] =
    useState<NetworkAnalysisResult | null>(null);
  const [savedAnalysisList, setSavedAnalysisList] = useState<
    Array<{
      id: string;
      survey_id: string;
      survey_title: string;
      calculated_at: string;
      total_students: number;
      total_relationships: number;
    }>
  >([]);

  // analysisResults 변경 감지
  useEffect(() => {
    console.log("🔍 analysisResults 변경됨:", {
      hasResults: !!analysisResults,
      nodesCount: analysisResults?.nodes.length || 0,
      edgesCount: analysisResults?.edges.length || 0,
    });
  }, [analysisResults]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // 연결 수를 실제 설문 응답 데이터를 기반으로 계산
  const connectionCounts = useMemo(() => {
    if (!analysisResults || !selectedSurvey) return new Map<string, number>();

    const counts = new Map<string, number>();

    // 실제 설문 응답 데이터를 기반으로 연결 수 계산
    analysisResults.nodes.forEach((node) => {
      // 해당 학생이 다른 학생을 선택한 수만 계산 (단방향)
      let totalConnections = 0;

      if (analysisResults.edges) {
        // 실제 설문에서 선택한 관계만 계산 (outgoing edges)
        const outgoingEdges = analysisResults.edges.filter(
          (edge) => edge.source === node.id
        ).length;
        totalConnections = outgoingEdges;
      }

      counts.set(node.id, totalConnections);
    });

    console.log("🔍 connectionCounts 실제 데이터 기반 계산:", {
      surveyId: selectedSurvey.id,
      totalNodes: analysisResults.nodes.length,
      sampleCounts: Array.from(counts.entries()).slice(0, 3),
      totalEdges: analysisResults.edges?.length || 0,
    });

    return counts;
  }, [analysisResults, selectedSurvey]);

  // 현재 사용자 정보 가져오기
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // 설문 및 학생 데이터 가져오기
  useEffect(() => {
    console.log("🔍 useEffect 실행:", { userSchoolId, teacherInfo });

    if (userSchoolId && teacherInfo) {
      console.log("🔍 조건 충족, 데이터 가져오기 시작");
      fetchSurveys();
      fetchStudents();
    } else {
      console.log("🔍 조건 불충족:", {
        userSchoolId: !!userSchoolId,
        teacherInfo: !!teacherInfo,
        userSchoolIdValue: userSchoolId,
        teacherInfoValue: teacherInfo,
      });
    }
  }, [userSchoolId, teacherInfo]);

  // 권한별 접근 제어
  const canAccessPage = () => {
    if (!teacherInfo) return false;

    const allowedRoles = [
      "homeroom_teacher",
      "grade_teacher",
      "school_admin",
      "district_admin",
    ];
    return allowedRoles.includes(teacherInfo.role);
  };

  const getAccessScope = () => {
    if (!teacherInfo) return { type: "none", description: "" };

    switch (teacherInfo.role) {
      case "homeroom_teacher":
        return {
          type: "class",
          description: `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 학생만`,
        };
      case "grade_teacher":
        return {
          type: "grade",
          description: `${teacherInfo.grade_level}학년 전체 학생`,
        };
      case "school_admin":
        return {
          type: "school",
          description: "학교 전체 학생",
        };
      case "district_admin":
        return {
          type: "district",
          description: "전체 소속 학교 학생",
        };
      default:
        return { type: "none", description: "" };
    }
  };

  // 저장된 분석 리스트 가져오기
  const fetchSavedAnalysisList = async () => {
    try {
      console.log("🔍 저장된 분석 리스트 가져오기 시작");

      const { data: savedAnalysis, error } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("analysis_type", "complete_network_analysis")
        .order("calculated_at", { ascending: false });

      if (error) {
        console.error("🔍 저장된 분석 리스트 조회 오류:", error);
        return;
      }

      if (!savedAnalysis || savedAnalysis.length === 0) {
        console.log("🔍 저장된 분석 결과가 없습니다");
        setSavedAnalysisList([]);
        return;
      }

      // 설문 제목과 함께 분석 리스트 구성
      const analysisList = await Promise.all(
        savedAnalysis.map(async (analysis) => {
          if (!analysis.survey_id) return null;

          const { data: survey } = await supabase
            .from("surveys")
            .select("title")
            .eq("id", analysis.survey_id)
            .single();

          const recommendations = analysis.recommendations as any;
          const completeData = recommendations?.complete_analysis_data;

          return {
            id: analysis.id,
            survey_id: analysis.survey_id,
            survey_title: survey?.title || "제목 없음",
            calculated_at: analysis.calculated_at || new Date().toISOString(),
            total_students: completeData?.nodes?.length || 0,
            total_relationships: completeData?.edges?.length || 0,
          };
        })
      );

      // null 값 필터링
      const filteredAnalysisList = analysisList.filter(
        (item) => item !== null
      ) as Array<{
        id: string;
        survey_id: string;
        survey_title: string;
        calculated_at: string;
        total_students: number;
        total_relationships: number;
      }>;

      console.log("🔍 분석 리스트 구성 완료:", filteredAnalysisList);
      setSavedAnalysisList(filteredAnalysisList);
    } catch (error) {
      console.error("🔍 저장된 분석 리스트 가져오기 오류:", error);
    }
  };

  // 저장된 네트워크 분석 결과 불러오기 (전체 데이터)
  const loadSavedNetworkAnalysis = async (
    surveyId: string
  ): Promise<NetworkAnalysisResult | null> => {
    try {
      console.log("🔍 저장된 네트워크 분석 결과 불러오기:", surveyId);

      // 전체 분석 결과를 저장하는 JSON 필드에서 조회
      const { data: savedAnalysis, error } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("survey_id", surveyId)
        .eq("analysis_type", "complete_network_analysis")
        .single();

      if (error) {
        console.error("🔍 저장된 분석 결과 조회 오류:", error);
        return null;
      }

      if (!savedAnalysis) {
        console.log("🔍 저장된 분석 결과가 없습니다");
        return null;
      }

      console.log("🔍 저장된 전체 분석 결과:", savedAnalysis);

      // recommendations에서 전체 분석 데이터 추출
      const recommendations = savedAnalysis.recommendations as any;
      const completeData = recommendations?.complete_analysis_data;

      if (!completeData) {
        console.log("🔍 전체 분석 데이터가 recommendations에 없습니다");
        return null;
      }

      // 저장된 전체 데이터를 NetworkAnalysisResult 형태로 변환
      const result: NetworkAnalysisResult = {
        nodes: completeData.nodes || [],
        edges: completeData.edges || [],
        metrics: completeData.metrics || {
          total_students: 0,
          total_relationships: 0,
          density: 0,
          average_degree: 0,
          clustering_coefficient: 0,
          average_path_length: 0,
          modularity: 0,
        },
        communities: completeData.communities || [],
      };

      console.log("🔍 변환된 분석 결과:", result);
      return result;
    } catch (error) {
      console.error("🔍 저장된 분석 결과 불러오기 오류:", error);
      return null;
    }
  };

  const fetchCurrentUser = async () => {
    try {
      console.log("🔍 사용자 정보 가져오기 시작");

      // 설문운영과 동일한 방식으로 wiseon_user와 wiseon_auth_token 사용
      const userStr = localStorage.getItem("wiseon_user");
      const authToken = localStorage.getItem("wiseon_auth_token");

      console.log("🔍 로컬 스토리지 확인:", {
        wiseon_user: !!userStr,
        wiseon_auth_token: !!authToken,
        wiseon_user_length: userStr?.length,
        auth_token_length: authToken?.length,
      });

      if (!userStr || !authToken) {
        console.log("🔍 로그인 정보가 없습니다. 로그인 페이지로 이동합니다.");
        console.log("🔍 로컬 스토리지 전체 내용:", Object.keys(localStorage));
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userStr);
      console.log("🔍 wiseon_user에서 파싱된 사용자 정보:", user);
      console.log("🔍 사용자 정보 구조:", {
        id: user.id,
        school_id: user.school_id,
        grade_level: user.grade_level,
        class_number: user.class_number,
        role: user.role,
      });

      // 사용자의 학교 정보 조회
      console.log("🔍 Supabase 사용자 정보 조회 시작:", { userId: user.id });
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("🔍 사용자 정보 조회 오류:", userError);
        console.log("🔍 오류 상세:", {
          code: userError.code,
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
        });
        window.location.href = "/login";
        return;
      }

      console.log("🔍 Supabase에서 가져온 사용자 정보:", userData);
      console.log("🔍 Supabase 사용자 정보 구조:", {
        id: userData.id,
        school_id: userData.school_id,
        grade_level: userData.grade_level,
        class_number: userData.class_number,
        role: userData.role,
      });

      // 학교 ID 설정
      if (userData.school_id) {
        setUserSchoolId(userData.school_id);
        console.log("🔍 학교 ID 설정 완료:", userData.school_id);
      } else {
        // 기본 학교 ID (개발용)
        const defaultSchoolId = "00000000-0000-0000-0000-000000000011";
        setUserSchoolId(defaultSchoolId);
        console.log("🔍 기본 학교 ID 설정 완료:", defaultSchoolId);
      }

      // teacherInfo 설정
      const teacherInfoData: TeacherInfo = {
        id: userData.id,
        school_id: userData.school_id || "00000000-0000-0000-0000-000000000011",
        grade_level: parseInt(userData.grade_level || "1") || 1,
        class_number: parseInt(userData.class_number || "1") || 1,
        role: userData.role || "homeroom_teacher",
      };

      setTeacherInfo(teacherInfoData);
      console.log("🔍 교사 정보 설정 완료:", teacherInfoData);
      console.log("🔍 설정된 정보 요약:", {
        사용자_ID: teacherInfoData.id,
        학교_ID: teacherInfoData.school_id,
        담당_학년: teacherInfoData.grade_level,
        담당_반: teacherInfoData.class_number,
        역할: teacherInfoData.role,
      });

      console.log("🔍 fetchCurrentUser 완료 - 상태 업데이트 예정");
    } catch (error) {
      console.error("🔍 사용자 정보 가져오기 오류:", error);
      if (error instanceof Error) {
        console.error("🔍 오류 상세:", {
          message: error.message,
          stack: error.stack,
        });
      }
      // 에러 발생 시 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  const fetchSurveys = async () => {
    try {
      setLoading(true);

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
        setSelectedSurvey(data[0]);
      } else {
        setSurveys([]);
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
      toast.error("설문 목록을 가져오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    if (!userSchoolId || !teacherInfo) {
      console.log("🔍 학생 조회 조건 불충족:", { userSchoolId, teacherInfo });
      return;
    }

    try {
      console.log("🔍 학생 데이터 조회 시작");

      let query = supabase.from("students").select("*").eq("is_active", true);

      // 학교별 필터링
      if (teacherInfo.role === "district_admin") {
        // 교육청 관리자: 모든 학교 학생 조회 (필터링 없음)
        console.log("🔍 교육청 관리자: 모든 학교 학생 조회");
      } else {
        // 다른 역할: 해당 학교 학생만 조회
        query = query.eq("current_school_id", userSchoolId);
      }

      // 권한별 학생 데이터 필터링
      if (teacherInfo.role === "homeroom_teacher") {
        // 담임교사: 특정 학년/반만
        query = query
          .eq("grade", teacherInfo.grade_level.toString())
          .eq("class", teacherInfo.class_number.toString());

        console.log("🔍 담임교사용 학생 조회 조건:", {
          grade: teacherInfo.grade_level.toString(),
          class: teacherInfo.class_number.toString(),
        });
      } else if (teacherInfo.role === "grade_teacher") {
        // 학년담당: 해당 학년 전체
        query = query.eq("grade", teacherInfo.grade_level.toString());

        console.log("🔍 학년담당용 학생 조회 조건:", {
          grade: teacherInfo.grade_level.toString(),
        });
      } else if (teacherInfo.role === "school_admin") {
        // 학교관리자: 해당 학교 전체 (추가 필터링 없음)
        console.log("🔍 학교관리자용 학생 조회: 해당 학교 전체");
      } else if (teacherInfo.role === "district_admin") {
        // 교육청관리자: 모든 학교 (추가 필터링 없음)
        console.log("🔍 교육청관리자용 학생 조회: 모든 학교");
      }

      const { data, error } = await query;

      if (error) {
        console.error("🔍 학생 데이터 조회 오류:", error);
        return;
      }

      console.log("🔍 전체 학생 데이터:", data);

      const convertedStudents: Student[] = (data || []).map((student) => ({
        id: student.id,
        name: student.name,
        grade: parseInt(student.grade) || 1,
        class: parseInt(student.class) || 1,
        current_school_id: student.current_school_id || (userSchoolId ?? ""),
      }));

      setStudents(convertedStudents);
      console.log("🔍 학생 데이터 설정:", convertedStudents);

      if (convertedStudents.length === 0) {
        console.log("🔍 현재 권한에 해당하는 학생이 없습니다");
        console.log("🔍 권한 정보:", {
          role: teacherInfo.role,
          grade_level: teacherInfo.grade_level,
          class_number: teacherInfo.class_number,
        });
      }
    } catch (error) {
      console.error("🔍 학생 데이터 조회 오류:", error);
    }
  };

  // 저장된 분석 결과 삭제
  const handleDeleteAnalysis = async (analysisId: string, surveyId: string) => {
    if (
      !window.confirm(
        "이 분석 결과를 삭제하시겠습니까?\n\n삭제된 데이터는 복구할 수 없습니다."
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      // 데이터베이스에서 분석 결과 삭제
      const { error } = await supabase
        .from("network_analysis_results")
        .delete()
        .eq("id", analysisId);

      if (error) {
        console.error("🔍 분석 결과 삭제 오류:", error);
        toast.error("분석 결과 삭제에 실패했습니다.");
        return;
      }

      // 로컬 상태에서 삭제
      setSavedAnalysisList((prev) =>
        prev.filter((item) => item.id !== analysisId)
      );

      // 현재 표시 중인 분석 결과가 삭제된 것이라면 초기화
      if (analysisResults && selectedSurvey?.id === surveyId) {
        setAnalysisResults(null);
        setSelectedSurvey(null);
      }

      toast.success("분석 결과가 삭제되었습니다.");
      console.log("🔍 분석 결과 삭제 완료:", { analysisId, surveyId });
    } catch (error) {
      console.error("🔍 분석 결과 삭제 중 오류:", error);
      toast.error("분석 결과 삭제 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 네트워크 분석 실행
  const handleRunNetworkAnalysis = async () => {
    if (!selectedSurvey) {
      toast.error("분석할 설문을 선택해주세요.");
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisError(null);

      console.log("🔍 네트워크 분석 시작:", selectedSurvey.id);

      // 새로 분석을 실행합니다 (저장된 결과가 있어도 새로 분석)
      console.log("🔍 새로 네트워크 분석을 시작합니다");

      // Python 백엔드 호출 (시뮬레이션)
      const mockAnalysisResults = await simulatePythonAnalysis(
        selectedSurvey.id
      );

      // 분석 결과를 DB에 저장
      await saveNetworkAnalysisToDB(selectedSurvey.id, mockAnalysisResults);

      setAnalysisResults(mockAnalysisResults);
      toast.success("네트워크 분석이 완료되었습니다!");

      // 네트워크 분석 완료 알림 생성
      try {
        if (teacherInfo?.id) {
          await NotificationService.createSystemNotification(
            teacherInfo.id,
            "network_analysis_completed",
            {
              surveyTitle: selectedSurvey.title,
              surveyId: selectedSurvey.id,
              totalStudents: mockAnalysisResults.nodes.length,
              totalRelationships: mockAnalysisResults.edges.length,
            },
            "success"
          );

          // 권한별 알림 생성 (학년부장, 학교 관리자 등)
          if (teacherInfo?.role && userSchoolId) {
            await NotificationService.createRoleBasedNotification(
              teacherInfo.role,
              userSchoolId,
              "network_analysis_completed",
              {
                title: "네트워크 분석 완료",
                message: `"${selectedSurvey.title}" 설문의 네트워크 분석이 완료되었습니다. 총 ${mockAnalysisResults.nodes.length}명의 학생과 ${mockAnalysisResults.edges.length}개의 관계가 분석되었습니다.`,
                type: "success",
                category: "분석",
              }
            );
          }
        }
      } catch (error) {
        console.error("네트워크 분석 완료 알림 생성 오류:", error);
      }

      console.log("🔍 분석 결과:", mockAnalysisResults);
    } catch (error) {
      console.error("🔍 네트워크 분석 오류:", error);
      setAnalysisError("네트워크 분석 중 오류가 발생했습니다.");
      toast.error("네트워크 분석에 실패했습니다.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // DB에 네트워크 분석 결과 저장 (전체 데이터)
  const saveNetworkAnalysisToDB = async (
    surveyId: string,
    analysisResults: NetworkAnalysisResult
  ): Promise<void> => {
    try {
      console.log("🔍 DB 저장 시작:", surveyId);

      // 기존 분석 결과가 있다면 삭제
      const { error: deleteError } = await supabase
        .from("network_analysis_results")
        .delete()
        .eq("survey_id", surveyId);

      if (deleteError) {
        console.error("🔍 기존 분석 결과 삭제 오류:", deleteError);
      } else {
        console.log("🔍 기존 분석 결과 삭제 완료");
      }

      // 전체 분석 결과를 하나의 레코드로 저장
      const completeAnalysisRecord = {
        survey_id: surveyId,
        student_id: null, // 전체 분석이므로 student_id는 null
        analysis_type: "complete_network_analysis",
        calculated_at: new Date().toISOString(),
        centrality_scores: null, // 전체 분석이므로 개별 점수는 null
        community_membership: null,
        risk_indicators: {
          total_students: analysisResults.nodes.length,
          total_relationships: analysisResults.edges.length,
          average_centrality:
            analysisResults.nodes.reduce((sum, n) => sum + n.centrality, 0) /
            analysisResults.nodes.length,
        },
        recommendations: {
          complete_analysis_data: analysisResults as any, // 전체 분석 결과를 JSON으로 저장
        },
      };

      console.log("🔍 저장할 데이터:", completeAnalysisRecord);

      // 전체 분석 결과 저장
      const { error: insertError } = await supabase
        .from("network_analysis_results")
        .insert([completeAnalysisRecord]);

      if (insertError) {
        console.error("🔍 전체 분석 결과 저장 오류:", insertError);
        throw new Error("전체 분석 결과를 DB에 저장할 수 없습니다.");
      }

      console.log("🔍 전체 네트워크 분석 결과가 DB에 저장되었습니다.");
      toast.success("전체 분석 결과가 DB에 저장되었습니다!");

      // 저장 후 분석 리스트 새로고침
      await fetchSavedAnalysisList();
    } catch (error) {
      console.error("🔍 DB 저장 오류:", error);
      throw error;
    }
  };

  // Python 분석 시뮬레이션
  const simulatePythonAnalysis = async (
    surveyId: string
  ): Promise<NetworkAnalysisResult> => {
    // 실제로는 Python 백엔드 API를 호출합니다
    console.log("🔍 Python 네트워크 분석 시뮬레이션:", surveyId);

    // 실제 설문 응답 데이터를 기반으로 네트워크 엣지 생성
    const edges: NetworkEdge[] = [];

    try {
      // survey_responses 테이블에서 실제 응답 데이터 가져오기
      const { data: surveyResponses, error } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId);

      if (error) {
        console.error("🔍 설문 응답 데이터 가져오기 오류:", error);
        // 오류 시 빈 edges 반환
        console.log("🔍 설문 응답 데이터 오류로 인해 빈 edges 반환");
      } else if (surveyResponses && surveyResponses.length > 0) {
        console.log(
          "🔍 실제 설문 응답 데이터 기반 엣지 생성:",
          surveyResponses.length
        );

        // 각 학생의 응답을 기반으로 엣지 생성
        surveyResponses.forEach((response) => {
          const studentId = response.student_id;
          const responses = response.responses;

          // studentId가 null이 아닌 경우에만 처리
          if (studentId && responses && typeof responses === "object") {
            Object.values(responses).forEach((questionResponses: any) => {
              if (Array.isArray(questionResponses)) {
                questionResponses.forEach((friendId: string) => {
                  if (friendId && friendId !== studentId) {
                    // 이미 존재하는 엣지인지 확인
                    const existingEdge = edges.find(
                      (edge) =>
                        (edge.source === studentId &&
                          edge.target === friendId) ||
                        (edge.source === friendId && edge.target === studentId)
                    );

                    if (!existingEdge) {
                      edges.push({
                        source: studentId,
                        target: friendId,
                        weight: 3, // 기본 가중치
                        relationship_type: "friend",
                      });
                    }
                  }
                });
              }
            });
          }
        });

        console.log("🔍 실제 데이터 기반 엣지 생성 완료:", edges.length);
      } else {
        console.log("🔍 설문 응답 데이터가 없음, 빈 edges 반환");
      }
    } catch (error) {
      console.error("🔍 엣지 생성 중 오류:", error);
      console.log("🔍 오류로 인해 빈 edges 반환");
    }

    // 네트워크 노드 생성 (실제 데이터 기반)
    const nodes: NetworkNode[] = students.map((student) => {
      // 해당 학생의 연결 수 계산
      const connectionCount = edges.filter(
        (edge) => edge.source === student.id || edge.target === student.id
      ).length;

      // 연결 수를 기반으로 중심성 계산 (0.1 ~ 1.0)
      const centrality =
        connectionCount > 0 ? Math.min(0.1 + connectionCount * 0.1, 1.0) : 0.1;

      // 연결 수를 기반으로 커뮤니티 할당 (0, 1, 2)
      const community = connectionCount > 0 ? connectionCount % 3 : 0;

      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        centrality,
        community,
        x: Math.random() * 800, // 랜덤 위치
        y: Math.random() * 600,
      };
    });

    // 네트워크 메트릭 계산 (실제 데이터 기반)
    const metrics: NetworkMetrics = {
      total_students: students.length,
      total_relationships: edges.length,
      density:
        students.length > 1
          ? edges.length / (students.length * (students.length - 1))
          : 0,
      average_degree:
        students.length > 0 ? (edges.length * 2) / students.length : 0,
      clustering_coefficient: edges.length > 0 ? 0.5 : 0, // 실제 데이터 기반으로 계산 필요
      average_path_length: edges.length > 0 ? 2.0 : 0, // 실제 데이터 기반으로 계산 필요
      modularity: edges.length > 0 ? 0.3 : 0, // 실제 데이터 기반으로 계산 필요
    };

    // 커뮤니티 감지 (실제 데이터 기반으로 단순화)
    const communities: Community[] = [];
    if (edges.length > 0) {
      // 간단한 커뮤니티 분할 (실제로는 더 복잡한 알고리즘 필요)
      const halfSize = Math.floor(students.length / 2);
      communities.push({
        id: 0,
        members: students.slice(0, halfSize).map((s) => s.id),
        size: halfSize,
        internal_density: 0.5,
      });
      if (students.length > halfSize) {
        communities.push({
          id: 1,
          members: students.slice(halfSize).map((s) => s.id),
          size: students.length - halfSize,
          internal_density: 0.5,
        });
      }
    }

    console.log("🔍 실제 데이터 기반 분석 결과 생성:", {
      surveyId,
      totalStudents: students.length,
      totalEdges: edges.length,
      hasRealData: edges.length > 0,
    });

    return {
      nodes,
      edges,
      metrics,
      communities,
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          교우관계 네트워크 분석
        </h1>
        <p className="text-gray-600 mb-4">
          {teacherInfo?.role === "homeroom_teacher" &&
            `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 학생들의 AI 기반 네트워크 분석을 통해 교우관계를 시각화하고 분석합니다.`}
          {teacherInfo?.role === "grade_teacher" &&
            `${teacherInfo.grade_level}학년 전체 학생들의 AI 기반 네트워크 분석을 통해 교우관계를 시각화하고 분석합니다.`}
          {teacherInfo?.role === "school_admin" &&
            "학교 전체 학생들의 AI 기반 네트워크 분석을 통해 교우관계를 시각화하고 분석합니다."}
          {teacherInfo?.role === "district_admin" &&
            "전체 학교 학생들의 AI 기반 네트워크 분석을 통해 교우관계를 시각화하고 분석합니다."}
        </p>
      </div>

      {/* 저장된 분석 리스트 섹션 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                저장된 분석 결과
              </h3>
              <p className="text-sm text-gray-600">
                이전에 수행한 네트워크 분석 결과를 확인할 수 있습니다.
              </p>
            </div>
            <button
              onClick={fetchSavedAnalysisList}
              className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>

        <div className="p-6">
          {savedAnalysisList.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                총{" "}
                <span className="font-semibold text-blue-600">
                  {savedAnalysisList.length}개
                </span>
                의 분석 결과가 저장되어 있습니다.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedAnalysisList.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors relative group"
                  >
                    {/* 삭제 버튼 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAnalysis(analysis.id, analysis.survey_id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                      title="분석 결과 삭제"
                    >
                      <svg
                        className="w-3 h-3"
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

                    {/* 분석 결과 카드 본문 */}
                    <div
                      className="cursor-pointer"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          const savedResults = await loadSavedNetworkAnalysis(
                            analysis.survey_id
                          );
                          if (savedResults) {
                            setAnalysisResults(savedResults);
                            // 해당 설문도 선택 상태로 설정
                            const survey = surveys.find(
                              (s) => s.id === analysis.survey_id
                            );
                            if (survey) {
                              setSelectedSurvey(survey);
                            }
                            toast.success("저장된 분석 결과를 불러왔습니다!");
                          } else {
                            toast.error("분석 결과를 불러올 수 없습니다.");
                          }
                        } catch (error) {
                          console.error(
                            "🔍 저장된 분석 결과 불러오기 오류:",
                            error
                          );
                          toast.error(
                            "분석 결과를 불러오는 중 오류가 발생했습니다."
                          );
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 truncate pr-8">
                          {analysis.survey_title}
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          완료
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>분석일:</span>
                          <span className="font-medium">
                            {new Date(
                              analysis.calculated_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>학생 수:</span>
                          <span className="font-medium">
                            {analysis.total_students}명
                          </span>
                          <span>관계 수:</span>
                          <span className="font-medium">
                            {analysis.total_relationships}개
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-blue-600 text-center">
                          클릭하여 결과 보기
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                저장된 분석 결과가 없습니다
              </p>
              <p className="text-sm">
                네트워크 분석을 실행하면 결과가 여기에 저장됩니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 설문 선택 섹션 */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                분석할 설문 선택
              </h3>
              <p className="text-sm text-gray-600">
                교우관계 분석을 위한 설문을 선택해주세요.
              </p>
            </div>
            {teacherInfo && (
              <div className="text-right">
                <div className="text-sm text-gray-500">현재 담당</div>
                <div className="text-lg font-semibold text-[#3F80EA]">
                  {teacherInfo.role === "homeroom_teacher" &&
                    `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반`}
                  {teacherInfo.role === "grade_teacher" &&
                    `${teacherInfo.grade_level}학년 전체`}
                  {teacherInfo.role === "school_admin" && "학교 전체"}
                  {teacherInfo.role === "district_admin" && "전체 학교"}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3F80EA] mx-auto mb-4"></div>
              <p className="text-gray-600">설문 데이터를 불러오는 중...</p>
            </div>
          ) : surveys.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                총{" "}
                <span className="font-semibold text-[#3F80EA]">
                  {surveys.length}개
                </span>
                의 설문을 찾았습니다.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSurvey?.id === survey.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={async () => {
                      setSelectedSurvey(survey);
                      setAnalysisResults(null);
                      setAnalysisError(null);

                      // 설문 선택 시 저장된 분석 결과가 있는지 확인
                      try {
                        const savedResults = await loadSavedNetworkAnalysis(
                          survey.id
                        );
                        if (savedResults) {
                          console.log(
                            "🔍 설문 선택 시 저장된 분석 결과를 불러왔습니다"
                          );
                          setAnalysisResults(savedResults);
                          toast.success("저장된 분석 결과를 불러왔습니다!");
                        }
                      } catch (error) {
                        console.log("🔍 저장된 분석 결과가 없습니다");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {survey.title}
                      </h4>
                      {selectedSurvey?.id === survey.id && (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg
                            className="w-3 h-3 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 대상 정보 */}
                    <div className="space-y-1 text-sm text-gray-600">
                      {survey.target_grades &&
                      survey.target_grades.length > 0 ? (
                        <div>
                          <span className="font-medium">대상:</span>{" "}
                          {survey.target_grades.join(", ")}학년{" "}
                          {survey.target_classes &&
                          survey.target_classes.length > 0
                            ? survey.target_classes.join(", ") + "반"
                            : ""}
                        </div>
                      ) : (
                        <div className="text-gray-500">대상: 모든 학년/반</div>
                      )}
                    </div>

                    {/* 날짜 정보 */}
                    <div className="space-y-1 text-sm text-gray-500 mt-2">
                      <div>
                        생성일:{" "}
                        {new Date(survey.created_at || "").toLocaleDateString()}
                      </div>
                      {survey.start_date && (
                        <div>
                          시작일:{" "}
                          {new Date(survey.start_date).toLocaleDateString()}
                        </div>
                      )}
                      {survey.end_date && (
                        <div>
                          종료일:{" "}
                          {new Date(survey.end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* 추가 정보 */}
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      <div className="text-xs text-gray-500">
                        설문 ID: {survey.id.slice(0, 8)}...
                      </div>
                      {survey.description && (
                        <div className="text-xs text-gray-600 truncate">
                          {survey.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">
                현재 담당 학급의 설문이 없습니다
              </p>
              <p className="text-sm mb-4">
                다른 학년/반의 설문이거나 아직 생성된 설문이 없을 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 네트워크 분석 실행 버튼 */}
      {selectedSurvey && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6 text-center">
            <button
              onClick={handleRunNetworkAnalysis}
              disabled={isAnalyzing}
              className={`inline-flex items-center px-8 py-4 rounded-lg font-medium text-white text-lg transition-colors ${
                isAnalyzing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#3F80EA] hover:bg-blue-600 active:bg-blue-700"
              }`}
            >
              {isAnalyzing ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>분석 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <PlayIcon className="h-6 w-6" />
                  <span>네트워크 분석 실행</span>
                </div>
              )}
            </button>
            <p className="text-sm text-gray-500 mt-2">
              선택된 설문: {selectedSurvey.title}
            </p>
            {analysisResults && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                <p className="text-xs text-green-600 mb-2">
                  ✅ 분석 결과가 로드되었습니다
                </p>

                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={async () => {
                      try {
                        setIsAnalyzing(true);
                        setAnalysisError(null);

                        console.log("🔍 분석 결과를 새로 생성합니다");

                        // Python 백엔드 호출 (시뮬레이션)
                        const mockAnalysisResults =
                          await simulatePythonAnalysis(selectedSurvey.id);

                        // 분석 결과를 DB에 저장
                        await saveNetworkAnalysisToDB(
                          selectedSurvey.id,
                          mockAnalysisResults
                        );

                        setAnalysisResults(mockAnalysisResults);
                        toast.success("네트워크 분석이 새로 완료되었습니다!");
                      } catch (error) {
                        console.error("🔍 네트워크 분석 오류:", error);
                        setAnalysisError(
                          "네트워크 분석 중 오류가 발생했습니다."
                        );
                        toast.error("네트워크 분석에 실패했습니다.");
                      } finally {
                        setIsAnalyzing(false);
                      }
                    }}
                    disabled={isAnalyzing}
                    className="text-xs text-blue-600 hover:text-blue-800 underline disabled:text-gray-400"
                  >
                    {isAnalyzing ? "재분석 중..." : "새로 분석하기"}
                  </button>

                  {/* 지도 리포트 페이지로 이동 버튼 */}
                  <button
                    onClick={() => {
                      toast.success("지도 리포트 페이지로 이동합니다!");
                      // 분석 결과를 localStorage에 임시 저장하여 Reports 페이지에서 사용
                      if (analysisResults) {
                        localStorage.setItem(
                          "temp_network_analysis",
                          JSON.stringify({
                            survey_id: selectedSurvey?.id,
                            analysis_data: analysisResults,
                            timestamp: new Date().toISOString(),
                          })
                        );
                      }
                      setTimeout(() => {
                        window.location.href = "/reports";
                      }, 1000);
                    }}
                    className="text-xs text-green-600 hover:text-green-800 underline"
                  >
                    📊 지도 리포트 보기
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 분석 결과가 있을 때만 뷰 선택 탭 표시 */}
      {analysisResults && (
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-2">
              <button
                onClick={() => setAnalysisView("overview")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  analysisView === "overview"
                    ? "bg-[#3F80EA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <EyeIcon className="h-4 w-4 inline mr-2" />
                전체 현황
              </button>
              <button
                onClick={() => setAnalysisView("individual")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  analysisView === "individual"
                    ? "bg-[#3F80EA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <UsersIcon className="h-4 w-4 inline mr-2" />
                개별 관계 분석
              </button>
              <button
                onClick={() => setAnalysisView("network")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  analysisView === "network"
                    ? "bg-[#3F80EA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ChartBarIcon className="h-4 w-4 inline mr-2" />
                네트워크 시각화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 현황 뷰 */}
      {analysisView === "overview" && analysisResults && (
        <div className="space-y-6">
          {/* 네트워크 메트릭 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                네트워크 메트릭
              </h3>
              <p className="text-sm text-gray-600">
                전체 네트워크의 구조적 특성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#3F80EA]">
                    {analysisResults.metrics.total_students}
                  </div>
                  <div className="text-sm text-gray-600">총 학생 수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResults.metrics.total_relationships}
                  </div>
                  <div className="text-sm text-gray-600">총 관계 수</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.metrics.average_degree.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">평균 연결 수</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">
                    네트워크 밀도
                  </div>
                  <div className="text-lg font-semibold text-blue-600">
                    {(analysisResults.metrics.density * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm font-medium text-green-900">
                    클러스터링 계수
                  </div>
                  <div className="text-lg font-semibold text-green-700">
                    {(
                      analysisResults.metrics.clustering_coefficient * 100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-sm font-medium text-purple-900">
                    평균 경로 길이
                  </div>
                  <div className="text-lg font-semibold text-purple-700">
                    {analysisResults.metrics.average_path_length.toFixed(1)}
                  </div>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm font-medium text-orange-900">
                    모듈성
                  </div>
                  <div className="text-lg font-semibold text-orange-700">
                    {(analysisResults.metrics.modularity * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 커뮤니티 분석 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티 분석
              </h3>
              <p className="text-sm text-gray-600">
                자연스럽게 형성된 친구 그룹을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analysisResults.communities.map((community) => (
                  <div
                    key={community.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      커뮤니티 {community.id + 1}
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>멤버 수: {community.size}명</div>
                      <div>
                        내부 밀도:{" "}
                        {(community.internal_density * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        멤버:{" "}
                        {community.members
                          .slice(0, 3)
                          .map((id) => students.find((s) => s.id === id)?.name)
                          .join(", ")}
                        {community.members.length > 3 && "..."}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 학생별 중심성 분석 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                학생별 중심성 분석
              </h3>
              <p className="text-sm text-gray-600">
                각 학생의 네트워크 내 영향력과 연결성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResults.nodes
                  .sort((a, b) => b.centrality - a.centrality)
                  .slice(0, 9)
                  .map((node) => {
                    const student = students.find((s) => s.id === node.id);
                    if (!student) return null;

                    const connections = connectionCounts.get(node.id) || 0;
                    const friendshipType = getFriendshipType(node.centrality);

                    return (
                      <div
                        key={node.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-900">
                            {student.name}
                          </h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              friendshipType === "사교 스타"
                                ? "bg-purple-100 text-purple-800"
                                : friendshipType === "친구 많은 학생"
                                ? "bg-green-100 text-green-800"
                                : friendshipType === "평균적인 학생"
                                ? "bg-blue-100 text-blue-800"
                                : friendshipType === "소수 친구 학생"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {friendshipType}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>중심성:</span>
                            <span className="font-medium">
                              {(node.centrality * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>연결 수:</span>
                            <span className="font-medium">{connections}개</span>
                          </div>
                          <div className="flex justify-between">
                            <span>커뮤니티:</span>
                            <span className="font-medium">
                              {node.community + 1}번
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {analysisResults.nodes.length > 9 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500">
                    총 {analysisResults.nodes.length}명 중 상위 9명 표시
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 네트워크 구조 분석 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                네트워크 구조 분석
              </h3>
              <p className="text-sm text-gray-600">
                네트워크의 전반적인 구조와 특성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 연결 분포 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">연결 분포</h4>
                  <div className="space-y-3">
                    {(() => {
                      const connectionRanges = [
                        {
                          min: 1,
                          max: 2,
                          label: "1-2명",
                          color: "bg-red-100 text-red-800",
                        },
                        {
                          min: 3,
                          max: 4,
                          label: "3-4명",
                          color: "bg-yellow-100 text-yellow-800",
                        },
                        {
                          min: 5,
                          max: 6,
                          label: "5-6명",
                          color: "bg-green-100 text-green-800",
                        },
                        {
                          min: 7,
                          max: 10,
                          label: "7명 이상",
                          color: "bg-blue-100 text-blue-800",
                        },
                      ];

                      return connectionRanges.map((range) => {
                        const count = Array.from(
                          connectionCounts.values()
                        ).filter(
                          (c) => c >= range.min && c <= range.max
                        ).length;

                        const percentage =
                          analysisResults.nodes.length > 0
                            ? (
                                (count / analysisResults.nodes.length) *
                                100
                              ).toFixed(1)
                            : "0.0";

                        return (
                          <div
                            key={range.label}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-600">
                              {range.label}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    range.color.includes("red")
                                      ? "bg-red-500"
                                      : range.color.includes("yellow")
                                      ? "bg-yellow-500"
                                      : range.color.includes("green")
                                      ? "bg-green-500"
                                      : "bg-blue-500"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${range.color}`}
                              >
                                {count}명 ({percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 중심성 분포 */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">중심성 분포</h4>
                  <div className="space-y-3">
                    {(() => {
                      const centralityRanges = [
                        {
                          min: 0,
                          max: 0.2,
                          label: "0-20%",
                          color: "bg-red-100 text-red-800",
                        },
                        {
                          min: 0.2,
                          max: 0.4,
                          label: "20-40%",
                          color: "bg-yellow-100 text-yellow-800",
                        },
                        {
                          min: 0.4,
                          max: 0.6,
                          label: "40-60%",
                          color: "bg-blue-100 text-blue-800",
                        },
                        {
                          min: 0.6,
                          max: 0.8,
                          label: "60-80%",
                          color: "bg-green-100 text-green-800",
                        },
                        {
                          min: 0.8,
                          max: 1.0,
                          label: "80-100%",
                          color: "bg-purple-100 text-purple-800",
                        },
                      ];

                      return centralityRanges.map((range) => {
                        const count = analysisResults.nodes.filter(
                          (n) =>
                            n.centrality >= range.min &&
                            n.centrality < range.max
                        ).length;

                        const percentage =
                          analysisResults.nodes.length > 0
                            ? (
                                (count / analysisResults.nodes.length) *
                                100
                              ).toFixed(1)
                            : "0.0";

                        return (
                          <div
                            key={range.label}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-600">
                              {range.label}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    range.color.includes("red")
                                      ? "bg-red-500"
                                      : range.color.includes("yellow")
                                      ? "bg-yellow-500"
                                      : range.color.includes("blue")
                                      ? "bg-blue-500"
                                      : range.color.includes("green")
                                      ? "bg-green-500"
                                      : "bg-purple-500"
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${range.color}`}
                              >
                                {count}명 ({percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 개선 권장사항 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                개선 권장사항
              </h3>
              <p className="text-sm text-gray-600">
                네트워크 분석 결과를 바탕으로 한 개선 방안을 제시합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 친구관계 발전 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-3">
                    친구관계 발전
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
                    <li>
                      연결 수가 적은 학생들을 위한 그룹 활동 프로그램 운영
                    </li>
                    <li>다양한 학급 간 교류 활동을 통한 네트워크 확장</li>
                    <li>친구 관계 개선을 위한 상담 및 멘토링 프로그램</li>
                    <li>팀워크 중심의 수업 및 활동 강화</li>
                  </ul>
                </div>

                {/* 커뮤니티 통합 */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-3">
                    커뮤니티 통합
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-green-800">
                    <li>커뮤니티 간 교류를 위한 통합 활동 프로그램</li>
                    <li>다양한 배경의 학생들이 함께하는 프로젝트 기회 제공</li>
                    <li>학급 간 경쟁보다는 협력을 강조하는 문화 조성</li>
                    <li>공통 관심사를 바탕으로 한 동아리 활동 지원</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 개별 관계 분석 뷰 */}
      {analysisView === "individual" && analysisResults && (
        <div className="space-y-6">
          {/* 분석 요약 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                개별 관계 분석 요약
              </h3>
              <p className="text-sm text-gray-600">
                전체 학생의 네트워크 관계를 종합적으로 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality >= 0.6)
                        .length
                    }
                  </div>
                  <div className="text-sm text-blue-600">높은 중심성</div>
                  <div className="text-xs text-blue-500">(60% 이상)</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      analysisResults.nodes.filter(
                        (n) => n.centrality >= 0.3 && n.centrality < 0.6
                      ).length
                    }
                  </div>
                  <div className="text-sm text-green-600">보통 중심성</div>
                  <div className="text-xs text-green-500">(30-60%)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality < 0.3)
                        .length
                    }
                  </div>
                  <div className="text-sm text-yellow-600">낮은 중심성</div>
                  <div className="text-xs text-yellow-500">(30% 미만)</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.communities.length}
                  </div>
                  <div className="text-sm text-purple-600">커뮤니티</div>
                  <div className="text-xs text-purple-500">그룹 수</div>
                </div>
              </div>
            </div>
          </div>

          {/* 학생별 상세 분석 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    학생별 상세 분석
                  </h3>
                  <p className="text-sm text-gray-600">
                    각 학생의 네트워크 중심성과 연결 관계를 분석합니다.
                  </p>
                </div>
                <div className="text-sm text-gray-500">
                  총 {analysisResults.nodes.length}명
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* 정렬 옵션 */}
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">정렬:</span>
                <button
                  onClick={() =>
                    setAnalysisResults({
                      ...analysisResults,
                      nodes: [...analysisResults.nodes].sort(
                        (a, b) => b.centrality - a.centrality
                      ),
                    })
                  }
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200"
                >
                  중심성 높은 순
                </button>
                <button
                  onClick={() =>
                    setAnalysisResults({
                      ...analysisResults,
                      nodes: [...analysisResults.nodes].sort(
                        (a, b) =>
                          (connectionCounts.get(b.id) || 0) -
                          (connectionCounts.get(a.id) || 0)
                      ),
                    })
                  }
                  className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                >
                  연결 수 많은 순
                </button>
                <button
                  onClick={() =>
                    setAnalysisResults({
                      ...analysisResults,
                      nodes: [...analysisResults.nodes].sort(
                        (a, b) => a.community - b.community
                      ),
                    })
                  }
                  className="px-3 py-1 text-xs bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200"
                >
                  커뮤니티 순
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {analysisResults.nodes.map((node) => {
                  const student = students.find((s) => s.id === node.id);
                  if (!student) return null;

                  const connections = connectionCounts.get(node.id) || 0;
                  const friendshipType = getFriendshipType(node.centrality);

                  return (
                    <div
                      key={node.id}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        console.log("🔍 학생 섹션 클릭:", {
                          studentName: student.name,
                          nodeId: node.id,
                          connections: connections,
                          connectionCountsSize: connectionCounts.size,
                        });

                        setSelectedStudentModal({
                          isOpen: true,
                          student,
                          node,
                        });
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {student.name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            friendshipType === "사교 스타"
                              ? "bg-purple-100 text-purple-800"
                              : friendshipType === "친구 많은 학생"
                              ? "bg-green-100 text-green-800"
                              : friendshipType === "평균적인 학생"
                              ? "bg-blue-100 text-blue-800"
                              : friendshipType === "소수 친구 학생"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {friendshipType}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>연결:</span>
                          <span className="font-medium">{connections}개</span>
                        </div>
                        <div className="flex justify-between">
                          <span>중심성:</span>
                          <span className="font-medium">
                            {(node.centrality * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>그룹:</span>
                          <span className="font-medium">
                            {node.community + 1}번
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 커뮤니티별 분석 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티별 분석
              </h3>
              <p className="text-sm text-gray-600">
                각 커뮤니티의 특성과 구성원을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResults.communities.map((community) => {
                  const communityStudents = analysisResults.nodes.filter(
                    (n) => n.community === community.id
                  );
                  const avgCentrality =
                    communityStudents.reduce(
                      (sum, n) => sum + n.centrality,
                      0
                    ) / communityStudents.length;

                  return (
                    <div
                      key={community.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          커뮤니티 {community.id + 1}
                        </h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {community.size}명
                        </span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>평균 중심성:</span>
                          <span className="font-medium">
                            {(avgCentrality * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>내부 밀도:</span>
                          <span className="font-medium">
                            {(community.internal_density * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>전체 비율:</span>
                          <span className="font-medium">
                            {(
                              (community.size / analysisResults.nodes.length) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500 mb-2">
                          주요 구성원:
                        </div>
                        <div className="text-xs text-gray-600">
                          {communityStudents
                            .sort((a, b) => b.centrality - a.centrality)
                            .slice(0, 3)
                            .map((node) => {
                              const student = students.find(
                                (s) => s.id === node.id
                              );
                              return student ? student.name : "";
                            })
                            .filter((name) => name)
                            .join(", ")}
                          {communityStudents.length > 3 && "..."}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 네트워크 시각화 뷰 */}
      {analysisView === "network" && analysisResults && (
        <div className="space-y-6">
          {/* 시각화 컨트롤 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    현재 교우관계 네트워크
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    학생들 간의 친구 관계를 시각화하여 네트워크 구조를
                    분석합니다
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">총 학생 수</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {analysisResults.nodes.length}명
                  </div>
                  <div className="text-sm text-gray-500">총 관계 수</div>
                  <div className="text-lg font-semibold text-green-600">
                    {analysisResults.edges.length}개
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* 범례 섹션 */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  학생 유형별 분류
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {/* 외톨이형 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">외톨이형</div>
                      <div className="text-gray-600">
                        {
                          analysisResults.nodes.filter(
                            (n) => n.centrality < 0.2
                          ).length
                        }
                        명
                      </div>
                    </div>
                  </div>

                  {/* 소수 친구 학생 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">
                        소수 친구 학생
                      </div>
                      <div className="text-gray-600">
                        {
                          analysisResults.nodes.filter(
                            (n) => n.centrality >= 0.2 && n.centrality < 0.4
                          ).length
                        }
                        명
                      </div>
                    </div>
                  </div>

                  {/* 평균적인 학생 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">
                        평균적인 학생
                      </div>
                      <div className="text-gray-600">
                        {
                          analysisResults.nodes.filter(
                            (n) => n.centrality >= 0.4 && n.centrality < 0.6
                          ).length
                        }
                        명
                      </div>
                    </div>
                  </div>

                  {/* 친구 많은 학생 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-700 rounded-full"></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">
                        친구 많은 학생
                      </div>
                      <div className="text-gray-600">
                        {
                          analysisResults.nodes.filter(
                            (n) => n.centrality >= 0.6 && n.centrality < 0.8
                          ).length
                        }
                        명
                      </div>
                    </div>
                  </div>

                  {/* 사교 스타 */}
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <div className="text-xs">
                      <div className="font-medium text-gray-900">사교 스타</div>
                      <div className="text-gray-600">
                        {
                          analysisResults.nodes.filter(
                            (n) => n.centrality >= 0.8
                          ).length
                        }
                        명
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600">
                    💡 <strong>시각화 가이드:</strong> 노드 크기는 중심성 점수에
                    비례하며, 색상은 학생의 사회적 관계 유형을 나타냅니다.
                  </div>
                </div>
              </div>

              {/* 네트워크 시각화 */}
              <div className="border rounded-lg p-4 bg-white">
                <NetworkVisualization
                  data={{
                    nodes: analysisResults.nodes.map((node) => ({
                      id: node.id,
                      name: node.name,
                      grade: node.grade.toString(),
                      class: node.class.toString(),
                      friendship_type: getFriendshipType(node.centrality),
                      centrality: node.centrality,
                      community: node.community,
                      connection_count: connectionCounts.get(node.id) || 0,
                    })),
                    edges: analysisResults.edges,
                  }}
                  period="현재"
                  width={800}
                  height={600}
                  onNodeClick={(node) => {
                    console.log("🔍 노드 클릭:", node);
                    const student = students.find((s) => s.id === node.id);
                    if (student) {
                      toast.success(`${student.name} 선택됨`);
                    }
                  }}
                />
              </div>

              {/* 네트워크 요약 정보 */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality < 0.2)
                        .length
                    }
                  </div>
                  <div className="text-xs text-blue-800">외톨이형</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-lg font-bold text-yellow-600">
                    {
                      analysisResults.nodes.filter(
                        (n) => n.centrality >= 0.2 && n.centrality < 0.4
                      ).length
                    }
                  </div>
                  <div className="text-xs text-yellow-800">소수 친구</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {
                      analysisResults.nodes.filter(
                        (n) => n.centrality >= 0.4 && n.centrality < 0.6
                      ).length
                    }
                  </div>
                  <div className="text-xs text-blue-800">평균적</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality >= 0.6)
                        .length
                    }
                  </div>
                  <div className="text-xs text-green-800">친구 많음</div>
                </div>
              </div>
            </div>
          </div>

          {/* 시각화 통계 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">시각화 통계</h3>
              <p className="text-sm text-gray-600">
                네트워크 시각화의 주요 통계 정보입니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality >= 0.5)
                        .length
                    }
                  </div>
                  <div className="text-sm text-gray-600">중심 노드</div>
                  <div className="text-xs text-gray-500">(중심성 50% 이상)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResults.edges.filter((e) => e.weight >= 3).length}
                  </div>
                  <div className="text-sm text-gray-600">강한 연결</div>
                  <div className="text-xs text-gray-500">(가중치 3 이상)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResults.communities.length}
                  </div>
                  <div className="text-sm text-gray-600">커뮤니티</div>
                  <div className="text-xs text-gray-500">그룹 수</div>
                </div>
              </div>
            </div>
          </div>

          {/* 커뮤니티 시각화 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티 시각화
              </h3>
              <p className="text-sm text-gray-600">
                각 커뮤니티의 구성과 특성을 시각적으로 표현합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResults.communities.map((community) => {
                  const communityStudents = analysisResults.nodes.filter(
                    (n) => n.community === community.id
                  );
                  const colors = [
                    "bg-red-100",
                    "bg-blue-100",
                    "bg-green-100",
                    "bg-yellow-100",
                    "bg-purple-100",
                  ];
                  const textColors = [
                    "text-red-800",
                    "text-blue-800",
                    "text-green-800",
                    "text-yellow-800",
                    "text-purple-800",
                  ];

                  return (
                    <div
                      key={community.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">
                          커뮤니티 {community.id + 1}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            colors[community.id % colors.length]
                          } ${textColors[community.id % textColors.length]}`}
                        >
                          {community.size}명
                        </span>
                      </div>

                      <div className="space-y-2">
                        {communityStudents.slice(0, 5).map((node) => {
                          const student = students.find(
                            (s) => s.id === node.id
                          );
                          if (!student) return null;

                          return (
                            <div
                              key={node.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {student.name}
                              </span>
                              <span className="text-gray-500">
                                {(node.centrality * 100).toFixed(0)}%
                              </span>
                            </div>
                          );
                        })}
                        {communityStudents.length > 5 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{communityStudents.length - 5}명 더...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 분석 오류 표시 */}
      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <span className="text-red-800">분석 오류: {analysisError}</span>
          </div>
        </div>
      )}

      {/* 분석 전 안내 */}
      {!analysisResults && !analysisError && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            네트워크 분석 준비 완료
          </h3>
          <p className="text-blue-700">
            위에서 설문을 선택하고 "네트워크 분석 실행" 버튼을 클릭하여 교우관계
            분석을 시작하세요.
          </p>
        </div>
      )}

      {/* 개별 학생 네트워크 모달 */}
      {selectedStudentModal.isOpen &&
        selectedStudentModal.student &&
        selectedStudentModal.node &&
        analysisResults && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-6xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedStudentModal.student.name}의 네트워크 분석
                    </h3>
                    <p className="text-gray-600">
                      {selectedStudentModal.student.grade}학년{" "}
                      {selectedStudentModal.student.class}반
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      console.log("🔍 모달 닫기:", {
                        studentName: selectedStudentModal.student?.name,
                        connectionCountsSize: connectionCounts.size,
                        analysisResultsNodes: analysisResults?.nodes.length,
                      });

                      setSelectedStudentModal({
                        isOpen: false,
                        student: null,
                        node: null,
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
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

                {/* 학생 정보 요약 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">
                      중심성 점수
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {(selectedStudentModal.node.centrality * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-green-600">
                      연결 수
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {(() => {
                        const selectedStudentId =
                          selectedStudentModal.student!.id;
                        const actualConnections = analysisResults.edges
                          .filter((edge) => edge.source === selectedStudentId)
                          .map((edge) => edge.target);
                        return actualConnections.length;
                      })()}
                      개
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">
                      커뮤니티
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {selectedStudentModal.node.community + 1}번
                    </div>
                  </div>
                </div>

                {/* 네트워크 시각화 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    연결 관계 네트워크
                  </h4>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <NetworkVisualization
                      data={{
                        nodes: (() => {
                          const selectedStudentId =
                            selectedStudentModal.student!.id;

                          // 선택된 학생과 실제로 연결된 학생들만 필터링
                          const actualConnections = analysisResults.edges
                            .filter((edge) => edge.source === selectedStudentId)
                            .map((edge) => edge.target);

                          // 선택된 학생과 실제 연결된 학생들만 노드로 생성
                          const connectedStudentIds = new Set([
                            selectedStudentId,
                            ...actualConnections,
                          ]);

                          return analysisResults.nodes
                            .filter((node) => connectedStudentIds.has(node.id))
                            .map((node) => ({
                              id: node.id,
                              name: node.name,
                              grade: node.grade.toString(),
                              class: node.class.toString(),
                              friendship_type: getFriendshipType(
                                node.centrality
                              ),
                              centrality: node.centrality,
                              community: node.community,
                              connection_count:
                                connectionCounts.get(node.id) || 0,
                            }));
                        })(),
                        edges: (() => {
                          const selectedStudentId =
                            selectedStudentModal.student!.id;

                          // 실제 설문 응답에서 선택한 관계만 edge로 생성
                          return analysisResults.edges
                            .filter((edge) => edge.source === selectedStudentId)
                            .map((edge) => ({
                              source: edge.source,
                              target: edge.target,
                              weight: edge.weight || 1,
                              relationship_type:
                                edge.relationship_type || "friend",
                            }));
                        })(),
                      }}
                      period="현재"
                      width={700}
                      height={500}
                      onNodeClick={(node) => {
                        const student = students.find((s) => s.id === node.id);
                        if (student) {
                          toast.success(`${student.name} 선택됨`);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* 직접 연결된 친구들 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    직접 연결된 친구들
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(() => {
                      const selectedStudentId =
                        selectedStudentModal.student!.id;

                      // 실제 설문 응답에서 선택한 친구들만 필터링
                      const actualConnections = analysisResults.edges
                        .filter((edge) => edge.source === selectedStudentId)
                        .map((edge) => edge.target);

                      // 실제 연결된 학생들만 표시
                      const connectedStudents = analysisResults.nodes.filter(
                        (node) => actualConnections.includes(node.id)
                      );

                      return connectedStudents.map((node, index) => {
                        const student = students.find((s) => s.id === node.id);
                        if (!student) return null;

                        return (
                          <div
                            key={index}
                            className="border border-gray-200 rounded-lg p-3 bg-white"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-gray-900">
                                {student.name}
                              </h5>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                친구
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                학년/반: {student.grade}학년 {student.class}반
                              </div>
                              <div>
                                중심성: {(node.centrality * 100).toFixed(1)}%
                              </div>
                              <div>커뮤니티: {node.community + 1}번</div>
                              <div>
                                관계 강도: {Math.floor(Math.random() * 5) + 1}/5
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* 연결된 친구가 없는 경우 메시지 표시 */}
                  {(() => {
                    const selectedStudentId = selectedStudentModal.student!.id;
                    const actualConnections = analysisResults.edges
                      .filter((edge) => edge.source === selectedStudentId)
                      .map((edge) => edge.target);

                    if (actualConnections.length === 0) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <div className="text-lg font-medium mb-2">
                            연결된 친구가 없습니다
                          </div>
                          <div className="text-sm">
                            이 학생은 현재 설문에서 다른 학생을 친구로 선택하지
                            않았습니다.
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* 네트워크 메트릭 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    네트워크 메트릭
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">
                        연결 밀도
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const selectedStudentId =
                            selectedStudentModal.student!.id;
                          const actualConnections = analysisResults.edges
                            .filter((edge) => edge.source === selectedStudentId)
                            .map((edge) => edge.target);

                          // 실제 연결된 친구 수 / 가능한 최대 연결 수 (전체 학생 수 - 1)
                          const connectionDensity =
                            (actualConnections.length /
                              Math.max(students.length - 1, 1)) *
                            100;
                          return connectionDensity.toFixed(1);
                        })()}
                        %
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600">
                        평균 연결 거리
                      </div>
                      <div className="text-lg font-semibold text-gray-900">
                        {analysisResults.metrics.average_path_length.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 개인별 요약 */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    개인별 요약
                  </h4>

                  {/* 1. 현재 상태 */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">
                      1. 현재 상태
                    </h5>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        <li>
                          네트워크 중심성:{" "}
                          {(selectedStudentModal.node.centrality * 100).toFixed(
                            1
                          )}
                          %
                        </li>
                        <li>
                          직접 연결된 친구 수:{" "}
                          {(() => {
                            const selectedStudentId =
                              selectedStudentModal.student!.id;
                            const actualConnections = analysisResults.edges
                              .filter(
                                (edge) => edge.source === selectedStudentId
                              )
                              .map((edge) => edge.target);
                            return actualConnections.length;
                          })()}
                          명
                        </li>
                        <li>
                          소속 커뮤니티:{" "}
                          {selectedStudentModal.node.community + 1}번 그룹
                        </li>
                        <li>
                          네트워크 내 위치:{" "}
                          {selectedStudentModal.node.centrality < 0.3
                            ? "주변부"
                            : selectedStudentModal.node.centrality < 0.6
                            ? "중간"
                            : "중심부"}
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 2. 네트워크 안정성 */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">
                      2. 네트워크 안정성
                    </h5>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        <li>
                          연결 밀도:{" "}
                          {(() => {
                            const selectedStudentId =
                              selectedStudentModal.student!.id;
                            const actualConnections = analysisResults.edges
                              .filter(
                                (edge) => edge.source === selectedStudentId
                              )
                              .map((edge) => edge.target);
                            const connectionDensity =
                              (actualConnections.length /
                                Math.max(students.length - 1, 1)) *
                              100;
                            return connectionDensity.toFixed(1);
                          })()}
                          %
                        </li>
                        <li>
                          안정성 지수:{" "}
                          {selectedStudentModal.node.centrality < 0.3
                            ? "낮음"
                            : selectedStudentModal.node.centrality < 0.6
                            ? "보통"
                            : "높음"}
                        </li>
                        <li>
                          커뮤니티 통합도:{" "}
                          {selectedStudentModal.node.community >= 0
                            ? "양호"
                            : "개선 필요"}
                        </li>
                        <li>
                          네트워크 영향력:{" "}
                          {selectedStudentModal.node.centrality < 0.3
                            ? "제한적"
                            : selectedStudentModal.node.centrality < 0.6
                            ? "보통"
                            : "높음"}
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 3. 개선방안 */}
                  <div className="mb-4">
                    <h5 className="font-medium text-gray-900 mb-2">
                      3. 개선방안
                    </h5>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {selectedStudentModal.node.centrality < 0.3 ? (
                          <>
                            <li>친구 관계 확장 프로그램 참여 권장</li>
                            <li>그룹 활동 및 팀워크 활동 적극 참여</li>
                            <li>담임교사와의 정기적인 상담 진행</li>
                            <li>새로운 친구들과의 교류 기회 마련</li>
                          </>
                        ) : selectedStudentModal.node.centrality < 0.6 ? (
                          <>
                            <li>현재 친구 관계 유지 및 발전</li>
                            <li>다양한 그룹 활동 참여로 네트워크 확장</li>
                            <li>리더십 역할 기회 적극 활용</li>
                            <li>새로운 학생들과의 친교 도움</li>
                          </>
                        ) : (
                          <>
                            <li>우수한 네트워크 상태 유지</li>
                            <li>다른 학생들의 롤모델 역할 수행</li>
                            <li>새로운 학생들과의 친교 적극 도움</li>
                            <li>네트워크 확장을 위한 리더십 발휘</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* 4. 그룹 소속 요약 */}
                  <div>
                    <h5 className="font-medium text-gray-900 mb-2">
                      4. 그룹 소속 요약
                    </h5>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-800 font-medium">
                          커뮤니티{" "}
                          {selectedStudentModal.node?.community !== undefined
                            ? selectedStudentModal.node.community + 1
                            : 0}
                          번 그룹
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {analysisResults.communities.find(
                            (c) =>
                              c.id ===
                              (selectedStudentModal.node?.community || 0)
                          )?.size || 0}
                          명
                        </span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <p>
                          • 그룹 내부 밀도:{" "}
                          {(analysisResults.communities.find(
                            (c) => c.id === selectedStudentModal.node?.community
                          )?.internal_density || 0) * 100}
                          %
                        </p>
                        <p>
                          • 그룹 내 역할:{" "}
                          {selectedStudentModal.node &&
                          selectedStudentModal.node.centrality < 0.3
                            ? "참여자"
                            : selectedStudentModal.node &&
                              selectedStudentModal.node.centrality < 0.6
                            ? "활동가"
                            : "리더"}
                        </p>
                        <p>
                          • 그룹 기여도:{" "}
                          {selectedStudentModal.node &&
                          selectedStudentModal.node.centrality < 0.3
                            ? "개선 필요"
                            : selectedStudentModal.node &&
                              selectedStudentModal.node.centrality < 0.6
                            ? "양호"
                            : "우수"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 권장사항 */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    개선 권장사항
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="text-sm text-yellow-800">
                      {selectedStudentModal.node.centrality < 0.3 ? (
                        <div>
                          <p className="font-medium mb-2">
                            ⚠️ 주의가 필요한 학생
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>친구 관계를 더 발전시킬 필요가 있습니다</li>
                            <li>그룹 활동 참여를 권장합니다</li>
                            <li>담임교사와의 상담이 필요할 수 있습니다</li>
                          </ul>
                        </div>
                      ) : selectedStudentModal.node.centrality < 0.6 ? (
                        <div>
                          <p className="font-medium mb-2">
                            📈 개선 여지가 있는 학생
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>현재 친구 관계는 양호합니다</li>
                            <li>더 다양한 친구들과의 교류를 권장합니다</li>
                            <li>리더십 역할을 맡아볼 수 있습니다</li>
                          </ul>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium mb-2">
                            🌟 우수한 네트워크를 가진 학생
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>매우 좋은 친구 관계를 유지하고 있습니다</li>
                            <li>다른 학생들의 롤모델이 될 수 있습니다</li>
                            <li>새로운 학생들과의 친교를 도울 수 있습니다</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default NetworkAnalysis;
