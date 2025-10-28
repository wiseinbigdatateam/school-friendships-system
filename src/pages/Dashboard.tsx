import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import BarChart from "../components/BarChart";

interface SurveyProject {
  id: string;
  title: string;
  templateType: string;
  date: string;
  status: "active" | "completed";
  questions: any[];
  targetGrades: any;
  targetClasses: any;
  isSelected: boolean;
  template_id?: string | null;
}

interface SurveyTemplate {
  id: string;
  name: string;
  metadata: {
    category: string;
    answer_options?: any;
  };
}

const Dashboard: React.FC = () => {
  const {
    user: currentUser,
    loading: authLoading,
    isAuthenticated,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [surveyProjects, setSurveyProjects] = useState<Array<SurveyProject>>(
    [],
  );
  const [participationData, setParticipationData] = useState({
    totalStudents: 0,
    participatedStudents: 0,
    nonParticipatedStudents: 0,
    completionRate: 0,
  });
  const [dailyParticipationData, setDailyParticipationData] = useState<
    Array<{
      date: string;
      count: number;
      cumulative: number;
    }>
  >([]);
  const [studentParticipationList, setStudentParticipationList] = useState<
    Array<{
      id: number;
      name: string;
      participated: boolean;
      ownName: string;
      closeFriends: string;
      playFriends: string;
      talkFriends: string;
    }>
  >([]);
  const [students, setStudents] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGuideModal, setShowGuideModal] = useState(() => {
    // localStorage에서 가이드 숨김 여부 확인
    const guideHidden = localStorage.getItem("dashboard-guide-hidden");
    return guideHidden !== "true";
  });
  const [dontShowAgain, setDontShowAgain] = useState(false);

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

  // 상태 필터에 따른 설문 프로젝트 필터링
  const filteredSurveyProjects = surveyProjects.filter((project) => {
    if (statusFilter === "all") return true;
    return project.status === statusFilter;
  });

  // 상태 필터 변경 핸들러
  const handleStatusFilterChange = (newStatusFilter: string) => {
    setStatusFilter(newStatusFilter);

    // 필터링된 프로젝트가 있으면 첫 번째 프로젝트를 자동 선택
    const filteredProjects = surveyProjects.filter((project) => {
      if (newStatusFilter === "all") return true;
      return project.status === newStatusFilter;
    });

    if (filteredProjects.length > 0) {
      handleProjectSelect(filteredProjects[0].id);
    } else {
      // 필터링된 프로젝트가 없으면 선택 해제 및 데이터 초기화
      setSelectedProject("");
      setSurveyProjects(
        surveyProjects.map((project) => ({ ...project, isSelected: false })),
      );

      // 참여 데이터 초기화
      setParticipationData({
        totalStudents: students.length,
        participatedStudents: 0,
        nonParticipatedStudents: students.length,
        completionRate: 0,
      });
      setStudentParticipationList([]);
      setDailyParticipationData([]);
      setResponses([]);
    }
  };

  // 설문 프로젝트 선택 핸들러
  const handleProjectSelect = async (projectId: string) => {
    // 모든 프로젝트의 선택 상태 초기화
    const updatedProjects = surveyProjects.map((project) => ({
      ...project,
      isSelected: project.id === projectId,
    }));

    setSurveyProjects(updatedProjects);
    setSelectedProject(projectId);

    // projectId가 없거나 빈 문자열이면 데이터 초기화
    if (!projectId) {
      setParticipationData({
        totalStudents: students.length,
        participatedStudents: 0,
        nonParticipatedStudents: students.length,
        completionRate: 0,
      });
      setStudentParticipationList([]);
      setDailyParticipationData([]);
      setResponses([]);
      return;
    }

    // 선택된 설문의 응답 데이터 조회
    if (projectId && students.length > 0) {
      try {
        // 해당 설문의 응답 조회
        const { data: responsesData, error: responsesError } = await supabase
          .from("survey_responses")
          .select("*")
          .eq("survey_id", projectId)
          .order("submitted_at", { ascending: true });

        if (responsesError) {
          console.error("❌ 설문 응답 조회 실패:", responsesError);
        } else {
          setResponses(responsesData || []);

          // 참여 현황 재계산
          const totalStudents = students.length;
          const participatedStudents = responsesData
            ? responsesData.filter((r) =>
                students.some((s) => s.id === r.student_id),
              ).length
            : 0;
          const nonParticipatedStudents = totalStudents - participatedStudents;
          const completionRate =
            totalStudents > 0
              ? Math.round((participatedStudents / totalStudents) * 100)
              : 0;

          setParticipationData({
            totalStudents,
            participatedStudents,
            nonParticipatedStudents,
            completionRate,
          });

          // 학생 참여 리스트 업데이트
          const studentList = students.map((student, index) => {
            const response = responsesData?.find(
              (r) => r.student_id === student.id,
            );
            const participated = !!response;

            return {
              id: index + 1,
              name: student.name,
              participated,
              ownName: student.name,
              closeFriends: "", // 이제 동적으로 계산됨
              playFriends: "", // 이제 동적으로 계산됨
              talkFriends: "", // 이제 동적으로 계산됨
            };
          });

          setStudentParticipationList(studentList);

          // 일별 참여 데이터 업데이트
          const dailyData = responsesData
            ? responsesData
                .reduce((acc: any[], response) => {
                  if (!response.submitted_at) return acc;

                  const dateObj = new Date(response.submitted_at);
                  const month = dateObj.getMonth() + 1; // 0-based month
                  const day = dateObj.getDate();
                  const date = `${month}/${day}`;

                  const existingDate = acc.find((d) => d.date === date);
                  if (existingDate) {
                    existingDate.count += 1;
                  } else {
                    acc.push({
                      date,
                      count: 1,
                      cumulative: 0,
                    });
                  }

                  // 누적 응답수 계산
                  acc.forEach((dayData, index) => {
                    if (index === 0) {
                      dayData.cumulative = dayData.count;
                    } else {
                      dayData.cumulative =
                        acc[index - 1].cumulative + dayData.count;
                    }
                  });

                  return acc;
                }, [])
                .sort((a, b) => {
                  // 날짜순으로 정렬
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA.getTime() - dateB.getTime();
                })
            : [];

          setDailyParticipationData(dailyData);

          
        }
      } catch (error) {
        console.error("❌ 설문 응답 데이터 조회 실패:", error);
      }
    }
  };

  // 실제 데이터베이스에서 데이터 로드
  useEffect(() => {
    const loadRealData = async () => {
      try {

        // 1. 인증 상태 확인
        if (authLoading) {
          return;
        }

        if (!isAuthenticated || !currentUser) {
          console.warn("⚠️ 인증되지 않은 사용자 또는 사용자 정보 없음");
          setLoading(false);
          return;
        }


        // 2. 사용자 정보에서 학교, 학년, 반 정보 추출
        const schoolId = currentUser.school_id || currentUser.schoolId || "";
        const gradeLevel = currentUser.grade?.toString() || "1";
        const classNumber = currentUser.class?.toString() || "1";

        

        setSchoolId(schoolId);
        setGradeLevel(gradeLevel);
        setClassNumber(classNumber);

        // 3. 학교 이름 조회
        if (schoolId) {
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("name")
            .eq("id", schoolId)
            .single();

          if (schoolError) {
            console.warn("⚠️ 학교 정보 조회 실패:", schoolError);
            setSchoolName("알 수 없는 학교");
          } else if (schoolData) {
            setSchoolName(schoolData.name);
          }
        } else {
          setSchoolName("학교 정보 없음");
        }

        // 4. 학생 목록 조회 (역할에 따라 다르게 처리)

        if (!schoolId) {
          console.warn("⚠️ 학교 ID가 없어서 학생 조회를 건너뜀");
          setParticipationData({
            totalStudents: 0,
            participatedStudents: 0,
            nonParticipatedStudents: 0,
            completionRate: 0,
          });
          setStudentParticipationList([]);
          setDailyParticipationData([]);
          setSurveyProjects([]);
          setLoading(false);
          return;
        }

        let studentsQuery = supabase
          .from("students")
          .select("*")
          .eq("current_school_id", schoolId);

        // 역할에 따른 필터링
        if (currentUser.role === "school_admin") {
          // 학교관리자는 전학년 전체 데이터 조회
          studentsQuery = studentsQuery.order("grade", { ascending: true });
        } else if (currentUser.role === "grade_teacher") {
          // grade_teacher인 경우 담당 학년 전체 데이터 조회
          const assignedGrade = currentUser.grade?.toString() || "1";
          studentsQuery = studentsQuery.eq("grade", assignedGrade);
        } else {
          // 담임교사인 경우 특정 학급만 조회
          studentsQuery = studentsQuery
            .eq("grade", gradeLevel)
            .eq("class", classNumber);
          
        }

        const { data: studentsData, error: studentsError } =
          await studentsQuery;

        if (studentsError) {
          console.error("❌ 학생 조회 실패:", studentsError);
          setLoading(false);
          return;
        }

        
        setStudents(studentsData || []);

        if (!studentsData || studentsData.length === 0) {
          setParticipationData({
            totalStudents: 0,
            participatedStudents: 0,
            nonParticipatedStudents: 0,
            completionRate: 0,
          });
          setStudentParticipationList([]);
          setDailyParticipationData([]);
          setSurveyProjects([]);
        } else if (studentsData && studentsData.length > 0) {
          // 5. 설문 목록 조회 (active와 completed 상태만 포함)
          let surveysQuery = supabase
            .from("surveys")
            .select("*")
            .eq("school_id", schoolId)
            .in("status", ["active", "completed"]) // draft 제외
            .order("created_at", { ascending: false });

          const { data: surveys, error: surveysError } = await surveysQuery;

          

          if (surveysError) {
            console.error("❌ 설문 조회 실패:", surveysError);
          } else {
            // 역할에 따라 설문 필터링
            const filteredSurveys =
              surveys?.filter((survey) => {
                const targetGrades = survey.target_grades;
                const targetClasses = survey.target_classes;

                

                if (currentUser.role === "school_admin") {
                  // 학교관리자: 해당 교육청 학교의 모든 학년 반의 설문
                  
                  return true;
                } else if (currentUser.role === "grade_teacher") {
                  // 학년부장: 해당 교육청 학교 선생님의 학년 모든 반의 설문
                  const assignedGrade = currentUser.grade?.toString() || "1";
                  const gradeMatch = Array.isArray(targetGrades)
                    ? targetGrades.includes(assignedGrade)
                    : targetGrades === assignedGrade;
                 
                  return gradeMatch;
                } else if (currentUser.role === "homeroom_teacher") {
                  // 담임교사: 해당 교육청 학교 선생님의 학년 반의 설문
                  const gradeMatch = Array.isArray(targetGrades)
                    ? targetGrades.includes(gradeLevel)
                    : targetGrades === gradeLevel;

                  const classMatch = Array.isArray(targetClasses)
                    ? targetClasses.includes(classNumber)
                    : targetClasses === classNumber;

                  const isMatch = gradeMatch && classMatch;
                 
                  return isMatch;
                } else {
                  // 기타 역할의 경우 기본적으로 모든 설문 표시하지 않음
                  
                  return false;
                }
              }) || [];

            

            // 설문 프로젝트 목록 설정 (더 자세한 정보 포함)
            const projects = await Promise.all(
              filteredSurveys.map(async (survey) => {
                let templateType = "커스텀 설문";

                // 템플릿 정보 가져오기
                if (survey.template_id) {
                  try {
                    const { data: templateData, error: templateError } =
                      await supabase
                        .from("survey_templates")
                        .select("name, metadata")
                        .eq("id", survey.template_id)
                        .single();

                    if (!templateError && templateData) {
                      const metadata = templateData.metadata as any;
                      const category = metadata?.category || "";
                      templateType = `템플릿형: ${category}`;
                    }
                  } catch (error) {
                    console.error("템플릿 정보 조회 실패:", error);
                    templateType = "템플릿형: 알 수 없음";
                  }
                }

                return {
                  id: survey.id,
                  title: survey.title || "제목 없음",
                  templateType,
                  date: survey.created_at
                    ? new Date(survey.created_at).toLocaleDateString("ko-KR")
                    : "날짜 없음",
                  status: (survey.status as "active" | "completed") || "draft",
                  questions: Array.isArray(survey.questions)
                    ? survey.questions
                    : [],
                  targetGrades: survey.target_grades,
                  targetClasses: survey.target_classes,
                  description: survey.description || "",
                  startDate: survey.start_date || "",
                  endDate: survey.end_date || "",
                  isSelected: false,
                };
              }),
            );

            setSurveyProjects(projects);

            // 설문 템플릿 정보는 필요시에만 조회 (현재 사용하지 않음)

            // 6. 첫 번째 설문 선택 및 응답 데이터 조회
            if (projects.length > 0) {
              const firstProject = projects[0];
              firstProject.isSelected = true;
              setSelectedProject(firstProject.id);

              // 해당 설문의 응답 조회 (더 자세한 정보 포함)
              const { data: responsesData, error: responsesError } =
                await supabase
                  .from("survey_responses")
                  .select("*")
                  .eq("survey_id", firstProject.id)
                  .order("submitted_at", { ascending: true });

              if (responsesError) {
                console.error("❌ 설문 응답 조회 실패:", responsesError);
              } else {
                setResponses(responsesData || []);

                // 참여 현황 계산
                const totalStudents = studentsData.length;
                const participatedStudents = responsesData
                  ? responsesData.filter((r) =>
                      studentsData.some((s) => s.id === r.student_id),
                    ).length
                  : 0;
                const nonParticipatedStudents =
                  totalStudents - participatedStudents;
                const completionRate =
                  totalStudents > 0
                    ? Math.round((participatedStudents / totalStudents) * 100)
                    : 0;

                setParticipationData({
                  totalStudents,
                  participatedStudents,
                  nonParticipatedStudents,
                  completionRate,
                });

                // 학생 참여 리스트 설정 (실제 응답 데이터 기반, 더 정확한 파싱)
                const studentList = studentsData.map((student, index) => {
                  const response = responsesData?.find(
                    (r) => r.student_id === student.id,
                  );
                  const participated = !!response;

                  // 응답 데이터에서 친구 정보 추출 (더 정확한 파싱)
                  let closeFriends = "";
                  let playFriends = "";
                  let talkFriends = "";

                  if (response && response.responses) {
                    try {
                      const responseData = response.responses as any;

                      // q1: 가장 친한 친구 3명
                      if (responseData.q1 && Array.isArray(responseData.q1)) {
                        const friendNames = responseData.q1
                          .map((friendId: string) => {
                            const friend = studentsData.find(
                              (s) => s.id === friendId,
                            );
                            return friend ? friend.name : "알 수 없음";
                          })
                          .filter((name: string) => name !== "알 수 없음");
                        closeFriends = friendNames.join(", ");
                      }

                      // q2: 함께 놀고 싶은 친구 5명
                      if (responseData.q2 && Array.isArray(responseData.q2)) {
                        const friendNames = responseData.q2
                          .map((friendId: string) => {
                            const friend = studentsData.find(
                              (s) => s.id === friendId,
                            );
                            return friend ? friend.name : "알 수 없음";
                          })
                          .filter((name: string) => name !== "알 수 없음");
                        playFriends = friendNames.join(", ");
                      }

                      // q3: 고민 상담하고 싶은 친구
                      if (responseData.q3 && Array.isArray(responseData.q3)) {
                        const friendNames = responseData.q3
                          .map((friendId: string) => {
                            const friend = studentsData.find(
                              (s) => s.id === friendId,
                            );
                            return friend ? friend.name : "알 수 없음";
                          })
                          .filter((name: string) => name !== "알 수 없음");
                        talkFriends = friendNames.join(", ");
                      }

                      // q4: 존경하거나 닮고 싶은 친구 (있는 경우)
                      if (responseData.q4 && Array.isArray(responseData.q4)) {
                        const friendNames = responseData.q4
                          .map((friendId: string) => {
                            const friend = studentsData.find(
                              (s) => s.id === friendId,
                            );
                            return friend ? friend.name : "알 수 없음";
                          })
                          .filter((name: string) => name !== "알 수 없음");
                        // q4는 별도 컬럼이 없으므로 closeFriends에 추가
                        if (friendNames.length > 0) {
                          closeFriends = closeFriends
                            ? `${closeFriends}, ${friendNames.join(", ")}`
                            : friendNames.join(", ");
                        }
                      }
                    } catch (e) {
                      console.error("응답 데이터 파싱 오류:", e);
                    }
                  }

                  return {
                    id: index + 1,
                    name: student.name,
                    participated,
                    ownName: student.name,
                    closeFriends:
                      closeFriends || (participated ? "친구 선택됨" : ""),
                    playFriends:
                      playFriends || (participated ? "친구 선택됨" : ""),
                    talkFriends:
                      talkFriends || (participated ? "친구 선택됨" : ""),
                  };
                });

                setStudentParticipationList(studentList);

                // 일별 참여 데이터 설정 (실제 제출 시간 기반)
                const dailyData = responsesData
                  ? responsesData
                      .reduce((acc: any[], response) => {
                        if (!response.submitted_at) return acc;

                        const dateObj = new Date(response.submitted_at);
                        const month = dateObj.getMonth() + 1; // 0-based month
                        const day = dateObj.getDate();
                        const date = `${month}/${day}`;

                        

                        const existingDate = acc.find((d) => d.date === date);
                        if (existingDate) {
                          existingDate.count += 1;
                          
                        } else {
                          acc.push({
                            date,
                            count: 1,
                            cumulative: 0,
                          });
                        }

                        // 누적 응답수 계산
                        acc.forEach((dayData, index) => {
                          if (index === 0) {
                            dayData.cumulative = dayData.count;
                          } else {
                            dayData.cumulative =
                              acc[index - 1].cumulative + dayData.count;
                          }
                          
                        });

                        return acc;
                      }, [])
                      .sort((a, b) => {
                        // 날짜순으로 정렬
                        const dateA = new Date(a.date);
                        const dateB = new Date(b.date);
                        return dateA.getTime() - dateB.getTime();
                      })
                  : [];

                setDailyParticipationData(dailyData);
              }
            } else {
              // 설문이 없으면 기본 데이터만 설정
              setParticipationData({
                totalStudents: studentsData.length,
                participatedStudents: 0,
                nonParticipatedStudents: studentsData.length,
                completionRate: 0,
              });

              setStudentParticipationList([]);
              setDailyParticipationData([]);
            }
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("❌ 실제 데이터 로드 실패:", error);
        console.error("❌ 에러 상세:", {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        setLoading(false);
      }
    };

    loadRealData();
  }, [currentUser, authLoading, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
          <p className="mt-2 text-sm text-gray-500">
            브라우저 개발자 도구 콘솔을 확인해주세요
          </p>
        </div>
      </div>
    );
  }

  // dashboardData 조건문 제거 - 테스트 데이터가 정상적으로 로드됨

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      {/* 사용 가이드 모달 */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-fit rounded-lg bg-white p-9 shadow-xl">
            {/* 모달 헤더 */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-gray-950">
                  언제든지 교우관계를 파악할 수 있는 와이즈온스쿨을 만나보세요
                </h2>
                <p className="text-sm text-blue-500">
                  번거로움 없이 처음부터 끝까지 클릭만 하세요
                </p>
              </div>
              <button
                onClick={() => {
                  if (dontShowAgain) {
                    localStorage.setItem("dashboard-guide-hidden", "true");
                  }
                  setShowGuideModal(false);
                }}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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

            {/* 모달 내용 */}
            <div className="flex items-center gap-5">
              {/* 왼쪽: 기능 설명 */}
              <div className="flex flex-col gap-3">
                <div className="space-y-3">
                  {/* 기능 1 */}
                  <div className="relative flex items-start space-x-4 after:absolute after:left-[9px] after:top-[19px] after:h-[calc(100%-4px)] after:w-[1px] after:border-r after:border-dashed after:border-blue-200 after:content-['']">
                    <img
                      src="/dashboard/calendar.svg"
                      alt="달력 아이콘"
                      className="pt-[2px]"
                    />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-gray-950">
                        오늘 설문(교우관계) 시작
                      </h3>
                      <p className="text-xs text-gray-600">
                        설문 문항 만들지 않음 → 설문템플릿 사용
                      </p>
                      <p className="text-xs text-gray-600">
                        단 1개의 설문으로 교우 만족 폭력 조사
                      </p>
                    </div>
                  </div>

                  {/* 기능 2 */}
                  <div className="relative flex items-start space-x-4 after:absolute after:left-[9px] after:top-[19px] after:h-[calc(100%-4px)] after:w-[1px] after:border-r after:border-dashed after:border-blue-200 after:content-['']">
                    <img
                      src="/dashboard/profile.svg"
                      alt="프로필 아이콘"
                      className="pt-[2px]"
                    />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-gray-950">
                        설문 진행 응답 현황
                      </h3>
                      <p className="text-xs text-gray-600">
                        대시보드 화면으로 학생들의 참여 관리
                      </p>
                    </div>
                  </div>

                  {/* 기능 3 */}
                  <div className="relative flex items-start space-x-4 after:absolute after:left-[9px] after:top-[19px] after:h-[calc(100%-4px)] after:w-[1px] after:border-r after:border-dashed after:border-blue-200 after:content-['']">
                    <img
                      src="/dashboard/check.svg"
                      alt="체크 아이콘"
                      className="pt-[2px]"
                    />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-gray-950">
                        분석과 AI로 LLM 가이드 제공
                      </h3>
                      <p className="text-xs text-gray-600">
                        교우관계 전 후 관계 분석
                      </p>
                      <p className="text-xs text-gray-600">
                        학급 전체와 학생 개인별 분석
                      </p>
                    </div>
                  </div>

                  {/* 기능 4 */}
                  <div className="flex items-start space-x-4">
                    <img
                      src="/dashboard/shield.svg"
                      alt="방패 아이콘"
                      className="pt-[2px]"
                    />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-semibold text-gray-950">
                        교권방어에 도움
                      </h3>
                      <p className="text-xs text-gray-600">
                        데이터 기반 지도 근거 확보
                      </p>
                      <p className="text-xs text-gray-600">
                        허위 신고 차별 주장에 대응 가능
                      </p>
                    </div>
                  </div>
                </div>

                {/* 더 이상 보지 않기 체크박스 */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dontShowAgain"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="dontShowAgain"
                    className="text-xs text-gray-600"
                  >
                    더 이상 보지 않기
                  </label>
                </div>

                {/* 시작하기 버튼 */}
                <div className="flex text-center">
                  <button
                    onClick={() => {
                      if (dontShowAgain) {
                        localStorage.setItem("dashboard-guide-hidden", "true");
                      }
                      setShowGuideModal(false);
                    }}
                    className="w-[230px] rounded-[4px] bg-blue-600 px-5 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                  >
                    시작하기
                  </button>
                </div>
              </div>

              {/* 오른쪽: 이미지 미리보기 */}
              <div className="flex flex-col gap-1">
                <img
                  src="/dashboard/card_top.png"
                  alt="상단 미리보기 이미지"
                  className="w-[344px]"
                />
                <img
                  src="/dashboard/card_bottom.png"
                  alt="하단 미리보기 이미지"
                  className="w-[344px]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 페이지 제목 */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="py-6">
          <div className="flex items-center justify-center space-x-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedProject
                ? surveyProjects.find((p) => p.id === selectedProject)?.title ||
                  "교우관계 조사"
                : "교우관계 조사"}
            </h1>

            {/* 설문 상태 */}
            <div
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                selectedProject &&
                surveyProjects.find((p) => p.id === selectedProject)?.status
                  ? getStatusStyle(
                      surveyProjects.find((p) => p.id === selectedProject)
                        ?.status || "",
                    )
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {selectedProject &&
              surveyProjects.find((p) => p.id === selectedProject)?.status
                ? getStatusLabel(
                    surveyProjects.find((p) => p.id === selectedProject)
                      ?.status || "",
                  )
                : "상태 없음"}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="pt-6">
        <div className="flex-row gap-6">
          {/* 상단 사이드바 - 설문 프로젝트 목록 */}
          <div className="mb-6 w-full">
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentUser?.role === "school_admin"
                    ? `학교 전체 설문 프로젝트 총 ${surveyProjects.length}개`
                    : currentUser?.role === "grade_teacher"
                      ? `${currentUser?.grade_level || gradeLevel}학년 설문 프로젝트 총 ${surveyProjects.length}개`
                      : currentUser?.role === "homeroom_teacher"
                        ? `${gradeLevel}학년 ${classNumber}반 설문 프로젝트 총 ${surveyProjects.length}개`
                        : `설문 프로젝트 총 ${surveyProjects.length}개`}
                </h3>

                {/* 상태 필터 드롭다운 */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    상태:
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => handleStatusFilterChange(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">전체</option>
                    <option value="active">진행중</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
              </div>
              <div className="flex h-fit w-full gap-2 overflow-x-auto">
                {filteredSurveyProjects.length > 0 ? (
                  filteredSurveyProjects.map((project) => (
                    <div
                      key={project.id}
                      className={`min-w-72 cursor-pointer rounded-lg border p-4 transition-all duration-200 ${
                        project.isSelected
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      }`}
                      onClick={() => handleProjectSelect(project.id)}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <h3
                          className={`w-3/4 truncate text-sm font-medium ${
                            project.isSelected
                              ? "text-blue-900"
                              : "text-gray-900"
                          }`}
                        >
                          {project.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${getStatusStyle(
                            project.status,
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-gray-600">
                        <p>{project.templateType}</p>
                        <p>생성일: {project.date}</p>
                      </div>

                      {/* {project.isSelected && (
                        <div className="mt-3 border-t border-blue-200 pt-2">
                          <div className="flex items-center text-xs text-blue-600">
                            <div className="mr-2 h-2 w-2 rounded-full bg-blue-500"></div>
                            선택됨
                          </div>
                        </div>
                      )} */}
                    </div>
                  ))
                ) : (
                  <div className="flex h-36 w-full items-center justify-center text-gray-500">
                    <div className="text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="mt-2 text-sm">
                        {statusFilter === "all"
                          ? "설문 프로젝트가 없습니다"
                          : `${getStatusLabel(statusFilter)} 상태의 설문이 없습니다`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 현황 파악 */}
          <div className="flex-row">
            {/* 설문 참여 현황 요약 */}
            <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-center text-lg font-semibold text-gray-900">
                {schoolName || "와이즈 초등학교"} [
                {currentUser?.role === "school_admin"
                  ? "학교 전체 모니터링"
                  : currentUser?.role === "grade_teacher"
                    ? `${currentUser?.grade_level || gradeLevel}학년 전체 모니터링`
                    : currentUser?.role === "homeroom_teacher"
                      ? `${gradeLevel}학년 ${classNumber}반 모니터링`
                      : "모니터링"}
                ]
              </h3>
              <div className="grid grid-cols-4 gap-8">
                {/* 설문 참여 예상 학생 수 */}
                <div className="flex flex-col items-center">
                  <div className="mb-2 text-4xl font-bold text-[#3F80EA]">
                    {participationData.totalStudents}
                  </div>
                  <div className="text-center text-sm leading-tight text-gray-600">
                    설문 참여 예상
                    <br />
                    학생 수
                  </div>
                </div>

                {/* 참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2 h-24 w-40">
                    <svg className="h-full w-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={
                          participationData.totalStudents > 0
                            ? 125.6 -
                              (participationData.participatedStudents /
                                participationData.totalStudents) *
                                125.6
                            : 125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        0
                      </text>
                      <text
                        x="78"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        {participationData.participatedStudents}/
                        {participationData.totalStudents}
                      </text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {participationData.participatedStudents}명
                      </span>
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    참여 학생
                  </div>
                </div>

                {/* 미참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2 h-24 w-40">
                    <svg className="h-full w-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#6b7280"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={
                          participationData.totalStudents > 0
                            ? 125.6 -
                              (participationData.nonParticipatedStudents /
                                participationData.totalStudents) *
                                125.6
                            : 125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        0
                      </text>
                      <text
                        x="79"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        {participationData.nonParticipatedStudents}/
                        {participationData.totalStudents}
                      </text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {participationData.nonParticipatedStudents}명
                      </span>
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    미참여 학생
                  </div>
                </div>

                {/* 진행 상태 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-2 h-24 w-40">
                    <svg className="h-full w-full" viewBox="0 0 100 50">
                      {/* 배경 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        strokeLinecap="round"
                      />
                      {/* 진행률 반원 */}
                      <path
                        d="M 10 40 A 40 40 0 0 1 90 40"
                        fill="none"
                        stroke="#8b5cf6"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={
                          participationData.totalStudents > 0
                            ? 125.6 -
                              (participationData.completionRate / 100) * 125.6
                            : 125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        0
                      </text>
                      <text
                        x="80"
                        y="52"
                        textAnchor="start"
                        className="fill-gray-500 text-[8px]"
                      >
                        {participationData.completionRate}%
                      </text>
                    </svg>
                    {/* 중앙 텍스트 */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-900">
                        {participationData.completionRate}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    진행 상태
                  </div>
                </div>
              </div>
            </div>

            {/* 참여 현황 리스트 */}
            <div className="relative mb-6 w-full rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                참여 현황 리스트
              </h3>
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="sticky left-0 z-10 min-w-[70px] max-w-[70px] bg-gray-100 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        번호
                      </th>
                      <th className="sticky left-[70px] z-10 min-w-[94px] max-w-[94px] bg-gray-100 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        이름
                      </th>
                      <th className="sticky left-[164px] z-10 min-w-[118px] max-w-[118px] bg-gray-100 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                        참여상태
                      </th>
                      {selectedProject &&
                        surveyProjects
                          .find((p) => p.id === selectedProject)
                          ?.questions?.map((question: any, index: number) => (
                            <th
                              key={question.id || index}
                              className="tooltip-header"
                              data-tooltip={
                                question.text || `질문 ${index + 1}`
                              }
                            >
                              {question.text || `질문 ${index + 1}`}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {studentParticipationList.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-gray-50 px-3 py-3 text-center text-xs text-gray-900">
                          {student.id}
                        </td>
                        <td className="sticky left-[70px] z-10 whitespace-nowrap bg-gray-50 px-3 py-3 text-xs font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="sticky left-[164px] z-10 whitespace-nowrap bg-gray-50 px-3 py-3 text-center">
                          <div className="flex items-center">
                            <div
                              className={`mx-auto h-3.5 w-3.5 rounded-full ${
                                student.participated
                                  ? "bg-green-500"
                                  : "bg-gray-300"
                              }`}
                            ></div>
                          </div>
                        </td>
                        {selectedProject &&
                          surveyProjects
                            .find((p) => p.id === selectedProject)
                            ?.questions?.map((question: any, index: number) => {
                              // 현재 선택된 설문의 응답 데이터에서 해당 학생의 응답 찾기
                              let questionResponse = "";

                              if (student.participated) {
                                // survey_responses 테이블에서 해당 설문과 학생의 응답 찾기
                                const actualStudentId = students?.find(
                                  (s) => s.name === student.name,
                                )?.id;

                                const studentResponse = responses?.find(
                                  (r: any) => r.student_id === actualStudentId,
                                );

                                if (
                                  studentResponse &&
                                  studentResponse.responses
                                ) {
                                  try {
                                    const responseData =
                                      studentResponse.responses as any;

                                    // 다양한 키 형태로 시도
                                    let answerValue = null;

                                    // 1. 원본 질문 ID로 시도
                                    if (responseData[question.id]) {
                                      answerValue = responseData[question.id];
                                    }
                                    // 2. q1, q2 형태인 경우 숫자 키로 변환하여 시도
                                    else if (question.id.startsWith("q")) {
                                      const numericKey =
                                        question.id.substring(1);
                                      if (responseData[numericKey]) {
                                        answerValue = responseData[numericKey];
                                      }
                                    }
                                    // 3. 질문 ID가 숫자인 경우 q 접두사 추가하여 시도
                                    else if (/^\d+$/.test(question.id)) {
                                      const qKey = `q${question.id}`;
                                      if (responseData[qKey]) {
                                        answerValue = responseData[qKey];
                                      }
                                    }
                                    // 4. 모든 키를 순회하며 질문 텍스트와 매칭되는지 확인
                                    else {
                                      for (const key of Object.keys(
                                        responseData,
                                      )) {
                                        if (
                                          key.includes(question.id) ||
                                          question.id.includes(key)
                                        ) {
                                          answerValue = responseData[key];
                                          break;
                                        }
                                      }
                                    }

                                    if (answerValue) {
                                      // UUID를 이름으로 변환하는 함수
                                      const convertUuidToName = (
                                        value: any,
                                      ): string => {
                                        if (Array.isArray(value)) {
                                          // 배열인 경우: 각 UUID를 이름으로 변환
                                          const names = value.map(
                                            (uuid: string) => {
                                              const student = students?.find(
                                                (s: any) => s.id === uuid,
                                              );
                                              return student
                                                ? student.name
                                                : uuid;
                                            },
                                          );
                                          return names.join(", ");
                                        } else if (typeof value === "string") {
                                          // 문자열인 경우: UUID인지 확인하고 이름으로 변환
                                          const student = students?.find(
                                            (s: any) => s.id === value,
                                          );
                                          return student ? student.name : value;
                                        } else {
                                          // 기타 타입은 그대로 반환
                                          return String(value);
                                        }
                                      };

                                      questionResponse =
                                        convertUuidToName(answerValue);
                                    } else {
                                      questionResponse = "응답 없음";
                                    }
                                  } catch (e) {
                                    console.error("응답 데이터 파싱 오류:", e);
                                    questionResponse = "파싱 오류";
                                  }
                                } else {
                                  questionResponse = "응답 데이터 없음";
                                }
                              }

                              return (
                                <td
                                  key={question.id || index}
                                  className="whitespace-nowrap px-3 py-3 text-xs text-gray-900"
                                >
                                  {questionResponse ||
                                    (student.participated ? "응답 없음" : "")}
                                </td>
                              );
                            })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 일별 참여 현황 */}
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-900">
                일별 참여 현황
              </h3>
              <BarChart data={dailyParticipationData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
