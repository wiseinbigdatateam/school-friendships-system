import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { NotificationService } from "../services/notificationService";
import BarChart from "../components/BarChart";
import { useAuth } from "../contexts/AuthContext";

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
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schoolId, setSchoolId] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classNumber, setClassNumber] = useState("");
  const [teacherInfo, setTeacherInfo] = useState({ name: "", role: "" });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [surveyProjects, setSurveyProjects] = useState<Array<SurveyProject>>(
    []
  );
  const [surveyTemplates, setSurveyTemplates] = useState<Array<SurveyTemplate>>(
    []
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

  // 설문 프로젝트 선택 핸들러
  const handleProjectSelect = async (projectId: string) => {
    // 모든 프로젝트의 선택 상태 초기화
    const updatedProjects = surveyProjects.map((project) => ({
      ...project,
      isSelected: project.id === projectId,
    }));

    setSurveyProjects(updatedProjects);
    setSelectedProject(projectId);

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
                students.some((s) => s.id === r.student_id)
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
              (r) => r.student_id === student.id
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

          console.log("✅ 설문 변경 - 최종 일별 참여 데이터:", dailyData);
          setDailyParticipationData(dailyData);

          console.log(
            "✅ 설문 변경에 따른 일별 참여 데이터 업데이트:",
            dailyData
          );
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
        if (!user) {
          console.log("🔍 사용자 정보가 없습니다.");
          setLoading(false);
          return;
        }

        // 최신 사용자 정보 조회 (grade_level, class_number 포함)
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*, schools(name), districts(name)")
          .eq("id", user.id)
          .single();

        if (userError) {
          console.error("❌ 사용자 정보 조회 실패:", userError);
          setLoading(false);
          return;
        }

        console.log("🔍 대시보드 데이터 로드 시작:", {
          userRole: user.role,
          userGrade: userData.grade_level,
          userClass: userData.class_number,
          userSchoolId: userData.school_id
        });

        // 사용자 권한에 따른 데이터 설정
        let schoolId = "";
        let gradeLevel = "";
        let classNumber = "";
        let schoolName = "";
        let teacherName = userData.name || "담임선생님";

        if (user.role === 'homeroom_teacher' && userData.grade_level && userData.class_number) {
          // 담임선생님: 자신의 담당 학년/반
          schoolId = userData.school_id || "";
          gradeLevel = userData.grade_level.toString();
          classNumber = userData.class_number.toString();
          
          if (!schoolId) {
            throw new Error("학교 정보가 설정되지 않았습니다.");
          }
          
          // 학교 이름 조회
          const { data: schoolData } = await supabase
            .from("schools")
            .select("name")
            .eq("id", schoolId)
            .single();
          
          schoolName = schoolData?.name || "알 수 없는 학교";
          
        } else if (user.role === 'grade_teacher' && userData.grade_level) {
          // 학년담당: 해당 학년 전체
          schoolId = userData.school_id || "";
          gradeLevel = userData.grade_level.toString();
          
          if (!schoolId) {
            throw new Error("학교 정보가 설정되지 않았습니다.");
          }
          
          // 학교 이름 조회
          const { data: schoolData } = await supabase
            .from("schools")
            .select("name")
            .eq("id", schoolId)
            .single();
          
          schoolName = schoolData?.name || "알 수 없는 학교";
          
        } else if (user.role === 'school_admin') {
          // 학교 관리자: 해당 학교 전체
          schoolId = userData.school_id || "";
          
          if (!schoolId) {
            throw new Error("학교 정보가 설정되지 않았습니다.");
          }
          
          // 학교 이름 조회
          const { data: schoolData } = await supabase
            .from("schools")
            .select("name")
            .eq("id", schoolId)
            .single();
          
          schoolName = schoolData?.name || "알 수 없는 학교";
          
                         } else if (user.role === 'district_admin') {
          // 교육청 관리자: 해당 교육청 전체
          // district_id는 userData에서 가져와야 함
          const districtId = userData.district_id || "";
           
           if (!districtId) {
             throw new Error("교육청 정보가 설정되지 않았습니다.");
           }
           
           // 교육청 이름 조회
           const { data: districtData } = await supabase
             .from("districts")
             .select("name")
             .eq("id", districtId)
             .single();
           
           schoolName = districtData?.name || "알 수 없는 교육청";
          
        } else if (user.role === 'main_admin') {
          // 시스템 관리자: 전체 시스템
          schoolName = "전체 시스템";
          
        } else {
          throw new Error("알 수 없는 사용자 권한입니다.");
        }

        setSchoolId(schoolId);
        setGradeLevel(gradeLevel);
        setClassNumber(classNumber);
        setSchoolName(schoolName);
        setCurrentUser(user);
        setTeacherInfo({
          name: teacherName,
          role: user.role,
        });

        console.log("🔍 사용자 권한별 설정 완료:", {
          schoolId,
          gradeLevel,
          classNumber,
          schoolName,
          userRole: user.role
        });

        // 학생 목록 조회 (권한에 따라)
        let studentsQuery = supabase
          .from("students")
          .select("*")
          .eq("is_active", true);

        if (user.role === 'homeroom_teacher' && schoolId && gradeLevel && classNumber) {
          // 담임선생님: 자신의 담당 학년/반 학생만
          studentsQuery = studentsQuery
            .eq("current_school_id", schoolId)
            .eq("grade", gradeLevel)
            .eq("class", classNumber);
            
        } else if (user.role === 'grade_teacher' && schoolId && gradeLevel) {
          // 학년담당: 해당 학년 전체 학생
          studentsQuery = studentsQuery
            .eq("current_school_id", schoolId)
            .eq("grade", gradeLevel);
            
        } else if (user.role === 'school_admin' && schoolId) {
          // 학교 관리자: 해당 학교 전체 학생
          studentsQuery = studentsQuery.eq("current_school_id", schoolId);
          
        } else if (user.role === 'district_admin') {
          // 교육청 관리자: 해당 교육청 전체 학생
          const districtId = userData.district_id || "";
          if (districtId) {
            // 교육청에 속한 학교들의 학생들 조회
            const { data: schoolIds } = await supabase
              .from("schools")
              .select("id")
              .eq("district_id", districtId);
            
            if (schoolIds && schoolIds.length > 0) {
              const schoolIdList = schoolIds.map(s => s.id);
              studentsQuery = studentsQuery.in("current_school_id", schoolIdList);
            }
          }
          
        } else if (user.role === 'main_admin') {
          // 시스템 관리자: 전체 학생
          // 필터링 없이 전체 조회
        }

        const { data: studentsData, error: studentsError } = await studentsQuery;

        if (studentsError) {
          console.error("❌ 학생 조회 실패:", studentsError);
          setLoading(false);
          return;
        }

        setStudents(studentsData || []);

        if (studentsData && studentsData.length > 0) {
          // 설문 목록 조회 (권한에 따라)
          console.log("🔍 설문 조회 시작:", { schoolId, userRole: user.role });
          
          let surveysQuery = supabase
            .from("surveys")
            .select("*")
            .in("status", ["active", "completed"])
            .order("created_at", { ascending: false });

          if (user.role === 'homeroom_teacher' && schoolId) {
            // 담임선생님: 해당 학교의 자신 담당 학년/반 설문
            surveysQuery = surveysQuery.eq("school_id", schoolId);
            
          } else if (user.role === 'grade_teacher' && schoolId) {
            // 학년담당: 해당 학교의 해당 학년 설문
            surveysQuery = surveysQuery.eq("school_id", schoolId);
            
          } else if (user.role === 'school_admin' && schoolId) {
            // 학교 관리자: 해당 학교 전체 설문
            surveysQuery = surveysQuery.eq("school_id", schoolId);
            
          } else if (user.role === 'district_admin') {
            // 교육청 관리자: 해당 교육청 전체 설문
            const districtId = userData.district_id || "";
            if (districtId) {
              const { data: schoolIds } = await supabase
                .from("schools")
                .select("id")
                .eq("district_id", districtId);
              
              if (schoolIds && schoolIds.length > 0) {
                const schoolIdList = schoolIds.map(s => s.id);
                surveysQuery = surveysQuery.in("school_id", schoolIdList);
              }
            }
            
          } else if (user.role === 'main_admin') {
            // 시스템 관리자: 전체 설문
            // 필터링 없이 전체 조회
          }

          const { data: surveys, error: surveysError } = await surveysQuery;

          if (surveysError) {
            console.error("❌ 설문 조회 실패:", surveysError);
          } else {
            console.log("✅ 원본 설문 데이터:", surveys);
            console.log("📊 총 설문 개수:", surveys?.length || 0);
            
            // 권한에 따른 추가 필터링
            let filteredSurveys = surveys || [];

            if (user.role === 'homeroom_teacher' && gradeLevel && classNumber) {
              // 담임선생님: 자신의 담당 학년/반 설문만
              filteredSurveys = surveys?.filter((survey) => {
                const targetGrades = survey.target_grades;
                const targetClasses = survey.target_classes;

                const gradeMatch = Array.isArray(targetGrades)
                  ? targetGrades.includes(gradeLevel)
                  : targetGrades === gradeLevel;

                const classMatch = Array.isArray(targetClasses)
                  ? targetClasses.includes(classNumber)
                  : targetClasses === classNumber;

                return gradeMatch && classMatch;
              }) || [];
              
            } else if (user.role === 'grade_teacher' && gradeLevel) {
              // 학년담당: 해당 학년 설문만
              filteredSurveys = surveys?.filter((survey) => {
                const targetGrades = survey.target_grades;
                const gradeMatch = Array.isArray(targetGrades)
                  ? targetGrades.includes(gradeLevel)
                  : targetGrades === gradeLevel;
                return gradeMatch;
              }) || [];
            }

            console.log("🎯 필터링 후 설문 개수:", filteredSurveys.length);
            console.log(
              "📝 필터링 된 설문들:",
              filteredSurveys.map((s) => ({ title: s.title, status: s.status }))
            );

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
              })
            );

            setSurveyProjects(projects);

            // 설문 템플릿 정보 저장
            const templateIds = filteredSurveys
              .filter((survey) => survey.template_id)
              .map((survey) => survey.template_id)
              .filter((id): id is string => id !== null);

            if (templateIds.length > 0) {
              try {
                const { data: templatesData, error: templatesError } =
                  await supabase
                    .from("survey_templates")
                    .select("id, name, metadata")
                    .in("id", templateIds);

                if (!templatesError && templatesData) {
                  const processedTemplates = templatesData.map((template) => ({
                    id: template.id,
                    name: template.name,
                    metadata: template.metadata as any,
                  }));
                  setSurveyTemplates(processedTemplates);
                  console.log("설문 템플릿 정보:", processedTemplates);
                }
              } catch (error) {
                console.error("템플릿 정보 조회 실패:", error);
              }
            }

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
                      studentsData.some((s) => s.id === r.student_id)
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
                    (r) => r.student_id === student.id
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
                              (s) => s.id === friendId
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
                              (s) => s.id === friendId
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
                              (s) => s.id === friendId
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
                              (s) => s.id === friendId
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

                        console.log(
                          `🔍 응답 날짜 처리: ${response.submitted_at} → ${date}`
                        );

                        const existingDate = acc.find((d) => d.date === date);
                        if (existingDate) {
                          existingDate.count += 1;
                          console.log(
                            `✅ 기존 날짜 ${date} 업데이트: ${existingDate.count}명`
                          );
                        } else {
                          acc.push({
                            date,
                            count: 1,
                            cumulative: 0,
                          });
                          console.log(`🆕 새 날짜 ${date} 추가: 1명`);
                        }

                        // 누적 응답수 계산
                        acc.forEach((dayData, index) => {
                          if (index === 0) {
                            dayData.cumulative = dayData.count;
                          } else {
                            dayData.cumulative =
                              acc[index - 1].cumulative + dayData.count;
                          }
                          console.log(
                            `📊 ${dayData.date}: 응답수 ${dayData.count}명, 누적 ${dayData.cumulative}명`
                          );
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
        setLoading(false);
      }
    };

    loadRealData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // dashboardData 조건문 제거 - 테스트 데이터가 정상적으로 로드됨

  return (
    <div className="max-w-7xl pb-16 mx-auto min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8">
      {/* 페이지 제목 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="py-6">
          <div className="flex items-center justify-center space-x-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {selectedProject
                ? surveyProjects.find((p) => p.id === selectedProject)?.title ||
                  "교우관계 조사"
                : "교우관계 조사"}
            </h1>

            {/* 설문 상태 */}
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedProject &&
                surveyProjects.find((p) => p.id === selectedProject)?.status
                  ? getStatusStyle(
                      surveyProjects.find((p) => p.id === selectedProject)
                        ?.status || ""
                    )
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {selectedProject &&
              surveyProjects.find((p) => p.id === selectedProject)?.status
                ? getStatusLabel(
                    surveyProjects.find((p) => p.id === selectedProject)
                      ?.status || ""
                  )
                : "상태 없음"}
            </div>
          </div>
          
          {/* 사용자 권한 정보 표시 */}
          <div className="mt-4 px-6">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
              <span>학교: {schoolName}</span>
              {user?.role === 'homeroom_teacher' && gradeLevel && classNumber && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {gradeLevel}학년 {classNumber}반 담임
                </span>
              )}
              {user?.role === 'grade_teacher' && gradeLevel && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  {gradeLevel}학년 담당
                </span>
              )}
              {user?.role === 'school_admin' && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                  학교 관리자
                </span>
              )}
              {user?.role === 'district_admin' && (
                <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                  교육청 관리자
                </span>
              )}
              {user?.role === 'main_admin' && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full">
                  시스템 관리자
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="pt-6">
        <div className="flex-row gap-6">
          {/* 상단 사이드바 - 설문 프로젝트 목록 */}
          <div className="w-full mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                설문 프로젝트 총 {surveyProjects.length}개
              </h3>
              <div className="flex gap-2 w-full h-fit overflow-x-auto">
                {surveyProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 min-w-72 h-36 border rounded-lg cursor-pointer transition-all duration-200 ${
                      project.isSelected
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                    onClick={() => handleProjectSelect(project.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3
                        className={`w-3/4 font-medium truncate text-sm ${
                          project.isSelected ? "text-blue-900" : "text-gray-900"
                        }`}
                      >
                        {project.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusStyle(
                          project.status
                        )}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-gray-600">
                      <p>{project.templateType}</p>
                      <p>생성일: {project.date}</p>
                    </div>

                    {project.isSelected && (
                      <div className="mt-3 pt-2 border-t border-blue-200">
                        <div className="flex items-center text-xs text-blue-600">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          선택됨
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 현황 파악 */}
          <div className="flex-row">
            {/* 설문 참여 현황 요약 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
                {schoolName || "와이즈 초등학교"} [{gradeLevel}학년{" "}
                {classNumber}반]
              </h3>
              <div className="grid grid-cols-4 gap-8">
                {/* 설문 참여 예상 학생 수 */}
                <div className="flex flex-col items-center">
                  <div className="text-4xl font-bold text-[#3F80EA] mb-2">
                    {participationData.totalStudents}
                  </div>
                  <div className="text-sm text-gray-600 text-center leading-tight">
                    설문 참여 예상
                    <br />
                    학생 수
                  </div>
                </div>

                {/* 참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
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
                          125.6 -
                          (participationData.participatedStudents /
                            participationData.totalStudents) *
                            125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
                      >
                        0
                      </text>
                      <text
                        x="83"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
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
                  <div className="text-sm text-gray-600 text-center">
                    참여 학생
                  </div>
                </div>

                {/* 미참여 학생 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
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
                          125.6 -
                          (participationData.nonParticipatedStudents /
                            participationData.totalStudents) *
                            125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
                      >
                        0
                      </text>
                      <text
                        x="79"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
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
                  <div className="text-sm text-gray-600 text-center">
                    미참여 학생
                  </div>
                </div>

                {/* 진행 상태 반원형 프로그레스 */}
                <div className="flex flex-col items-center">
                  <div className="relative w-40 h-24 mb-2">
                    <svg className="w-full h-full" viewBox="0 0 100 50">
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
                          125.6 -
                          (participationData.completionRate / 100) * 125.6
                        }
                      />
                      {/* 시작점과 끝점 라벨 */}
                      <text
                        x="7"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
                      >
                        0
                      </text>
                      <text
                        x="80"
                        y="52"
                        textAnchor="start"
                        className="text-[8px] fill-gray-500"
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
                  <div className="text-sm text-gray-600 text-center">
                    진행 상태
                  </div>
                </div>
              </div>
            </div>

            {/* 참여 현황 리스트 */}
            <div className="bg-white w-full rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                참여 현황 리스트
              </h3>
              <div className="w-full overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="min-w-[70px] max-w-[70px] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        번호
                      </th>
                      <th className="min-w-[94px] max-w-[94px] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이름
                      </th>
                      <th className="min-w-[118px] max-w-[118px] px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        참여상태
                      </th>
                      {selectedProject &&
                        surveyProjects
                          .find((p) => p.id === selectedProject)
                          ?.questions?.map((question: any, index: number) => (
                            <th
                              key={question.id || index}
                              className="min-w-[176px] max-w-[176px] px-3 py-3 truncate text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {question.text || `질문 ${index + 1}`}
                            </th>
                          ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {studentParticipationList.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-center whitespace-nowrap text-xs text-gray-900">
                          {student.id}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-3 py-3 text-center whitespace-nowrap">
                          <div className="flex  items-center">
                            <div
                              className={`w-3.5 h-3.5 mx-auto rounded-full ${
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
                                  (s) => s.name === student.name
                                )?.id;

                                const studentResponse = responses?.find(
                                  (r: any) => r.student_id === actualStudentId
                                );

                                if (
                                  studentResponse &&
                                  studentResponse.responses
                                ) {
                                  try {
                                    const responseData =
                                      studentResponse.responses as any;
                                    const answerValue = responseData[question.id];
                                    
                                    if (answerValue) {
                                      // UUID를 이름으로 변환하는 함수
                                      const convertUuidToName = (value: any): string => {
                                        if (Array.isArray(value)) {
                                          // 배열인 경우: 각 UUID를 이름으로 변환
                                          const names = value.map((uuid: string) => {
                                            const student = students?.find((s: any) => s.id === uuid);
                                            return student ? student.name : uuid;
                                          });
                                          return names.join(", ");
                                        } else if (typeof value === 'string') {
                                          // 문자열인 경우: UUID인지 확인하고 이름으로 변환
                                          const student = students?.find((s: any) => s.id === value);
                                          return student ? student.name : value;
                                        } else {
                                          // 기타 타입은 그대로 반환
                                          return String(value);
                                        }
                                      };
                                      
                                      questionResponse = convertUuidToName(answerValue);
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
                                  className="px-3 py-3 whitespace-nowrap text-xs text-gray-900"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
