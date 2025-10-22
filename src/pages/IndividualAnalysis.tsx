import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import NetworkGraph from "../components/NetworkGraph";
import {
  generateStudentGuidanceReport,
  generateFallbackReport,
  StudentAnalysisData,
  GeneratedReport,
  TokenUsage,
} from "../services/chatgptService";
import { AIReportService } from "../services/aiReportService";
import AIReportDisplay from "../components/AIReportDisplay";
import { useAuth } from "../contexts/AuthContext";
import { unifiedNetworkAnalysisService } from "../services/unifiedNetworkAnalysisService";
import { IndividualAnalysisResult } from "../types/unifiedNetworkTypes";
import { networkAnalysisService } from "../services/networkAnalysisService";
import { NetworkAnalysisData } from "../types";
import {
  StudentMetrics,
  CurrentStatus,
  NetworkStability,
  RecommendationPlan,
  MonitoringPoints,
  calculateCurrentStatus,
  calculateNetworkStability,
  generateRecommendationPlan,
  generateMonitoringPoints,
  assessRiskLevel,
} from "../utils/studentStatusCalculator";

interface Survey {
  id: string;
  title: string;
  template_id?: string | null;
  target_grades?: string[] | null;
  target_classes?: string[] | null;
  created_at: string | null;
  status: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  school_id?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  questions?: any;
  settings?: any;
  survey_templates?: {
    id: string;
    name: string;
    metadata: any;
  } | null;
}

interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  student_number: string;
  current_school_id?: string | null;
  lifelong_education_id?: string;
  birth_date?: string;
  gender?: string;
  enrolled_at?: string;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean | null;
  network_metrics?: any;
}

interface PythonAnalysisResult {
  student_id: string;
  analysis_timestamp: string;
  network_stats: {
    total_nodes: number;
    total_edges: number;
    network_density: number;
    average_clustering: number;
    communities_count: number;
  };
  individual_metrics: {
    student_id: string;
    degree: number;
    neighbors: string[];
    centrality_metrics: {
      degree: number;
      betweenness: number;
      closeness: number;
      eigenvector: number;
    };
    network_density: number;
    clustering_coefficient: number;
    friendship_type: string;
    community_id: number;
    isolation_risk: {
      level: string;
      score: number;
      description: string;
      factors: {
        connection_count: number;
        centrality: number;
        network_density: number;
      };
    };
    social_influence: {
      level: string;
      score: number;
      description: string;
      metrics: {
        degree: number;
        betweenness: number;
        closeness: number;
        eigenvector: number;
      };
    };
    current_status?: {
      school_satisfaction: string;
      teacher_relationship: string;
      peer_relationship: string;
      network_participation: string;
    };
    total_nodes: number;
    total_edges: number;
  };
  recommendations: {
    immediate_actions: string[];
    short_term_goals: string[];
    long_term_goals: string[];
    monitoring_points: string[];
    intervention_level: string;
  };
  network_data: {
    nodes: Array<{
      id: string;
      name: string;
      grade: string;
      class: string;
      is_center: boolean;
      degree: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      weight: number;
      relationship_type: string;
    }>;
  };
  communities: { [student_id: string]: number };
}

