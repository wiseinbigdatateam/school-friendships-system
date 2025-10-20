import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface StudentResponse {
  id: string;
  name: string;
  number: string; // student_number 또는 임시 번호
  grade: string;
  class: string;
  hasResponded: boolean;
  responseTime?: string;
  completionRate?: number;
}

interface SurveyMonitoringData {
  id: string;
  title: string;
  totalStudents: number;
  respondedStudents: number;
  responseRate: number;
  timeRemaining: string;
  status: string;
  startDate: string;
  endDate: string;
  students: StudentResponse[];
}

const SurveyMonitoring: React.FC = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [monitoringData, setMonitoringData] =
    useState<SurveyMonitoringData | null>(null);
  // const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMonitoringData();
  }, [surveyId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadMonitoringData, 30000); // 30초마다 새로고침
      return () => clearInterval(interval);
    }
  }, [autoRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMonitoringData = async () => {
    try {
      setLoading(true);

      if (!surveyId) {
        console.error("설문 ID가 없습니다.");
        return;
      }

      // 1. 설문 정보 로드
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("*")
        .eq("id", surveyId)
        .single();

      if (surveyError) throw surveyError;

      if (!surveyData) {
        console.error("설문을 찾을 수 없습니다.");
        return;
      }

      // 2. 설문 대상 학생들 로드 (담임선생님 권한에 따라 필터링)
      if (!surveyData.school_id) {
        throw new Error("설문에 학교 ID가 설정되지 않았습니다.");
      }

      let studentsQuery = supabase
        .from("students")
        .select("id, name, grade, class, current_school_id, student_number")
        .eq("current_school_id", surveyData.school_id)
        .eq("is_active", true);

      // 담임선생님인 경우 자신의 담당 학급만 필터링
      if (user?.role === "homeroom_teacher" && user?.grade && user?.class) {
        
        studentsQuery = studentsQuery
          .eq("grade", user.grade)
          .eq("class", user.class);
      } else if (user?.role === "grade_teacher" && user?.grade) {
        // 학년담당인 경우 해당 학년만 필터링
        

        studentsQuery = studentsQuery.eq("grade", user.grade);
      } else if (
        user?.role === "school_admin" ||
        user?.role === "district_admin" ||
        user?.role === "main_admin"
      ) {
        // 관리자는 모든 학생 조회 가능
       

        // 설문의 target_grades와 target_classes가 설정된 경우 해당 범위만 조회
        if (surveyData.target_grades && surveyData.target_grades.length > 0) {
          studentsQuery = studentsQuery.in("grade", surveyData.target_grades);
        }
        if (surveyData.target_classes && surveyData.target_classes.length > 0) {
          studentsQuery = studentsQuery.in("class", surveyData.target_classes);
        }
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      // 3. 설문 응답 데이터 로드
      const { data: responsesData, error: responsesError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", surveyId);

      if (responsesError) throw responsesError;

      // 4. 응답 현황 데이터 구성
      const students =
        studentsData?.map((student) => {
          const response = responsesData?.find(
            (r) => r.student_id === student.id,
          );
          return {
            id: student.id,
            name: student.name,
            number: student.student_number || student.id.slice(-2), // student_number 사용, 없으면 임시 생성
            grade: student.grade,
            class: student.class,
            hasResponded: !!response,
            responseTime: response?.submitted_at
              ? new Date(response.submitted_at).toLocaleString("ko-KR")
              : undefined,
            completionRate: response ? 100 : 0,
          };
        }) || [];

      // 5. 모니터링 데이터 구성
      const monitoringData: SurveyMonitoringData = {
        id: surveyId,
        title: surveyData.title,
        totalStudents: students.length,
        respondedStudents: students.filter((s) => s.hasResponded).length,
        responseRate:
          students.length > 0
            ? Math.round(
                (students.filter((s) => s.hasResponded).length /
                  students.length) *
                  100,
              )
            : 0,
        timeRemaining: calculateTimeRemaining(surveyData.end_date),
        status: surveyData.status,
        startDate: surveyData.start_date,
        endDate: surveyData.end_date,
        students,
      };

      setMonitoringData(monitoringData);
      setError(null);
    } catch (error) {
      console.error("모니터링 데이터 로드 실패:", error);
      setError("모니터링 데이터를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 남은 시간 계산 함수
  const calculateTimeRemaining = (endDate: string): string => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();

    if (diff <= 0) return "종료됨";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}일 ${hours}시간`;
    } else if (hours > 0) {
      return `${hours}시간`;
    } else {
      return "1시간 미만";
    }
  };

  // const handleStudentSelect = (studentId: string, checked: boolean) => {
  //   if (checked) {
  //     setSelectedStudents(prev => [...prev, studentId]);
  //   } else {
  //     setSelectedStudents(prev => prev.filter(id => id !== studentId));
  //   }
  // };

  // const handleSelectAll = (responded: boolean) => {
  //   const targetStudents = monitoringData?.students.filter(s => s.hasResponded === responded) || [];
  //   setSelectedStudents(targetStudents.map(s => s.id));
  // };

  // const handleSendReminder = () => {
  //   if (selectedStudents.length === 0) {
  //     alert('독려 메시지를 보낼 학생을 선택해주세요.');
  //     return;
  //   }

  //   const selectedNames = monitoringData?.students
  //     .filter(s => selectedStudents.includes(s.id))
  //     .map(s => s.name) || [];

  //   if (window.confirm(`선택된 ${selectedStudents.length}명의 학생에게 독려 메시지를 발송하시겠습니까?\n\n${selectedNames.join(', ')}`)) {
  //     // TODO: 실제 독려 메시지 발송
  //     alert('독려 메시지가 발송되었습니다!');
  //     setSelectedStudents([]);
  //   }
  // };

  const handleExportData = () => {
    if (!monitoringData) return;

    // CSV 데이터 생성
    const csvContent =
      `번호,이름,응답여부,응답시간,완료율\n` +
      monitoringData.students
        .map(
          (student) =>
            `${parseInt(student.number)},${student.name},${student.hasResponded ? "O" : "X"},${student.responseTime || "-"},${student.completionRate || 0}%`,
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `설문응답현황_${monitoringData.title}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!monitoringData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            설문을 찾을 수 없습니다
          </h2>
          <button
            onClick={() => navigate("/survey-management")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            설문 관리로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const respondedStudents = monitoringData.students.filter(
    (s) => s.hasResponded,
  );
  const notRespondedStudents = monitoringData.students.filter(
    (s) => !s.hasResponded,
  );

  // 학급별로 학생들을 그룹화하는 함수
  const groupStudentsByClass = (students: StudentResponse[]) => {
    const grouped: { [key: string]: StudentResponse[] } = {};

    students.forEach((student) => {
      const classKey = `${student.grade}학년 ${student.class}반`;
      if (!grouped[classKey]) {
        grouped[classKey] = [];
      }
      grouped[classKey].push(student);
    });

    return grouped;
  };

  // 학급별 응답률 계산 함수
  const calculateClassResponseRate = (classKey: string) => {
    const respondedCount = groupedRespondedStudents[classKey]?.length || 0;
    const notRespondedCount =
      groupedNotRespondedStudents[classKey]?.length || 0;
    const totalCount = respondedCount + notRespondedCount;

    if (totalCount === 0) return 0;
    return Math.round((respondedCount / totalCount) * 100);
  };

  const groupedRespondedStudents = groupStudentsByClass(respondedStudents);
  const groupedNotRespondedStudents =
    groupStudentsByClass(notRespondedStudents);

  // 모든 학급 키를 가져오기
  const allClassKeys = Array.from(
    new Set([
      ...Object.keys(groupedRespondedStudents),
      ...Object.keys(groupedNotRespondedStudents),
    ]),
  ).sort();

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 pb-16 sm:px-6 lg:px-8">
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              {monitoringData.title}
            </h1>
            <p className="text-gray-600">
              실시간 응답 현황을 모니터링하고 관리합니다.
            </p>
            {/* 담임선생님 권한 정보 표시 */}
            {user?.role === "homeroom_teacher" &&
              user?.grade &&
              user?.class && (
                <div className="mt-2 rounded-lg bg-blue-50 p-3">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">담임 권한:</span>{" "}
                    {user.grade}학년 {user.class}반 담임
                  </p>
                </div>
              )}
            {user?.role === "grade_teacher" && user?.grade && (
              <div className="mt-2 rounded-lg bg-green-50 p-3">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">학년담당 권한:</span>{" "}
                  {user.grade}학년 담당
                </p>
              </div>
            )}
            {(user?.role === "school_admin" ||
              user?.role === "district_admin" ||
              user?.role === "main_admin") && (
              <div className="mt-2 rounded-lg bg-purple-50 p-3">
                <p className="text-sm text-purple-800">
                  <span className="font-semibold">관리자 권한:</span> 전체 학생
                  조회 가능
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">자동 새로고침</span>
            </label>
            <button
              onClick={loadMonitoringData}
              className="rounded-lg bg-gray-100 px-3 py-2 text-gray-700 hover:bg-gray-200"
            >
              새로고침
            </button>
            {/* <button
              onClick={handleExportData}
              className="rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700"
            >
              데이터 내보내기
            </button> */}
          </div>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 통계 카드 */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="rounded-lg bg-blue-100 p-2">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">전체 학생</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.totalStudents}명
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="rounded-lg bg-green-100 p-2">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">응답 완료</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.respondedStudents}명
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="rounded-lg bg-yellow-100 p-2">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">응답률</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.responseRate}%
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center">
            <div className="rounded-lg bg-red-100 p-2">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">남은 시간</p>
              <p className="text-2xl font-bold text-gray-900">
                {monitoringData.timeRemaining}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 목록 */}
      <div className="space-y-6">
        {/* 학급별 탭 */}
        {allClassKeys.length > 1 && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {allClassKeys.map((classKey) => (
                <button
                  key={classKey}
                  className="border-b-2 border-transparent px-1 py-2 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  {classKey}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* 학급별 학생 목록 */}
        {allClassKeys.map((classKey) => (
          <div
            key={classKey}
            className="rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div className="border-b border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {classKey}
              </h3>
              <div className="mt-2 flex space-x-4 text-sm text-gray-600">
                <span>
                  응답 완료: {groupedRespondedStudents[classKey]?.length || 0}명
                </span>
                <span>
                  미응답: {groupedNotRespondedStudents[classKey]?.length || 0}명
                </span>
                <span>응답률: {calculateClassResponseRate(classKey)}%</span>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 응답 완료 학생 */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-900">
                    응답 완료 ({groupedRespondedStudents[classKey]?.length || 0}
                    명)
                  </h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {groupedRespondedStudents[classKey]?.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg bg-green-50 p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {parseInt(student.number)}번 {student.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {student.responseTime}
                          </p>
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                          완료
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500">
                        응답 완료한 학생이 없습니다.
                      </p>
                    )}
                  </div>
                </div>

                {/* 미응답 학생 */}
                <div>
                  <h4 className="mb-3 text-sm font-medium text-gray-900">
                    미응답 ({groupedNotRespondedStudents[classKey]?.length || 0}
                    명)
                  </h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {groupedNotRespondedStudents[classKey]?.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between rounded-lg bg-gray-100 p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {parseInt(student.number)}번 {student.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            아직 응답하지 않음
                          </p>
                        </div>
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-800">
                          미응답
                        </span>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500">
                        미응답 학생이 없습니다.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/survey-management")}
        className="mt-3 flex items-center justify-self-end rounded-lg bg-gray-400 px-3 py-2 text-white hover:bg-gray-500"
      >
        <svg
          className="mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        설문 관리로 돌아가기
      </button>
      {/* 독려 메시지 버튼 */}
      {/* {selectedStudents.length > 0 && (
          <div className="fixed bottom-6 right-6">
            <button
              onClick={handleSendReminder}
              className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              선택된 {selectedStudents.length}명에게 독려 메시지 보내기
            </button>
          </div>
        )} */}
    </div>
  );
};

export default SurveyMonitoring;
