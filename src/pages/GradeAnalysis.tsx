import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import NetworkChartComponent from "../components/NetworkChartComponent";

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  student_number: string;
}

interface Survey {
  id: string;
  title: string;
  status: string;
  created_at: string | null;
  target_grades: string[] | null;
  target_classes: string[] | null;
}

interface NetworkAnalysisResult {
  id: string;
  survey_id: string | null;
  analysis_data?: any;
  created_at?: string | null;
  analysis_type?: string;
  calculated_at?: string | null;
  centrality_scores?: any;
  community_membership?: string | null;
  recommendations?: any;
  risk_indicators?: any;
  student_id?: string | null;
}

const GradeAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [analysisResults, setAnalysisResults] = useState<NetworkAnalysisResult[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<NetworkAnalysisResult | null>(null);
  const [gradeData, setGradeData] = useState<any>(null);

  // 학년 부장의 담당 학년 정보 가져오기
  const getGradeTeacherGrade = () => {
    // 실제로는 사용자 정보에서 담당 학년을 가져와야 함
    // 임시로 1학년으로 설정
    return "1";
  };

  // 학년별 학생 데이터 로드
  const loadGradeStudents = async () => {
    try {
      const grade = getGradeTeacherGrade();
      
      const { data: studentsData, error } = await supabase
        .from("students")
        .select("*")
        .eq("current_school_id", user?.school_id || "")
        .eq("grade", grade)
        .order("class", { ascending: true })
        .order("student_number", { ascending: true });

      if (error) {
        console.error("학생 데이터 로드 실패:", error);
        return;
      }

      setStudents(studentsData || []);
    } catch (error) {
      console.error("학생 데이터 로드 오류:", error);
    }
  };

  // 학년별 설문 데이터 로드
  const loadGradeSurveys = async () => {
    try {
      const grade = getGradeTeacherGrade();
      
      const { data: surveysData, error } = await supabase
        .from("surveys")
        .select("*")
        .eq("school_id", user?.school_id || "")
        .in("status", ["active", "completed"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("설문 데이터 로드 실패:", error);
        return;
      }

      // 학년에 맞는 설문만 필터링
      const filteredSurveys = surveysData?.filter(survey => {
        const targetGrades = survey.target_grades;
        return targetGrades && targetGrades.includes(grade);
      }) || [];

      setSurveys(filteredSurveys);
      
      // 첫 번째 설문을 기본 선택
      if (filteredSurveys.length > 0) {
        setSelectedSurvey(filteredSurveys[0]);
      }
    } catch (error) {
      console.error("설문 데이터 로드 오류:", error);
    }
  };

  // 학년별 분석 결과 로드
  const loadAnalysisResults = async () => {
    if (!selectedSurvey) return;

    try {
      const { data: analysisData, error } = await supabase
        .from("network_analysis_results")
        .select("*")
        .eq("survey_id", selectedSurvey.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("분석 결과 로드 실패:", error);
        return;
      }

      setAnalysisResults(analysisData || []);
      
      // 첫 번째 분석 결과를 기본 선택
      if (analysisData && analysisData.length > 0) {
        setSelectedAnalysis(analysisData[0]);
      }
    } catch (error) {
      console.error("분석 결과 로드 오류:", error);
    }
  };

  // 학년별 통합 데이터 생성
  const generateGradeData = () => {
    if (!selectedAnalysis || !students.length) return;

    try {
      const analysisData = selectedAnalysis.analysis_data || selectedAnalysis;
      const grade = getGradeTeacherGrade();
      
      // 학년 전체 학생들의 데이터를 통합
      const gradeStudents = students.filter(student => student.grade === grade);
      
      // 학급별로 그룹화
      const classGroups = gradeStudents.reduce((groups: any, student) => {
        const classKey = student.class;
        if (!groups[classKey]) {
          groups[classKey] = [];
        }
        groups[classKey].push(student);
        return groups;
      }, {});

      // 학년 전체 네트워크 데이터 생성
      const gradeNetworkData: any = {
        nodes: gradeStudents.map(student => ({
          id: student.id,
          label: student.name,
          group: student.class,
          title: `${student.name} (${student.grade}-${student.class})`,
          color: getClassColor(student.class)
        })),
        edges: [] as any[],
        statistics: {
          totalStudents: gradeStudents.length,
          totalClasses: Object.keys(classGroups).length,
          averageClassSize: Math.round(gradeStudents.length / Object.keys(classGroups).length),
          classDistribution: Object.keys(classGroups).map(classKey => ({
            class: classKey,
            count: classGroups[classKey].length
          }))
        }
      };

      // 학급 간 연결 분석 (같은 학년 내에서의 관계)
      const gradeEdges = [];
      for (let i = 0; i < gradeStudents.length; i++) {
        for (let j = i + 1; j < gradeStudents.length; j++) {
          const student1 = gradeStudents[i];
          const student2 = gradeStudents[j];
          
          // 같은 학급이 아닌 경우에만 학급 간 연결로 간주
          if (student1.class !== student2.class) {
            gradeEdges.push({
              from: student1.id,
              to: student2.id,
              label: "학급간 연결",
              color: { color: "#94a3b8", highlight: "#64748b" },
              dashes: true
            });
          }
        }
      }

      gradeNetworkData.edges = gradeEdges;

      setGradeData(gradeNetworkData);
    } catch (error) {
      console.error("학년 데이터 생성 오류:", error);
    }
  };

  // 학급별 색상 매핑
  const getClassColor = (classNumber: string) => {
    const colors = [
      "#3b82f6", // 파란색
      "#10b981", // 초록색
      "#f59e0b", // 노란색
      "#ef4444", // 빨간색
      "#8b5cf6", // 보라색
      "#06b6d4", // 청록색
      "#84cc16", // 라임색
      "#f97316"  // 주황색
    ];
    
    const classIndex = parseInt(classNumber) - 1;
    return colors[classIndex % colors.length];
  };

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await loadGradeStudents();
      await loadGradeSurveys();
      setLoading(false);
    };

    loadData();
  }, [user]);

  // 설문 변경 시 분석 결과 로드
  useEffect(() => {
    if (selectedSurvey) {
      loadAnalysisResults();
    }
  }, [selectedSurvey]);

  // 분석 결과 변경 시 학년 데이터 생성
  useEffect(() => {
    if (selectedAnalysis) {
      generateGradeData();
    }
  }, [selectedAnalysis, students]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const grade = getGradeTeacherGrade();

  return (
    <div className="mx-auto min-h-screen max-w-7xl bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {grade}학년 학습별 분석결과
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          {grade}학년 전체 학생들의 교우관계를 학급별로 분석합니다.
        </p>
      </div>

      {/* 설문 선택 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">분석할 설문 선택</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <button
              key={survey.id}
              onClick={() => setSelectedSurvey(survey)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                selectedSurvey?.id === survey.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <h3 className="font-medium text-gray-900">{survey.title}</h3>
              <p className="mt-1 text-sm text-gray-600">
                상태: {survey.status === "completed" ? "완료" : "진행중"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                생성일: {survey.created_at ? new Date(survey.created_at).toLocaleDateString("ko-KR") : "날짜 없음"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* 분석 결과 선택 */}
      {selectedSurvey && analysisResults.length > 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">분석 결과 선택</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analysisResults.map((result) => (
              <button
                key={result.id}
                onClick={() => setSelectedAnalysis(result)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  selectedAnalysis?.id === result.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <h3 className="font-medium text-gray-900">
                  분석 결과 #{analysisResults.indexOf(result) + 1}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  생성일: {result.created_at ? new Date(result.created_at).toLocaleDateString("ko-KR") : "날짜 없음"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 학년별 통계 */}
      {gradeData && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{grade}학년 통계</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {gradeData.statistics.totalStudents}
              </div>
              <div className="text-sm text-gray-600">전체 학생 수</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {gradeData.statistics.totalClasses}
              </div>
              <div className="text-sm text-gray-600">학급 수</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {gradeData.statistics.averageClassSize}
              </div>
              <div className="text-sm text-gray-600">평균 학급 인원</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {gradeData.edges.length}
              </div>
              <div className="text-sm text-gray-600">학급간 연결</div>
            </div>
          </div>

          {/* 학급별 인원 분포 */}
          <div className="mt-6">
            <h3 className="mb-3 text-md font-semibold text-gray-900">학급별 인원 분포</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {gradeData.statistics.classDistribution.map((classInfo: any) => (
                <div key={classInfo.class} className="rounded-lg bg-gray-50 p-3 text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {classInfo.class}반
                  </div>
                  <div className="text-sm text-gray-600">
                    {classInfo.count}명
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 네트워크 시각화 */}
      {gradeData && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {grade}학년 교우관계 네트워크
          </h2>
          <div className="mb-4 text-sm text-gray-600">
            <p>• 각 노드는 학생을 나타냅니다</p>
            <p>• 노드 색상은 학급을 구분합니다</p>
            <p>• 점선은 학급 간 연결을 나타냅니다</p>
          </div>
          <NetworkChartComponent
            chartData={[gradeData]}
            activeTab={0}
          />
        </div>
      )}

      {/* 데이터가 없는 경우 */}
      {!selectedSurvey && (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
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
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            분석할 설문이 없습니다
          </h3>
          <p className="mt-2 text-gray-600">
            {grade}학년 대상 설문을 먼저 생성해주세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default GradeAnalysis;
