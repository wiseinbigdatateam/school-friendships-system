import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import NetworkGraph from '../components/NetworkGraph';

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  friends: string[];
  friendCount: number;
}

interface SurveyResponse {
  id: string;
  student_id: string;
  answers: any;
  submitted_at: string;
}

const NetworkAnalysisPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSurvey, setSelectedSurvey] = useState<string>('');
  const [surveys, setSurveys] = useState<any[]>([]);
  const [maxSelections, setMaxSelections] = useState<number[]>([]);

  useEffect(() => {
    fetchSurveys();
  }, []);

  useEffect(() => {
    if (selectedSurvey) {
      fetchNetworkData(selectedSurvey);
    }
  }, [selectedSurvey]);

  const fetchSurveys = async () => {
    try {
      const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('category', '교우관계')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSurveys(data || []);
    } catch (error) {
      console.error('설문 조회 오류:', error);
    }
  };

  const fetchNetworkData = async (surveyId: string) => {
    try {
      setLoading(true);

      // 설문 정보와 템플릿 메타데이터 조회
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!surveys_template_id_fkey(metadata)
        `)
        .eq('id', surveyId)
        .single();

      if (surveyError) throw surveyError;

      // 설문 응답 데이터 조회
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select(`
          *,
          students!survey_responses_student_id_fkey(id, name)
        `)
        .eq('survey_id', surveyId);

      if (responseError) throw responseError;

      // 학생 데이터 조회
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (studentsError) throw studentsError;

      // 템플릿 메타데이터에서 max_selections 추출
      const metadata = surveyData?.survey_templates?.metadata as any;
      const templateMaxSelections = metadata?.max_selections || [];
      setMaxSelections(templateMaxSelections);
      
      // 네트워크 데이터 생성 (max_selections 반영)
      const networkData = generateNetworkData(responses || [], studentsData || [], templateMaxSelections);
      setStudents(networkData);
    } catch (error) {
      console.error('네트워크 데이터 조회 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNetworkData = (responses: any[], studentsData: any[], maxSelections: number[] = []): Student[] => {
    const studentMap = new Map<string, Student>();
    const friendshipMap = new Map<string, Set<string>>();

    // 학생 초기화
    studentsData.forEach(student => {
      studentMap.set(student.id, {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        friends: [],
        friendCount: 0
      });
      friendshipMap.set(student.id, new Set());
    });

    // 설문 응답에서 친구 관계 추출
    responses.forEach(response => {
      if (response.answers) {
        const answers = typeof response.answers === 'string' 
          ? JSON.parse(response.answers) 
          : response.answers;

        // 질문별로 max_selections 값에 따라 처리
        Object.entries(answers).forEach(([questionKey, answer]: [string, any]) => {
          // q1, q2, q3, q4 등의 질문 번호 추출
          const questionIndex = parseInt(questionKey.replace('q', '')) - 1;
          const maxSelection = maxSelections[questionIndex] || 10; // 기본값 10

          if (Array.isArray(answer)) {
            // 배열 형태의 답변 (여러 친구 선택)
            // max_selections 값에 따라 제한
            const limitedAnswers = answer.slice(0, maxSelection);
            limitedAnswers.forEach((friendId: string) => {
              if (friendId && studentMap.has(friendId)) {
                friendshipMap.get(response.student_id)?.add(friendId);
                friendshipMap.get(friendId)?.add(response.student_id);
              }
            });
          } else if (typeof answer === 'string' && studentMap.has(answer)) {
            // 단일 친구 선택 (max_selections가 1인 경우)
            if (maxSelection >= 1) {
              friendshipMap.get(response.student_id)?.add(answer);
              friendshipMap.get(answer)?.add(response.student_id);
            }
          }
        });
      }
    });

    // 최종 네트워크 데이터 생성
    const networkData: Student[] = [];
    studentMap.forEach((student, studentId) => {
      const friends = Array.from(friendshipMap.get(studentId) || []);
      networkData.push({
        ...student,
        friends,
        friendCount: friends.length
      });
    });

    return networkData;
  };

  const getNetworkInsights = () => {
    if (students.length === 0) return null;

    const totalStudents = students.length;
    const connectedStudents = students.filter(s => s.friendCount > 0).length;
    const isolatedStudents = students.filter(s => s.friendCount === 0).length;
    const avgFriends = students.reduce((sum, s) => sum + s.friendCount, 0) / totalStudents;
    
    const maxFriends = Math.max(...students.map(s => s.friendCount));
    const popularStudents = students.filter(s => s.friendCount === maxFriends);

    return {
      totalStudents,
      connectedStudents,
      isolatedStudents,
      avgFriends: avgFriends.toFixed(1),
      popularStudents
    };
  };

  const insights = getNetworkInsights();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900">네트워크 분석 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">교우관계 네트워크 분석</h1>
          <p className="text-gray-600">학생들의 교우관계를 시각화하고 분석합니다.</p>
        </div>

        {/* 설문 선택 */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            분석할 설문 선택
          </label>
          <select
            value={selectedSurvey}
            onChange={(e) => setSelectedSurvey(e.target.value)}
            className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">설문을 선택하세요</option>
            {surveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {survey.title} ({new Date(survey.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {selectedSurvey && students.length > 0 && (
          <>
            {/* 인사이트 카드 */}
            {insights && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">총 학생 수</h3>
                  <p className="text-2xl font-bold text-blue-600">{insights.totalStudents}명</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">연결된 학생</h3>
                  <p className="text-2xl font-bold text-green-600">{insights.connectedStudents}명</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">고립된 학생</h3>
                  <p className="text-2xl font-bold text-red-600">{insights.isolatedStudents}명</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <h3 className="text-sm font-medium text-gray-500">평균 친구 수</h3>
                  <p className="text-2xl font-bold text-purple-600">{insights.avgFriends}명</p>
                </div>
              </div>
            )}

            {/* 네트워크 그래프 */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">교우관계 네트워크</h2>
              <NetworkGraph students={students} maxSelections={maxSelections.length > 0 ? Math.max(...maxSelections) : 5} />
            </div>

            {/* 인기 학생 정보 */}
            {insights && insights.popularStudents.length > 0 && (
              <div className="mt-6 bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">인기 학생 (친구 수: {insights.popularStudents[0].friendCount}명)</h3>
                <div className="flex flex-wrap gap-2">
                  {insights.popularStudents.map((student) => (
                    <span
                      key={student.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {student.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {selectedSurvey && students.length === 0 && (
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <p className="text-gray-500">선택한 설문에 대한 응답 데이터가 없습니다.</p>
          </div>
        )}

        {!selectedSurvey && (
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <p className="text-gray-500">분석할 설문을 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkAnalysisPage;
