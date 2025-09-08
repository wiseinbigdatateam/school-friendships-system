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
import NetworkGraph from "../components/NetworkGraph";
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
    "overview" | "individual" | "network" | "graph"
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

  // 통일된 네트워크 그래프 데이터 상태
  const [unifiedGraphData, setUnifiedGraphData] = useState<any[]>([]);
  const [unifiedMaxSelections, setUnifiedMaxSelections] = useState<number[]>(
    [],
  );

  // 통일된 네트워크 그래프 데이터 생성
  useEffect(() => {
    const generateUnifiedNetworkData = async () => {
      if (!students || !selectedSurvey) {
        setUnifiedGraphData([]);
        return;
      }

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
          .eq("id", selectedSurvey.id)
          .single();

        if (surveyError) throw surveyError;

        // 2. 설문 응답 데이터 조회
        const { data: responses, error: responseError } = await supabase
          .from("survey_responses")
          .select(
            `
            *,
            students!survey_responses_student_id_fkey(id, name)
          `,
          )
          .eq("survey_id", selectedSurvey.id);

        if (responseError) throw responseError;

        // 3. 템플릿 메타데이터에서 max_selections 추출
        const metadata = surveyData?.survey_templates?.metadata as any;
        const maxSelections = metadata?.max_selections || [3, 5, 1, 1]; // 기본값
        setUnifiedMaxSelections(maxSelections);

        // 4. 통일된 네트워크 데이터 생성
        const studentMap = new Map(students.map((s) => [s.id, s]));
        const friendshipMap = new Map<string, Set<string>>();

        // 학생 초기화
        students.forEach((student) => {
          friendshipMap.set(student.id, new Set());
        });

        // 설문 응답에서 친구 관계 추출 (통일된 로직)
        responses.forEach((response) => {
          if (response.responses && response.student_id) {
            const answers =
              typeof response.responses === "string"
                ? JSON.parse(response.responses)
                : response.responses;

            // 질문별로 max_selections 값에 따라 처리
            Object.entries(answers).forEach(
              ([questionKey, answer]: [string, any]) => {
                const questionIndex =
                  parseInt(questionKey.replace("q", "")) - 1;
                const maxSelection = maxSelections[questionIndex] || 10;

                if (Array.isArray(answer)) {
                  const limitedAnswers = answer.slice(0, maxSelection);
                  limitedAnswers.forEach((friendId: string) => {
                    if (
                      friendId &&
                      studentMap.has(friendId) &&
                      response.student_id
                    ) {
                      friendshipMap.get(response.student_id)?.add(friendId);
                      friendshipMap.get(friendId)?.add(response.student_id);
                    }
                  });
                } else if (
                  typeof answer === "string" &&
                  studentMap.has(answer) &&
                  response.student_id
                ) {
                  if (maxSelection >= 1) {
                    friendshipMap.get(response.student_id)?.add(answer);
                    friendshipMap.get(answer)?.add(response.student_id);
                  }
                }
              },
            );
          }
        });

        // 5. NetworkGraph 컴포넌트용 데이터 형식으로 변환
        const graphStudents = [];
        for (const student of students) {
          const friends = Array.from(friendshipMap.get(student.id) || []);
          graphStudents.push({
            id: student.id,
            name: student.name,
            friends,
            friendCount: friends.length,
          });
        }

        setUnifiedGraphData(graphStudents);
      } catch (error) {
        console.error("Error in generateUnifiedNetworkData:", error);
        setUnifiedGraphData([]);
      }
    };

    generateUnifiedNetworkData();
  }, [students, selectedSurvey]);

  // 기존 convertToGraphData 함수 (하위 호환성을 위해 유지)
  const convertToGraphData = useMemo(() => {
    if (!analysisResults || !students || !selectedSurvey) return [];

    const studentMap = new Map(students.map((s) => [s.id, s]));
    const graphStudents = [];

    for (const student of students) {
      const friends = [];
      let friendCount = 0;

      // 네트워크 데이터에서 해당 학생의 연결 찾기
      if (analysisResults.edges) {
        for (const edge of analysisResults.edges) {
          if (edge.source === student.id) {
            const friendId = edge.target;
            if (studentMap.has(friendId)) {
              friends.push(friendId);
              friendCount++;
            }
          } else if (edge.target === student.id) {
            const friendId = edge.source;
            if (studentMap.has(friendId)) {
              friends.push(friendId);
              friendCount++;
            }
          }
        }
      }

      graphStudents.push({
        id: student.id,
        name: student.name,
        friends,
        friendCount,
      });
    }

    return graphStudents;
  }, [analysisResults, students, selectedSurvey]);

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
          (edge) => edge.source === node.id,
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

  // 저장된 네트워크 분석 결과 불러오기 (전체 데이터)
  const loadSavedNetworkAnalysis = async (
    surveyId: string,
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
        selectedSurvey.id,
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
            "success",
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
              },
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
    analysisResults: NetworkAnalysisResult,
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
    } catch (error) {
      console.error("🔍 DB 저장 오류:", error);
      throw error;
    }
  };

  // 네트워크 분석을 위한 헬퍼 함수들
  const calculateClusteringCoefficient = (
    nodes: NetworkNode[],
    edges: NetworkEdge[],
  ): number => {
    if (nodes.length === 0 || edges.length === 0) return 0;

    let totalCoefficient = 0;
    let validNodes = 0;

    nodes.forEach((node) => {
      const neighbors = edges
        .filter((edge) => edge.source === node.id || edge.target === node.id)
        .map((edge) => (edge.source === node.id ? edge.target : edge.source));

      if (neighbors.length < 2) {
        totalCoefficient += 0;
        validNodes++;
        return;
      }

      let triangles = 0;
      let possibleTriangles = 0;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          possibleTriangles++;
          const hasEdge = edges.some(
            (edge) =>
              (edge.source === neighbors[i] && edge.target === neighbors[j]) ||
              (edge.source === neighbors[j] && edge.target === neighbors[i]),
          );
          if (hasEdge) triangles++;
        }
      }

      const coefficient =
        possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      totalCoefficient += coefficient;
      validNodes++;
    });

    return validNodes > 0 ? totalCoefficient / validNodes : 0;
  };

  const calculateAveragePathLength = (
    nodes: NetworkNode[],
    edges: NetworkEdge[],
  ): number => {
    if (nodes.length === 0 || edges.length === 0) return 0;

    // Floyd-Warshall 알고리즘으로 최단 경로 계산
    const distances: { [key: string]: { [key: string]: number } } = {};

    // 초기화
    nodes.forEach((node) => {
      distances[node.id] = {};
      nodes.forEach((otherNode) => {
        distances[node.id][otherNode.id] =
          node.id === otherNode.id ? 0 : Infinity;
      });
    });

    // 직접 연결된 노드들
    edges.forEach((edge) => {
      distances[edge.source][edge.target] = 1;
      distances[edge.target][edge.source] = 1;
    });

    // Floyd-Warshall
    nodes.forEach((k) => {
      nodes.forEach((i) => {
        nodes.forEach((j) => {
          if (
            distances[i.id][k.id] + distances[k.id][j.id] <
            distances[i.id][j.id]
          ) {
            distances[i.id][j.id] =
              distances[i.id][k.id] + distances[k.id][j.id];
          }
        });
      });
    });

    // 평균 경로 길이 계산
    let totalDistance = 0;
    let pathCount = 0;

    nodes.forEach((i) => {
      nodes.forEach((j) => {
        if (i.id !== j.id && distances[i.id][j.id] !== Infinity) {
          totalDistance += distances[i.id][j.id];
          pathCount++;
        }
      });
    });

    return pathCount > 0 ? totalDistance / pathCount : 0;
  };

  const calculateModularity = (
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    communities: Community[],
  ): number => {
    if (nodes.length === 0 || edges.length === 0 || communities.length === 0)
      return 0;

    const m = edges.length;
    let modularity = 0;

    edges.forEach((edge) => {
      const sourceCommunity = communities.find((c) =>
        c.members.includes(edge.source),
      );
      const targetCommunity = communities.find((c) =>
        c.members.includes(edge.target),
      );

      if (
        sourceCommunity &&
        targetCommunity &&
        sourceCommunity.id === targetCommunity.id
      ) {
        const ki = edges.filter(
          (e) => e.source === edge.source || e.target === edge.source,
        ).length;
        const kj = edges.filter(
          (e) => e.source === edge.target || e.target === edge.target,
        ).length;
        modularity += 1 - (ki * kj) / (2 * m);
      }
    });

    return m > 0 ? modularity / (2 * m) : 0;
  };

  // 네트워크 분석 결과를 기반으로 개선 권장사항 생성
  const generateImprovementRecommendations = (
    analysisResults: NetworkAnalysisResult,
  ) => {
    const recommendations = {
      friendshipDevelopment: [] as string[],
      communityIntegration: [] as string[],
      priority: "normal" as "high" | "normal" | "low",
    };

    // 연결 수가 적은 학생 비율 계산
    const lowConnectionStudents = analysisResults.nodes.filter((n) => {
      const connections = analysisResults.edges.filter(
        (e) => e.source === n.id || e.target === n.id,
      ).length;
      return connections <= 2;
    }).length;
    const lowConnectionRatio =
      lowConnectionStudents / analysisResults.nodes.length;

    // 커뮤니티 수와 평균 크기
    const avgCommunitySize =
      analysisResults.nodes.length / analysisResults.communities.length;
    const smallCommunities = analysisResults.communities.filter(
      (c) => c.size < avgCommunitySize * 0.5,
    ).length;

    // 네트워크 밀도 기반 권장사항
    if (analysisResults.metrics.density < 0.1) {
      recommendations.friendshipDevelopment.push(
        "전체적으로 낮은 네트워크 밀도로 인해 친구 관계 확장 프로그램이 필요합니다",
      );
      recommendations.priority = "high";
    } else if (analysisResults.metrics.density < 0.3) {
      recommendations.friendshipDevelopment.push(
        "네트워크 밀도 개선을 위한 그룹 활동 프로그램 운영이 권장됩니다",
      );
    }

    // 연결 수가 적은 학생들에 대한 권장사항
    if (lowConnectionRatio > 0.3) {
      recommendations.friendshipDevelopment.push(
        `${Math.round(lowConnectionRatio * 100)}%의 학생이 연결 수가 적어 개별 상담 프로그램이 필요합니다`,
      );
      recommendations.priority = "high";
    } else if (lowConnectionRatio > 0.1) {
      recommendations.friendshipDevelopment.push(
        "연결 수가 적은 학생들을 위한 그룹 활동 프로그램 운영",
      );
    }

    // 클러스터링 계수 기반 권장사항
    if (analysisResults.metrics.clustering_coefficient < 0.2) {
      recommendations.friendshipDevelopment.push(
        "낮은 클러스터링 계수로 인해 친구들의 친구 관계 형성을 위한 활동이 필요합니다",
      );
    }

    // 커뮤니티 통합 관련 권장사항
    if (analysisResults.communities.length > 3) {
      recommendations.communityIntegration.push(
        "커뮤니티가 많아 통합 활동 프로그램이 필요합니다",
      );
      recommendations.priority = "high";
    } else if (smallCommunities > 0) {
      recommendations.communityIntegration.push(
        "작은 커뮤니티들이 있어 통합 활동을 통한 네트워크 확장이 필요합니다",
      );
    }

    // 모듈성 기반 권장사항
    if (analysisResults.metrics.modularity > 0.5) {
      recommendations.communityIntegration.push(
        "높은 모듈성으로 인해 커뮤니티 간 교류 프로그램이 필요합니다",
      );
    }

    // 기본 권장사항 추가
    if (recommendations.friendshipDevelopment.length === 0) {
      recommendations.friendshipDevelopment.push(
        "현재 친구 관계는 양호하나 지속적인 개선을 위한 활동 프로그램 운영",
      );
    }
    if (recommendations.communityIntegration.length === 0) {
      recommendations.communityIntegration.push(
        "커뮤니티 간 자연스러운 교류를 위한 활동 기회 제공",
      );
    }

    return recommendations;
  };

  // 개별 학생 개선방안 생성
  const generateIndividualRecommendations = (
    node: NetworkNode,
    analysisResults: NetworkAnalysisResult,
  ) => {
    const recommendations = [] as string[];
    const connections = analysisResults.edges.filter(
      (e) => e.source === node.id || e.target === node.id,
    ).length;
    const totalStudents = analysisResults.nodes.length;
    const connectionRatio = connections / (totalStudents - 1);

    // 중심성 기반 권장사항
    if (node.centrality < 0.3) {
      recommendations.push("친구 관계 확장 프로그램 참여 권장");
      recommendations.push("그룹 활동 및 팀워크 활동 적극 참여");
      recommendations.push("담임교사와의 정기적인 상담 진행");
      if (connectionRatio < 0.2) {
        recommendations.push("새로운 친구들과의 교류 기회 적극 마련");
      }
    } else if (node.centrality < 0.6) {
      recommendations.push("현재 친구 관계 유지 및 발전");
      recommendations.push("다양한 그룹 활동 참여로 네트워크 확장");
      recommendations.push("리더십 역할 기회 적극 활용");
      if (connectionRatio < 0.5) {
        recommendations.push("새로운 학생들과의 친교 도움");
      }
    } else {
      recommendations.push("우수한 네트워크 상태 유지");
      recommendations.push("다른 학생들의 롤모델 역할 수행");
      recommendations.push("새로운 학생들과의 친교 적극 도움");
      recommendations.push("네트워크 확장을 위한 리더십 발휘");
    }

    // 커뮤니티 관련 권장사항
    const community = analysisResults.communities.find(
      (c) => c.id === node.community,
    );
    if (community && community.size < 3) {
      recommendations.push("작은 커뮤니티 소속으로 다른 그룹과의 교류 확대");
    }

    return recommendations;
  };

  // Python 분석 시뮬레이션
  const simulatePythonAnalysis = async (
    surveyId: string,
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
          surveyResponses.length,
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
                        (edge.source === friendId && edge.target === studentId),
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
        (edge) => edge.source === student.id || edge.target === student.id,
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
      clustering_coefficient: calculateClusteringCoefficient(nodes, edges),
      average_path_length: calculateAveragePathLength(nodes, edges),
      modularity: calculateModularity(nodes, edges, communities),
    };

    // 커뮤니티 감지 (실제 데이터 기반으로 단순화)
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
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          교우관계 네트워크 분석
        </h1>
        <p className="mb-4 text-gray-600">
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

      {/* 설문 선택 섹션 */}
      <div className="mb-4 rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
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
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <p className="text-gray-600">설문 데이터를 불러오는 중...</p>
            </div>
          ) : surveys.length > 0 ? (
            <div className="space-y-4">
              <div className="mb-4 text-sm text-gray-600">
                총{" "}
                <span className="font-semibold text-[#3F80EA]">
                  {surveys.length}개
                </span>
                의 설문을 찾았습니다.
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {surveys.map((survey) => (
                  <div
                    key={survey.id}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      selectedSurvey?.id === survey.id
                        ? "border-[#3F80EA] bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    onClick={async () => {
                      setSelectedSurvey(survey);
                      setAnalysisResults(null);
                      setAnalysisError(null);

                      // 설문 선택 시 저장된 분석 결과가 있는지 확인
                      try {
                        const savedResults = await loadSavedNetworkAnalysis(
                          survey.id,
                        );
                        if (savedResults) {
                          console.log(
                            "🔍 설문 선택 시 저장된 분석 결과를 불러왔습니다",
                          );
                          setAnalysisResults(savedResults);
                          toast.success("저장된 분석 결과를 불러왔습니다!");
                        }
                      } catch (error) {
                        console.log("🔍 저장된 분석 결과가 없습니다");
                      }
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {survey.title}
                      </h4>
                      {selectedSurvey?.id === survey.id && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3F80EA]">
                          <svg
                            className="h-3 w-3 text-white"
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
                    {/* <div className="space-y-1 text-sm text-gray-600">
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
                    </div> */}

                    {/* 날짜 정보 */}
                    <div className="mt-2 space-y-1 text-sm text-gray-500">
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
                    <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                      {/* <div className="text-xs text-gray-500">
                        설문 ID: {survey.id.slice(0, 8)}...
                      </div> */}
                      {survey.description && (
                        <div className="truncate text-xs text-gray-600">
                          {survey.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <UsersIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="mb-2 text-lg font-medium">
                현재 담당 학급의 설문이 없습니다
              </p>
              <p className="mb-4 text-sm">
                다른 학년/반의 설문이거나 아직 생성된 설문이 없을 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 네트워크 분석 실행 버튼 */}
      {selectedSurvey && (
        <div className="mb-4 rounded-lg bg-white shadow">
          <div className="p-6 text-center">
            <button
              onClick={handleRunNetworkAnalysis}
              disabled={isAnalyzing}
              className={`inline-flex items-center rounded-lg px-8 py-4 text-lg font-medium text-white transition-colors ${
                isAnalyzing
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-[#3F80EA] hover:bg-blue-600 active:bg-blue-600"
              }`}
            >
              {isAnalyzing ? (
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                  <span>분석 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <PlayIcon className="h-6 w-6" />
                  <span>네트워크 분석 실행</span>
                </div>
              )}
            </button>
            <p className="mt-2 text-sm text-gray-500">
              선택된 설문: {selectedSurvey.title}
            </p>
            {/* {analysisResults && (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                <p className="mb-2 text-xs text-green-600">
                  ✅ 분석 결과가 로드되었습니다
                </p>

                <div className="flex justify-center space-x-3">
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
                          mockAnalysisResults,
                        );

                        setAnalysisResults(mockAnalysisResults);
                        toast.success("네트워크 분석이 새로 완료되었습니다!");
                      } catch (error) {
                        console.error("🔍 네트워크 분석 오류:", error);
                        setAnalysisError(
                          "네트워크 분석 중 오류가 발생했습니다.",
                        );
                        toast.error("네트워크 분석에 실패했습니다.");
                      } finally {
                        setIsAnalyzing(false);
                      }
                    }}
                    disabled={isAnalyzing}
                    className="text-xs text-blue-600 underline hover:text-blue-800 disabled:text-gray-400"
                  >
                    {isAnalyzing ? "재분석 중..." : "새로 분석하기"}
                  </button>

                  {/* 지도 리포트 페이지로 이동 버튼 */}
            {/* <button
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
                          }),
                        );
                      }
                      setTimeout(() => {
                        window.location.href = "/reports";
                      }, 1000);
                    }}
                    className="text-xs text-green-600 underline hover:text-green-800"
                  >
                    📊 지도 리포트 보기
                  </button>
                </div>
              </div>
            )}  */}
          </div>
        </div>
      )}

      {/* 분석 결과가 있을 때만 뷰 선택 탭 표시 */}
      {analysisResults && (
        <div className="mb-4 rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setAnalysisView("overview")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  analysisView === "overview"
                    ? "bg-[#3F80EA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <EyeIcon className="mr-2 inline h-4 w-4" />
                전체 현황
              </button>
              <button
                onClick={() => setAnalysisView("network")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${
                  analysisView === "network"
                    ? "bg-[#3F80EA] text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <ChartBarIcon className="mr-2 inline h-4 w-4" />
                네트워크 시각화
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 현황 뷰 */}
      {analysisView === "overview" && analysisResults && (
        <div className="space-y-4">
          {/* 네트워크 메트릭스 */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                네트워크 메트릭스
              </h3>
              <p className="text-sm text-gray-600">
                전체 네트워크의 구조적 특성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="text-sm font-medium text-blue-900">
                    네트워크 밀도
                  </div>
                  <div className="text-lg font-semibold text-blue-700">
                    {(analysisResults.metrics.density * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg bg-green-50 p-4">
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
                <div className="rounded-lg bg-purple-50 p-4">
                  <div className="text-sm font-medium text-purple-900">
                    평균 경로 길이
                  </div>
                  <div className="text-lg font-semibold text-purple-700">
                    {analysisResults.metrics.average_path_length.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-lg bg-orange-50 p-4">
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티 분석
              </h3>
              <p className="text-sm text-gray-600">
                자연스럽게 형성된 친구 그룹을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {analysisResults.communities.map((community) => (
                  <div
                    key={community.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <h4 className="mb-2 font-medium text-gray-900">
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                학생별 중심성 분석
              </h3>
              <p className="text-sm text-gray-600">
                각 학생의 네트워크 내 영향력과 연결성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                        className="rounded-lg border border-gray-200 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {student.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
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
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    총 {analysisResults.nodes.length}명 중 상위 9명 표시
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 네트워크 구조 분석 */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                네트워크 구조 분석
              </h3>
              <p className="text-sm text-gray-600">
                네트워크의 전반적인 구조와 특성을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                          connectionCounts.values(),
                        ).filter(
                          (c) => c >= range.min && c <= range.max,
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
                              <div className="h-2 w-24 rounded-full bg-gray-200">
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
                                className={`rounded-full px-2 py-1 text-xs font-medium ${range.color}`}
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
                            n.centrality < range.max,
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
                              <div className="h-2 w-24 rounded-full bg-gray-200">
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
                                className={`rounded-full px-2 py-1 text-xs font-medium ${range.color}`}
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                개선 권장사항
              </h3>
              <p className="text-sm text-gray-600">
                네트워크 분석 결과를 바탕으로 한 개선 방안을 제시합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 친구관계 발전 */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="mb-3 font-medium text-blue-900">
                    친구관계 발전
                  </h4>
                  <ul className="list-inside list-disc space-y-2 text-sm text-blue-800">
                    {generateImprovementRecommendations(
                      analysisResults,
                    ).friendshipDevelopment.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>

                {/* 커뮤니티 통합 */}
                <div className="rounded-lg bg-green-50 p-4">
                  <h4 className="mb-3 font-medium text-green-900">
                    커뮤니티 통합
                  </h4>
                  <ul className="list-inside list-disc space-y-2 text-sm text-green-800">
                    {generateImprovementRecommendations(
                      analysisResults,
                    ).communityIntegration.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 우선순위 표시 */}
              {generateImprovementRecommendations(analysisResults).priority ===
                "high" && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-red-600">⚠️</span>
                    <span className="font-medium text-red-800">
                      높은 우선순위
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-red-700">
                    네트워크 분석 결과에 따라 즉시 개선 조치가 필요한
                    상황입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 개별 관계 분석 뷰 */}
      {analysisView === "individual" && analysisResults && (
        <div className="space-y-6">
          {/* 분석 요약 */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                개별 관계 분석 요약
              </h3>
              <p className="text-sm text-gray-600">
                전체 학생의 네트워크 관계를 종합적으로 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality >= 0.6)
                        .length
                    }
                  </div>
                  <div className="text-sm text-blue-600">높은 중심성</div>
                  <div className="text-xs text-blue-500">(60% 이상)</div>
                </div>
                <div className="rounded-lg bg-green-50 p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {
                      analysisResults.nodes.filter(
                        (n) => n.centrality >= 0.3 && n.centrality < 0.6,
                      ).length
                    }
                  </div>
                  <div className="text-sm text-green-600">보통 중심성</div>
                  <div className="text-xs text-green-500">(30-60%)</div>
                </div>
                <div className="rounded-lg bg-yellow-50 p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {
                      analysisResults.nodes.filter((n) => n.centrality < 0.3)
                        .length
                    }
                  </div>
                  <div className="text-sm text-yellow-600">낮은 중심성</div>
                  <div className="text-xs text-yellow-500">(30% 미만)</div>
                </div>
                <div className="rounded-lg bg-purple-50 p-4 text-center">
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
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
                        (a, b) => b.centrality - a.centrality,
                      ),
                    })
                  }
                  className="rounded-md bg-blue-100 px-3 py-1 text-xs text-blue-800 hover:bg-blue-200"
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
                          (connectionCounts.get(a.id) || 0),
                      ),
                    })
                  }
                  className="rounded-md bg-green-100 px-3 py-1 text-xs text-green-800 hover:bg-green-200"
                >
                  연결 수 많은 순
                </button>
                <button
                  onClick={() =>
                    setAnalysisResults({
                      ...analysisResults,
                      nodes: [...analysisResults.nodes].sort(
                        (a, b) => a.community - b.community,
                      ),
                    })
                  }
                  className="rounded-md bg-purple-100 px-3 py-1 text-xs text-purple-800 hover:bg-purple-200"
                >
                  커뮤니티 순
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {analysisResults.nodes.map((node) => {
                  const student = students.find((s) => s.id === node.id);
                  if (!student) return null;

                  const connections = connectionCounts.get(node.id) || 0;
                  const friendshipType = getFriendshipType(node.centrality);

                  return (
                    <div
                      key={node.id}
                      className="cursor-pointer rounded-lg border border-gray-200 p-3 transition-shadow hover:shadow-md"
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
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="truncate text-sm font-medium text-gray-900">
                          {student.name}
                        </h4>
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티별 분석
              </h3>
              <p className="text-sm text-gray-600">
                각 커뮤니티의 특성과 구성원을 분석합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analysisResults.communities.map((community) => {
                  const communityStudents = analysisResults.nodes.filter(
                    (n) => n.community === community.id,
                  );
                  const avgCentrality =
                    communityStudents.reduce(
                      (sum, n) => sum + n.centrality,
                      0,
                    ) / communityStudents.length;

                  return (
                    <div
                      key={community.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          커뮤니티 {community.id + 1}
                        </h4>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
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

                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <div className="mb-2 text-xs text-gray-500">
                          주요 구성원:
                        </div>
                        <div className="text-xs text-gray-600">
                          {communityStudents
                            .sort((a, b) => b.centrality - a.centrality)
                            .slice(0, 3)
                            .map((node) => {
                              const student = students.find(
                                (s) => s.id === node.id,
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    현재 교우관계 네트워크
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    학생들 간의 친구 관계를 시각화하여 네트워크 구조를
                    분석합니다
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">총 학생 수</div>
                  <div className="text-lg font-semibold text-[#3F80EA]">
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
              {/* 네트워크 시각화 */}
              <div className="rounded-lg border bg-white p-4">
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
                  width={900}
                  height={550}
                  onNodeClick={(node) => {
                    console.log("🔍 노드 클릭:", node);
                    const student = students.find((s) => s.id === node.id);
                    if (student) {
                      toast.success(`${student.name} 선택됨`);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* 시각화 통계 */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">시각화 통계</h3>
              <p className="text-sm text-gray-600">
                네트워크 시각화의 주요 통계 정보입니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#3F80EA]">
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
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-900">
                커뮤니티 시각화
              </h3>
              <p className="text-sm text-gray-600">
                각 커뮤니티의 구성과 특성을 시각적으로 표현합니다.
              </p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analysisResults.communities.map((community) => {
                  const communityStudents = analysisResults.nodes.filter(
                    (n) => n.community === community.id,
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
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          커뮤니티 {community.id + 1}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${colors[community.id % colors.length]} ${textColors[community.id % textColors.length]}`}
                        >
                          {community.size}명
                        </span>
                      </div>

                      <div className="space-y-2">
                        {communityStudents.slice(0, 5).map((node) => {
                          const student = students.find(
                            (s) => s.id === node.id,
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
                          <div className="text-center text-xs text-gray-500">
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
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <span className="text-red-800">분석 오류: {analysisError}</span>
          </div>
        </div>
      )}

      {/* 분석 전 안내 */}
      {/* {!analysisResults && !analysisError && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <ChartBarIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-blue-900">
            네트워크 분석 준비 완료
          </h3>
          <p className="text-blue-700">
            위에서 설문을 선택하고 "네트워크 분석 실행" 버튼을 클릭하여 교우관계
            분석을 시작하세요.
          </p>
        </div>
      )} */}

      {/* 개별 학생 네트워크 모달 */}
      {selectedStudentModal.isOpen &&
        selectedStudentModal.student &&
        selectedStudentModal.node &&
        analysisResults && (
          <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
            <div className="relative top-20 mx-auto w-11/12 max-w-6xl rounded-md border bg-white p-5 shadow-lg">
              <div className="mt-3">
                {/* 모달 헤더 */}
                <div className="mb-6 flex items-center justify-between">
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
                    className="text-gray-400 transition-colors hover:text-gray-600"
                  >
                    <svg
                      className="h-6 w-6"
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
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="text-sm font-medium text-blue-600">
                      중심성 점수
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {(selectedStudentModal.node.centrality * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4">
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
                  <div className="rounded-lg bg-purple-50 p-4">
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
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    연결 관계 네트워크
                  </h4>
                  <div className="rounded-lg border bg-gray-50 p-4">
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
                                node.centrality,
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
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    직접 연결된 친구들
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {(() => {
                      const selectedStudentId =
                        selectedStudentModal.student!.id;

                      // 실제 설문 응답에서 선택한 친구들만 필터링
                      const actualConnections = analysisResults.edges
                        .filter((edge) => edge.source === selectedStudentId)
                        .map((edge) => edge.target);

                      // 실제 연결된 학생들만 표시
                      const connectedStudents = analysisResults.nodes.filter(
                        (node) => actualConnections.includes(node.id),
                      );

                      return connectedStudents.map((node, index) => {
                        const student = students.find((s) => s.id === node.id);
                        if (!student) return null;

                        return (
                          <div
                            key={index}
                            className="rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <div className="mb-2 flex items-center justify-between">
                              <h5 className="font-medium text-gray-900">
                                {student.name}
                              </h5>
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                                친구
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
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
                        <div className="py-8 text-center text-gray-500">
                          <div className="mb-2 text-lg font-medium">
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
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    네트워크 메트릭
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-gray-50 p-4">
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
                    <div className="rounded-lg bg-gray-50 p-4">
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
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    개인별 요약
                  </h4>

                  {/* 1. 현재 상태 */}
                  <div className="mb-4">
                    <h5 className="mb-2 font-medium text-gray-900">
                      1. 현재 상태
                    </h5>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                        <li>
                          네트워크 중심성:{" "}
                          {(selectedStudentModal.node.centrality * 100).toFixed(
                            1,
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
                                (edge) => edge.source === selectedStudentId,
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
                    <h5 className="mb-2 font-medium text-gray-900">
                      2. 네트워크 안정성
                    </h5>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                        <li>
                          연결 밀도:{" "}
                          {(() => {
                            const selectedStudentId =
                              selectedStudentModal.student!.id;
                            const actualConnections = analysisResults.edges
                              .filter(
                                (edge) => edge.source === selectedStudentId,
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
                    <h5 className="mb-2 font-medium text-gray-900">
                      3. 개선방안
                    </h5>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
                        {generateIndividualRecommendations(
                          selectedStudentModal.node,
                          analysisResults,
                        ).map((recommendation, index) => (
                          <li key={index}>{recommendation}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 4. 그룹 소속 요약 */}
                  <div>
                    <h5 className="mb-2 font-medium text-gray-900">
                      4. 그룹 소속 요약
                    </h5>
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium text-blue-800">
                          커뮤니티{" "}
                          {selectedStudentModal.node?.community !== undefined
                            ? selectedStudentModal.node.community + 1
                            : 0}
                          번 그룹
                        </span>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                          {analysisResults.communities.find(
                            (c) =>
                              c.id ===
                              (selectedStudentModal.node?.community || 0),
                          )?.size || 0}
                          명
                        </span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <p>
                          • 그룹 내부 밀도:{" "}
                          {(analysisResults.communities.find(
                            (c) =>
                              c.id === selectedStudentModal.node?.community,
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
                  <h4 className="mb-4 text-lg font-medium text-gray-900">
                    개선 권장사항
                  </h4>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <div className="text-sm text-yellow-800">
                      {(() => {
                        const centrality = selectedStudentModal.node.centrality;
                        const connections = analysisResults.edges.filter(
                          (e) =>
                            e.source === selectedStudentModal.student!.id ||
                            e.target === selectedStudentModal.student!.id,
                        ).length;
                        const totalStudents = analysisResults.nodes.length;
                        const connectionRatio =
                          connections / (totalStudents - 1);

                        if (centrality < 0.3) {
                          return (
                            <div>
                              <p className="mb-2 font-medium">
                                ⚠️ 주의가 필요한 학생
                              </p>
                              <ul className="list-inside list-disc space-y-1">
                                <li>친구 관계를 더 발전시킬 필요가 있습니다</li>
                                <li>그룹 활동 참여를 권장합니다</li>
                                <li>담임교사와의 상담이 필요할 수 있습니다</li>
                                {connectionRatio < 0.2 && (
                                  <li>
                                    연결 수가 매우 적어 즉시 개선 조치가
                                    필요합니다
                                  </li>
                                )}
                              </ul>
                            </div>
                          );
                        } else if (centrality < 0.6) {
                          return (
                            <div>
                              <p className="mb-2 font-medium">
                                📈 개선 여지가 있는 학생
                              </p>
                              <ul className="list-inside list-disc space-y-1">
                                <li>현재 친구 관계는 양호합니다</li>
                                <li>더 다양한 친구들과의 교류를 권장합니다</li>
                                <li>리더십 역할을 맡아볼 수 있습니다</li>
                                {connectionRatio < 0.5 && (
                                  <li>
                                    연결 수를 늘려 네트워크를 확장할 수 있습니다
                                  </li>
                                )}
                              </ul>
                            </div>
                          );
                        } else {
                          return (
                            <div>
                              <p className="mb-2 font-medium">
                                🌟 우수한 네트워크를 가진 학생
                              </p>
                              <ul className="list-inside list-disc space-y-1">
                                <li>매우 좋은 친구 관계를 유지하고 있습니다</li>
                                <li>다른 학생들의 롤모델이 될 수 있습니다</li>
                                <li>
                                  새로운 학생들과의 친교를 도울 수 있습니다
                                </li>
                                {connectionRatio > 0.7 && (
                                  <li>
                                    네트워크 영향력을 활용하여 다른 학생들을
                                    도울 수 있습니다
                                  </li>
                                )}
                              </ul>
                            </div>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* 교우관계 그래프 뷰 */}
      {analysisView === "graph" && unifiedGraphData.length > 0 && (
        <div className="space-y-6">
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    교우관계 네트워크 그래프
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    학생들의 친구 관계를 인터랙티브 그래프로 시각화합니다
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">총 학생 수</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {unifiedGraphData.length}명
                  </div>
                  <div className="text-sm text-gray-500">평균 친구 수</div>
                  <div className="text-lg font-semibold text-green-600">
                    {unifiedGraphData.length > 0
                      ? (
                          unifiedGraphData.reduce(
                            (sum, s) => sum + s.friendCount,
                            0,
                          ) / unifiedGraphData.length
                        ).toFixed(1)
                      : "0"}
                    명
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <NetworkGraph
                students={unifiedGraphData}
                maxSelections={
                  unifiedMaxSelections.length > 0
                    ? Math.max(...unifiedMaxSelections)
                    : 5
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* 그래프 뷰에서 데이터가 없는 경우 */}
      {analysisView === "graph" && unifiedGraphData.length === 0 && (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <UserGroupIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900">
            교우관계 데이터가 없습니다
          </h3>
          <p className="text-gray-500">네트워크 분석을 먼저 실행해주세요.</p>
        </div>
      )}
    </div>
  );
};

export default NetworkAnalysis;
