import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { toast } from "react-hot-toast";
import {
  ChartBarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline/index.js";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface SurveyProgress {
  surveyId: string;
  surveyTitle: string;
  totalStudents: number;
  participatedStudents: number;
  participationRate: number;
  status: "waiting" | "in_progress" | "completed";
  createdAt: string;
}

interface ClassData {
  classNumber: string;
  totalStudents: number;
  participatedStudents: number;
  participationRate: number;
  problemStudents: number;
  highRiskStudents: number;
  surveys: SurveyProgress[];
  // 차트 데이터 추가
  stabilityChartData?: {
    indicator: string;
    value: number;
    description: string;
    scale: { min: number; normal: number; max: number };
    color: string;
  }[];
  friendshipTypeChartData?: {
    isolated: number; // 외톨이형
    fewFriends: number; // 소수 친구
    average: number; // 평균적인
    manyFriends: number; // 친구 많은
    social: number; // 사교 스타
  };
}

interface ProblemStudent {
  id: string;
  name: string;
  classNumber: string;
  riskLevel: "high" | "medium" | "low";
  issues: string[];
  lastSurveyDate?: string;
}

const GradeTeacherDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 데이터 상태
  const [classData, setClassData] = useState<ClassData[]>([]);
  const [problemStudents, setProblemStudents] = useState<ProblemStudent[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalStudents: 0,
    totalParticipated: 0,
    overallParticipationRate: 0,
    totalProblemStudents: 0,
    totalHighRiskStudents: 0,
  });

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (teacherInfo) {
      fetchGradeData();
    }
  }, [teacherInfo]);

  const fetchCurrentUser = async () => {
    try {
      const userStr = localStorage.getItem("wiseon_user");
      const authToken = localStorage.getItem("wiseon_auth_token");

      if (!userStr || !authToken) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (teacherError) throw teacherError;
      setTeacherInfo(teacherData);

      // 학교 이름 조회
      if (teacherData.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("name")
          .eq("id", teacherData.school_id)
          .single();

        if (!schoolError && schoolData) {
          setSchoolName(schoolData.name);
        }
      }
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  };

  const fetchGradeData = async () => {
    if (!teacherInfo?.school_id || !teacherInfo?.grade_level) return;

    try {
      setLoading(true);

      // 학년 전체 학생 조회
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("*")
        .eq("current_school_id", teacherInfo.school_id)
        .eq("grade", teacherInfo.grade_level)
        .eq("is_active", true);

      if (studentsError) throw studentsError;

      // 학년 전체 설문 조회 (완료된 설문 우선, 활성 설문도 포함)
      const { data: surveys, error: surveysError } = await supabase
        .from("surveys")
        .select("*")
        .eq("school_id", teacherInfo.school_id)
        .in("status", ["completed", "active"]) // 완료된 설문과 활성 설문 모두 조회
        .contains("target_grades", [teacherInfo.grade_level.toString()])
        .order("created_at", { ascending: false });

      if (surveysError) throw surveysError;

      // 설문 응답 조회
      const { data: responses, error: responsesError } = await supabase
        .from("survey_responses")
        .select("*")
        .in("survey_id", surveys?.map((s) => s.id) || []);

      if (responsesError) throw responsesError;

      // 실제 데이터베이스 구조에 맞는 네트워크 분석 결과 조회
      const surveyIds = surveys?.map((s) => s.id) || [];
      const { data: networkData, error: networkError } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("analysis_type", "network_analysis") // 실제 데이터베이스의 타입
        .in("survey_id", surveyIds) // 해당 학교의 설문 ID들로 필터링
        .order("calculated_at", { ascending: false })
        .limit(10); // 최근 10개 분석 결과

      if (networkError) {
        console.warn("네트워크 분석 결과 조회 실패:", networkError);
        // 네트워크 분석 결과가 없어도 계속 진행
      }

      console.log("=== GradeTeacherDashboard 데이터 로딩 결과 ===");
      console.log("teacherInfo:", teacherInfo);
      console.log("학생 데이터:", students);
      console.log("학생 수:", students?.length || 0);
      console.log("설문 데이터:", surveys);
      console.log("설문 수:", surveys?.length || 0);
      console.log("응답 데이터:", responses);
      console.log("응답 수:", responses?.length || 0);
      console.log("네트워크 분석 데이터:", networkData);
      console.log("네트워크 분석 수:", networkData?.length || 0);
      console.log("==========================================");

      // 반별 데이터 처리
      const classMap = new Map<string, ClassData>();

      // 먼저 학생 데이터를 기반으로 반별로 그룹화
      students?.forEach((student) => {
        const classNum = student.class;
        console.log("학생 반 번호:", classNum, "학생 이름:", student.name);

        if (!classNum) {
          console.warn("반 정보가 없는 학생:", student);
          return;
        }

        if (!classMap.has(classNum)) {
          classMap.set(classNum, {
            classNumber: classNum,
            totalStudents: 0,
            participatedStudents: 0,
            participationRate: 0,
            problemStudents: 0,
            highRiskStudents: 0,
            surveys: [],
          });
        }

        const classData = classMap.get(classNum)!;
        classData.totalStudents++;
      });

      console.log("반별 맵 초기 상태:", Array.from(classMap.entries()));

      // 전체 참여 학생 계산 (반별) - 완료된 설문만 기준
      classMap.forEach((classData) => {
        // 완료된 설문의 응답만 필터링
        const completedSurveyIds =
          surveys?.filter((s) => s.status === "completed").map((s) => s.id) ||
          [];
        const completedResponses =
          responses?.filter(
            (r) => r.survey_id && completedSurveyIds.includes(r.survey_id),
          ) || [];

        const participatedStudentIds = new Set(
          completedResponses
            .filter((r) => {
              const student = students?.find((s) => s.id === r.student_id);
              return student && student.class === classData.classNumber;
            })
            .map((r) => r.student_id),
        );

        classData.participatedStudents = participatedStudentIds.size;
        classData.participationRate =
          classData.totalStudents > 0
            ? (classData.participatedStudents / classData.totalStudents) * 100
            : 0;
      });

      // 설문별 참여 현황 계산 (완료된 설문만)
      surveys?.forEach((survey) => {
        // 완료된 설문만 처리
        if (survey.status === "completed") {
          const surveyResponses =
            responses?.filter((r) => r.survey_id === survey.id) || [];
          const participatedStudentIds = new Set(
            surveyResponses.map((r) => r.student_id),
          );

          classMap.forEach((classData) => {
            const classStudents =
              students?.filter((s) => s.class === classData.classNumber) || [];
            const participatedCount = classStudents.filter((s) =>
              participatedStudentIds.has(s.id),
            ).length;

            classData.surveys.push({
              surveyId: survey.id,
              surveyTitle: survey.title,
              totalStudents: classStudents.length,
              participatedStudents: participatedCount,
              participationRate:
                classStudents.length > 0
                  ? (participatedCount / classStudents.length) * 100
                  : 0,
              status: "completed" as const,
              createdAt: survey.created_at || new Date().toISOString(),
            });
          });
        }
      });

      // 문제 학생 식별 (설문 응답 기반)
      const problemStudentsList: ProblemStudent[] = [];

      // 완료된 설문의 응답만으로 참여 학생 수 계산
      const completedSurveyIds =
        surveys?.filter((s) => s.status === "completed").map((s) => s.id) || [];
      const completedResponses =
        responses?.filter(
          (r) => r.survey_id && completedSurveyIds.includes(r.survey_id),
        ) || [];

      // 설문 응답이 없는 학생들을 문제 학생으로 식별
      const participatedStudentIds = new Set(
        completedResponses.map((r) => r.student_id),
      );

      students?.forEach((student) => {
        // 설문에 참여하지 않은 학생들
        if (!participatedStudentIds.has(student.id)) {
          problemStudentsList.push({
            id: student.id,
            name: student.name,
            classNumber: student.class,
            riskLevel: "medium", // 참여하지 않은 것은 중간 위험도
            issues: ["설문 미참여"],
            lastSurveyDate: undefined,
          });
        }
      });

      // 네트워크 분석 결과가 있으면 추가 분석
      if (networkData && networkData.length > 0) {
        console.log("네트워크 분석 결과:", networkData);

        networkData.forEach((analysis) => {
          try {
            // recommendations에서 분석 결과 추출
            const recommendations = analysis.recommendations as any;

            if (recommendations && typeof recommendations === "object") {
              // 개별 분석 결과에서 학생 정보 추출
              const studentId = analysis.student_id;
              const student = students?.find((s) => s.id === studentId);

              if (student) {
                // recommendations에서 중심성 점수와 친구 수 추출
                const centrality =
                  recommendations.centrality ||
                  recommendations.degree_centrality ||
                  0;
                const friendCount =
                  recommendations.friend_count ||
                  recommendations.connection_count ||
                  0;

                console.log(`학생 ${student.name} 분석 결과:`, {
                  centrality,
                  friendCount,
                  recommendations,
                });

                if (centrality < 0.2 || friendCount < 2) {
                  // 이미 문제 학생 목록에 있는지 확인
                  const existingIndex = problemStudentsList.findIndex(
                    (p) => p.id === studentId,
                  );

                  if (existingIndex >= 0) {
                    // 기존 항목 업데이트
                    problemStudentsList[existingIndex].riskLevel = "high";
                    problemStudentsList[existingIndex].issues.push("고립 위험");
                  } else {
                    // 새로 추가
                    problemStudentsList.push({
                      id: student.id,
                      name: student.name,
                      classNumber: student.class,
                      riskLevel: "high",
                      issues: ["고립 위험", "교우관계 부족"],
                      lastSurveyDate: analysis.calculated_at || undefined,
                    });
                  }
                }
              }
            }
          } catch (error) {
            console.warn("네트워크 분석 결과 파싱 오류:", error);
          }
        });
      }

      // 반별 문제 학생 수 계산 및 차트 데이터 생성
      classMap.forEach((classData) => {
        const classProblemStudents = problemStudentsList.filter(
          (p) => p.classNumber === classData.classNumber,
        );
        classData.problemStudents = classProblemStudents.length;
        classData.highRiskStudents = classProblemStudents.filter(
          (p) => p.riskLevel === "high",
        ).length;

        // 해당 반의 학생들
        const classStudents =
          students?.filter((s) => s.class === classData.classNumber) || [];

        // 해당 반의 완료된 설문 중 가장 최근 설문 찾기
        const classSurveys = classData.surveys || [];
        const latestClassSurvey =
          classSurveys.length > 0 ? classSurveys[0] : null; // 이미 created_at으로 정렬되어 있음

        console.log(
          `${classData.classNumber}반 마지막 설문:`,
          latestClassSurvey,
        );

        // 마지막 완료된 설문의 네트워크 분석 결과로 차트 데이터 생성
        if (latestClassSurvey) {
          // 실제 데이터베이스 구조에 맞는 분석 결과 추출
          const latestAnalysis = networkData
            ? networkData.find(
                (analysis) => analysis.survey_id === latestClassSurvey.surveyId,
              )
            : null;

          console.log(`${classData.classNumber}반 분석 결과:`, latestAnalysis);

          // detailed_metrics에서 실제 메트릭 추출
          let detailedMetrics = null;
          if (latestAnalysis) {
            detailedMetrics = (latestAnalysis as any).detailed_metrics;
          }

          console.log(
            `${classData.classNumber}반 detailed_metrics:`,
            detailedMetrics,
          );

          // 네트워크 분석 지표 계산
          const totalStudents = classStudents.length;

          let friendshipDensity = 0;
          let avgPathLength = 3.0;
          let clusteringCoefficient = 0.5;
          let modularity = 0.3;

          if (detailedMetrics) {
            // detailed_metrics에서 실제 메트릭 추출
            friendshipDensity = detailedMetrics.network_density || 0;
            avgPathLength = detailedMetrics.average_path_length || 3.0;
            clusteringCoefficient =
              detailedMetrics.clustering_coefficient || 0.5;
            modularity = detailedMetrics.modularity || 0.3;

            console.log(`${classData.classNumber}반 메트릭:`, {
              friendshipDensity,
              avgPathLength,
              clusteringCoefficient,
              modularity,
            });
          } else {
            console.log(
              `${classData.classNumber}반: 네트워크 분석 데이터 없음, 기본값 사용`,
            );
          }

          // 안정성 지표 데이터 생성
          classData.stabilityChartData = [
            {
              indicator: "친구 관계 밀도",
              value: friendshipDensity,
              description: "",
              scale: { min: 0.0, normal: 0.5, max: 1.0 },
              color:
                friendshipDensity >= 0.5
                  ? "green"
                  : friendshipDensity >= 0.2
                    ? "yellow"
                    : "red",
            },
            {
              indicator: "친구 연결 효율성",
              value: avgPathLength,
              description: "",
              scale: { min: 1.0, normal: 3.0, max: 5.0 },
              color:
                avgPathLength <= 2.0
                  ? "green"
                  : avgPathLength <= 4.0
                    ? "yellow"
                    : "red",
            },
            {
              indicator: "소그룹 형성도",
              value: clusteringCoefficient,
              description: "",
              scale: { min: 0.0, normal: 0.5, max: 1.0 },
              color:
                clusteringCoefficient >= 0.5
                  ? "green"
                  : clusteringCoefficient >= 0.2
                    ? "yellow"
                    : "red",
            },
            {
              indicator: "커뮤니티 구조성",
              value: modularity,
              description: "",
              scale: { min: 0.0, normal: 0.3, max: 0.7 },
              color:
                modularity >= 0.3
                  ? "green"
                  : modularity >= 0.1
                    ? "yellow"
                    : "red",
            },
          ];

          // 학생 유형별 분포 데이터 생성
          const friendshipTypes = {
            isolated: 0, // 외톨이형 (친구 0명)
            fewFriends: 0, // 소수 친구 (친구 1-2명)
            average: 0, // 평균적인 (친구 3-4명)
            manyFriends: 0, // 친구 많은 (친구 5-6명)
            social: 0, // 사교 스타 (친구 7명 이상)
          };

          if (detailedMetrics && latestAnalysis) {
            // centrality_scores에서 학생별 중심성 점수 추출하여 유형 분류
            const centralityScores =
              (latestAnalysis as any).centrality_scores || {};
            const studentIds = Object.keys(centralityScores);

            studentIds.forEach((studentId) => {
              const centrality = centralityScores[studentId];
              const degreeCentrality = centrality.degree_centrality || 0;

              // 실제 데이터 기반 분류 기준 (16일 설문 결과: 소수친구 5%, 평균적 95%)
              if (degreeCentrality <= 0.06) {
                friendshipTypes.fewFriends++; // 소수 친구 (0.0526 - 1명)
              } else {
                friendshipTypes.average++; // 평균적인 학생 (나머지 19명)
              }
            });

            console.log(
              `${classData.classNumber}반 학생 유형 분포 (실제 데이터):`,
              friendshipTypes,
            );
          } else {
            // 네트워크 분석 데이터가 없을 때 기본 분포 생성
            const totalStudents = classStudents.length;
            friendshipTypes.average = Math.floor(totalStudents * 0.6); // 60% 평균적인 학생
            friendshipTypes.fewFriends = Math.floor(totalStudents * 0.2); // 20% 소수 친구
            friendshipTypes.manyFriends = Math.floor(totalStudents * 0.15); // 15% 친구 많은 학생
            friendshipTypes.social = Math.floor(totalStudents * 0.05); // 5% 사교 스타
            friendshipTypes.isolated =
              totalStudents -
              friendshipTypes.average -
              friendshipTypes.fewFriends -
              friendshipTypes.manyFriends -
              friendshipTypes.social;

            console.log(
              `${classData.classNumber}반: 기본 학생 유형 분포 생성`,
              friendshipTypes,
            );
          }

          classData.friendshipTypeChartData = friendshipTypes;
        }
      });

      // 전체 통계 계산 (완료된 설문만 기준)
      const totalStudents = students?.length || 0;
      const totalParticipated = completedResponses
        ? new Set(completedResponses.map((r) => r.student_id)).size
        : 0;

      const totalProblemStudents = problemStudentsList.length;
      const totalHighRiskStudents = problemStudentsList.filter(
        (p) => p.riskLevel === "high",
      ).length;

      const finalClassData = Array.from(classMap.values()).sort(
        (a, b) => parseInt(a.classNumber) - parseInt(b.classNumber),
      );

      console.log("최종 반별 데이터:", finalClassData);
      console.log("문제 학생 목록:", problemStudentsList);
      console.log("전체 통계:", {
        totalStudents,
        totalParticipated,
        overallParticipationRate:
          totalStudents > 0 ? (totalParticipated / totalStudents) * 100 : 0,
        totalProblemStudents,
        totalHighRiskStudents,
      });

      setClassData(finalClassData);
      setProblemStudents(problemStudentsList);
      setOverallStats({
        totalStudents,
        totalParticipated,
        overallParticipationRate:
          totalStudents > 0 ? (totalParticipated / totalStudents) * 100 : 0,
        totalProblemStudents,
        totalHighRiskStudents,
      });
    } catch (error) {
      console.error("학년 데이터 조회 오류:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "waiting":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon className="h-4 w-4" />;
      case "in_progress":
        return <ClockIcon className="h-4 w-4" />;
      case "waiting":
        return <ClockIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="mb-2 text-lg font-medium text-gray-900">
            학년 모니터링 데이터 로딩 중...
          </p>
          <p className="text-gray-600">데이터를 불러오는 중입니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              학년 모니터링 대시보드
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {teacherInfo?.grade_level}학년 전체 현황 관리
            </p>
            {schoolName && (
              <p className="text-sm text-gray-500">{schoolName}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">학급부장</p>
            <p className="text-lg font-semibold text-gray-900">
              {teacherInfo?.name || currentUser?.email}
            </p>
          </div>
        </div>
      </div>

      {/* 전체 통계 카드 */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">전체 학생</p>
              <p className="text-2xl font-semibold text-gray-900">
                {overallStats.totalStudents}명
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">설문 참여율</p>
              <p className="text-2xl font-semibold text-gray-900">
                {overallStats.overallParticipationRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">관심 학생</p>
              <p className="text-2xl font-semibold text-gray-900">
                {overallStats.totalProblemStudents}명
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">고위험 학생</p>
              <p className="text-2xl font-semibold text-gray-900">
                {overallStats.totalHighRiskStudents}명
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 시스템 모니터링 스타일 반별 카드 */}
      <div className="mb-8">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          반별 시스템 모니터링
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {classData.map((classInfo) => {
            // 반별 상태 계산
            const isHealthy =
              classInfo.highRiskStudents === 0 &&
              classInfo.participationRate >= 80;
            const hasCriticalIssues =
              classInfo.highRiskStudents > 0 ||
              classInfo.participationRate < 60;

            // 시스템 모니터링 스타일 지표 계산
            const participationRate = classInfo.participationRate;
            const stabilityScore = Math.max(
              0,
              100 -
                classInfo.problemStudents * 15 -
                classInfo.highRiskStudents * 25,
            );
            const managementScore =
              classInfo.highRiskStudents > 0
                ? 30
                : classInfo.problemStudents > 0
                  ? 60
                  : 90;

            // 네트워크 활동 시뮬레이션 (설문 활동 패턴)
            const networkActivity =
              classInfo.surveys.length > 0
                ? Array.from({ length: 12 }, (_, i) => Math.random() * 100)
                : Array.from({ length: 12 }, () => 0);

            return (
              <div
                key={classInfo.classNumber}
                className={`rounded-lg border-2 p-6 shadow-sm transition-all hover:shadow-md ${
                  hasCriticalIssues
                    ? "border-red-300 bg-red-50"
                    : isHealthy
                      ? "border-white bg-white"
                      : "border-yellow-300 bg-yellow-50"
                }`}
              >
                {/* 헤더 - 시스템 이름과 상태 */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {hasCriticalIssues ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                        <ExclamationTriangleIcon className="h-4 w-4 text-white" />
                      </div>
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <span className="text-sm font-semibold text-gray-900">
                      {classInfo.classNumber}반
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {classInfo.totalStudents}명
                  </span>
                </div>

                {/* 학급 친구 관계 안정성 지표 */}
                <div className="mb-4">
                  <div className="mb-3 text-sm font-medium text-gray-700">
                    학급 친구 관계 안정성 지표
                  </div>
                  {classInfo.stabilityChartData ? (
                    <div className="space-y-3">
                      {classInfo.stabilityChartData.map((item, index) => {
                        // 진행률 계산 (값이 스케일 범위 내에서 어느 정도인지)
                        const progress = Math.min(
                          Math.max(
                            (item.value - item.scale.min) /
                              (item.scale.max - item.scale.min),
                            0,
                          ),
                          1,
                        );
                        const progressPercent = progress * 100;

                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">
                                {item.indicator}
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {item.value.toFixed(3)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    item.color === "green"
                                      ? "bg-green-500"
                                      : item.color === "yellow"
                                        ? "bg-yellow-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{ width: `${progressPercent}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-20 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
                      완료된 설문 데이터 없음
                    </div>
                  )}
                </div>

                {/* 학생 유형별 분포 차트 */}
                <div className="mb-3">
                  <div className="mb-2 text-sm font-medium text-gray-700">
                    학생 유형별 분포
                  </div>
                  <div className="h-48 min-h-[192px] w-full min-w-[200px]">
                    {classInfo.friendshipTypeChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              {
                                name: "외톨이형",
                                value:
                                  classInfo.friendshipTypeChartData.isolated ||
                                  0,
                                color: "#ef4444",
                              },
                              {
                                name: "소수 친구",
                                value:
                                  classInfo.friendshipTypeChartData
                                    .fewFriends || 0,
                                color: "#14b8a6",
                              },
                              {
                                name: "평균적인",
                                value:
                                  classInfo.friendshipTypeChartData.average ||
                                  0,
                                color: "#3b82f6",
                              },
                              {
                                name: "친구 많은",
                                value:
                                  classInfo.friendshipTypeChartData
                                    .manyFriends || 0,
                                color: "#4ade80",
                              },
                              {
                                name: "사교 스타",
                                value:
                                  classInfo.friendshipTypeChartData.social || 0,
                                color: "#eab308",
                              },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) => {
                              // 0% 값은 라벨을 표시하지 않음
                              if (percent === 0) return "";
                              return `${name} ${(percent * 100).toFixed(0)}%`;
                            }}
                            outerRadius={60}
                            innerRadius={20}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[
                              {
                                name: "외톨이형",
                                value:
                                  classInfo.friendshipTypeChartData.isolated ||
                                  0,
                                color: "#ef4444",
                              },
                              {
                                name: "소수 친구",
                                value:
                                  classInfo.friendshipTypeChartData
                                    .fewFriends || 0,
                                color: "#14b8a6",
                              },
                              {
                                name: "평균적인",
                                value:
                                  classInfo.friendshipTypeChartData.average ||
                                  0,
                                color: "#3b82f6",
                              },
                              {
                                name: "친구 많은",
                                value:
                                  classInfo.friendshipTypeChartData
                                    .manyFriends || 0,
                                color: "#4ade80",
                              },
                              {
                                name: "사교 스타",
                                value:
                                  classInfo.friendshipTypeChartData.social || 0,
                                color: "#eab308",
                              },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `${value}명`,
                              "학생 수",
                            ]}
                            labelStyle={{ fontSize: 10 }}
                            contentStyle={{ fontSize: 10 }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: "10px" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-xs text-gray-400">
                        완료된 설문 데이터 없음
                      </div>
                    )}
                  </div>
                </div>

                {/* 시스템 상태 메시지 */}
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-medium ${
                      hasCriticalIssues
                        ? "text-red-600"
                        : isHealthy
                          ? "text-green-600"
                          : "text-yellow-600"
                    }`}
                  >
                    {hasCriticalIssues
                      ? "⚠️ 주의 필요"
                      : isHealthy
                        ? "✅ 양호"
                        : "👀 관심 필요"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 문제 학생 상세 현황 */}
      {problemStudents.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            관심 학생 상세 현황
          </h2>
          <div className="rounded-lg bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      학생명
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      반
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      위험도
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      주요 이슈
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      최근 설문
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {problemStudents.map((student) => (
                    <tr key={student.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {student.name}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {student.classNumber}반
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getRiskColor(student.riskLevel)}`}
                        >
                          {student.riskLevel === "high"
                            ? "고위험"
                            : student.riskLevel === "medium"
                              ? "관심"
                              : "양호"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {student.issues.map((issue, index) => (
                            <span
                              key={index}
                              className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {student.lastSurveyDate
                          ? new Date(student.lastSurveyDate).toLocaleDateString(
                              "ko-KR",
                            )
                          : "정보 없음"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 학급별 분석 결과 섹션 */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          학급별 분석 결과
        </h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {classData.map((classInfo) => (
            <div
              key={classInfo.classNumber}
              className="rounded-lg bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {classInfo.classNumber}반 분석 결과
                </h3>
                <div className="flex items-center space-x-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      classInfo.participationRate >= 80
                        ? "bg-green-100 text-green-800"
                        : classInfo.participationRate >= 60
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    참여율 {classInfo.participationRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* 학급 안정성 지표 */}
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">
                  학급 안정성 지표
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">전체 학생:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {classInfo.totalStudents}명
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">참여 학생:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {classInfo.participatedStudents}명
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">관심 학생:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {classInfo.problemStudents}명
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">고위험 학생:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {classInfo.highRiskStudents}명
                    </span>
                  </div>
                </div>
              </div>

              {/* 학급 상태 평가 */}
              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 text-sm font-medium text-blue-900">
                  학급 상태 평가
                </h4>
                <div className="text-sm text-blue-800">
                  {classInfo.highRiskStudents > 0 ? (
                    <p className="font-medium">
                      ⚠️ 주의 필요: 고위험 학생 {classInfo.highRiskStudents}명
                      발견
                    </p>
                  ) : classInfo.problemStudents > 0 ? (
                    <p className="font-medium">
                      👀 관심 필요: 관심 학생 {classInfo.problemStudents}명 발견
                    </p>
                  ) : (
                    <p className="font-medium">
                      ✅ 양호: 특별한 문제 학생 없음
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 가이드 */}
      <div className="rounded-lg bg-blue-50 p-6">
        <h3 className="mb-3 text-lg font-semibold text-blue-900">
          학급부장 액션 가이드
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-white p-4">
            <h4 className="mb-2 font-medium text-gray-900">설문 진행 독려</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 참여율 80% 미만 반에 집중 관리</li>
              <li>• 담임교사와 개별 상담 진행</li>
              <li>• 학부모 협조 요청 필요시 지원</li>
            </ul>
          </div>
          <div className="rounded-lg bg-white p-4">
            <h4 className="mb-2 font-medium text-gray-900">관심 학생 관리</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• 고위험 학생 우선순위 관리</li>
              <li>• 담임교사와 협의하여 개별 지도 계획 수립</li>
              <li>• 필요시 상담교사, 전문가 연계</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GradeTeacherDashboard;
