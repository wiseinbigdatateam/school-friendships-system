import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

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
  yes_count: number;
  no_count: number;
  yes_students?: string[];
  no_students?: string[];
}

const ClassSurvey: React.FC = () => {
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<string>("");
  const [viewMode, setViewMode] = useState<"names" | "graphs">("names");
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // 상태를 한글로 변환하는 함수
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "active":
        return "진행중";
      case "completed":
        return "완료";
      // case 'draft':
      //   return '작성중';
      // case 'archived':
      //   return '보관';
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
      // case 'draft':
      //   return 'bg-gray-100 text-gray-800';
      // case 'archived':
      //   return 'bg-yellow-100 text-yellow-800';
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      fetchChartData();
    }
  }, [selectedSurvey]);

  const fetchSurveys = async () => {
    try {
      console.log("Fetching surveys...");

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

      // 카테고리가 "학교폭력" 또는 "만족도"인 템플릿 ID들 찾기
      const targetTemplateIds = templates
        .filter((template: any) => {
          const metadata = template.metadata;
          console.log("Template metadata:", template.name, metadata);
          return (
            metadata &&
            metadata.category &&
            (metadata.category === "학교폭력" || metadata.category === "만족도")
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

      // 해당 템플릿을 사용하는 설문들 가져오기 (active와 completed 상태만)
      const { data, error } = await supabase
        .from("surveys")
        .select("id, title, created_at, template_id, status")
        .in("template_id", targetTemplateIds)
        .in("status", ["active", "completed"]) // draft와 archived 제외
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Survey error:", error);
        throw error;
      }

      console.log("Surveys found:", data);

      if (data && data.length > 0) {
        // 템플릿 정보와 함께 데이터 구성
        const surveysWithTemplates = data.map((survey: any) => {
          const template = templates.find(
            (t: any) => t.id === survey.template_id
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
        setSelectedSurvey(surveysWithTemplates[0].id);
      } else {
        setSurveys([]);
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
      setSurveys([]);
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
      console.log("Responses data:", responsesData);

      // 설문 정보 가져오기
      const { data: surveyData, error: surveyError } = await supabase
        .from("surveys")
        .select("questions, template_id, school_id")
        .eq("id", selectedSurvey)
        .single();

      if (surveyError) throw surveyError;
      console.log("Survey data:", surveyData);

      // 설문의 학교 ID를 사용하여 학생 정보 가져오기
      let schoolId = surveyData.school_id;

      if (!schoolId) {
        // 설문에 학교 ID가 없으면 현재 사용자의 학교 ID 사용
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: userProfile } = await supabase
            .from("users")
            .select("school_id")
            .eq("id", user.id)
            .single();

          if (userProfile?.school_id) {
            schoolId = userProfile.school_id;
          }
        }

        // 사용자에게 학교 ID가 없으면 첫 번째 학교 사용
        if (!schoolId) {
          const { data: firstSchool } = await supabase
            .from("schools")
            .select("id")
            .limit(1)
            .single();

          if (firstSchool) {
            schoolId = firstSchool.id;
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
      console.log("Students data:", studentsData);

      // 응답 데이터를 차트 데이터로 변환
      if (responsesData && surveyData && surveyData.questions) {
        const questions = surveyData.questions as any[];
        console.log("Questions from survey:", questions);

        const chartDataArray: ChartData[] = questions.map(
          (question: any, index: number) => {
            // 답변 옵션이 있는 경우 (학교폭력, 만족도 설문)
            if (question.answer_options) {
              const yesCount = responsesData.filter(
                (response: any) =>
                  response.responses &&
                  response.responses[`q${index + 1}`] === "1"
              ).length;

              const noCount = responsesData.filter(
                (response: any) =>
                  response.responses &&
                  response.responses[`q${index + 1}`] === "2"
              ).length;

              return {
                question:
                  question.text || question.question || `질문 ${index + 1}`,
                yes_count: yesCount,
                no_count: noCount,
                yes_students: responsesData
                  .filter(
                    (response: any) =>
                      response.responses &&
                      response.responses[`q${index + 1}`] === "1"
                  )
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
                no_students: responsesData
                  .filter(
                    (response: any) =>
                      response.responses &&
                      response.responses[`q${index + 1}`] === "2"
                  )
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
              };
            } else {
              // 답변 옵션이 없는 경우 (교우관계 설문 등)
              const yesCount = responsesData.filter(
                (response: any) =>
                  response.responses &&
                  response.responses[`q${index + 1}`] &&
                  Array.isArray(response.responses[`q${index + 1}`]) &&
                  response.responses[`q${index + 1}`].length > 0
              ).length;

              const noCount = responsesData.filter(
                (response: any) =>
                  response.responses &&
                  response.responses[`q${index + 1}`] &&
                  Array.isArray(response.responses[`q${index + 1}`]) &&
                  response.responses[`q${index + 1}`].length === 0
              ).length;

              return {
                question:
                  question.text || question.question || `질문 ${index + 1}`,
                yes_count: yesCount,
                no_count: noCount,
                yes_students: responsesData
                  .filter(
                    (response: any) =>
                      response.responses &&
                      response.responses[`q${index + 1}`] &&
                      Array.isArray(response.responses[`q${index + 1}`]) &&
                      response.responses[`q${index + 1}`].length > 0
                  )
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
                no_students: responsesData
                  .filter(
                    (response: any) =>
                      response.responses &&
                      response.responses[`q${index + 1}`] &&
                      Array.isArray(response.responses[`q${index + 1}`]) &&
                      response.responses[`q${index + 1}`].length === 0
                  )
                  .map((response: any) => {
                    const student = studentsData?.find(
                      (s: any) => s.id === response.student_id
                    );
                    return student ? student.name : "알 수 없는 학생";
                  }),
              };
            }
          }
        );

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen pb-16 bg-gray-50 flex-col">
      {/* 상단 사이드바 */}
      <div className="w-full bg-white rounded-lg border border-gray-200 h-fit mb-4">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            분석 대상 리스트 총{surveys.length}개
          </h2>

          <div className="flex gap-2 w-full h-fit overflow-x-auto">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className={`p-4 min-w-72 h-36 rounded-lg border cursor-pointer transition-colors ${
                  selectedSurvey === survey.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedSurvey(survey.id)}
              >
                <h3 className="font-medium text-gray-900 mb-2">
                  {survey.title}
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    카테고리 :{" "}
                    {survey.survey_templates?.metadata?.category ||
                      "알 수 없음"}
                  </p>
                  <p>
                    상태 :{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                        survey.status
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
        {/* 상단 헤더 */}
        <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-semibold text-gray-900">학급 조사</h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setViewMode("names")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === "names"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                학생이름과 보기
              </button>
              <button
                onClick={() => setViewMode("graphs")}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  viewMode === "graphs"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                그래프만 보기
              </button>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="pt-6">
          {selectedSurvey && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {surveys.find((s) => s.id === selectedSurvey)?.title}
              </h2>

              {viewMode === "graphs" ? (
                <div className="grid grid-cols-2 gap-6">
                  {chartData.map((data, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-6"
                    >
                      <h3 className="text-lg font-medium text-gray-900 mb-6">
                        문항 {(index + 1).toString().padStart(2, "0")}.{" "}
                        {data.question}
                      </h3>

                      {/* 차트 제목 */}
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                          응답 분포
                        </h4>
                      </div>

                      {/* 세로 막대 차트 */}
                      <div className="flex items-end space-x-6 h-48 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex flex-col items-center">
                          <div
                            className="w-12 bg-blue-500 rounded-t transition-all duration-300"
                            style={{
                              height: `${Math.max(
                                (data.yes_count /
                                  Math.max(data.yes_count + data.no_count, 1)) *
                                  180,
                                30
                              )}px`,
                              minHeight: "30px",
                            }}
                          ></div>
                          <span className="text-sm text-gray-600 mt-2">예</span>
                          <span className="text-lg font-semibold text-blue-600">
                            {data.yes_count}
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <div
                            className="w-12 bg-blue-700 rounded-t transition-all duration-300"
                            style={{
                              height: `${Math.max(
                                (data.no_count /
                                  Math.max(data.yes_count + data.no_count, 1)) *
                                  180,
                                30
                              )}px`,
                              minHeight: "30px",
                            }}
                          ></div>
                          <span className="text-sm text-gray-600 mt-2">
                            아니오
                          </span>
                          <span className="text-lg font-semibold text-blue-700">
                            {data.no_count}
                          </span>
                        </div>
                      </div>

                      {/* 디버깅 정보 */}
                      <div className="mt-2 text-xs text-gray-500">
                        <p>
                          차트 데이터: 예 {data.yes_count}명, 아니오{" "}
                          {data.no_count}명
                        </p>
                      </div>

                      {/* 범례 */}
                      <div className="mt-4 flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded"></div>
                          <span className="text-gray-600">예</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-700 rounded"></div>
                          <span className="text-gray-600">아니오</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-8">
                  {chartData.map((data, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-lg border border-gray-200 p-6"
                    >
                      <h3 className="text-lg font-medium text-gray-900 mb-6">
                        문항 {(index + 1).toString().padStart(2, "0")}.{" "}
                        {data.question}
                      </h3>

                      <div className="flex gap-8">
                        {/* 왼쪽: 차트 */}
                        <div className="flex-1">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              응답 분포
                            </h4>
                          </div>

                          {/* 세로 막대 차트 */}
                          <div className="flex items-end space-x-6 h-48 border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex flex-col items-center">
                              <div
                                className="w-12 bg-blue-500 rounded-t transition-all duration-300"
                                style={{
                                  height: `${Math.max(
                                    (data.yes_count /
                                      Math.max(
                                        data.yes_count + data.no_count,
                                        1
                                      )) *
                                      180,
                                    30
                                  )}px`,
                                  minHeight: "30px",
                                }}
                              ></div>
                              <span className="text-sm text-gray-600 mt-2">
                                예
                              </span>
                              <span className="text-lg font-semibold text-blue-600">
                                {data.yes_count}
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <div
                                className="w-12 bg-blue-700 rounded-t transition-all duration-300"
                                style={{
                                  height: `${Math.max(
                                    (data.no_count /
                                      Math.max(
                                        data.yes_count + data.no_count,
                                        1
                                      )) *
                                      180,
                                    30
                                  )}px`,
                                  minHeight: "30px",
                                }}
                              ></div>
                              <span className="text-sm text-gray-600 mt-2">
                                아니오
                              </span>
                              <span className="text-lg font-semibold text-blue-700">
                                {data.no_count}
                              </span>
                            </div>
                          </div>

                          {/* 디버깅 정보 */}
                          <div className="mt-2 text-xs text-gray-500">
                            <p>
                              차트 데이터: 예 {data.yes_count}명, 아니오{" "}
                              {data.no_count}명
                            </p>
                          </div>

                          {/* 범례 */}
                          <div className="mt-4 flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-500 rounded"></div>
                              <span className="text-gray-600">예</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 bg-blue-700 rounded"></div>
                              <span className="text-gray-600">아니오</span>
                            </div>
                          </div>
                        </div>

                        {/* 오른쪽: 응답 표 */}
                        <div className="flex-1">
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">
                              응답 현황
                            </h4>
                          </div>

                          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    답변
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    학생
                                  </th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    합계
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {/* 예 답변 행 */}
                                <tr>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                      <span className="text-sm font-medium text-gray-900">
                                        예
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {data.yes_students &&
                                      data.yes_students.length > 0 ? (
                                        data.yes_students.map((name, i) => (
                                          <span
                                            key={i}
                                            className="text-xs text-gray-600"
                                          >
                                            {name}
                                            {i <
                                            (data.yes_students?.length || 0) - 1
                                              ? ","
                                              : ""}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-500">
                                          -
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-semibold text-blue-600">
                                      {data.yes_count}명
                                    </span>
                                  </td>
                                </tr>

                                {/* 아니오 답변 행 */}
                                <tr>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-700 rounded"></div>
                                      <span className="text-sm font-medium text-gray-900">
                                        아니오
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                      {data.no_students &&
                                      data.no_students.length > 0 ? (
                                        data.no_students.map((name, i) => (
                                          <span
                                            key={i}
                                            className="text-xs text-gray-600"
                                          >
                                            {name}
                                            {i <
                                            (data.no_students?.length || 0) - 1
                                              ? ","
                                              : ""}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-gray-500">
                                          -
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-sm font-semibold text-blue-700">
                                      {data.no_count}명
                                    </span>
                                  </td>
                                </tr>
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
