import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
);

interface SurveyData {
  id: string;
  title: string;
  template_id: string | null;
  created_at: string | null;
  status: string;
  survey_templates?: {
    metadata: any;
  };
}

interface ChartData {
  question: string;
  yes_count?: number;
  no_count?: number;
  yes_students?: string[];
  no_students?: string[];
  // 학교 폭력 조사용 속성들
  never_count?: number;
  sometimes_count?: number;
  often_count?: number;
  never_students?: string[];
  sometimes_students?: string[];
  often_students?: string[];
}

const ClassSurvey: React.FC = () => {
  const { user } = useAuth();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [viewMode, setViewMode] = useState<"names" | "graphs">("graphs");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // 현재 선택된 설문 정보
  const currentSurvey = surveys.find((s) => s.id === selectedSurvey);

  // 상태를 한글로 변환하는 함수
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "active":
        return "진행중";
      case "completed":
        return "완료";
      default:
        return status;
    }
  };

  // 상태에 따른 스타일 클래스 반환
  const getStatusStyle = (status: string): string => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "active":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Chart.js 옵션들
  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
        text: "응답 분포",
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: {
          dash: [2, 2],
        },
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return value + "명";
          },
        },
      },
    },
  };

  const doughnutChartOptions = {
    responsive: true,

    plugins: {
      legend: {
        position: "bottom" as const,
      },
      title: {
        display: true,
        text: "응답 비율",
        font: {
          size: 14,
          weight: "bold" as const,
        },
      },
    },
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text:
          currentSurvey?.title && currentSurvey.title.includes("폭력")
            ? "문항별 폭력 경험 빈도 추이"
            : "문항별 응답 추이",
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
    },

    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return value + "명";
          },
        },
      },
    },
  };

  // 차트 데이터 생성 함수들
  const createBarChartData = (data: any, questionText?: string) => {
    // 학교 폭력 조사인지 확인 - 설문 제목과 질문 텍스트 모두 확인
    const isViolenceSurvey =
      (currentSurvey?.title && currentSurvey.title.includes("폭력")) ||
      (questionText &&
        (questionText.includes("폭력") ||
          questionText.includes("괴롭힘") ||
          questionText.includes("싸움") ||
          questionText.includes("욕설") ||
          questionText.includes("협박") ||
          questionText.includes("놀림") ||
          questionText.includes("상해") ||
          questionText.includes("소외") ||
          questionText.includes("따돌림") ||
          questionText.includes("소지품") ||
          questionText.includes("무시")));

    if (isViolenceSurvey && data.never_count !== undefined) {
      // 학교 폭력 조사 3단계 차트
      return {
        labels: ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
        datasets: [
          {
            label: "응답자 수",
            data: [data.never_count, data.sometimes_count, data.often_count],
            backgroundColor: [
              "#93c5fd", // tailwind color: blue-300
              "#3b82f6", // tailwind color: blue-500
              "#094185",
            ],
            borderSkipped: false,
            barThickness: 28,
          },
        ],
      };
    } else {
      // 일반 예/아니오 차트
      return {
        labels: ["예", "아니오"],
        datasets: [
          {
            label: "응답자 수",
            data: [data.yes_count, data.no_count],
            backgroundColor: ["#3b82f6", "#094185"],
            borderSkipped: false,
            barThickness: 28,
          },
        ],
      };
    }
  };

  // const createDoughnutChartData = (data: ChartData) => ({
  //   labels: ["예", "아니오"],
  //   datasets: [
  //     {
  //       data: [data.yes_count, data.no_count],
  //       backgroundColor: ["#094185", "#3b82f6"],
  //       hoverOffset: 4,
  //     },
  //   ],
  // });

  const createLineChartData = () => {
    const labels = chartData.map(
      (_, index) => `문항 ${(index + 1).toString().padStart(2, "0")}`,
    );

    // 현재 선택된 설문이 학교 폭력 조사인지 확인
    const isViolenceSurvey =
      currentSurvey?.title && currentSurvey.title.includes("폭력");
    const isComprehensiveSurvey =
      currentSurvey?.survey_templates?.metadata?.category === "종합조사";

    if (isViolenceSurvey) {
      // 학교 폭력 조사 3단계 추이
      return {
        labels,
        datasets: [
          {
            label: "전혀 없다",
            data: chartData.map((data) => data.never_count || 0),
            borderColor: "#93c5fd",
            backgroundColor: "rgba(147,197,253,0.25)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#93c5fd",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
          {
            label: "한 두번 당한 적 있다",
            data: chartData.map((data) => data.sometimes_count || 0),
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59,130,246,0.20)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#3b82f6",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
          {
            label: "자주 있다",
            data: chartData.map((data) => data.often_count || 0),
            borderColor: "#094185",
            backgroundColor: "rgba(30,58,138,0.25)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "#094185",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
        ],
      };
    } else if (isComprehensiveSurvey) {
      // 종합조사 - 만족도와 학교폭력 분리된 선그래프
      return {
        satisfaction: {
          labels: ["문항 02", "문항 03", "문항 04", "문항 05"],
          datasets: [
            {
              label: "예",
              data: chartData.slice(0, 4).map((data) => data.yes_count || 0),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(147,197,253,0.25)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#3b82f6",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
            },
            {
              label: "아니오",
              data: chartData.slice(0, 4).map((data) => data.no_count || 0),
              borderColor: "#094185",
              backgroundColor: "rgba(30,58,138,0.25)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#094185",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
            },
          ],
        },
        violence: {
          labels: ["문항 06", "문항 07", "문항 08"],
          datasets: [
            {
              label: "전혀 없다",
              data: chartData.slice(4, 7).map((data) => data.never_count || 0),
              borderColor: "#93c5fd",
              backgroundColor: "rgba(147,197,253,0.25)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#93c5fd",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
            },
            {
              label: "한 두번 당한 적 있다",
              data: chartData
                .slice(4, 7)
                .map((data) => data.sometimes_count || 0),
              borderColor: "#3b82f6",
              backgroundColor: "rgba(59,130,246,0.20)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#3b82f6",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
            },
            {
              label: "자주 있다",
              data: chartData.slice(4, 7).map((data) => data.often_count || 0),
              borderColor: "#094185",
              backgroundColor: "rgba(30,58,138,0.25)",
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: "#094185",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
              pointRadius: 6,
            },
          ],
        },
      };
    } else {
      // 일반 예/아니오 추이
      return {
        labels,
        datasets: [
          {
            label: "예 답변",
            data: chartData.map((data) => data.yes_count || 0),
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(59, 130, 246, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
          {
            label: "아니오 답변",
            data: chartData.map((data) => data.no_count || 0),
            borderColor: "rgba(30, 64, 175, 1)",
            backgroundColor: "rgba(30, 64, 175, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: "rgba(30, 64, 175, 1)",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
            pointRadius: 6,
          },
        ],
      };
    }
  };

  // 전체 응답 요약 차트 데이터
  const createSummaryChartData = () => {
    // 현재 선택된 설문이 학교 폭력 조사인지 확인
    const isViolenceSurvey =
      currentSurvey?.title && currentSurvey.title.includes("폭력");
    const isComprehensiveSurvey =
      currentSurvey?.survey_templates?.metadata?.category === "종합조사";

    if (isViolenceSurvey) {
      // 학교 폭력 조사 3단계 요약
      const totalNever = chartData.reduce(
        (sum, data) => sum + (data.never_count || 0),
        0,
      );
      const totalSometimes = chartData.reduce(
        (sum, data) => sum + (data.sometimes_count || 0),
        0,
      );
      const totalOften = chartData.reduce(
        (sum, data) => sum + (data.often_count || 0),
        0,
      );

      return {
        labels: ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
        datasets: [
          {
            data: [totalNever, totalSometimes, totalOften],
            backgroundColor: [
              "#93c5fd", // tailwind color: blue-300
              "#3b82f6", // tailwind color: blue-500
              "#094185",
            ],
            hoverOffset: 4,
          },
        ],
      };
    } else if (isComprehensiveSurvey) {
      // 종합조사 - 만족도와 학교폭력 분리 (1번, 9번 제외)
      // 2~5번 질문 (만족도) - 필터링 후 인덱스 0~3
      const satisfactionData = chartData.slice(0, 4); // 인덱스 0~3 (2~5번 질문)
      const totalSatisfactionYes = satisfactionData.reduce(
        (sum, data) => sum + (data.yes_count || 0),
        0,
      );
      const totalSatisfactionNo = satisfactionData.reduce(
        (sum, data) => sum + (data.no_count || 0),
        0,
      );

      // 6~8번 질문 (학교폭력) - 필터링 후 인덱스 4~6
      const violenceData = chartData.slice(4, 7); // 인덱스 4~6 (6~8번 질문)
      const totalViolenceNever = violenceData.reduce(
        (sum, data) => sum + (data.never_count || 0),
        0,
      );
      const totalViolenceSometimes = violenceData.reduce(
        (sum, data) => sum + (data.sometimes_count || 0),
        0,
      );
      const totalViolenceOften = violenceData.reduce(
        (sum, data) => sum + (data.often_count || 0),
        0,
      );

      return {
        satisfaction: {
          labels: ["예", "아니오"],
          datasets: [
            {
              data: [totalSatisfactionYes, totalSatisfactionNo],
              backgroundColor: [
                "#3b82f6", // tailwind color: blue-500
                "#094185",
              ],
              hoverOffset: 4,
            },
          ],
        },
        violence: {
          labels: ["전혀 없다", "한 두번 당한 적 있다", "자주 있다"],
          datasets: [
            {
              data: [
                totalViolenceNever,
                totalViolenceSometimes,
                totalViolenceOften,
              ],
              backgroundColor: [
                "#93c5fd", // tailwind color: blue-300
                "#3b82f6", // tailwind color: blue-500
                "#094185",
              ],
              hoverOffset: 4,
            },
          ],
        },
      };
    } else {
      // 일반 예/아니오 요약
      const totalYes = chartData.reduce(
        (sum, data) => sum + (data.yes_count || 0),
        0,
      );
      const totalNo = chartData.reduce(
        (sum, data) => sum + (data.no_count || 0),
        0,
      );

      return {
        labels: ["전체 예 답변", "전체 아니오 답변"],
        datasets: [
          {
            data: [totalYes, totalNo],
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)",
              "rgba(239, 68, 68, 0.8)",
            ],
            hoverOffset: 4,
          },
        ],
      };
    }
  };

  useEffect(() => {
    if (user) {
      fetchSurveys();
    }
  }, [user]);

  // 페이지가 포커스될 때마다 설문 목록 새로고침 (삭제된 설문 제거)
  useEffect(() => {
    const handleFocus = () => {
      console.log("페이지 포커스 - 설문 목록 새로고침");
      fetchSurveys();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      fetchChartData();
    }
  }, [selectedSurvey]);

  const fetchSurveys = async () => {
    try {
      console.log("Fetching surveys for user:", user);

      if (!user) {
        console.log("No user found");
        setSurveys([]);
        setLoading(false);
        return;
      }

      // 먼저 설문 템플릿에서 카테고리 정보 확인
      const { data: templates, error: templateError } = await supabase
        .from("survey_templates")
        .select("id, name, metadata")
        .eq("is_active", true);

      if (templateError) {
        console.error("Template error:", templateError);
        throw templateError;
      }

      console.log("Templates found:", templates);

      // 카테고리가 "학교폭력", "만족도", 또는 "종합조사"인 템플릿 ID들 찾기
      const targetTemplateIds = templates
        .filter((template: any) => {
          const metadata = template.metadata;
          console.log("Template metadata:", template.name, metadata);
          return (
            metadata &&
            metadata.category &&
            (metadata.category === "학교폭력" ||
              metadata.category === "만족도" ||
              metadata.category === "종합조사")
          );
        })
        .map((template: any) => template.id);

      console.log("Target template IDs:", targetTemplateIds);

      if (targetTemplateIds.length === 0) {
        console.log("No matching templates found");
        setSurveys([]);
        setLoading(false);
        return;
      }

      // 사용자 권한에 따른 설문 필터링
      let query = supabase
        .from("surveys")
        .select(
          "id, title, created_at, template_id, status, school_id, target_grades, target_classes",
        )
        .in("template_id", targetTemplateIds)
        .eq("status", "completed") // 완료된 설문만
        .order("created_at", { ascending: false });

      // 학교 ID 필터링
      if (user.school_id) {
        query = query.eq("school_id", user.school_id);
        console.log("Filtering by school_id:", user.school_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Survey error:", error);
        throw error;
      }

      console.log("All surveys found:", data);

      // 사용자 권한에 따른 추가 필터링
      let filteredSurveys = data || [];

      if (user.role === "homeroom_teacher" && user.grade && user.class) {
        // 담임교사: 자신의 담당 학급만
        console.log("Filtering for homeroom teacher:", {
          grade: user.grade,
          class: user.class,
        });
        filteredSurveys = filteredSurveys.filter((survey: any) => {
          const gradeMatch =
            survey.target_grades && survey.target_grades.includes(user.grade);
          const classMatch =
            survey.target_classes && survey.target_classes.includes(user.class);
          console.log(`Survey "${survey.title}" grade/class match:`, {
            gradeMatch,
            classMatch,
          });
          return gradeMatch && classMatch;
        });
      } else if (user.role === "grade_teacher" && user.grade) {
        // 학년담당: 해당 학년만
        console.log("Filtering for grade teacher:", { grade: user.grade });
        filteredSurveys = filteredSurveys.filter((survey: any) => {
          const gradeMatch =
            survey.target_grades && survey.target_grades.includes(user.grade);
          console.log(`Survey "${survey.title}" grade match:`, { gradeMatch });
          return gradeMatch;
        });
      } else if (
        user.role === "school_admin" ||
        user.role === "district_admin" ||
        user.role === "main_admin"
      ) {
        // 관리자: 학교의 모든 설문 (이미 school_id로 필터링됨)
        console.log("Admin user - showing all surveys for school");
      }

      console.log("Filtered surveys:", filteredSurveys);

      if (filteredSurveys.length > 0) {
        // 템플릿 정보와 함께 데이터 구성
        const surveysWithTemplates = filteredSurveys.map((survey: any) => {
          const template = templates.find(
            (t: any) => t.id === survey.template_id,
          );
          return {
            ...survey,
            survey_templates: template
              ? { metadata: template.metadata }
              : undefined,
          };
        });

        console.log("Final surveys data:", surveysWithTemplates);
        setSurveys(surveysWithTemplates);

        // 현재 선택된 설문이 삭제되었을 경우 첫 번째 설문으로 변경
        if (!surveysWithTemplates.find((s) => s.id === selectedSurvey)) {
          setSelectedSurvey(surveysWithTemplates[0].id);
        }
      } else {
        setSurveys([]);
        setSelectedSurvey("");
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
      setSurveys([]);
      setSelectedSurvey("");
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      console.log("Fetching chart data for survey:", selectedSurvey);

      // 실제 설문 응답 데이터를 가져오는 로직
      const { data: responsesData, error: responsesError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", selectedSurvey);

      if (responsesError) throw responsesError;
      console.log("📊 설문 응답 데이터:", responsesData);
      console.log("📊 응답 데이터 개수:", responsesData?.length || 0);

      if (responsesData && responsesData.length > 0) {
        console.log("📊 첫 번째 응답 예시:", responsesData[0]);
        console.log(
          "📊 첫 번째 응답의 responses 필드:",
          responsesData[0].responses,
        );
      }

      // 설문 정보 가져오기
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("questions, template_id, school_id")
        .eq("id", selectedSurvey)
        .single();

      if (surveyError) throw surveyError;
      console.log("📋 설문 정보:", surveyData);
      console.log("📋 설문 질문들:", surveyData.questions);

      // 설문의 학교 ID를 사용하여 학생 정보 가져오기
      let schoolId = surveyData.school_id;

      if (!schoolId) {
        // 설문에 학교 ID가 없으면 현재 사용자의 학교 ID 사용
        console.log("설문에 학교 ID가 없음, 현재 사용자 정보 사용:", user);

        if (user?.school_id) {
          schoolId = user.school_id;
          console.log("사용자의 학교 ID 사용:", schoolId);
        } else if (user?.schoolId) {
          schoolId = user.schoolId;
          console.log("사용자의 schoolId 사용:", schoolId);
        }

        // 사용자에게 학교 ID가 없으면 첫 번째 학교 사용
        if (!schoolId) {
          console.log("사용자에게도 학교 ID가 없음, 첫 번째 학교 사용");
          const { data: firstSchool } = await supabase
            .from("schools")
            .select("id")
            .limit(1)
            .single();

          if (firstSchool) {
            schoolId = firstSchool.id;
            console.log("첫 번째 학교 ID 사용:", schoolId);
          }
        }
      }

      if (!schoolId) {
        console.error("No school ID available");
        setChartData([]);
        return;
      }

      console.log("Using school ID:", schoolId);

      // 학생 정보 가져오기 (current_school_id 사용)
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name")
        .eq("current_school_id", schoolId);

      if (studentsError) throw studentsError;
      console.log("👥 학생 데이터:", studentsData);
      console.log("👥 학생 수:", studentsData?.length || 0);

      // 응답 데이터를 차트 데이터로 변환
      if (responsesData && surveyData && surveyData.questions) {
        const questions = surveyData.questions as any[];
        console.log("Questions from survey:", questions);

        const chartDataArray: ChartData[] = questions
          .filter((question: any, index: number) => {
            // 1번(교우관계)과 9번(주관식) 문항 제외
            return index !== 0 && index !== 8;
          })
          .map((question: any, index: number) => {
            // 필터링 후 실제 인덱스 계산 (1번, 9번 제외)
            // 원본 질문 인덱스 1 (2번 질문)이 필터링 후 인덱스 0이 되므로 +2
            const originalIndex = index + 2;
            console.log(`처리 중인 질문 ${originalIndex}:`, question);

            // 다양한 키 형식으로 응답 데이터 찾기 (원본 인덱스 사용)
            const questionId = question.id || `q${originalIndex}`;
            const numericKey = originalIndex.toString();
            const qKey = `q${originalIndex}`;

            console.log(`질문 ${originalIndex} 키 후보:`, {
              questionId,
              numericKey,
              qKey,
            });

            // 다양한 키로 응답 찾기
            const findResponseValue = (response: any) => {
              if (!response.responses) return null;

              // 1. 원본 질문 ID로 시도
              if (response.responses[questionId] !== undefined) {
                return response.responses[questionId];
              }
              // 2. q1, q2 형태로 시도
              if (response.responses[qKey] !== undefined) {
                return response.responses[qKey];
              }
              // 3. 숫자 키로 시도
              if (response.responses[numericKey] !== undefined) {
                return response.responses[numericKey];
              }
              return null;
            };

            // 응답 값 분석
            const sampleResponse = responsesData.find(
              (r) => findResponseValue(r) !== null,
            );
            const sampleValue = sampleResponse
              ? findResponseValue(sampleResponse)
              : null;

            console.log(`질문 ${originalIndex} - 샘플 응답 값:`, sampleValue);
            console.log(
              `질문 ${originalIndex} - 샘플 응답 타입:`,
              typeof sampleValue,
            );
            console.log(
              `질문 ${originalIndex} - 샘플 응답이 배열인가:`,
              Array.isArray(sampleValue),
            );

            // 응답 값이 문자열인 경우 (예/아니오 또는 빈도 기반)
            if (typeof sampleValue === "string") {
              console.log(`질문 ${originalIndex} - 문자열 응답 처리`);

              // 학교 폭력 조사 감지 - 설문 제목, 질문 텍스트, 종합조사 6~8번 질문 확인
              const isViolenceSurvey =
                (currentSurvey?.title &&
                  currentSurvey.title.includes("폭력")) ||
                (currentSurvey?.survey_templates?.metadata?.category ===
                  "종합조사" &&
                  originalIndex >= 6 &&
                  originalIndex <= 8) || // 종합조사 6~8번 질문
                (question.text &&
                  (question.text.includes("폭력") ||
                    question.text.includes("괴롭힘") ||
                    question.text.includes("싸움") ||
                    question.text.includes("욕설") ||
                    question.text.includes("협박") ||
                    question.text.includes("놀림") ||
                    question.text.includes("상해") ||
                    question.text.includes("소외") ||
                    question.text.includes("따돌림") ||
                    question.text.includes("소지품") ||
                    question.text.includes("무시")));

              console.log(`질문 ${originalIndex} - 학교 폭력 조사 감지:`, {
                surveyTitle: currentSurvey?.title,
                questionText: question.text,
                isViolenceSurvey,
              });

              if (isViolenceSurvey) {
                console.log(
                  `질문 ${originalIndex} - 학교 폭력 조사 3단계 빈도 처리`,
                );

                // 학교 폭력 조사 3단계 빈도 처리
                const neverKeywords = ["전혀 없다", "전혀 없음"];
                const sometimesKeywords = ["한 두번", "가끔"];
                const oftenKeywords = ["자주", "매우 자주"];

                const neverCount = responsesData.filter((response: any) => {
                  const value = findResponseValue(response);
                  return neverKeywords.some(
                    (keyword) =>
                      value &&
                      value
                        .toString()
                        .toLowerCase()
                        .includes(keyword.toLowerCase()),
                  );
                }).length;

                const sometimesCount = responsesData.filter((response: any) => {
                  const value = findResponseValue(response);
                  return sometimesKeywords.some(
                    (keyword) =>
                      value &&
                      value
                        .toString()
                        .toLowerCase()
                        .includes(keyword.toLowerCase()),
                  );
                }).length;

                const oftenCount = responsesData.filter((response: any) => {
                  const value = findResponseValue(response);
                  return oftenKeywords.some(
                    (keyword) =>
                      value &&
                      value
                        .toString()
                        .toLowerCase()
                        .includes(keyword.toLowerCase()),
                  );
                }).length;

                console.log(`질문 ${originalIndex} 응답 수 (폭력조사 3단계):`, {
                  neverCount,
                  sometimesCount,
                  oftenCount,
                });
                console.log(`질문 ${originalIndex} - 빈도 키워드 매칭:`, {
                  neverKeywords,
                  sometimesKeywords,
                  oftenKeywords,
                  sampleResponses: responsesData
                    .slice(0, 3)
                    .map((r) => findResponseValue(r)),
                });

                // 학교 폭력 조사는 3개 카테고리로 분리
                return {
                  question:
                    question.text ||
                    question.question ||
                    `질문 ${originalIndex}`,
                  never_count: neverCount,
                  sometimes_count: sometimesCount,
                  often_count: oftenCount,
                  never_students: responsesData
                    .filter((response: any) => {
                      const value = findResponseValue(response);
                      return neverKeywords.some(
                        (keyword) =>
                          value &&
                          value
                            .toString()
                            .toLowerCase()
                            .includes(keyword.toLowerCase()),
                      );
                    })
                    .map((response: any) => {
                      const student = studentsData?.find(
                        (s: any) => s.id === response.student_id,
                      );
                      return student ? student.name : "알 수 없는 학생";
                    }),
                  sometimes_students: responsesData
                    .filter((response: any) => {
                      const value = findResponseValue(response);
                      return sometimesKeywords.some(
                        (keyword) =>
                          value &&
                          value
                            .toString()
                            .toLowerCase()
                            .includes(keyword.toLowerCase()),
                      );
                    })
                    .map((response: any) => {
                      const student = studentsData?.find(
                        (s: any) => s.id === response.student_id,
                      );
                      return student ? student.name : "알 수 없는 학생";
                    }),
                  often_students: responsesData
                    .filter((response: any) => {
                      const value = findResponseValue(response);
                      return oftenKeywords.some(
                        (keyword) =>
                          value &&
                          value
                            .toString()
                            .toLowerCase()
                            .includes(keyword.toLowerCase()),
                      );
                    })
                    .map((response: any) => {
                      const student = studentsData?.find(
                        (s: any) => s.id === response.student_id,
                      );
                      return student ? student.name : "알 수 없는 학생";
                    }),
                };
              } else {
                // 일반적인 예/아니오 응답 처리 (만족도 조사 등)
                console.log(`질문 ${originalIndex} - 일반 예/아니오 응답 처리`);

                const yesCount = responsesData.filter((response: any) => {
                  const value = findResponseValue(response);
                  return (
                    value === "예" ||
                    value === "yes" ||
                    value === "1" ||
                    value === 1 ||
                    value === true
                  );
                }).length;

                const noCount = responsesData.filter((response: any) => {
                  const value = findResponseValue(response);
                  return (
                    value === "아니오" ||
                    value === "no" ||
                    value === "2" ||
                    value === 2 ||
                    value === false
                  );
                }).length;

                console.log(`질문 ${originalIndex} 응답 수:`, {
                  yesCount,
                  noCount,
                });

                return {
                  question:
                    question.text ||
                    question.question ||
                    `질문 ${originalIndex}`,
                  yes_count: yesCount,
                  no_count: noCount,
                  yes_students: responsesData
                    .filter((response: any) => {
                      const value = findResponseValue(response);
                      return (
                        value === "예" ||
                        value === "yes" ||
                        value === "1" ||
                        value === 1 ||
                        value === true
                      );
                    })
                    .map((response: any) => {
                      const student = studentsData?.find(
                        (s: any) => s.id === response.student_id,
                      );
                      return student ? student.name : "알 수 없는 학생";
                    }),
                  no_students: responsesData
                    .filter((response: any) => {
                      const value = findResponseValue(response);
                      return (
                        value === "아니오" ||
                        value === "no" ||
                        value === "2" ||
                        value === 2 ||
                        value === false
                      );
                    })
                    .map((response: any) => {
                      const student = studentsData?.find(
                        (s: any) => s.id === response.student_id,
                      );
                      return student ? student.name : "알 수 없는 학생";
                    }),
                };
              }
            }
            // 응답 값이 배열인 경우 (교우관계 설문 등)
            else if (Array.isArray(sampleValue)) {
              console.log(`질문 ${originalIndex} - 배열 응답 처리`);

              const yesCount = responsesData.filter((response: any) => {
                const value = findResponseValue(response);
                return value && Array.isArray(value) && value.length > 0;
              }).length;

              const noCount = responsesData.filter((response: any) => {
                const value = findResponseValue(response);
                return !value || (Array.isArray(value) && value.length === 0);
              }).length;

              console.log(`질문 ${originalIndex} 응답 수:`, {
                yesCount,
                noCount,
              });

              return {
                question:
                  question.text || question.question || `질문 ${originalIndex}`,
                yes_count: yesCount,
                no_count: noCount,
                yes_students: responsesData
                  .filter((response: any) => {
                    const value = findResponseValue(response);
                    return value && Array.isArray(value) && value.length > 0;
                  })
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id,
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
                no_students: responsesData
                  .filter((response: any) => {
                    const value = findResponseValue(response);
                    return (
                      !value || (Array.isArray(value) && value.length === 0)
                    );
                  })
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id,
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
              };
            }
            // 기타 경우
            else {
              console.log(`질문 ${originalIndex} - 기타 응답 처리`);

              const yesCount = responsesData.filter((response: any) => {
                const value = findResponseValue(response);
                return (
                  value === "1" ||
                  value === 1 ||
                  value === "예" ||
                  value === true
                );
              }).length;

              const noCount = responsesData.filter((response: any) => {
                const value = findResponseValue(response);
                return (
                  value === "2" ||
                  value === 2 ||
                  value === "아니오" ||
                  value === false
                );
              }).length;

              console.log(`질문 ${originalIndex} 응답 수:`, {
                yesCount,
                noCount,
              });

              return {
                question:
                  question.text || question.question || `질문 ${originalIndex}`,
                yes_count: yesCount,
                no_count: noCount,
                yes_students: responsesData
                  .filter((response: any) => {
                    const value = findResponseValue(response);
                    return (
                      value === "1" ||
                      value === 1 ||
                      value === "예" ||
                      value === true
                    );
                  })
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id,
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
                no_students: responsesData
                  .filter((response: any) => {
                    const value = findResponseValue(response);
                    return (
                      value === "2" ||
                      value === 2 ||
                      value === "아니오" ||
                      value === false
                    );
                  })
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id,
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
              };
            }
          });

        console.log("Final chart data:", chartDataArray);
        setChartData(chartDataArray);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartData([]);
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
      {/* 상단 사이드바 */}
      <div className="mb-4 h-fit w-full rounded-lg border border-gray-200 bg-white">
        <div className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            분석 대상 리스트 총{surveys.length}개
          </h2>

          <div className="flex h-fit w-full gap-2 overflow-x-auto">
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
                  <p>
                    카테고리 :{" "}
                    {survey.survey_templates?.metadata?.category ||
                      "알 수 없음"}
                  </p>
                  <p>
                    상태 :{" "}
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusStyle(
                        survey.status,
                      )}`}
                    >
                      {getStatusLabel(survey.status)}
                    </span>
                  </p>
                  <p>
                    생성일 :{" "}
                    {survey.created_at ? formatDate(survey.created_at) : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1">
        {/* 메인 콘텐츠 */}
        <div className="pt-4">
          {selectedSurvey && (
            <div>
              <div className="flex justify-between">
                <h2 className="mb-6 text-2xl font-bold text-gray-900">
                  {surveys.find((s) => s.id === selectedSurvey)?.title}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewMode("graphs")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "graphs"
                        ? "bg-[#3F80EA] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    결과보기
                  </button>
                  <button
                    onClick={() => setViewMode("names")}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      viewMode === "names"
                        ? "bg-[#3F80EA] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    학생이름과 결과보기
                  </button>
                </div>
              </div>

              {viewMode === "graphs" ? (
                <div className="space-y-4">
                  {/* 전체 요약 차트 */}
                  {chartData.length > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-6 text-xl font-semibold text-gray-900">
                        {currentSurvey?.title &&
                        currentSurvey.title.includes("폭력")
                          ? "전체 폭력 경험 분포"
                          : currentSurvey?.survey_templates?.metadata
                                ?.category === "종합조사"
                            ? "종합조사 결과 요약"
                            : "전체 응답 요약"}
                      </h3>
                      {currentSurvey?.survey_templates?.metadata?.category ===
                      "종합조사" ? (
                        // 종합조사 - 만족도와 학교폭력 분리된 차트
                        <div className="space-y-8">
                          {/* 학교생활 만족도 분포 */}
                          <div>
                            <h4 className="mb-4 text-lg font-medium text-gray-800">
                              학교생활 만족도 분포 (문항 2~5)
                            </h4>
                            <div className="grid grid-cols-1 justify-items-center gap-6 lg:grid-cols-2">
                              <div className="h-64">
                                <Doughnut
                                  data={createSummaryChartData().satisfaction!}
                                  options={doughnutChartOptions}
                                />
                              </div>
                              <div className="h-64 w-[480px]">
                                <Line
                                  data={createLineChartData().satisfaction!}
                                  options={lineChartOptions}
                                />
                              </div>
                            </div>
                          </div>

                          {/* 학교폭력 분포 */}
                          <div>
                            <h4 className="mb-4 text-lg font-medium text-gray-800">
                              학교폭력 분포 (문항 6~8)
                            </h4>
                            <div className="grid grid-cols-1 justify-items-center gap-6 lg:grid-cols-2">
                              <div className="h-64">
                                <Doughnut
                                  data={createSummaryChartData().violence!}
                                  options={doughnutChartOptions}
                                />
                              </div>
                              <div className="h-64 w-[480px]">
                                <Line
                                  data={createLineChartData().violence!}
                                  options={lineChartOptions}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // 일반 설문 차트
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                          <div className="flex flex-col">
                            <h4 className="mb-4 text-lg font-medium text-gray-800">
                              {currentSurvey?.title &&
                              currentSurvey.title.includes("폭력")
                                ? "폭력 경험 빈도별 분포"
                                : "전체 응답 분포"}
                            </h4>
                            <div className="h-64 self-center">
                              <Doughnut
                                data={createSummaryChartData() as any}
                                options={doughnutChartOptions}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col">
                            <h4 className="mb-4 text-lg font-medium text-gray-800">
                              {currentSurvey?.title &&
                              currentSurvey.title.includes("폭력")
                                ? "문항별 폭력 경험 빈도 추이"
                                : "문항별 응답 추이"}
                            </h4>
                            <div className="h-64 w-[480px] self-center">
                              <Line
                                data={createLineChartData() as any}
                                options={lineChartOptions}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 개별 문항 차트들 */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {chartData.map((data, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-gray-200 bg-white p-6"
                      >
                        <h3 className="mb-6 text-lg font-medium text-gray-900">
                          문항 {(index + 2).toString().padStart(2, "0")}.{" "}
                          {data.question}
                        </h3>

                        <div className="space-y-6">
                          {/* 막대 차트 */}
                          <div>
                            <div className="h-64">
                              <Bar
                                data={createBarChartData(data, data.question)}
                                options={barChartOptions}
                              />
                            </div>
                          </div>

                          {/* 도넛 차트 */}
                          {/* <div className="flex flex-col items-center">
                            <h4 className="mb-3 text-sm font-medium text-gray-700">
                              응답 비율 (도넛 차트)
                            </h4>
                            <div className="h-48">
                              <Doughnut
                                data={createDoughnutChartData(data)}
                                options={doughnutChartOptions}
                              />
                            </div>
                          </div> */}

                          {/* 응답 현황 요약 */}
                          <div className="rounded-lg bg-gray-50 p-4">
                            {((currentSurvey?.title &&
                              currentSurvey.title.includes("폭력")) ||
                              (currentSurvey?.survey_templates?.metadata
                                ?.category === "종합조사" &&
                                index >= 4 &&
                                index <= 6)) &&
                            data.never_count !== undefined ? (
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <div className="text-2xl font-bold text-blue-300">
                                    {data.never_count}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    전혀 없다
                                  </div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-blue-500">
                                    {data.sometimes_count}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    한 두번 당한 적 있다
                                  </div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-[#094185]">
                                    {data.often_count}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    자주 있다
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                  <div className="text-2xl font-bold text-blue-500">
                                    {data.yes_count}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    예 답변
                                  </div>
                                </div>
                                <div>
                                  <div className="text-2xl font-bold text-[#094185]">
                                    {data.no_count}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    아니오 답변
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {chartData.map((data, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-white p-6"
                    >
                      <h3 className="mb-6 text-lg font-medium text-gray-900">
                        문항 {(index + 2).toString().padStart(2, "0")}.{" "}
                        {data.question}
                      </h3>

                      <div className="flex gap-8">
                        {/* 왼쪽: Chart.js 차트들 */}
                        <div className="flex-1">
                          <div className="space-y-6">
                            {/* 막대 차트 */}
                            <div>
                              <div className="h-64">
                                <Bar
                                  data={createBarChartData(data, data.question)}
                                  options={barChartOptions}
                                />
                              </div>
                            </div>

                            {/* 도넛 차트 */}
                            {/* <div>
                              <h4 className="mb-3 text-sm font-medium text-gray-700">
                                응답 비율 (도넛 차트)
                              </h4>
                              <div className="h-48">
                                <Doughnut
                                  data={createDoughnutChartData(data)}
                                  options={doughnutChartOptions}
                                />
                              </div>
                            </div> */}
                          </div>
                        </div>

                        {/* 오른쪽: 응답 표 */}
                        <div className="flex-1">
                          <div className="mb-14">
                            <h4 className="mb-3 text-sm font-medium text-gray-700">
                              응답 현황
                            </h4>
                          </div>

                          <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="w-[18%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    답변
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    학생
                                  </th>
                                  <th className="w-[14%] px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700">
                                    합계
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 bg-white">
                                {/* 학교 폭력 조사인 경우 3개 행, 아니면 2개 행 */}
                                {((currentSurvey?.title &&
                                  currentSurvey.title.includes("폭력")) ||
                                  (currentSurvey?.survey_templates?.metadata
                                    ?.category === "종합조사" &&
                                    index >= 4 &&
                                    index <= 6)) &&
                                data.never_count !== undefined ? (
                                  <>
                                    {/* 전혀 없다 행 */}
                                    <tr>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-3 w-3 rounded bg-blue-300"></div>
                                          <span className="text-sm font-medium text-gray-900">
                                            전혀 없다
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {data.never_students &&
                                          data.never_students.length > 0 ? (
                                            data.never_students.map(
                                              (name: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {name}
                                                  {i <
                                                  (data.never_students
                                                    ?.length || 0) -
                                                    1
                                                    ? ","
                                                    : ""}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-xs text-gray-500">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-semibold text-blue-300">
                                          {data.never_count}명
                                        </span>
                                      </td>
                                    </tr>

                                    {/* 한 두번 당한 적 있다 행 */}
                                    <tr>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-3 w-3 rounded bg-blue-500"></div>
                                          <span className="text-sm font-medium text-gray-900">
                                            한 두번 당한 적 있다
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {data.sometimes_students &&
                                          data.sometimes_students.length > 0 ? (
                                            data.sometimes_students.map(
                                              (name: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {name}
                                                  {i <
                                                  (data.sometimes_students
                                                    ?.length || 0) -
                                                    1
                                                    ? ","
                                                    : ""}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-xs text-gray-500">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-semibold text-blue-600">
                                          {data.sometimes_count}명
                                        </span>
                                      </td>
                                    </tr>

                                    {/* 자주 있다 행 */}
                                    <tr>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-3 w-3 rounded bg-[#094185]"></div>
                                          <span className="text-sm font-medium text-gray-900">
                                            자주 있다
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {data.often_students &&
                                          data.often_students.length > 0 ? (
                                            data.often_students.map(
                                              (name: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {name}
                                                  {i <
                                                  (data.often_students
                                                    ?.length || 0) -
                                                    1
                                                    ? ","
                                                    : ""}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-xs text-gray-500">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-semibold text-[#094185]">
                                          {data.often_count}명
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                ) : (
                                  <>
                                    {/* 예 답변 행 */}
                                    <tr>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-3 w-3 rounded bg-blue-500"></div>
                                          <span className="text-sm font-medium text-gray-900">
                                            예
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {data.yes_students &&
                                          data.yes_students.length > 0 ? (
                                            data.yes_students.map(
                                              (name: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {name}
                                                  {i <
                                                  (data.yes_students?.length ||
                                                    0) -
                                                    1
                                                    ? ","
                                                    : ""}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-xs text-gray-500">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-semibold text-blue-500">
                                          {data.yes_count || 0}명
                                        </span>
                                      </td>
                                    </tr>

                                    {/* 아니오 답변 행 */}
                                    <tr>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center space-x-2">
                                          <div className="h-3 w-3 rounded bg-[#094185]"></div>
                                          <span className="text-sm font-medium text-gray-900">
                                            아니오
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1">
                                          {data.no_students &&
                                          data.no_students.length > 0 ? (
                                            data.no_students.map(
                                              (name: string, i: number) => (
                                                <span
                                                  key={i}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {name}
                                                  {i <
                                                  (data.no_students?.length ||
                                                    0) -
                                                    1
                                                    ? ","
                                                    : ""}
                                                </span>
                                              ),
                                            )
                                          ) : (
                                            <span className="text-xs text-gray-500">
                                              -
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="text-sm font-semibold text-[#094185]">
                                          {data.no_count || 0}명
                                        </span>
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClassSurvey;