const IndividualAnalysis: React.FC = () => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [teacherInfo, setTeacherInfo] = useState<any>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [individualNetworkData, setIndividualNetworkData] = useState<any[]>([]);
  const [maxSelections, setMaxSelections] = useState<number[]>([]);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"core" | "ai" | "python">("core");
  const [aiReport, setAiReport] = useState<GeneratedReport | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | undefined>(undefined);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportCreatedAt, setAiReportCreatedAt] = useState<string | null>(null);
  const [isReportFromDB, setIsReportFromDB] = useState(false); // DB에서 불러온 리포트인지 여부
  const [pythonAnalysisResult, setPythonAnalysisResult] =
    useState<PythonAnalysisResult | null>(null);
  const [pythonAnalysisLoading, setPythonAnalysisLoading] = useState(false);
  const [surveyResponseCounts, setSurveyResponseCounts] = useState<{
    [key: string]: number;
  }>({});
  const [pythonAnalysisError, setPythonAnalysisError] = useState<string | null>(
    null,
  );
  const [forceUpdate, setForceUpdate] = useState(0);
  const [unifiedAnalysisResult, setUnifiedAnalysisResult] =
    useState<IndividualAnalysisResult | null>(null);
  const [unifiedAnalysisLoading, setUnifiedAnalysisLoading] = useState(false);
  const [networkAnalysisData, setNetworkAnalysisData] =
    useState<NetworkAnalysisData | null>(null);
  const [networkAnalysisLoading, setNetworkAnalysisLoading] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // 핵심결과 탭용 설문 응답 데이터
  const [coreTabSurveyData, setCoreTabSurveyData] = useState<any[]>([]);
  const [coreTabSatisfaction, setCoreTabSatisfaction] = useState<number>(0.5);
  const [coreTabViolence, setCoreTabViolence] = useState<number>(0);

  // 개별 학생의 설문 응답 데이터 수집 함수
  const getStudentSurveyResponses = async (studentId: string, surveyId: string) => {
    try {
      // 설문 템플릿과 함께 응답 조회
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!surveys_template_id_fkey(
            id,
            name,
            metadata
          )
        `)
        .eq('id', surveyId)
        .single();

      if (surveyError) {
        console.warn('설문 정보 조회 오류:', surveyError);
        return [];
      }

      const { data, error } = await supabase
        .from('survey_responses')
        .select('responses')
        .eq('student_id', studentId)
        .eq('survey_id', surveyId)
        .single();

      if (error || !data) {
        console.warn('설문 응답 데이터 없음:', error?.message);
        return [];
      }

      // 설문 응답을 질문-답변 형태로 변환
      const responses = data.responses;
      
      console.log('🔍 원본 응답 데이터:', responses);
      
      // 템플릿 메타데이터에서 질문 카테고리 가져오기
      const metadata = surveyData?.survey_templates?.metadata as any;
      const questionCategories = metadata?.questionCategories || [];
      
      console.log('✅ 질문 카테고리 배열:', questionCategories);
      
      // 응답 데이터를 배열로 변환
      const responseArray: Array<{question: string; answer: string; category: string}> = [];
      
      Object.entries(responses || {}).forEach(([key, value]) => {
        // key는 'q1', 'q2', ... 형태
        const questionIndex = parseInt(key.replace('q', '')) - 1;
        
        // metadata에서 카테고리 가져오기
        let category = 'general';
        if (questionCategories[questionIndex]) {
          const rawCategory = questionCategories[questionIndex];
          // 카테고리 매핑: '만족도' → 'satisfaction', '학교폭력' → 'violence'
          if (rawCategory === '만족도') {
            category = 'satisfaction';
          } else if (rawCategory === '학교폭력') {
            category = 'violence';
          } else if (rawCategory === '교우관계') {
            category = 'friendship';
          } else {
            category = rawCategory;
          }
        }
        
        const question = `Q${questionIndex + 1}. 질문`;
        
        // 배열인 경우 (친구 선택) -> 학생 이름으로 변환
        let answerText = '';
        if (Array.isArray(value)) {
          // 친구 ID를 이름으로 변환
          const friendNames = value.map(friendId => {
            const friend = students.find(s => s.id === friendId);
            return friend ? friend.name : friendId;
          }).filter(Boolean);
          answerText = friendNames.length > 0 ? friendNames.join(', ') : '선택 없음';
        } else {
          // 단일 응답인 경우 학생 이름으로 변환 시도
          const friend = students.find(s => s.id === String(value));
          answerText = friend ? friend.name : String(value);
        }
        
        console.log(`  Q${questionIndex + 1}: "${question}" → "${answerText}" [${category}]`);
        
        responseArray.push({
          question,
          answer: answerText,
          category
        });
      });

      console.log('✅ 변환된 응답 배열:', responseArray);
      
      return responseArray;
    } catch (error) {
      console.error('설문 응답 수집 오류:', error);
      return [];
    }
  };

  // 만족도 점수 계산 함수 (개선된 버전)
  const calculateSatisfactionScore = (responses: any[]) => {
    if (!responses.length) {
      console.warn('⚠️ 설문 응답이 없습니다. 기본값 0.5 반환');
      return 0.5;
    }
    
    // Q2-Q5: 만족도 관련 질문 (친구 선택 제외)
    // 친구 선택 질문(배열 답변)은 제외하고, 단일 답변(예/아니오/보통)만 필터링
    const satisfactionQuestions = responses.filter((r, idx) => {
      // 답변이 "예", "아니오", "보통" 중 하나인 것만 (친구 이름 제외)
      const answer = String(r.answer).trim();
      const isValidAnswer = answer === '예' || 
                           answer === '아니오' || 
                           answer === '보통' ||
                           answer.includes('그렇다') ||
                           answer.includes('매우') ||
                           (answer.length < 15 && !answer.includes(',') && !answer.includes('-'));
      
      // 만족도 관련 키워드 체크 (OR 조건) - 친구 "선택" 질문은 제외
      const q = r.question.toLowerCase();
      const isSatisfactionQuestion = (
        (q.includes('친구') && q.includes('논다')) ||
        (q.includes('즐겁') && q.includes('참여')) ||
        (q.includes('학교') && q.includes('오고 싶')) ||
        (q.includes('선생님') && q.includes('이야기')) ||
        r.category === 'satisfaction'
      ) && !q.includes('누구') && !q.includes('선택');
      
      return isValidAnswer && isSatisfactionQuestion;
    });
    
    console.log('📝 만족도 질문 필터링 결과:', {
      전체응답수: responses.length,
      만족도질문수: satisfactionQuestions.length,
      필터링된질문들: satisfactionQuestions.map(q => ({ 
        질문: q.question.substring(0, 30), 
        답변: q.answer 
      }))
    });
    
    if (!satisfactionQuestions.length) {
      console.warn('⚠️ 만족도 질문이 없습니다. 기본값 0.5 반환');
      console.log('전체 응답 내용:', responses);
      return 0.5;
    }
    
    let totalScore = 0;
    let validQuestions = 0;
    
    satisfactionQuestions.forEach(q => {
      const answer = String(q.answer).toLowerCase().trim();
      let questionScore = 0.5; // 기본값
      
      // 긍정 응답
      if (answer === '예' || answer === 'yes' || answer.includes('매우') || answer === '그렇다') {
        questionScore = 1.0;
      } 
      // 중립 응답
      else if (answer === '보통' || answer.includes('보통') || answer === 'so-so') {
        questionScore = 0.5;
      } 
      // 부정 응답
      else if (answer === '아니오' || answer === 'no' || answer.includes('그렇지 않') || answer.includes('아니')) {
        questionScore = 0;
      }
      
      console.log(`  - ${q.question.substring(0, 30)}...: "${q.answer}" → ${questionScore}점`);
      
      totalScore += questionScore;
      validQuestions++;
    });
    
    const finalScore = validQuestions > 0 ? totalScore / validQuestions : 0.5;
    console.log(`✅ 최종 만족도 점수: ${(finalScore * 100).toFixed(1)}% (${validQuestions}개 질문)`);
    
    return Math.min(finalScore, 1);
  };

  // 폭력 경험 점수 계산 함수 (개선된 버전)
  const calculateViolenceScore = (responses: any[]) => {
    if (!responses.length) {
      console.warn('⚠️ 설문 응답이 없습니다. 폭력경험 기본값 0 반환');
      return 0;
    }
    
    // 폭력 경험 관련 질문들 필터링 (Q6-Q8)
    const violenceQuestions = responses.filter(r => {
      const q = r.question.toLowerCase();
      return q.includes('때리') || q.includes('발로') || q.includes('밀치') ||
             q.includes('욕') || q.includes('놀린') ||
             q.includes('따돌') || q.includes('괴롭') ||
             r.category === 'violence' || 
             r.category === 'bullying';
    });
    
    console.log('📝 폭력경험 질문 수:', violenceQuestions.length, '/', responses.length);
    
    if (!violenceQuestions.length) {
      console.warn('⚠️ 폭력경험 질문이 없습니다. 기본값 0 반환');
      return 0;
    }
    
    let totalScore = 0;
    let validQuestions = 0;
    
    violenceQuestions.forEach(q => {
      const answer = String(q.answer).toLowerCase().trim();
      let questionScore = 0;
      
      // 폭력 없음
      if (answer === '전혀 없다' || answer.includes('없다') || answer === '아니오' || answer === 'no') {
        questionScore = 0;
      } 
      // 가끔 경험
      else if (answer === '가끔 있다' || answer.includes('가끔') || answer.includes('한두번') || answer.includes('1-2번')) {
        questionScore = 0.5;
      } 
      // 자주 경험
      else if (answer === '자주 있다' || answer.includes('자주') || answer.includes('여러번') || answer === '예' || answer === 'yes') {
        questionScore = 1.0;
      }
      // 알 수 없는 응답은 안전하게 0으로 처리
      else {
        console.warn(`⚠️ 알 수 없는 폭력경험 응답: "${q.answer}"`);
        questionScore = 0;
      }
      
      console.log(`  - ${q.question.substring(0, 30)}...: "${q.answer}" → ${questionScore}점`);
      
      totalScore += questionScore;
      validQuestions++;
    });
    
    const finalScore = validQuestions > 0 ? totalScore / validQuestions : 0;
    console.log(`✅ 최종 폭력경험 점수: ${(finalScore * 100).toFixed(1)}% (${validQuestions}개 질문)`);
    
    return Math.min(finalScore, 1);
  };

  // 통합 서비스를 사용한 개별 학생 분석
  const performUnifiedIndividualAnalysis = useCallback(
    async (surveyId: string, studentId: string) => {
      try {
        setUnifiedAnalysisLoading(true);

        const individualAnalysis =
          await unifiedNetworkAnalysisService.getIndividualAnalysis(
            surveyId,
            studentId,
          );

        setUnifiedAnalysisResult(individualAnalysis);
      } catch (error) {
        console.error("❌ 통합 개별 분석 오류:", error);
        setUnifiedAnalysisResult(null);
      } finally {
        setUnifiedAnalysisLoading(false);
      }
    },
    [],
  );

  // 전체 네트워크 분석 수행
  const performNetworkAnalysis = useCallback(async (surveyId: string) => {
    try {
      setNetworkAnalysisLoading(true);

      const result = await networkAnalysisService.analyzeNetwork(surveyId);

      const networkData: NetworkAnalysisData = {
        nodes: result.nodes.map((node) => ({
          ...node,
          grade: node.grade.toString(),
          class: node.class.toString(),
        })),
        edges: result.edges,
        metrics: {
          // 기본 속성들
          totalConnections: result.metrics?.total_relationships || 0,
          averageCentrality: result.metrics?.average_degree_centrality || 0,
          isolatedIndividuals: 0,
          highCentralityIndividuals: 0,
          clusterCount: result.metrics?.connected_components || 0,

          // 추가 속성들
          total_students: result.metrics?.total_students || result.nodes.length,
          total_relationships:
            result.metrics?.total_relationships || result.edges.length,
          total_nodes: result.nodes.length,
          total_edges: result.edges.length,
          density: result.metrics?.density || 0,
          network_density: result.metrics?.density || 0,
          average_degree: result.metrics?.average_degree || 0,
          average_path_length: result.metrics?.average_path_length || 0,
          clustering_coefficient: result.metrics?.clustering_coefficient || 0,
          modularity: result.metrics?.modularity || 0,
          connected_components: result.metrics?.connected_components || 0,
          average_degree_centrality:
            result.metrics?.average_degree_centrality || 0,
          average_closeness_centrality:
            result.metrics?.average_closeness_centrality || 0,
          average_betweenness_centrality:
            result.metrics?.average_betweenness_centrality || 0,
          average_eigenvector_centrality:
            result.metrics?.average_eigenvector_centrality || 0,
        },
        friendship_types: result.friendship_type_distribution || {
          외톨이형: 0,
          "소수 친구 학생": 0,
          "평균적인 학생": 0,
          "친구 많은 학생": 0,
          "사교 스타": 0,
        },
      };

      setNetworkAnalysisData(networkData);
    } catch (error) {
      console.error("❌ 전체 네트워크 분석 오류:", error);
      setNetworkAnalysisData(null);
    } finally {
      setNetworkAnalysisLoading(false);
    }
  }, []);

  // 설문별 응답자 수 계산 함수 - 더 간단하고 확실한 방법
  const calculateResponseCounts = async (surveys: Survey[]) => {

    const counts: { [key: string]: number } = {};

    // 모든 설문의 응답 수를 한 번에 조회
    try {
      const surveyIds = surveys.map((survey) => survey.id);

      const { data, error } = await supabase
        .from("survey_responses")
        .select("survey_id")
        .in("survey_id", surveyIds);

      if (error) {
        return;
      }


      // 설문별로 응답 수 계산
      surveyIds.forEach((surveyId) => {
        const responseCount =
          data?.filter((response) => response.survey_id === surveyId).length ||
          0;
        counts[surveyId] = responseCount;
      });


      // 상태 업데이트 - 강제로 즉시 반영
      setSurveyResponseCounts(counts);

      // 강제 리렌더링 트리거
      setForceUpdate((prev) => prev + 1);

      // 상태 업데이트 완료 로그
    } catch (error) {
      console.error("❌ 응답자 수 계산 중 오류:", error);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (teacherInfo) {
      fetchSurveys();
      fetchStudents();
    }
  }, [teacherInfo]);

  // 강제 리렌더링을 위한 useEffect
  useEffect(() => {
  }, [forceUpdate, surveyResponseCounts]);

  // 선택된 학생이 변경될 때 개별 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey) {
      
      generateIndividualNetworkData(selectedStudent, selectedSurvey.id);
    }
  }, [selectedStudent, selectedSurvey]);

  // 네트워크 분석 데이터가 로드되면 학생 상태 업데이트를 위한 강제 리렌더링
  useEffect(() => {
    if (networkAnalysisData) {
      
      setForceUpdate((prev) => prev + 1);
    }
  }, [networkAnalysisData]);

  // 학생 선택 시 통합 분석 수행
  useEffect(() => {
    
    if (selectedStudent && selectedSurvey) {
    
      performUnifiedIndividualAnalysis(selectedSurvey.id, selectedStudent);
    }
  }, [selectedStudent, selectedSurvey, performUnifiedIndividualAnalysis]);

  // 설문 선택 시 전체 네트워크 분석 수행
  useEffect(() => {
    if (selectedSurvey) {
      performNetworkAnalysis(selectedSurvey.id);
    }
  }, [selectedSurvey, performNetworkAnalysis]);

  // 핵심결과 탭용 설문 응답 데이터 로드
  useEffect(() => {
    const loadCoreTabSurveyData = async () => {
      if (selectedStudent && selectedSurvey) {
        console.log('🔄 핵심결과 탭 - 설문 응답 로드 시작:', { 
          학생ID: selectedStudent, 
          설문ID: selectedSurvey.id 
        });
        
        const data = await getStudentSurveyResponses(selectedStudent, selectedSurvey.id);
        
        console.log('📋 핵심결과 탭 - 로드된 설문 응답:', data);
        
        const satisfaction = calculateSatisfactionScore(data);
        const violence = calculateViolenceScore(data);
        
        console.log('📊 핵심결과 탭 - 계산된 점수:', {
          만족도: `${(satisfaction * 100).toFixed(1)}%`,
          폭력경험: `${(violence * 100).toFixed(1)}%`
        });
        
        setCoreTabSurveyData(data);
        setCoreTabSatisfaction(satisfaction);
        setCoreTabViolence(violence);
      } else {
        // 초기화
        setCoreTabSurveyData([]);
        setCoreTabSatisfaction(0.5);
        setCoreTabViolence(0);
      }
    };
    
    loadCoreTabSurveyData();
  }, [selectedStudent, selectedSurvey, activeTab]);

  const fetchCurrentUser = async () => {
    try {
      // 로컬 스토리지에서 사용자 정보 확인
      const userStr = localStorage.getItem("wiseon_user");
      const authToken = localStorage.getItem("wiseon_auth_token");

      if (!userStr || !authToken) {
        window.location.href = "/login";
        return;
      }

      const user = JSON.parse(userStr);
      setCurrentUser(user);

      // 사용자의 담임 정보 조회
      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (teacherError) throw teacherError;
      setTeacherInfo(teacherData);

      
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
      // 에러 발생 시 로그인 페이지로 이동
      window.location.href = "/login";
    }
  };

  const fetchSurveys = async () => {
    try {
      if (!teacherInfo) {
        setSurveys([]);
        return;
      }


      // 먼저 설문 템플릿에서 카테고리가 "교우관계" 또는 "종합조사"인 것 찾기
      const { data: templates, error: templateError } = await supabase
        .from("survey_templates")
        .select("id, name, metadata")
        .eq("is_active", true);

      if (templateError) {
        console.error("Template error:", templateError);
        throw templateError;
      }

      // 카테고리가 "교우관계" 또는 "종합조사"인 템플릿 ID들 찾기
      const analysisTemplateIds = templates
        .filter((template: any) => {
          const metadata = template.metadata;
          return (
            metadata &&
            (metadata.category === "교우관계" ||
              metadata.category === "종합조사")
          );
        })
        .map((template: any) => template.id);

      if (analysisTemplateIds.length === 0) {
        setSurveys([]);
        return;
      }

      // 사용자 역할에 따른 설문 필터링
      // 해당 템플릿을 사용하는 완료된 설문들만 가져오기 (템플릿 정보 포함)
      let query = supabase
        .from("surveys")
        .select(
          `
          *,
          survey_templates!surveys_template_id_fkey(
            id,
            name,
            metadata
          )
        `,
        )
        .in("template_id", analysisTemplateIds)
        .eq("status", "completed");

      // 학교 ID로 필터링
      if (teacherInfo.school_id) {
        query = query.eq("school_id", teacherInfo.school_id);
      }

      // 담임교사인 경우 학년/반으로 추가 필터링
      if (
        teacherInfo.role === "homeroom_teacher" &&
        teacherInfo.grade_level &&
        teacherInfo.class_number
      ) {
        

        // 설문의 target_grades와 target_classes 확인
        const { data: allSurveys, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) {
          console.error("Survey error:", error);
          throw error;
        }

        // 학년/반 매칭 필터링
        const filteredSurveys =
          allSurveys?.filter((survey: any) => {
            const targetGrades = survey.target_grades || [];
            const targetClasses = survey.target_classes || [];

            const gradeMatch =
              targetGrades.length === 0 ||
              targetGrades.includes(teacherInfo.grade_level);
            const classMatch =
              targetClasses.length === 0 ||
              targetClasses.includes(teacherInfo.class_number);

            

            return gradeMatch && classMatch;
          }) || [];

        

        if (filteredSurveys.length > 0) {
          setSurveys(filteredSurveys);
          setSelectedSurvey(filteredSurveys[0]);
          // 응답자 수 계산
          await calculateResponseCounts(filteredSurveys);
        } else {
          setSurveys([]);
        }
      } else {
        // 다른 역할의 경우 학교 전체 설문
        const { data, error } = await query.order("created_at", {
          ascending: false,
        });

        if (error) {
          console.error("Survey error:", error);
          throw error;
        }

        if (data && data.length > 0) {
          setSurveys(data);
          setSelectedSurvey(data[0]);
          // 응답자 수 계산
          await calculateResponseCounts(data);

          // 즉시 테스트를 위한 추가 로그
          setTimeout(() => {
            
          }, 1000);
        } else {
          setSurveys([]);
        }
      }
    } catch (error) {
      console.error("Error fetching surveys:", error);
    }
  };

  const fetchStudents = async () => {
    try {
      if (!teacherInfo) {
        setStudents([]);
        return;
      }

      let query = supabase.from("students").select("*");

      // 학교 ID로 필터링
      if (teacherInfo.school_id) {
        query = query.eq("current_school_id", teacherInfo.school_id);
      }

      // 담임교사인 경우 학년/반으로 추가 필터링
      if (
        teacherInfo.role === "homeroom_teacher" &&
        teacherInfo.grade_level &&
        teacherInfo.class_number
      ) {
        query = query
          .eq("grade", teacherInfo.grade_level)
          .eq("class", teacherInfo.class_number);
      }

      const { data, error } = await query.order("student_number", {
        ascending: true,
      });

      if (error) throw error;

      if (data && data.length > 0) {
        // 네트워크 분석 결과 조회 (StudentManagement.tsx와 동일한 방식)
        const { data: networkData, error: networkError } = await supabase
          .from("network_analysis_results")
          .select("*")
          .eq("analysis_type", "complete_network_analysis")
          .order("calculated_at", { ascending: false })
          .limit(1);

        if (networkError) {
          console.error("네트워크 분석 결과 조회 오류:", networkError);
        }

        // 학생 데이터에 네트워크 메트릭 연결
        const studentsWithMetrics = data.map((student) => {
          let metrics = null;
          if (networkData && networkData.length > 0) {
            const completeAnalysis = networkData[0];
            const recommendations = completeAnalysis.recommendations as any;
            const completeData = recommendations?.complete_analysis_data;

            if (completeData?.nodes) {
              const node = completeData.nodes.find(
                (n: any) =>
                  n.id === student.id ||
                  (n.name === student.name &&
                    n.grade === student.grade &&
                    n.class === student.class),
              );

              if (node) {
                metrics = {
                  centrality_scores: {
                    centrality: node.centrality,
                    degree: node.centrality, // 호환성을 위해 degree도 설정
                    betweenness: node.betweenness || 0,
                    closeness: node.closeness || 0,
                  },
                  community_membership: node.community || 0,
                  recommendations: node.recommendations || {},
                };
              }
            }
          }

          return {
            ...student,
            network_metrics: metrics,
          };
        });

        setStudents(studentsWithMetrics);
        setSelectedStudent(studentsWithMetrics[0].id);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
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

  // 학생 유형별 분류 함수들
  const getStudentType = (student: Student) => {
    // 전체 네트워크 분석 데이터에서 해당 학생의 유형 찾기 (우선순위 1)
    if (networkAnalysisData) {
      const networkNode = networkAnalysisData.nodes.find(
        (n) => n.id === student.id,
      );
      if (networkNode && networkNode.friendship_type) {
        switch (networkNode.friendship_type) {
          case "외톨이형":
            return "isolated";
          case "소수 친구 학생":
            return "few_friends";
          case "평균적인 학생":
            return "average";
          case "친구 많은 학생":
            return "many_friends";
          case "사교 스타":
            return "social_star";
        }
      }
    }

    // 네트워크 메트릭이 있으면 사용 (우선순위 2)
    if (student.network_metrics) {
      const centrality =
        student.network_metrics.centrality_scores?.centrality ||
        student.network_metrics.centrality_scores?.degree ||
        0;

      const totalStudents = students.length;
      const maxPossibleConnections = totalStudents - 1;
      const normalizedCentrality =
        centrality / Math.max(maxPossibleConnections, 1);

      if (normalizedCentrality < 0.1) return "isolated"; // 외톨이형
      if (normalizedCentrality < 0.3) return "few_friends"; // 소수 친구 학생
      if (normalizedCentrality < 0.6) return "average"; // 평균적인 학생
      if (normalizedCentrality < 0.8) return "many_friends"; // 친구 많은 학생
      return "social_star"; // 사교 스타
    }

    // 개별 네트워크 데이터에서 계산 (우선순위 3)
    if (individualNetworkData.length > 0) {
      const studentData = individualNetworkData.find(
        (s) => s.id === student.id,
      );
      if (studentData) {
        const totalStudents = individualNetworkData.length;
        const maxPossibleConnections = totalStudents - 1;
        const normalizedCentrality =
          studentData.friendCount / Math.max(maxPossibleConnections, 1);

        if (normalizedCentrality < 0.1) return "isolated";
        if (normalizedCentrality < 0.3) return "few_friends";
        if (normalizedCentrality < 0.6) return "average";
        if (normalizedCentrality < 0.8) return "many_friends";
        return "social_star";
      }
    }

    // 기본값: 평균적인 학생
    return "average";
  };

  const getStudentTypeColor = (type: string) => {
    switch (type) {
      case "isolated":
        return "text-white"; // #FF6B6B 외톨이형
      case "few_friends":
        return "text-white"; // #4ECDC4 소수 친구 학생
      case "average":
        return "text-white"; // #45B7D1 평균적인 학생
      case "many_friends":
        return "text-white"; // #96CEB4 친구 많은 학생
      case "social_star":
        return "text-gray-800"; // #FFEAA7 사교 스타
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStudentTypeBgColor = (type: string) => {
    switch (type) {
      case "isolated":
        return "#FF6B6B"; // 외톨이형 - 빨간색
      case "few_friends":
        return "#4ECDC4"; // 소수 친구 학생 - 청록색
      case "average":
        return "#45B7D1"; // 평균적인 학생 - 파란색
      case "many_friends":
        return "#96CEB4"; // 친구 많은 학생 - 민트색
      case "social_star":
        return "#FFEAA7"; // 사교 스타 - 노란색
      default:
        return "#94a3b8";
    }
  };

  const getStudentTypeLabel = (type: string) => {
    switch (type) {
      case "isolated":
        return "외톨이형";
      case "few_friends":
        return "소수 친구 학생";
      case "average":
        return "평균적인 학생";
      case "many_friends":
        return "친구 많은 학생";
      case "social_star":
        return "사교 스타";
      default:
        return "평균적인 학생";
    }
  };

  // 개별 학생의 네트워크 데이터 생성 (선택된 학생 중심)
  const generateIndividualNetworkData = useCallback(
    async (studentId: string, surveyId: string) => {
      const selectedStudentData = students.find((s) => s.id === studentId);
      if (!selectedStudentData) return [];

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
          .eq("id", surveyId)
          .single();

        if (surveyError) throw surveyError;

        // 2. 선택된 학생의 설문 응답 데이터 조회
        const { data: studentResponse, error: responseError } = await supabase
          .from("survey_responses")
          .select(
            `
          *,
          students!survey_responses_student_id_fkey(id, name)
        `,
          )
          .eq("survey_id", surveyId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (responseError) {
          console.error("설문 응답 조회 오류:", responseError);
          return [];
        }

        if (!studentResponse) {
          return [];
        }

        // 3. 학생 데이터 조회
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*");

        if (studentsError) throw studentsError;

        // 4. 템플릿 메타데이터에서 max_selections 추출
        const metadata = surveyData?.survey_templates?.metadata as any;
        const maxSelections = metadata?.max_selections || [];
        setMaxSelections(maxSelections);

        // 5. 모든 학생들의 응답을 조회하여 양방향 관계 고려
        const { data: allResponses, error: allResponsesError } = await supabase
          .from("survey_responses")
          .select("*")
          .eq("survey_id", surveyId);

        if (allResponsesError) throw allResponsesError;

        const studentMap = new Map(studentsData.map((s) => [s.id, s]));
        const selectedFriends = new Set<string>();

        // 선택된 학생의 응답에서 친구 추출 (선택된 학생이 선택한 친구)
        if (studentResponse && studentResponse.responses) {
          const answers =
            typeof studentResponse.responses === "string"
              ? JSON.parse(studentResponse.responses)
              : studentResponse.responses;

          Object.entries(answers).forEach(
            ([questionKey, answer]: [string, any]) => {
              const questionIndex = parseInt(questionKey.replace("q", "")) - 1;
              const maxSelection = maxSelections[questionIndex] || 10;

              if (Array.isArray(answer)) {
                const limitedAnswers = answer.slice(0, maxSelection);
                limitedAnswers.forEach((friendId: string) => {
                  if (
                    friendId &&
                    studentMap.has(friendId) &&
                    friendId !== studentId
                  ) {
                    selectedFriends.add(friendId);
                  }
                });
              } else if (
                typeof answer === "string" &&
                studentMap.has(answer) &&
                answer !== studentId
              ) {
                if (maxSelection >= 1) {
                  selectedFriends.add(answer);
                }
              }
            },
          );
        }

        // 다른 학생들의 응답에서 선택된 학생을 선택한 경우도 추가 (양방향 관계)
        allResponses?.forEach((response) => {
          if (response.student_id !== studentId && response.responses) {
            const answers =
              typeof response.responses === "string"
                ? JSON.parse(response.responses)
                : response.responses;

            Object.entries(answers).forEach(
              ([questionKey, answer]: [string, any]) => {
                const questionIndex =
                  parseInt(questionKey.replace("q", "")) - 1;
                const maxSelection = maxSelections[questionIndex] || 10;

                if (Array.isArray(answer)) {
                  const limitedAnswers = answer.slice(0, maxSelection);
                  if (
                    limitedAnswers.includes(studentId) &&
                    response.student_id
                  ) {
                    selectedFriends.add(response.student_id);
                  }
                } else if (
                  answer === studentId &&
                  maxSelection >= 1 &&
                  response.student_id
                ) {
                  selectedFriends.add(response.student_id);
                }
              },
            );
          }
        });

        // 6. 개별 네트워크 데이터 생성 (선택된 학생 + 선택한 친구들만)
        const individualNetworkData = [];

        // 전체 네트워크 분석 데이터에서 friendship_type 가져오기
        const getFriendshipTypeFromNetwork = (studentId: string) => {
          if (networkAnalysisData) {
            const networkNode = networkAnalysisData.nodes.find(
              (n) => n.id === studentId,
            );
            if (networkNode && networkNode.friendship_type) {
              return networkNode.friendship_type;
            }
          }
          return "평균적인 학생"; // 기본값
        };

        console.log(`🔍 개별 네트워크 생성: 학생=${selectedStudentData.name}, 친구수=${selectedFriends.size}`);

        // 선택된 학생 추가
        individualNetworkData.push({
          id: selectedStudentData.id,
          name: selectedStudentData.name,
          grade: selectedStudentData.grade,
          class: selectedStudentData.class,
          friends: Array.from(selectedFriends),
          friendCount: selectedFriends.size,
          isCenter: true, // 중심 학생 표시
          friendship_type: getFriendshipTypeFromNetwork(selectedStudentData.id), // 전체 네트워크 데이터에서 가져오기
        });

        // 선택한 친구들 추가
        selectedFriends.forEach((friendId) => {
          const friend = studentMap.get(friendId);
          if (friend) {
            individualNetworkData.push({
              id: friend.id,
              name: friend.name,
              grade: friend.grade,
              class: friend.class,
              friends: [selectedStudentData.id], // 선택된 학생과의 관계만
              friendCount: 1,
              isCenter: false,
              friendship_type: getFriendshipTypeFromNetwork(friendId), // 전체 네트워크 데이터에서 가져오기
            });
          }
        });

        return individualNetworkData;
      } catch (error) {
        console.error("Error in generateIndividualNetworkData:", error);
        return [];
      }
    },
    [students, networkAnalysisData],
  );

  // 학생 또는 설문 선택 시 네트워크 데이터 생성
  useEffect(() => {
    if (selectedStudent && selectedSurvey && students.length > 0) {
      setNetworkLoading(true);

      // 개별 네트워크 데이터 생성
      generateIndividualNetworkData(selectedStudent, selectedSurvey.id)
        .then((data) => {
          console.log('✅ individualNetworkData state 설정:', data);
          setIndividualNetworkData(data);
        })
        .catch((error) => {
          console.error("Error generating individual network data:", error);
          setIndividualNetworkData([]);
        })
        .finally(() => {
          setNetworkLoading(false);
        });
    }
  }, [
    selectedStudent,
    selectedSurvey,
    students,
    generateIndividualNetworkData,
  ]);

  const selectedStudentData = students.find((s) => s.id === selectedStudent);

  // Python 분석용 친구 관계 데이터 준비
  const prepareFriendshipDataForPython = useCallback(async () => {
    if (!selectedSurvey) return [];

    try {
      // 전체 학급의 설문 응답 데이터 조회 (선택된 학생만이 아닌 모든 학생)
      const { data: allResponses, error: responseError } = await supabase
        .from("survey_responses")
        .select("*")
        .eq("survey_id", selectedSurvey.id);

      if (responseError || !allResponses || allResponses.length === 0) {
        return [];
      }

      // 설문 템플릿 메타데이터 조회
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

      if (surveyError || !surveyData) {
        return [];
      }

      const metadata = surveyData?.survey_templates?.metadata as any;
      const maxSelections = metadata?.max_selections || [];

      // 전체 학급의 친구 관계 데이터 변환
      const friendshipData: Array<{
        student_id: string;
        friend_student_id: string;
        relationship_type: string;
        strength_score: number;
      }> = [];

      // 모든 학생의 응답을 처리
      allResponses.forEach((response) => {
        if (response.responses && response.student_id) {
          const answers =
            typeof response.responses === "string"
              ? JSON.parse(response.responses)
              : response.responses;

          Object.entries(answers).forEach(
            ([questionKey, answer]: [string, any]) => {
              const questionIndex = parseInt(questionKey.replace("q", "")) - 1;
              const maxSelection = maxSelections[questionIndex] || 10;

              if (Array.isArray(answer)) {
                const limitedAnswers = answer.slice(0, maxSelection);
                limitedAnswers.forEach((friendId: string) => {
                  if (
                    friendId &&
                    friendId !== response.student_id &&
                    response.student_id
                  ) {
                    friendshipData.push({
                      student_id: response.student_id,
                      friend_student_id: friendId,
                      relationship_type: "friend",
                      strength_score: 1.0,
                    });
                  }
                });
              } else if (
                typeof answer === "string" &&
                answer !== response.student_id &&
                response.student_id
              ) {
                if (maxSelection >= 1) {
                  friendshipData.push({
                    student_id: response.student_id,
                    friend_student_id: answer,
                    relationship_type: "friend",
                    strength_score: 1.0,
                  });
                }
              }
            },
          );
        }
      });

      return friendshipData;
    } catch (error) {
      console.error("친구 관계 데이터 준비 오류:", error);
      return [];
    }
  }, [selectedSurvey]);

  // 추가 설문 데이터 수집 함수 (다른 설문들의 내용도 참조)
  const prepareAdditionalSurveyData = useCallback(async () => {
    if (!selectedStudentData) return null;

    try {
      // 해당 학생의 모든 설문 응답 조회
      const { data: allResponses, error } = await supabase
        .from("survey_responses")
        .select(
          `
          *,
          surveys (
            id,
            title,
            questions
          )
        `,
        )
        .eq("student_id", selectedStudentData.id);

      if (error) throw error;

      // 설문 응답을 구조화된 데이터로 변환
      const surveyData =
        allResponses?.map((response) => ({
          surveyTitle: response.surveys?.title || "알 수 없는 설문",
          responses: response.responses,
          questions: response.surveys?.questions || [],
          submittedAt: response.submitted_at,
        })) || [];

      return {
        studentName: selectedStudentData.name,
        totalSurveys: surveyData.length,
        surveys: surveyData,
      };
    } catch (error) {
      console.error("추가 설문 데이터 수집 오류:", error);
      return null;
    }
  }, [selectedStudentData]);

  // AI 리포트 파일 출력 함수
  const handlePrintReport = useCallback(() => {
    if (!aiReport || !selectedStudentData || !selectedSurvey) return;

    // HTML 생성
    const printContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${selectedStudentData.name} 학생 AI 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: white;
      padding: 40px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #3F80EA;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      color: #3F80EA;
      margin-bottom: 10px;
    }
    .header .meta {
      font-size: 14px;
      color: #6b7280;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }
    .subsection {
      margin-bottom: 20px;
    }
    .subsection-title {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }
    .content {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.8;
      white-space: pre-wrap;
    }
    .list {
      margin-left: 20px;
    }
    .list-item {
      margin-bottom: 8px;
      padding-left: 10px;
      border-left: 3px solid #3F80EA;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-right: 8px;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }
    .table td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 150px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎓 학생 개별 지도 리포트</h1>
    <div class="meta">
      <p><strong>${selectedStudentData.name}</strong> 학생 (${selectedStudentData.grade}학년 ${selectedStudentData.class}반)</p>
      <p>설문: ${selectedSurvey.title}</p>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 1. 종합 진단</div>
    <div class="subsection">
      <div class="subsection-title">학생 유형</div>
      <div class="content">
        <span class="badge badge-primary">${aiReport.comprehensiveDiagnosis.studentType}</span>
      </div>
    </div>
    <div class="subsection">
      <div class="subsection-title">종합 평가</div>
      <div class="content">${aiReport.comprehensiveDiagnosis.summary}</div>
    </div>
    <div class="subsection">
      <div class="subsection-title">주요 특징</div>
      <div class="list">
        ${aiReport.comprehensiveDiagnosis.keyCharacteristics.map(char => `<div class="list-item">✓ ${char}</div>`).join('')}
      </div>
    </div>
    <div class="subsection">
      <div class="subsection-title">개선 영역</div>
      <div class="list">
        ${aiReport.comprehensiveDiagnosis.challenges.map(challenge => `<div class="list-item">• ${challenge}</div>`).join('')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📝 2. 세부 분석</div>
    
    <div class="subsection">
      <div class="subsection-title">학교생활 만족도</div>
      <table class="table">
        ${aiReport.detailedAnalysis.schoolLifeSatisfaction.surveyResults.map(result => `
          <tr>
            <td>${result.question}</td>
            <td><strong>${result.answer}</strong></td>
          </tr>
        `).join('')}
      </table>
      <div class="content">${aiReport.detailedAnalysis.schoolLifeSatisfaction.analysis}</div>
    </div>

    <div class="subsection">
      <div class="subsection-title">폭력 경험도</div>
      <table class="table">
        ${aiReport.detailedAnalysis.violenceExperience.surveyResults.map(result => `
          <tr>
            <td>${result.question}</td>
            <td><strong>${result.answer}</strong></td>
          </tr>
        `).join('')}
      </table>
      <div class="content">${aiReport.detailedAnalysis.violenceExperience.analysis}</div>
    </div>

    <div class="subsection">
      <div class="subsection-title">교우관계 네트워크 분석</div>
      <table class="table">
        <tr>
          <td>받은 선택 수</td>
          <td><strong>${aiReport.detailedAnalysis.peerNetworkAnalysis.receivedChoices}명</strong></td>
        </tr>
        <tr>
          <td>한 선택 수</td>
          <td><strong>${aiReport.detailedAnalysis.peerNetworkAnalysis.madeChoices}명</strong></td>
        </tr>
        <tr>
          <td>네트워크 위치</td>
          <td><strong>${aiReport.detailedAnalysis.peerNetworkAnalysis.networkPosition}</strong></td>
        </tr>
      </table>
      <div class="content">${aiReport.detailedAnalysis.peerNetworkAnalysis.analysis}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">💪 3. 강점 및 개선 영역</div>
    
    <div class="subsection">
      <div class="subsection-title">강점</div>
      <div class="list">
        ${aiReport.strengthsAndImprovements.strengths.map(strength => `
          <div class="list-item">
            <strong>${strength.title}</strong><br>
            ${strength.description}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">개선 영역</div>
      <div class="list">
        ${aiReport.strengthsAndImprovements.improvementAreas.map(area => `
          <div class="list-item">
            <strong>${area.title}</strong><br>
            ${area.description}
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">🎯 4. 맞춤형 솔루션</div>
    
    <div class="subsection">
      <div class="subsection-title">전체 목표</div>
      <div class="content">${aiReport.customizedSolutions.overallGoal}</div>
    </div>

    <div class="subsection">
      <div class="subsection-title">단기 솔루션 (1-2주)</div>
      <div class="list">
        ${aiReport.customizedSolutions.shortTermSolutions.map(solution => `
          <div class="list-item">
            <strong>${solution.title}</strong><br>
            ${solution.description}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">중기 솔루션 (1-2개월)</div>
      <div class="list">
        ${aiReport.customizedSolutions.midTermSolutions.map(solution => `
          <div class="list-item">
            <strong>${solution.title}</strong><br>
            ${solution.description}
          </div>
        `).join('')}
      </div>
    </div>

    <div class="subsection">
      <div class="subsection-title">장기 솔루션 (3-6개월)</div>
      <div class="list">
        ${aiReport.customizedSolutions.longTermSolutions.map(solution => `
          <div class="list-item">
            <strong>${solution.title}</strong><br>
            ${solution.description}
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="footer">
    <p>본 리포트는 와이즈온스쿨 AI 분석 시스템에서 자동으로 생성되었습니다.</p>
    <p>생성 일시: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</p>
    <p>© 2025 WiseOn School. All rights reserved.</p>
  </div>

  <div class="no-print" style="position: fixed; top: 20px; right: 20px; display: flex; gap: 10px;">
    <button onclick="window.print()" style="
      background: #3F80EA;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      🖨️ 인쇄하기
    </button>
    <button onclick="window.close()" style="
      background: #6b7280;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    ">
      ✕ 닫기
    </button>
  </div>
</body>
</html>
    `;

    // 새 창에서 미리보기 열기
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  }, [aiReport, selectedStudentData, selectedSurvey]);

  // 24시간 경과 여부 확인 함수
  const canRegenerateReport = useCallback(() => {
    if (!aiReportCreatedAt) return true; // 생성된 리포트가 없으면 생성 가능
    
    const createdTime = new Date(aiReportCreatedAt);
    const now = new Date();
    const hoursPassed = (now.getTime() - createdTime.getTime()) / (1000 * 60 * 60);
    
    return hoursPassed >= 24;
  }, [aiReportCreatedAt]);

  // AI 리포트 생성 함수
  const generateAIReport = useCallback(async () => {
    if (
      !selectedStudentData ||
      !individualNetworkData.length ||
      !selectedSurvey
    )
      return;

    setAiReportLoading(true);

    try {
      // 먼저 기존 리포트가 있는지 확인
      const existingReport = await AIReportService.getAIReport(
        selectedStudentData.id,
        selectedSurvey.id,
      );

      if (existingReport) {
        // 기존 리포트가 있으면 DB에서 로드
        console.log('✅ 저장된 AI 리포트 발견. DB에서 불러옵니다.');
        setAiReport(existingReport.report_data || null);
        setAiReportCreatedAt(existingReport.created_at || null);
        setIsReportFromDB(true); // DB에서 불러온 것으로 표시
        setAiReportLoading(false);
        return;
      }

      console.log('📝 새 AI 리포트 생성 시작...');

      // 네트워크 분석 결과에서 데이터 추출 - 더 구체적인 메트릭 사용
      const centerStudent = individualNetworkData.find((s) => s.isCenter);
      const totalNodes = individualNetworkData.length;
      const maxPossibleConnections = totalNodes - 1;

      // 기본 중앙성 계산
      const basicCentrality = centerStudent
        ? centerStudent.friendCount / Math.max(maxPossibleConnections, 1)
        : 0;

      // 네트워크 메트릭에서 더 정확한 데이터 추출
      const networkMetrics = selectedStudentData.network_metrics;
      let refinedCentrality = basicCentrality;
      let communityId = 0;
      let isolationRisk = "보통";
      let friendshipDevelopment = "보통";
      let communityIntegration = "보통";

      if (networkMetrics) {
        // Python 분석 결과가 있으면 더 정확한 메트릭 사용
        const centralityMetrics = networkMetrics.centrality_metrics;
        if (centralityMetrics) {
          // 정규화된 중앙성 점수 사용 (0-1 범위)
          refinedCentrality = Math.min(
            centralityMetrics.degree / maxPossibleConnections,
            1,
          );
        }

        // 커뮤니티 ID 사용
        communityId = networkMetrics.community_id || 0;

        // 격리 위험도 분석 결과 사용
        if (networkMetrics.isolation_risk) {
          isolationRisk = networkMetrics.isolation_risk.level || "보통";
        }

        // 사회적 영향력 분석 결과 사용
        if (networkMetrics.social_influence) {
          const influenceLevel = networkMetrics.social_influence.level;
          friendshipDevelopment =
            influenceLevel === "높음"
              ? "양호"
              : influenceLevel === "보통"
                ? "보통"
                : "개선 필요";
          communityIntegration =
            influenceLevel === "높음"
              ? "높음"
              : influenceLevel === "보통"
                ? "보통"
                : "낮음";
        }
      } else {
        // 네트워크 메트릭이 없으면 기본 계산 사용
        isolationRisk =
          refinedCentrality < 0.3
            ? "높음"
            : refinedCentrality < 0.6
              ? "보통"
              : "낮음";
        friendshipDevelopment =
          refinedCentrality < 0.3
            ? "개선 필요"
            : refinedCentrality < 0.6
              ? "보통"
              : "양호";
        communityIntegration =
          refinedCentrality < 0.3
            ? "낮음"
            : refinedCentrality < 0.6
              ? "보통"
              : "높음";
      }

      // 개별 학생의 실제 설문 응답 데이터 수집
      const surveyResponses = await getStudentSurveyResponses(selectedStudentData.id, selectedSurvey.id);
      console.log('📋 수집된 설문 응답:', surveyResponses);
      console.log('📋 설문 응답 상세:', JSON.stringify(surveyResponses, null, 2));
      
      // 네트워크 특성 데이터 수집
      const networkCharacteristics = {
        madeChoices: centerStudent?.friendCount || 0,
        receivedChoices: individualNetworkData.filter(s => s.friends && s.friends.includes(selectedStudentData.id)).length,
        networkPosition: networkMetrics?.network_position || "평균적인 학생",
        communityMembers: individualNetworkData
          .filter(s => s.community === communityId && s.id !== selectedStudentData.id)
          .map(s => s.name)
      };
      
      console.log('🔍 네트워크 특성:', networkCharacteristics);

      const satisfactionScore = calculateSatisfactionScore(surveyResponses);
      const violenceScore = calculateViolenceScore(surveyResponses);
      
      console.log('📊 계산된 점수:', {
        만족도: `${(satisfactionScore * 100).toFixed(1)}%`,
        폭력경험: `${(violenceScore * 100).toFixed(1)}%`,
        친구수: centerStudent?.friendCount || 0,
        중심성: `${(refinedCentrality * 100).toFixed(1)}%`
      });

      const analysisData: StudentAnalysisData = {
        studentName: selectedStudentData.name,
        grade: parseInt(selectedStudentData.grade),
        class: parseInt(selectedStudentData.class),
        centrality: refinedCentrality,
        community: communityId,
        totalRelationships: centerStudent?.friendCount || 0,
        isolationRisk: isolationRisk,
        friendshipDevelopment: friendshipDevelopment,
        communityIntegration: communityIntegration,
        satisfaction: satisfactionScore,
        violenceExperience: violenceScore,
        surveyResponses: surveyResponses,
        networkCharacteristics: networkCharacteristics
      };

      // 추가 설문 데이터 수집 (다른 설문들의 내용도 참조)
      const additionalSurveyData = await prepareAdditionalSurveyData();

      // ChatGPT API 호출
      const result = await generateStudentGuidanceReport(
        analysisData,
        additionalSurveyData,
      );

      // 리포트를 먼저 표시
      setAiReport(result.report);
      setTokenUsage(result.tokenUsage);
      setIsReportFromDB(false); // 새로 생성된 것으로 표시

      // DB에 저장 시도 (실패해도 리포트는 표시됨)
      try {
        const savedReport = await AIReportService.saveAIReport(
        selectedStudentData.id,
        selectedSurvey.id,
          result.report,
          result.tokenUsage,
        );
        // 저장 성공 시 생성 시간 저장
        if (savedReport && savedReport.created_at) {
          setAiReportCreatedAt(savedReport.created_at);
          setIsReportFromDB(true); // DB에 저장 후 DB 상태로 변경
          console.log('✅ AI 리포트 DB 저장 완료!');
        }
      } catch (saveError) {
        // DB 저장 실패해도 무시 (리포트는 이미 표시됨)
        console.error('⚠️ AI 리포트 DB 저장 실패:', saveError);
      }
    } catch (error) {

      // 대체 리포트 생성 (오류 메시지 없이)
      const centerStudent = individualNetworkData.find((s) => s.isCenter);
      const centrality = centerStudent
        ? centerStudent.friendCount /
          Math.max(individualNetworkData.length - 1, 1)
        : 0;

      // 대체 리포트용 데이터도 개별화
      const surveyResponses = await getStudentSurveyResponses(selectedStudentData.id, selectedSurvey.id);
      console.log('📋 대체 리포트 - 설문 응답:', surveyResponses);
      
      const networkCharacteristics = {
        madeChoices: centerStudent?.friendCount || 0,
        receivedChoices: individualNetworkData.filter(s => s.friends && s.friends.includes(selectedStudentData.id)).length,
        networkPosition: "평균적인 학생",
        communityMembers: individualNetworkData
          .filter(s => s.community === 0 && s.id !== selectedStudentData.id)
          .map(s => s.name)
      };

      const satisfactionScore = calculateSatisfactionScore(surveyResponses);
      const violenceScore = calculateViolenceScore(surveyResponses);
      
      console.log('📊 대체 리포트 - 계산된 점수:', {
        만족도: `${(satisfactionScore * 100).toFixed(1)}%`,
        폭력경험: `${(violenceScore * 100).toFixed(1)}%`,
        친구수: centerStudent?.friendCount || 0
      });

      const analysisData: StudentAnalysisData = {
        studentName: selectedStudentData.name,
        grade: parseInt(selectedStudentData.grade),
        class: parseInt(selectedStudentData.class),
        centrality: centrality,
        community: 0,
        totalRelationships: centerStudent?.friendCount || 0,
        isolationRisk:
          centrality < 0.3 ? "높음" : centrality < 0.6 ? "보통" : "낮음",
        friendshipDevelopment:
          centrality < 0.3 ? "개선 필요" : centrality < 0.6 ? "보통" : "양호",
        communityIntegration:
          centrality < 0.3 ? "낮음" : centrality < 0.6 ? "보통" : "높음",
        satisfaction: satisfactionScore,
        violenceExperience: violenceScore,
        surveyResponses: surveyResponses,
        networkCharacteristics: networkCharacteristics
      };

      const fallbackResult = generateFallbackReport(analysisData);

      // 리포트를 먼저 표시
      setAiReport(fallbackResult.report);
      setTokenUsage(fallbackResult.tokenUsage);
      setIsReportFromDB(false); // 새로 생성된 것으로 표시

      // 대체 리포트도 DB에 저장 시도 (실패해도 무시)
      if (selectedSurvey) {
        try {
          const savedReport = await AIReportService.saveAIReport(
            selectedStudentData.id,
            selectedSurvey.id,
            fallbackResult.report,
            fallbackResult.tokenUsage,
          );
          // 저장 성공 시 생성 시간 저장
          if (savedReport && savedReport.created_at) {
            setAiReportCreatedAt(savedReport.created_at);
            setIsReportFromDB(true); // DB에 저장 후 DB 상태로 변경
            console.log('✅ 대체 리포트 DB 저장 완료!');
          }
        } catch (saveError) {
          // DB 저장 실패해도 무시 (리포트는 이미 표시됨)
          console.error('⚠️ 대체 리포트 DB 저장 실패:', saveError);
        }
      }
    } finally {
      setAiReportLoading(false);
    }
  }, [selectedStudentData, individualNetworkData, selectedSurvey]);

  // Python 네트워크 분석 실행 함수
  const runPythonAnalysis = useCallback(async () => {
    if (!selectedStudentData || !selectedSurvey) return;

    setPythonAnalysisLoading(true);
    setPythonAnalysisError(null);

    try {
      // 설문 응답 데이터를 Python 분석 형식으로 변환
      const friendshipData = await prepareFriendshipDataForPython();

      if (!friendshipData || friendshipData.length === 0) {
        throw new Error("분석할 친구 관계 데이터가 없습니다.");
      }

      // Python API 호출
      const response = await fetch(
        "http://localhost:5001/api/individual-analysis",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: selectedStudent,
            friendship_data: friendshipData,
            student_info: students.map((student) => ({
              id: student.id,
              name: student.name,
              grade: student.grade,
              class: student.class,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Python 분석 API 오류: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setPythonAnalysisResult(result.data);
      } else {
        throw new Error(result.error || "Python 분석 실패");
      }
    } catch (error) {
      console.error("Python 분석 오류:", error);
      setPythonAnalysisError(
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.",
      );
    } finally {
      setPythonAnalysisLoading(false);
    }
  }, [
    selectedStudentData,
    selectedSurvey,
    students,
    selectedStudent,
    prepareFriendshipDataForPython,
  ]);

  // AI리포트 탭이 활성화될 때 리포트 생성
  useEffect(() => {
    if (
      activeTab === "ai" &&
      selectedStudentData &&
      individualNetworkData.length > 0
    ) {
      // 학생이 변경되면 기존 AI 리포트를 초기화하고 새로 생성
      if (selectedStudent) {
        setAiReport(null);
        setAiReportCreatedAt(null);
        setIsReportFromDB(false); // 상태 초기화
        generateAIReport();
      }
    }
  }, [
    activeTab,
    selectedStudent,
    selectedStudentData,
    individualNetworkData.length,
    generateAIReport,
  ]);

  // Python 분석 탭이 활성화될 때 분석 실행
  useEffect(() => {
    if (activeTab === "python" && selectedStudentData && selectedSurvey) {
      // 학생이 변경되면 기존 Python 분석 결과를 초기화하고 새로 분석
      if (selectedStudent) {
        setPythonAnalysisResult(null);
        runPythonAnalysis();
      }
    }
  }, [
    activeTab,
    selectedStudent,
    selectedStudentData,
    selectedSurvey,
    runPythonAnalysis,
  ]);

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
      <div className="flex-col">
        {/* 상단 바 */}
        <div className="mb-6 w-full rounded-lg border border-gray-200 bg-white">
          <div className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              분석 대상 리스트 총 {surveys.length}개
              {teacherInfo?.role === "homeroom_teacher" &&
                teacherInfo?.grade_level &&
                teacherInfo?.class_number && (
                  <span className="ml-2 text-sm font-normal text-gray-600">
                    ({teacherInfo.grade_level}학년 {teacherInfo.class_number}반
                    담임)
                  </span>
                )}
            </h2>

            <div className="flex h-fit w-full gap-2 overflow-x-scroll">
              {surveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`h-36 min-w-72 cursor-pointer rounded-lg border p-4 transition-colors ${
                    selectedSurvey?.id === survey.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSurvey(survey)}
                >
                  <h3 className="mb-2 font-medium text-gray-900">
                    {survey.title}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      템플릿형:{" "}
                      {survey.survey_templates?.metadata?.category ||
                        "분석가능"}
                    </p>
                    <p>평가인원: {surveyResponseCounts[survey.id] || 0}명</p>
                    <p>
                      상태:{" "}
                      <span
                        className={`font-medium ${survey.status === "completed" ? "text-green-600" : survey.status === "active" ? "text-blue-600" : "text-gray-600"}`}
                      >
                        {survey.status === "completed"
                          ? "완료"
                          : survey.status === "active"
                            ? "진행중"
                            : survey.status}
                      </span>
                    </p>
                    <p>날짜: {formatDate(survey.created_at || "")}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠  */}
        <div className="flex w-full gap-6">
          {/* 사이드 학생 목록 */}
          <div className="min-h-screen w-1/4 rounded-lg border border-gray-200 bg-white">
            <div className="p-4">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                {teacherInfo?.role === "homeroom_teacher" &&
                teacherInfo?.grade_level &&
                teacherInfo?.class_number
                  ? `${teacherInfo.grade_level}학년 ${teacherInfo.class_number}반 총 ${students.length}명`
                  : `학생 총 ${students.length}명`}
              </h2>

              <div className="space-y-1">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className={`cursor-pointer rounded-lg p-2 transition-colors ${
                      selectedStudent === student.id
                        ? "bg-blue-50 text-blue-900"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedStudent(student.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="truncate text-sm font-medium">
                          {index + 1}번) {student.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStudentTypeColor(
                            getStudentType(student),
                          )}`}
                          style={{
                            backgroundColor: getStudentTypeBgColor(
                              getStudentType(student),
                            ),
                          }}
                        >
                          {getStudentTypeLabel(getStudentType(student))}
                        </span>
                      </div>
                      {selectedStudent === student.id && (
                        <ChevronRightIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 학생 개별 분석 리포트 */}
          <div className="w-3/4">
            <div className="pt-6">
              {selectedStudentData ? (
                <div>
                  <div className="flex justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedStudentData.name} 학생 개별 분석 리포트
                    </h2>
                    {/* 탭 헤더 */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex space-x-1 rounded-lg bg-gray-100 p-1">
                        <button
                          onClick={() => setActiveTab("core")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "core"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          핵심결과
                        </button>
                        <button
                          onClick={() => setActiveTab("ai")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "ai"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          AI리포트
                        </button>
                        {/* <button
                          onClick={() => setActiveTab("python")}
                          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === "python"
                              ? "bg-white text-[#3F80EA] shadow-sm"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          Python분석
                        </button> */}
                      </div>
                    </div>
                  </div>

                  {/* 관계 네트워크 그래프 */}
                  <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
                    {/* 관계 네트워크 그래프 제목 */}
                    {/* <h3 className="mb-4 text-lg font-medium text-gray-900">
                      관계 네트워크 그래프
                    </h3> */}

                    {/* 탭 내용 */}
                    {activeTab === "core" && (
                      <div>
                        {networkLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              네트워크 분석을 실행하는 중...
                            </p>
                          </div>
                        ) : individualNetworkData.length > 0 ? (
                          <div className="mx-auto w-fit">
                            {/* <div className="text-sm text-gray-600">
                               개별 학생 네트워크 분석 (선택된 학생의 친구 관계만
                               표시)
                             </div> */}
                            <NetworkGraph
                              students={individualNetworkData}
                              maxSelections={
                                maxSelections.length > 0
                                  ? Math.max(...maxSelections)
                                  : 5
                              }
                              isInteractive={false}
                            />
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-gray-500">
                              <p className="mb-2 text-lg font-medium">
                                네트워크 데이터가 없습니다
                              </p>
                              <p className="text-sm">
                                설문 응답 데이터를 확인해주세요.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === "ai" && (
                      <div className="space-y-6">
                        {aiReportLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              AI 리포트를 생성하는 중...
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              진단 전문 LLM으로 개인별 분석 결과를 바탕으로
                              리포트를 작성하고 있습니다.
                            </p>
                          </div>
                        ) : aiReport ? (
                          <div className="space-y-4">
                            {/* 재생성 및 출력 버튼 */}
                            <div className="flex justify-end space-x-3">
                              <button
                                onClick={handlePrintReport}
                                className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                  />
                                </svg>
                                <span>파일로 출력</span>
                              </button>
                              {/* 재생성 버튼 - 24시간 후에만 표시 */}
                              {canRegenerateReport() && (
                              <button
                                onClick={async () => {
                                  // 기존 리포트 삭제 후 재생성
                                  setAiReport(null);
                                    setAiReportCreatedAt(null);
                                    setIsReportFromDB(false); // 상태 초기화
                                  setAiReportLoading(true);

                                  try {
                                    // DB에서 기존 리포트 삭제
                                    if (selectedStudentData && selectedSurvey) {
                                      await AIReportService.deleteAIReportByStudentSurvey(
                                        selectedStudentData.id,
                                        selectedSurvey.id,
                                      );
                                    }

                                    // 새 리포트 생성
                                    await generateAIReport();
                                  } catch (error) {
                                    console.error("리포트 재생성 오류:", error);
                                    setAiReportLoading(false);
                                  }
                                }}
                                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                                <span>리포트 재생성</span>
                              </button>
                              )}
                              {/* 24시간 이내인 경우 안내 메시지 */}
                              {!canRegenerateReport() && aiReportCreatedAt && (
                                <div className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-600">
                                  <svg
                                    className="h-4 w-4"
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
                                  <span>
                                    리포트 재생성은 24시간 후 가능합니다
                                    (생성: {new Date(aiReportCreatedAt).toLocaleString('ko-KR', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })})
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* DB 상태 표시 뱃지 */}
                            {isReportFromDB && (
                              <div className="flex items-center space-x-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                                <svg
                                  className="h-5 w-5 text-green-600"
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
                                <span className="text-sm font-medium text-green-800">
                                  💾 데이터베이스에서 불러온 리포트
                                </span>
                                {aiReportCreatedAt && (
                                  <span className="text-xs text-green-600">
                                    (생성: {new Date(aiReportCreatedAt).toLocaleString('ko-KR', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })})
                                  </span>
                                )}
                              </div>
                            )}
                            {!isReportFromDB && (
                              <div className="flex items-center space-x-2 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
                                <svg
                                  className="h-5 w-5 text-blue-600"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                                <span className="text-sm font-medium text-blue-800">
                                  ✨ 새로 생성된 리포트
                                </span>
                              </div>
                            )}

                            {/* AI 리포트 표시 */}
                            <AIReportDisplay aiReport={aiReport} tokenUsage={tokenUsage} />

                            {/* 실용적인 활용 예시 섹션 */}
                            <div className="mt-8 space-y-6">
                              {/* 문자메시지 예시 */}
                              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-blue-900">
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
                                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                    />
                                  </svg>
                                  💬 학부모 문자메시지 예시
                                </h3>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-blue-700">
                                        📱 긍정적 피드백형
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `안녕하세요, ${selectedStudentData?.name} 학부모님.\n\n최근 교우관계 분석 결과, ${selectedStudentData?.name} 학생이 친구들과 매우 긍정적인 관계를 맺고 있는 것으로 나타났습니다. ${selectedStudentData?.name} 학생의 밝은 모습이 학급 분위기에도 좋은 영향을 주고 있습니다.\n\n앞으로도 건강하고 즐거운 학교생활이 되도록 지도하겠습니다.\n\n${teacherInfo?.name || ''} 담임 올림`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-blue-600 underline hover:text-blue-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      안녕하세요, <strong>{selectedStudentData?.name}</strong> 학부모님.
                                      <br />
                                      <br />
                                      최근 교우관계 분석 결과, <strong>{selectedStudentData?.name}</strong> 학생이 친구들과 매우 긍정적인 관계를 맺고 있는 것으로 나타났습니다. {selectedStudentData?.name} 학생의 밝은 모습이 학급 분위기에도 좋은 영향을 주고 있습니다.
                                      <br />
                                      <br />
                                      앞으로도 건강하고 즐거운 학교생활이 되도록 지도하겠습니다.
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 담임 올림
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-orange-700">
                                        📱 관심 필요형
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `안녕하세요, ${selectedStudentData?.name} 학부모님.\n\n최근 교우관계 분석을 통해 ${selectedStudentData?.name} 학생의 학교생활을 살펴보았습니다. 좀 더 다양한 친구들과 교류할 수 있도록 학급에서 소그룹 활동 기회를 제공하고 있습니다.\n\n가정에서도 학교생활에 대해 편안하게 이야기 나눌 수 있는 시간을 가져주시면 좋겠습니다. 필요시 상담 일정을 잡아 자세히 말씀드리겠습니다.\n\n${teacherInfo?.name || ''} 담임 올림`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-orange-600 underline hover:text-orange-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      안녕하세요, <strong>{selectedStudentData?.name}</strong> 학부모님.
                                      <br />
                                      <br />
                                      최근 교우관계 분석을 통해 <strong>{selectedStudentData?.name}</strong> 학생의 학교생활을 살펴보았습니다. 좀 더 다양한 친구들과 교류할 수 있도록 학급에서 소그룹 활동 기회를 제공하고 있습니다.
                                      <br />
                                      <br />
                                      가정에서도 학교생활에 대해 편안하게 이야기 나눌 수 있는 시간을 가져주시면 좋겠습니다. 필요시 상담 일정을 잡아 자세히 말씀드리겠습니다.
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 담임 올림
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 학생 대상 문자메시지 예시 */}
                              <div className="rounded-lg border border-pink-200 bg-pink-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-pink-900">
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
                                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                  </svg>
                                  💌 학생 대상 문자메시지 예시
                                </h3>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-pink-700">
                                        📱 격려 및 응원형
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `${selectedStudentData?.name}야 안녕! 선생님이야 😊\n\n오늘 친구들이랑 재밌게 노는 거 봤어. ${selectedStudentData?.name} 웃는 모습 보니까 선생님도 기분 좋더라 ㅎㅎ\n\n내일도 오늘처럼 즐겁게 보내! 힘들거나 이야기하고 싶은 거 있으면 언제든 말해 🤗\n\n${teacherInfo?.name || ''} 쌤이`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-pink-600 underline hover:text-pink-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      <strong>{selectedStudentData?.name}</strong>야 안녕! 선생님이야 😊
                                      <br />
                                      <br />
                                      오늘 친구들이랑 재밌게 노는 거 봤어. <strong>{selectedStudentData?.name}</strong> 웃는 모습 보니까 선생님도 기분 좋더라 ㅎㅎ
                                      <br />
                                      <br />
                                      내일도 오늘처럼 즐겁게 보내! 힘들거나 이야기하고 싶은 거 있으면 언제든 말해 🤗
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 쌤이
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-pink-700">
                                        📱 관심 및 지지형
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `${selectedStudentData?.name}아 안녕~ 쌤이야! ☺️\n\n요즘 어때? 학교생활 재밌어? 선생님이 ${selectedStudentData?.name} 생각나서 연락했어 ㅎㅎ\n\n혹시 힘든 일 있거나 고민 있으면 쌤한테 언제든 말해도 돼. 내일 쉬는 시간에 잠깐 얘기할까? 🍪 과자도 준비할게!\n\n쌤이 항상 응원해! 💪\n\n${teacherInfo?.name || ''} 쌤`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-pink-600 underline hover:text-pink-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      <strong>{selectedStudentData?.name}</strong>아 안녕~ 쌤이야! ☺️
                                      <br />
                                      <br />
                                      요즘 어때? 학교생활 재밌어? 선생님이 <strong>{selectedStudentData?.name}</strong> 생각나서 연락했어 ㅎㅎ
                                      <br />
                                      <br />
                                      혹시 힘든 일 있거나 고민 있으면 쌤한테 언제든 말해도 돼. 내일 쉬는 시간에 잠깐 얘기할까? 🍪 과자도 준비할게!
                                      <br />
                                      <br />
                                      쌤이 항상 응원해! 💪
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 쌤
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-pink-700">
                                        📱 칭찬 및 동기부여형
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `${selectedStudentData?.name}야! 🌟\n\n오늘 수업시간에 발표한 거 진짜 대박이었어! 👏 ${selectedStudentData?.name} 점점 더 당당해지는 모습 보니까 쌤이 완전 뿌듯하다 ㅠㅠ\n\n이번 주도 이렇게 멋지게! 화이팅!! 💪✨\n\n${teacherInfo?.name || ''} 쌤이`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-pink-600 underline hover:text-pink-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      <strong>{selectedStudentData?.name}</strong>야! 🌟
                                      <br />
                                      <br />
                                      오늘 수업시간에 발표한 거 진짜 대박이었어! 👏 <strong>{selectedStudentData?.name}</strong> 점점 더 당당해지는 모습 보니까 쌤이 완전 뿌듯하다 ㅠㅠ
                                      <br />
                                      <br />
                                      이번 주도 이렇게 멋지게! 화이팅!! 💪✨
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 쌤이
                                    </p>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-sm font-semibold text-pink-700">
                                        📱 생일/특별한 날
                                      </span>
                                      <button
                                        onClick={() => {
                                          const message = `🎂 ${selectedStudentData?.name}야 생일 축하해!! 🎉🎈\n\n${selectedStudentData?.name} 덕분에 우리 반이 더 재밌고 행복해! 올해도 멋진 일들만 가득하길! 🌟\n\n내일 학교에서 보자~ 쌤이 작은 서프라이즈 준비했어 ㅎㅎ 기대해도 돼! 😊🎁\n\n${teacherInfo?.name || ''} 쌤이`;
                                          navigator.clipboard.writeText(message);
                                          alert('문자 내용이 복사되었습니다!');
                                        }}
                                        className="text-xs text-pink-600 underline hover:text-pink-800"
                                      >
                                        복사
                                      </button>
                                    </div>
                                    <p className="text-sm text-gray-700">
                                      🎂 <strong>{selectedStudentData?.name}</strong>야 생일 축하해!! 🎉🎈
                                      <br />
                                      <br />
                                      <strong>{selectedStudentData?.name}</strong> 덕분에 우리 반이 더 재밌고 행복해! 올해도 멋진 일들만 가득하길! 🌟
                                      <br />
                                      <br />
                                      내일 학교에서 보자~ 쌤이 작은 서프라이즈 준비했어 ㅎㅎ 기대해도 돼! 😊🎁
                                      <br />
                                      <br />
                                      {teacherInfo?.name || ''} 쌤이
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* 상담 스킬 및 대화 예시 */}
                              <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-green-900">
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
                                      d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
                                    />
                                  </svg>
                                  🗣️ 학생 상담 대화 스킬
                                </h3>
                                <div className="space-y-4">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-green-700">
                                      1. 라포 형성 (신뢰 구축)
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <p className="font-medium text-green-600">✓ 대화 시작</p>
                                      <p className="ml-4">
                                        "안녕, {selectedStudentData?.name}! 오늘 기분은 어때? 선생님이랑 잠깐 이야기 나눌 수 있을까?"
                                      </p>
                                      <p className="ml-4 text-xs text-gray-500">
                                        → 편안한 분위기에서 학생이 마음을 열 수 있도록 합니다
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-green-700">
                                      2. 공감적 경청
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <p className="font-medium text-green-600">✓ 감정 인정하기</p>
                                      <p className="ml-4">
                                        "요즘 친구들과 지내는 게 조금 힘들구나. 그런 기분이 드는 게 당연해. 선생님한테 더 이야기해줄 수 있어?"
                                      </p>
                                      <p className="ml-4 text-xs text-gray-500">
                                        → 학생의 감정을 먼저 인정하고 공감해줍니다
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-green-700">
                                      3. 구체적 질문 (열린 질문)
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <p className="font-medium text-green-600">✓ 상황 파악하기</p>
                                      <p className="ml-4">
                                        "쉬는 시간에는 주로 누구랑 무엇을 하면서 시간을 보내니?"
                                      </p>
                                      <p className="ml-4">
                                        "요즘 학교에서 가장 즐거운 순간은 언제야?"
                                      </p>
                                      <p className="ml-4">
                                        "친구들이랑 같이 하고 싶은 활동이 있어?"
                                      </p>
                                      <p className="ml-4 text-xs text-gray-500">
                                        → 예/아니오로 답할 수 없는 열린 질문으로 학생의 생각을 듣습니다
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-green-700">
                                      4. 긍정적 강화
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <p className="font-medium text-green-600">✓ 강점 발견 및 격려</p>
                                      <p className="ml-4">
                                        "선생님이 보니까 {selectedStudentData?.name}는 친구들 이야기를 잘 들어주더라. 그게 정말 좋은 점이야."
                                      </p>
                                      <p className="ml-4">
                                        "지난주에 ○○이랑 같이 과제할 때 정말 잘 도와줬잖아. 그런 모습 계속 보여주면 좋겠어."
                                      </p>
                                      <p className="ml-4 text-xs text-gray-500">
                                        → 구체적인 행동을 언급하며 강점을 강화합니다
                                      </p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-green-700">
                                      5. 실천 가능한 목표 설정
                                    </h4>
                                    <div className="space-y-2 text-sm text-gray-700">
                                      <p className="font-medium text-green-600">✓ 작은 목표부터</p>
                                      <p className="ml-4">
                                        "이번 주에는 점심시간에 평소랑 다른 친구 한 명이랑 같이 밥 먹어보는 건 어때?"
                                      </p>
                                      <p className="ml-4">
                                        "내일 쉬는 시간에 ○○이한테 먼저 인사해보자. 선생님이 응원할게!"
                                      </p>
                                      <p className="ml-4 text-xs text-gray-500">
                                        → 학생이 실천 가능한 작은 목표를 함께 정합니다
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 교실 활동 예시 */}
                              <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-purple-900">
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
                                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                    />
                                  </svg>
                                  🎯 교실에서 바로 실천할 수 있는 활동
                                </h3>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-purple-700">
                                      📌 소그룹 협력 활동
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>• <strong>짝 바꾸기:</strong> 평소 교류가 적은 친구와 짝을 지어 함께 과제 수행</li>
                                      <li>• <strong>모둠 프로젝트:</strong> 다양한 성향의 학생들로 모둠을 구성하여 협력 기회 제공</li>
                                      <li>• <strong>점심 친구 만들기:</strong> 주 1회 랜덤으로 점심 짝 정해서 함께 식사</li>
                                    </ul>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-purple-700">
                                      🎮 관계 형성 게임
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>• <strong>칭찬 릴레이:</strong> 돌아가며 옆 친구의 좋은 점 한 가지씩 말하기</li>
                                      <li>• <strong>공통점 찾기:</strong> 짝과 함께 서로의 공통점 5가지 찾기</li>
                                      <li>• <strong>감사 카드:</strong> 이번 주 도움받은 친구에게 감사 카드 쓰기</li>
                                    </ul>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-purple-700">
                                      👥 역할 부여 전략
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>• <strong>모둠 리더:</strong> 리더십을 발휘할 수 있는 역할 부여 (조용한 학생에게도 기회)</li>
                                      <li>• <strong>도우미 친구:</strong> 특정 과목에서 어려움을 겪는 친구 도와주기</li>
                                      <li>• <strong>환경 도우미:</strong> 함께 교실 환경을 관리하며 협력 경험</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              {/* 관찰 포인트 */}
                              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-yellow-900">
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
                                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                    />
                                  </svg>
                                  👀 일상 관찰 체크리스트
                                </h3>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-yellow-700">
                                      쉬는 시간
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>□ 누구와 함께 시간을 보내는가?</li>
                                      <li>□ 주로 어떤 활동을 하는가?</li>
                                      <li>□ 혼자 있는 시간이 얼마나 되는가?</li>
                                      <li>□ 표정과 분위기는 어떠한가?</li>
                                    </ul>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-yellow-700">
                                      수업 시간
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>□ 모둠 활동 참여도는 어떠한가?</li>
                                      <li>□ 발표나 질문을 적극적으로 하는가?</li>
                                      <li>□ 친구들과의 상호작용은 어떠한가?</li>
                                      <li>□ 수업 태도와 집중도는 어떠한가?</li>
                                    </ul>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-yellow-700">
                                      점심 시간
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>□ 누구와 함께 식사하는가?</li>
                                      <li>□ 대화에 적극적으로 참여하는가?</li>
                                      <li>□ 식사 태도는 어떠한가?</li>
                                      <li>□ 급식 후 활동은 어떠한가?</li>
                                    </ul>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <h4 className="mb-2 font-semibold text-yellow-700">
                                      특별 활동
                                    </h4>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-700">
                                      <li>□ 학교 행사 참여 의욕은 어떠한가?</li>
                                      <li>□ 체육 활동 시 팀워크는 어떠한가?</li>
                                      <li>□ 동아리나 특별활동 참여도는?</li>
                                      <li>□ 리더십 발휘 기회는 충분한가?</li>
                                    </ul>
                                  </div>
                                </div>
                              </div>

                              {/* 즉시 실천 팁 */}
                              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-6">
                                <h3 className="mb-4 flex items-center text-lg font-semibold text-indigo-900">
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
                                      d="M13 10V3L4 14h7v7l9-11h-7z"
                                    />
                                  </svg>
                                  ⚡ 오늘 바로 시작할 수 있는 3가지
                                </h3>
                                <div className="space-y-3">
                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="flex items-start">
                                      <span className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                                        1
                                      </span>
                                      <div>
                                        <h4 className="font-semibold text-indigo-700">
                                          긍정적 상호작용 만들기
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-700">
                                          오늘 하루 동안 <strong>{selectedStudentData?.name}</strong> 학생에게 최소 3번 이상 긍정적인 피드백을 주세요. 
                                          "잘했어", "좋은 생각이야", "도움이 됐어" 같은 간단한 말도 효과적입니다.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="flex items-start">
                                      <span className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                                        2
                                      </span>
                                      <div>
                                        <h4 className="font-semibold text-indigo-700">
                                          관계 연결 기회 제공
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-700">
                                          수업 중 짝 활동이나 모둠 활동 시, <strong>{selectedStudentData?.name}</strong> 학생이 평소 잘 어울리지 않던 친구와 함께할 수 있도록 의도적으로 배치해보세요.
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-lg bg-white p-4 shadow-sm">
                                    <div className="flex items-start">
                                      <span className="mr-3 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                                        3
                                      </span>
                                      <div>
                                        <h4 className="font-semibold text-indigo-700">
                                          1:1 대화 시간 갖기
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-700">
                                          오늘 또는 내일 중 5분이라도 <strong>{selectedStudentData?.name}</strong> 학생과 개인적으로 대화할 시간을 만들어보세요. 
                                          학교생활에 대한 솔직한 생각을 들어보는 것이 중요합니다.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <p className="text-gray-500">
                              AI 리포트를 생성하려면 "AI리포트 생성" 버튼을
                              클릭하세요.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    {activeTab === "python" && (
                      <div className="space-y-6">
                        {pythonAnalysisLoading ? (
                          <div className="py-8 text-center">
                            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#3F80EA]"></div>
                            <p className="text-gray-600">
                              Python 네트워크 분석을 실행하는 중...
                            </p>
                            <p className="mt-2 text-sm text-gray-500">
                              NetworkX를 사용한 고급 네트워크 분석을 수행하고
                              있습니다.
                            </p>
                          </div>
                        ) : pythonAnalysisError ? (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-red-500">
                              <p className="mb-2 text-lg font-medium">
                                Python 분석 중 오류가 발생했습니다
                              </p>
                              <p className="text-sm">{pythonAnalysisError}</p>
                            </div>
                          </div>
                        ) : pythonAnalysisResult ? (
                          <div className="space-y-6">
                            {/* 네트워크 통계 */}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-blue-800">
                                네트워크 통계
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-blue-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-blue-700">
                                    기본 정보
                                  </h5>
                                  <ul className="space-y-1 text-sm text-gray-700">
                                    <li>
                                      • 총 노드 수:{" "}
                                      {
                                        pythonAnalysisResult.network_stats
                                          .total_nodes
                                      }
                                      개
                                    </li>
                                    <li>
                                      • 총 연결 수:{" "}
                                      {
                                        pythonAnalysisResult.network_stats
                                          .total_edges
                                      }
                                      개
                                    </li>
                                    <li>
                                      • 네트워크 밀도:{" "}
                                      {(
                                        pythonAnalysisResult.network_stats
                                          .network_density * 100
                                      ).toFixed(1)}
                                      %
                                    </li>
                                    <li>
                                      • 평균 클러스터링:{" "}
                                      {(
                                        pythonAnalysisResult.network_stats
                                          .average_clustering * 100
                                      ).toFixed(1)}
                                      %
                                    </li>
                                    <li>
                                      • 총 커뮤니티 수:{" "}
                                      {
                                        pythonAnalysisResult.network_stats
                                          .communities_count
                                      }
                                      개
                                    </li>
                                  </ul>
                                </div>
                                <div className="rounded-lg border border-blue-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-blue-700">
                                    개별 지표
                                  </h5>
                                  <ul className="space-y-1 text-sm text-gray-700">
                                    <li>
                                      • 연결 수:{" "}
                                      {
                                        pythonAnalysisResult.individual_metrics
                                          .degree
                                      }
                                      개
                                    </li>
                                    <li>
                                      • 연결 중심성:{" "}
                                      {(
                                        pythonAnalysisResult.individual_metrics
                                          .centrality_metrics.degree * 100
                                      ).toFixed(1)}
                                      %
                                    </li>
                                    <li>
                                      • 매개 중심성:{" "}
                                      {(
                                        pythonAnalysisResult.individual_metrics
                                          .centrality_metrics.betweenness * 100
                                      ).toFixed(1)}
                                      %
                                    </li>
                                    <li>
                                      • 근접 중심성:{" "}
                                      {(
                                        pythonAnalysisResult.individual_metrics
                                          .centrality_metrics.closeness * 100
                                      ).toFixed(1)}
                                      %
                                    </li>
                                    <li>
                                      • 소속 커뮤니티:{" "}
                                      {pythonAnalysisResult.individual_metrics
                                        .community_id + 1}
                                      번 그룹
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </div>

                            {/* 교우관계 유형 및 위험도 평가 */}
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-yellow-800">
                                교우관계 유형 및 위험도 평가
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-lg border border-yellow-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-yellow-700">
                                    교우관계 유형
                                  </h5>
                                  <p className="text-lg font-medium text-gray-800">
                                    {
                                      pythonAnalysisResult.individual_metrics
                                        .friendship_type
                                    }
                                  </p>
                                </div>
                                <div className="rounded-lg border border-yellow-100 bg-white p-4">
                                  <h5 className="mb-2 text-sm font-semibold text-yellow-700">
                                    고립 위험도
                                  </h5>
                                  <div className="space-y-1">
                                    <p className="text-lg font-medium text-gray-800">
                                      {
                                        pythonAnalysisResult.individual_metrics
                                          .isolation_risk.level
                                      }
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      {
                                        pythonAnalysisResult.individual_metrics
                                          .isolation_risk.description
                                      }
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      위험도 점수:{" "}
                                      {
                                        pythonAnalysisResult.individual_metrics
                                          .isolation_risk.score
                                      }
                                      /100
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 사회적 영향력 */}
                            <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-green-800">
                                사회적 영향력 분석
                              </h4>
                              <div className="rounded-lg border border-green-100 bg-white p-4">
                                <div className="space-y-2">
                                  <p className="text-lg font-medium text-gray-800">
                                    영향력 수준:{" "}
                                    {
                                      pythonAnalysisResult.individual_metrics
                                        .social_influence.level
                                    }
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {
                                      pythonAnalysisResult.individual_metrics
                                        .social_influence.description
                                    }
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    영향력 점수:{" "}
                                    {pythonAnalysisResult.individual_metrics.social_influence.score.toFixed(
                                      1,
                                    )}
                                    /100
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* 맞춤형 지도 방안 */}
                            <div className="rounded-lg border border-purple-200 bg-purple-50 p-6">
                              <h4 className="mb-4 text-lg font-semibold text-purple-800">
                                맞춤형 지도 방안
                              </h4>
                              <div className="space-y-4">
                                {pythonAnalysisResult.recommendations
                                  .immediate_actions.length > 0 && (
                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      즉시 조치 사항
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.immediate_actions.map(
                                        (action, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start"
                                          >
                                            <span className="mr-2 mt-0.5 text-purple-600">
                                              •
                                            </span>
                                            <span>{action}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                )}

                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      단기 목표
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.short_term_goals.map(
                                        (goal, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start"
                                          >
                                            <span className="mr-2 mt-0.5 text-purple-600">
                                              •
                                            </span>
                                            <span>{goal}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>

                                  <div className="rounded-lg border border-purple-100 bg-white p-4">
                                    <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                      장기 목표
                                    </h5>
                                    <ul className="space-y-2 text-sm text-gray-600">
                                      {pythonAnalysisResult.recommendations.long_term_goals.map(
                                        (goal, index) => (
                                          <li
                                            key={index}
                                            className="flex items-start"
                                          >
                                            <span className="mr-2 mt-0.5 text-purple-600">
                                              •
                                            </span>
                                            <span>{goal}</span>
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-purple-100 bg-white p-4">
                                  <h5 className="mb-3 text-sm font-semibold text-purple-700">
                                    모니터링 포인트
                                  </h5>
                                  <ul className="space-y-2 text-sm text-gray-600">
                                    {pythonAnalysisResult.recommendations.monitoring_points.map(
                                      (point, index) => (
                                        <li
                                          key={index}
                                          className="flex items-start"
                                        >
                                          <span className="mr-2 mt-0.5 text-purple-600">
                                            •
                                          </span>
                                          <span>{point}</span>
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center">
                            <div className="mb-4 text-gray-500">
                              <p className="mb-2 text-lg font-medium">
                                Python 분석을 실행할 수 없습니다
                              </p>
                              <p className="text-sm">
                                학생과 설문을 선택한 후 다시 시도해주세요.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 통합 분석 결과 - 주석처리 */}
                  {/* {unifiedAnalysisResult && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        통합 네트워크 분석 결과
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {unifiedAnalysisResult.centralityMetrics.degree.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">연결 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {unifiedAnalysisResult.centralityMetrics.betweenness.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">중개 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {unifiedAnalysisResult.centralityMetrics.closeness.toFixed(3)}
                          </div>
                          <div className="text-sm text-gray-600">근접 중심성</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {unifiedAnalysisResult.communityMembership}
                          </div>
                          <div className="text-sm text-gray-600">커뮤니티</div>
                        </div>
                      </div>

                      위험도 및 영향력
                      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-gray-50 p-4">
                          <h4 className="mb-2 font-medium text-gray-900">고립 위험도</h4>
                          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            unifiedAnalysisResult.isolationRisk.level === 'high' ? 'bg-red-100 text-red-800' :
                            unifiedAnalysisResult.isolationRisk.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {unifiedAnalysisResult.isolationRisk.level === 'high' ? '높음' :
                             unifiedAnalysisResult.isolationRisk.level === 'medium' ? '보통' : '낮음'}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {unifiedAnalysisResult.isolationRisk.description}
                          </p>
                        </div>
                        
                        <div className="rounded-lg bg-gray-50 p-4">
                          <h4 className="mb-2 font-medium text-gray-900">사회적 영향력</h4>
                          <div className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                            unifiedAnalysisResult.socialInfluence.level === 'high' ? 'bg-blue-100 text-blue-800' :
                            unifiedAnalysisResult.socialInfluence.level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {unifiedAnalysisResult.socialInfluence.level === 'high' ? '높음' :
                             unifiedAnalysisResult.socialInfluence.level === 'medium' ? '보통' : '낮음'}
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {unifiedAnalysisResult.socialInfluence.description}
                          </p>
                        </div>
                      </div>

                      네트워크 위치
                      <div className="mt-6">
                        <h4 className="mb-3 font-medium text-gray-900">관계에서의 위치</h4>
                        <div className="flex flex-wrap gap-2">
                          {unifiedAnalysisResult.networkPosition.isCenter && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                              중심 인물
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isBridge && (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              연결자
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isIsolated && (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                              고립 위험
                            </span>
                          )}
                          {unifiedAnalysisResult.networkPosition.isPeripheral && (
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                              주변 인물
                            </span>
                          )}
                          {!unifiedAnalysisResult.networkPosition.isCenter && 
                           !unifiedAnalysisResult.networkPosition.isBridge && 
                           !unifiedAnalysisResult.networkPosition.isIsolated && 
                           !unifiedAnalysisResult.networkPosition.isPeripheral && (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                              일반 구성원
                            </span>
                          )}
                        </div>
                      </div>

                      권장사항
                      {unifiedAnalysisResult.recommendations && (
                        <div className="mt-6">
                          <h4 className="mb-3 font-medium text-gray-900">개선 권장사항</h4>
                          <div className="space-y-4">
                            {unifiedAnalysisResult.recommendations.immediate_actions.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-blue-600">즉시 실행 가능한 조치</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.immediate_actions.map((action, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {action}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {unifiedAnalysisResult.recommendations.short_term_goals.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-green-600">단기 목표</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.short_term_goals.map((goal, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {unifiedAnalysisResult.recommendations.long_term_goals.length > 0 && (
                              <div>
                                <h5 className="mb-2 font-medium text-purple-600">장기 목표</h5>
                                <ul className="space-y-1">
                                  {unifiedAnalysisResult.recommendations.long_term_goals.map((goal, index) => (
                                    <li key={index} className="text-sm text-gray-700">• {goal}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )} */}

                  {/* 통합 분석 로딩 상태 */}
                  {unifiedAnalysisLoading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="mr-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-gray-600">
                          통합 네트워크 분석을 수행하는 중...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 전체 네트워크 분석 결과 */}
                  {/* {networkAnalysisData && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <h3 className="mb-4 text-lg font-semibold text-gray-900">
                        학급 전체 교우관계 분석
                      </h3>
                      
                      교우관계 유형 분포
                      <div className="mb-6">
                        <h4 className="mb-3 font-medium text-gray-900">교우관계 유형 분포</h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#FF6B6B" }}>
                              {networkAnalysisData.friendship_types.외톨이형 || 0}
                            </div>
                            <div className="text-sm text-gray-600">외톨이형</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#4ECDC4" }}>
                              {networkAnalysisData.friendship_types["소수 친구 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">소수 친구 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#45B7D1" }}>
                              {networkAnalysisData.friendship_types["평균적인 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">평균적인 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#96CEB4" }}>
                              {networkAnalysisData.friendship_types["친구 많은 학생"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">친구 많은 학생</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold" style={{ color: "#FFEAA7" }}>
                              {networkAnalysisData.friendship_types["사교 스타"] || 0}
                            </div>
                            <div className="text-sm text-gray-600">사교 스타</div>
                          </div>
                        </div>
                      </div>

                      네트워크 메트릭
                      <div className="mb-6">
                        <h4 className="mb-3 font-medium text-gray-900">네트워크 구조 지표</h4>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                              {(networkAnalysisData.metrics.network_density * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-600">네트워크 밀도</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                              {networkAnalysisData.metrics.average_degree.toFixed(1)}
                            </div>
                            <div className="text-sm text-gray-600">평균 연결 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">
                              {networkAnalysisData.metrics.connected_components}
                            </div>
                            <div className="text-sm text-gray-600">연결 그룹 수</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xl font-bold text-orange-600">
                              {networkAnalysisData.metrics.clustering_coefficient.toFixed(3)}
                            </div>
                            <div className="text-sm text-gray-600">클러스터링 계수</div>
                          </div>
                        </div>
                      </div>

                      전체 통계 요약
                      <div className="rounded-lg bg-gray-50 p-4">
                        <h4 className="mb-2 font-medium text-gray-900">학급 전체 요약</h4>
                        <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 md:grid-cols-3">
                          <div>• 총 학생 수: {networkAnalysisData.metrics.total_students}명</div>
                          <div>• 총 관계 수: {networkAnalysisData.metrics.total_relationships}개</div>
                          <div>• 평균 중심성: {(networkAnalysisData.metrics.average_degree_centrality * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  )} */}

                  {/* 전체 네트워크 분석 로딩 상태 */}
                  {networkAnalysisLoading && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="mr-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                        <p className="text-gray-600">
                          전체 네트워크 분석을 수행하는 중...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 개인별 요약 - 핵심결과 탭에서만 표시 */}
                  {activeTab === "core" && (
                    <div className="rounded-lg border border-gray-200 bg-white p-6">
                      {networkLoading ? (
                        <div className="py-8 text-center">
                          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
                          <p className="text-gray-600">
                            네트워크 데이터를 분석하는 중...
                          </p>
                        </div>
                      ) : individualNetworkData.length > 0 ? (
                        <div className="space-y-6">
                          {(() => {
                            console.log('📊 UI 렌더링 - individualNetworkData:', individualNetworkData);
                            
                            const centerStudent = individualNetworkData.find(
                              (s) => s.isCenter,
                            );
                            
                            console.log('🎯 중심 학생 찾기:', centerStudent);
                            
                            const totalStudents = individualNetworkData.length;
                            const maxPossibleConnections = totalStudents - 1;

                            // 통합 분석 결과 우선 사용
                            let centrality = centerStudent
                              ? centerStudent.friendCount /
                                Math.max(maxPossibleConnections, 1)
                              : 0;
                            let friendCount = centerStudent?.friendCount || 0;
                            
                            console.log('📈 초기 계산값:', {친구수: friendCount, 중심성: centrality});
                            let networkDensity = 0;
                            let isolationRiskLevel = "보통";
                            let socialInfluenceLevel = "보통";
                            let communityId = 0;
                            
                            // 친구 수 기반 학생 유형 분류
                            let friendshipType = "평균적인 학생";
                            if (friendCount === 0) {
                              friendshipType = "외톨이형";
                            } else if (friendCount <= 2) {
                              friendshipType = "소수 친구 학생";
                            } else if (friendCount <= 5) {
                              friendshipType = "평균적인 학생";
                            } else if (friendCount <= 8) {
                              friendshipType = "친구 많은 학생";
                            } else {
                              friendshipType = "사교 스타";
                            }
                            
                            let recommendations = null;

                            // 통합 분석 결과가 있으면 실제 데이터 사용 (단, individualNetworkData가 더 정확하면 우선 사용)
                            if (unifiedAnalysisResult) {
                              console.log('⚠️ unifiedAnalysisResult 발견:', {
                                connection_count: unifiedAnalysisResult.student.connection_count,
                                degree: unifiedAnalysisResult.centralityMetrics.degree
                              });
                              
                              // individualNetworkData의 값이 더 정확하므로, unifiedAnalysisResult가 0이면 무시
                              const unifiedFriendCount = unifiedAnalysisResult.student.connection_count;
                              const unifiedCentrality = unifiedAnalysisResult.centralityMetrics.degree;
                              
                              // unifiedAnalysisResult가 유효한 값을 가지고 있을 때만 사용
                              if (unifiedFriendCount > 0 || unifiedCentrality > 0) {
                                centrality = unifiedCentrality;
                                friendCount = unifiedFriendCount;
                                console.log('✅ unifiedAnalysisResult 값 사용');
                              } else {
                                console.log('⚠️ unifiedAnalysisResult가 0이므로 individualNetworkData 값 유지');
                              }

                              // 격리 위험도 사용
                              isolationRiskLevel =
                                unifiedAnalysisResult.isolationRisk.level ===
                                "high"
                                  ? "높음"
                                  : unifiedAnalysisResult.isolationRisk
                                        .level === "medium"
                                    ? "보통"
                                    : "낮음";

                              // 사회적 영향력 사용
                              socialInfluenceLevel =
                                unifiedAnalysisResult.socialInfluence.level ===
                                "high"
                                  ? "높음"
                                  : unifiedAnalysisResult.socialInfluence
                                        .level === "medium"
                                    ? "보통"
                                    : "낮음";

                              // 커뮤니티 ID 사용
                              communityId =
                                unifiedAnalysisResult.communityMembership;

                              // 친구관계 유형 사용 (실제 친구 수로 재계산)
                              friendshipType =
                                unifiedAnalysisResult.student.friendship_type;
                              
                              console.log('🔄 unifiedAnalysisResult 적용 후:', {친구수: friendCount, 중심성: centrality});
                              
                              // 친구 수 기반으로 재검증 (통합 분석 결과가 부정확할 수 있음)
                              if (friendCount === 0) {
                                friendshipType = "외톨이형";
                              } else if (friendCount <= 2) {
                                friendshipType = "소수 친구 학생";
                              } else if (friendCount <= 5) {
                                friendshipType = "평균적인 학생";
                              } else if (friendCount <= 8) {
                                friendshipType = "친구 많은 학생";
                              } else {
                                friendshipType = "사교 스타";
                              }

                              // 추천사항 사용
                              recommendations =
                                unifiedAnalysisResult.recommendations;

                              // 네트워크 밀도는 전체 분석에서 가져오기
                              const selectedStudentData = students.find(
                                (s) => s.id === selectedStudent,
                              );
                              networkDensity =
                                selectedStudentData?.network_metrics
                                  ?.network_density || 0;
                            } else {
                              // 네트워크 메트릭이 없으면 기본 계산
                              const totalConnections =
                                individualNetworkData.reduce(
                                  (sum, student) => sum + student.friendCount,
                                  0,
                                ) / 2;
                              networkDensity =
                                totalConnections /
                                ((totalStudents * (totalStudents - 1)) / 2);

                              isolationRiskLevel =
                                centrality < 0.3
                                  ? "높음"
                                  : centrality < 0.6
                                    ? "보통"
                                    : "낮음";
                              socialInfluenceLevel =
                                centrality < 0.3
                                  ? "낮음"
                                  : centrality < 0.6
                                    ? "보통"
                                    : "높음";
                            }

                            // 그룹 분석 (실제 커뮤니티 정보 사용)
                            const connectedStudents =
                              individualNetworkData.filter(
                                (s) => !s.isCenter && s.friendCount > 0,
                              );
                            const groupDistribution =
                              connectedStudents.length > 0
                                ? `연결된 ${connectedStudents.length}명 (커뮤니티 ${communityId})`
                                : "연결된 학생 없음";

                            // 디버깅 로그
                            console.log('👤 개인별 요약 - 학생 정보:', {
                              학생명: selectedStudentData?.name,
                              친구수: friendCount,
                              중심성: `${(centrality * 100).toFixed(1)}%`,
                              학생유형: friendshipType,
                              만족도: `${(coreTabSatisfaction * 100).toFixed(1)}%`,
                              폭력경험: `${(coreTabViolence * 100).toFixed(1)}%`
                            });

                            return (
                              <div>
                                <h3 className="mb-4 text-lg font-medium text-gray-900">
                                  개인별 요약 :{" "}
                                  <span className="text-md mb-2 bg-gradient-to-t from-yellow-200 from-50% to-transparent to-50% font-medium text-gray-800">
                                    {friendshipType} ({socialInfluenceLevel}{" "}
                                    영향력) - 친구 {friendCount}명
                                  </span>
                                </h3>

                                <div className="space-y-4">
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-cyan-500">
                                      1. 현재 상태 (Current Status)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // Python 분석 결과의 current_status 우선 사용
                                        let currentStatus: CurrentStatus;

                                        if (
                                          pythonAnalysisResult
                                            ?.individual_metrics?.current_status
                                        ) {
                                          const pyStatus =
                                            pythonAnalysisResult
                                              .individual_metrics
                                              .current_status;
                                          currentStatus = {
                                            schoolSatisfaction:
                                              pyStatus.school_satisfaction,
                                            teacherRelationship:
                                              pyStatus.teacher_relationship,
                                            peerRelationship:
                                              pyStatus.peer_relationship,
                                            networkParticipation:
                                              pyStatus.network_participation,
                                            violenceExperience: (pyStatus as any).violence_experience || "파악 필요",
                                          };
                                        } else {
                                          // 유틸리티 함수로 계산 (실제 설문 응답 포함)
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence:
                                              socialInfluenceLevel,
                                            totalStudents,
                                            communityId,
                                            satisfactionScore: coreTabSatisfaction,
                                            violenceScore: coreTabViolence,
                                            surveyResponses: coreTabSurveyData
                                          };
                                          currentStatus =
                                            calculateCurrentStatus(metrics);
                                        }

                                        return (
                                          <>
                                            <li>
                                              • 학교생활 만족도:{" "}
                                              {currentStatus.schoolSatisfaction}
                                            </li>
                                            <li>
                                              • 교사와의 관계:{" "}
                                              {
                                                currentStatus.teacherRelationship
                                              }
                                            </li>
                                            <li>
                                              • 또래 관계:{" "}
                                              {currentStatus.peerRelationship}
                                            </li>
                                            <li>
                                              • 네트워크 참여도:{" "}
                                              {
                                                currentStatus.networkParticipation
                                              }
                                            </li>
                                            <li>
                                              • 학교폭력 경험:{" "}
                                              {currentStatus.violenceExperience}
                                            </li>
                                          </>
                                        );
                                      })()}
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-sky-500">
                                      2. 네트워크 안정성 (Network Stability)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      <li>
                                        • 중심성 점수:{" "}
                                        {(centrality * 100).toFixed(1)}%
                                      </li>
                                      <li>
                                        • 연결된 친구 수: {friendCount}명 (전체{" "}
                                        {totalStudents}명 중)
                                      </li>
                                      <li>
                                        • 네트워크 밀도:{" "}
                                        {(networkDensity * 100).toFixed(1)}%
                                      </li>
                                      <li>• 그룹 분포: {groupDistribution}</li>
                                      <li>
                                        • 고립 위험도: {isolationRiskLevel}
                                      </li>
                                    </ul>
                                  </div>

                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-blue-500">
                                      3. 개선방안 (Improvement Plan)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // Python 분석 결과 우선 사용, 없으면 유틸리티 함수로 생성
                                        let recommendationPlan: RecommendationPlan;

                                        if (recommendations) {
                                          recommendationPlan = {
                                            immediate:
                                              recommendations.immediate_actions ||
                                              [],
                                            shortTerm:
                                              recommendations.short_term_goals ||
                                              [],
                                            longTerm:
                                              recommendations.long_term_goals ||
                                              [],
                                            interventionLevel:
                                              (() => {
                                                const level = recommendations.intervention_level || "관찰";
                                                // 영어 개입 수준을 한글로 변환
                                                const levelMap: { [key: string]: string } = {
                                                  "observation": "관찰",
                                                  "attention": "주의", 
                                                  "urgent": "긴급",
                                                  "emergency": "긴급",
                                                  "monitoring": "관찰",
                                                  "intervention": "주의"
                                                };
                                                return levelMap[level.toLowerCase()] || level;
                                              })(),
                                          };
                                        } else {
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence:
                                              socialInfluenceLevel,
                                            totalStudents,
                                            communityId,
                                            satisfactionScore: coreTabSatisfaction,
                                            violenceScore: coreTabViolence,
                                            surveyResponses: coreTabSurveyData
                                          };
                                          recommendationPlan =
                                            generateRecommendationPlan(metrics);
                                        }

                                        return (
                                          <>
                                            {recommendationPlan.immediate
                                              .length > 0 && (
                                              <>
                                                <li className="font-medium text-blue-600">
                                                  즉시 실행 가능한 조치:
                                                </li>
                                                {recommendationPlan.immediate.map(
                                                  (action, index) => (
                                                    <li key={index}>
                                                      • {action}
                                                    </li>
                                                  ),
                                                )}
                                              </>
                                            )}

                                            {recommendationPlan.shortTerm
                                              .length > 0 && (
                                              <>
                                                <li className="font-medium text-green-600">
                                                  단기 목표 (1-3개월):
                                                </li>
                                                {recommendationPlan.shortTerm.map(
                                                  (goal, index) => (
                                                    <li key={index}>
                                                      • {goal}
                                                    </li>
                                                  ),
                                                )}
                                              </>
                                            )}

                                            {recommendationPlan.longTerm
                                              .length > 0 && (
                                              <>
                                                <li className="font-medium text-purple-600">
                                                  장기 목표 (3-6개월):
                                                </li>
                                                {recommendationPlan.longTerm.map(
                                                  (goal, index) => (
                                                    <li key={index}>
                                                      • {goal}
                                                    </li>
                                                  ),
                                                )}
                                              </>
                                            )}

                                            <li className="font-medium text-orange-600">
                                              개입 수준:{" "}
                                              {
                                                recommendationPlan.interventionLevel
                                              }
                                            </li>
                                          </>
                                        );
                                      })()}
                                    </ul>
                                  </div>
                                  <div>
                                    <h5 className="mb-2 text-sm font-medium text-indigo-500">
                                      4. 모니터링 포인트 (Monitoring Points)
                                    </h5>
                                    <ul className="ml-4 space-y-1 text-sm text-gray-600">
                                      {(() => {
                                        // Python 분석 결과 우선 사용, 없으면 유틸리티 함수로 생성
                                        let monitoringPoints: string[];

                                        if (
                                          recommendations?.monitoring_points &&
                                          recommendations.monitoring_points
                                            .length > 0
                                        ) {
                                          monitoringPoints =
                                            recommendations.monitoring_points;
                                        } else {
                                          const metrics: StudentMetrics = {
                                            centrality,
                                            friendCount,
                                            networkDensity,
                                            isolationRisk: isolationRiskLevel,
                                            socialInfluence:
                                              socialInfluenceLevel,
                                            totalStudents,
                                            communityId,
                                            satisfactionScore: coreTabSatisfaction,
                                            violenceScore: coreTabViolence,
                                            surveyResponses: coreTabSurveyData
                                          };
                                          monitoringPoints =
                                            generateMonitoringPoints(
                                              metrics,
                                            ).points;
                                        }

                                        return monitoringPoints.map(
                                          (point, index) => (
                                            <li key={index}>• {point}</li>
                                          ),
                                        );
                                      })()}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500">
                          <p>개인별 요약 데이터를 불러올 수 없습니다.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-gray-500">학생을 선택해주세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndividualAnalysis;