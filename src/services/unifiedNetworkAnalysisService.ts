import { supabase } from '../lib/supabase';
import {
  UnifiedNetworkData,
  CompleteAnalysisResult,
  ClassAnalysisResult,
  IndividualAnalysisResult,
  NetworkNode,
  NetworkEdge,
  NetworkMetrics,
  Community,
  CentralityMetrics,
  RiskLevel,
  InfluenceLevel,
  IndividualRecommendations,
  GlobalRecommendations,
  AnalysisCache
} from '../types/unifiedNetworkTypes';
import { networkAnalysisSyncManager, DataConsistencyValidator } from '../utils/dataConsistencyManager';

/**
 * 통합 네트워크 분석 서비스
 * 모든 페이지에서 일관된 네트워크 분석 결과를 제공합니다.
 */
class UnifiedNetworkAnalysisService {
  private analysisCache: Map<string, AnalysisCache> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30분
  private readonly API_BASE_URL = window.location.hostname === 'edu.wiseon.io' 
    ? 'https://edu.wiseon.io' 
    : 'http://localhost:5001';

  /**
   * 전체 네트워크 분석 수행 (최상위 레벨)
   */
  async performCompleteAnalysis(surveyId: string): Promise<CompleteAnalysisResult> {
    try {
      
      // Python API 호출로 전체 분석 수행
      const pythonData = await this.getSurveyDataForPython(surveyId);
      
      const response = await fetch(`${this.API_BASE_URL}/api/network-analysis/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId,
          surveyData: pythonData.survey_data,
          studentInfo: pythonData.student_info
        })
      });

      if (!response.ok) {
        throw new Error(`Python API 호출 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Python 분석 실패');
      }

      // Python 결과를 통합 형식으로 변환
      const completeAnalysis = this.convertPythonResultToUnifiedFormat(result.data, surveyId);
      
      return completeAnalysis;
      
    } catch (error) {
      console.error('❌ 전체 네트워크 분석 오류:', error);
      
      // Python API 실패 시 기존 네트워크 분석 서비스로 fallback
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        try {
          const { networkAnalysisService } = await import('./networkAnalysisService');
          const fallbackResult = await networkAnalysisService.analyzeNetwork(surveyId);
          
          // 기존 결과를 통합 형식으로 변환
          const completeAnalysis = this.convertNetworkAnalysisToUnifiedFormat(fallbackResult, surveyId);
          return completeAnalysis;
        } catch (fallbackError) {
          console.error('❌ Fallback 분석도 실패:', fallbackError);
          throw new Error('네트워크 분석에 실패했습니다.');
        }
      }
      
      throw new Error('전체 네트워크 분석에 실패했습니다.');
    }
  }

  /**
   * 학급별 분석 (전체 결과에서 추출)
   */
  async getClassAnalysis(surveyId: string, classNumber: string): Promise<ClassAnalysisResult> {
    try {
      
      const unifiedData = await this.getCachedAnalysis(surveyId);
      const classAnalysis = this.extractClassAnalysis(unifiedData, classNumber);
      
      return classAnalysis;
      
    } catch (error) {
      console.error('❌ 학급별 분석 오류:', error);
      throw new Error('학급별 분석에 실패했습니다.');
    }
  }

  /**
   * 개별 학생 분석 (Python API 직접 호출)
   */
  async getIndividualAnalysis(surveyId: string, studentId: string): Promise<IndividualAnalysisResult> {
    try {
      
      // Python API로 개별 학생 분석 직접 호출
      const pythonData = await this.getSurveyDataForPython(surveyId);
      
      const response = await fetch(`${this.API_BASE_URL}/api/individual-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          friendship_data: pythonData.survey_data,
          student_info: pythonData.student_info
        })
      });

      if (!response.ok) {
        throw new Error(`Python 개별 분석 API 호출 실패: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Python 개별 분석 실패');
      }

      // Python 결과를 IndividualAnalysisResult 형식으로 변환
      const individualAnalysis = this.convertPythonIndividualResultToUnifiedFormat(result.data, studentId);
      
      return individualAnalysis;
      
    } catch (error) {
      console.error('❌ 개별 학생 분석 오류:', error);
      
      // Python API 실패 시 전체 분석에서 추출하는 방식으로 fallback
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        try {
          const unifiedData = await this.getCachedAnalysis(surveyId);
          const individualAnalysis = this.extractIndividualAnalysis(unifiedData, studentId);
          return individualAnalysis;
        } catch (fallbackError) {
          console.error('❌ Fallback 개별 분석도 실패:', fallbackError);
          throw new Error('개별 학생 분석에 실패했습니다.');
        }
      }
      
      throw new Error('개별 학생 분석에 실패했습니다.');
    }
  }

  /**
   * 캐시된 분석 데이터 조회
   */
  async getCachedAnalysis(surveyId: string): Promise<UnifiedNetworkData> {
    // 먼저 캐시에서 확인
    const cachedData = networkAnalysisSyncManager.getCachedAnalysisData(surveyId, 'complete');
    if (cachedData) {
      return cachedData;
    }

    // 캐시에 없으면 새로 분석
    return await this.refreshAnalysisData(surveyId);
  }

  /**
   * 분석 데이터 새로고침
   */
  async refreshAnalysisData(surveyId: string): Promise<UnifiedNetworkData> {
    try {
      
      // 전체 분석 수행
      const completeAnalysis = await this.performCompleteAnalysis(surveyId);
      
      // 학급별 분석 추출
      const classAnalyses = this.extractAllClassAnalyses(completeAnalysis);
      
      // 개별 학생 분석 추출
      const individualAnalyses = this.extractAllIndividualAnalyses(completeAnalysis);
      
      // 통합 데이터 생성
      const unifiedData: UnifiedNetworkData = {
        completeAnalysis,
        classAnalyses,
        individualAnalyses,
        lastUpdated: new Date(),
        surveyId,
        analysisVersion: '1.0.0',
        cacheExpiry: new Date(Date.now() + this.CACHE_DURATION)
      };

      // 데이터 일관성 검증
      const validation = DataConsistencyValidator.validateNetworkAnalysisConsistency(
        completeAnalysis,
        classAnalyses.get('1'), // 첫 번째 학급으로 검증
        individualAnalyses.values().next().value // 첫 번째 개별 분석으로 검증
      );

      if (!validation.isValid) {
        console.error('❌ 데이터 일관성 검증 실패:', validation.errors);
        throw new Error(`데이터 일관성 검증 실패: ${validation.errors.join(', ')}`);
      }

      if (validation.warnings.length > 0) {
        console.warn('⚠️ 데이터 일관성 경고:', validation.warnings);
      }

      // 캐시에 저장
      this.analysisCache.set(surveyId, {
        data: unifiedData,
        isStale: false,
        lastRefresh: new Date()
      });

      // 동기화 관리자에 캐시 저장
      networkAnalysisSyncManager.cacheAnalysisData(surveyId, 'complete', unifiedData);

      // DB에 저장
      await this.saveToDatabase(surveyId, unifiedData);
      
      return unifiedData;
      
    } catch (error) {
      console.error('❌ 분석 데이터 새로고침 오류:', error);
      throw new Error('분석 데이터 새로고침에 실패했습니다.');
    }
  }

  /**
   * Python 스크립트용 데이터 준비
   */
  private async getSurveyDataForPython(surveyId: string): Promise<{
    survey_data: Array<{student_id: string, friend_student_id: string, relationship_type: string, strength_score: number}>;
    student_info: Array<{id: string, name: string, grade: string, class: string}>;
  }> {
    try {
      
      // 설문 정보와 질문 구조 가져오기
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!surveys_template_id_fkey(questions, metadata)
        `)
        .eq('id', surveyId)
        .single();

      if (surveyError) {
        console.error('❌ 설문 데이터 조회 오류:', surveyError);
        throw surveyError;
      }


      // 설문 응답 데이터 가져오기
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('student_id, responses')
        .eq('survey_id', surveyId);

      if (responseError) {
        console.error('❌ 응답 데이터 조회 오류:', responseError);
        throw responseError;
      }


      // 설문 대상 학급 정보 가져오기
      const targetGrades = surveyData?.target_grades || [];
      const targetClasses = surveyData?.target_classes || [];
      
      
      if (targetGrades.length === 0 || targetClasses.length === 0) {
        return { survey_data: [], student_info: [] };
      }

      // 해당 학급의 모든 학생 정보 가져오기
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name, grade, class')
        .in('grade', targetGrades)
        .in('class', targetClasses)
        .eq('is_active', true);

      if (studentError) {
        throw studentError;
      }


      // 질문 구조 분석 및 관계 유형 매핑
      const templateQuestions = surveyData?.survey_templates?.questions as any;
      const questionRelationshipMapping = this.buildQuestionRelationshipMapping(templateQuestions);

      // survey_data 생성 (딕셔너리 배열로)
      const survey_data: Array<{student_id: string, friend_student_id: string, relationship_type: string, strength_score: number}> = [];
      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      responses?.forEach(response => {
        if (response.responses && typeof response.responses === 'object') {
          Object.entries(response.responses).forEach(([questionKey, answer]) => {
            if (Array.isArray(answer)) {
              answer.forEach(targetStudentId => {
                // 타입 안전성 확보
                if (targetStudentId && 
                    typeof targetStudentId === 'string' && 
                    studentMap.has(targetStudentId) &&
                    response.student_id) {
                  const relationshipType = questionRelationshipMapping[questionKey] || '기타';
                  survey_data.push({
                    student_id: response.student_id,
                    friend_student_id: targetStudentId,
                    relationship_type: relationshipType,
                    strength_score: 1.0
                  });
                }
              });
            }
          });
        }
      });

      const student_info = students?.map(s => ({
        id: s.id,
        name: s.name,
        grade: s.grade.toString(),
        class: s.class.toString()
      })) || [];

      return { survey_data, student_info };
      
    } catch (error) {
      console.error('❌ Python용 데이터 준비 오류:', error);
      throw error;
    }
  }

  /**
   * 질문별 관계 유형 매핑 구축
   */
  private buildQuestionRelationshipMapping(templateQuestions: any): { [key: string]: string } {
    const mapping: { [key: string]: string } = {};
    
    if (!templateQuestions) return mapping;

    if (Array.isArray(templateQuestions)) {
      templateQuestions.forEach((question, index) => {
        const questionText = typeof question === 'string' ? question : question?.question || '';
        const questionKey = `q${index + 1}`;
        mapping[questionKey] = this.mapQuestionToRelationshipType(questionText);
      });
    } else {
      Object.keys(templateQuestions).forEach((questionKey, index) => {
        const questionText = templateQuestions[questionKey]?.question || '';
        mapping[questionKey] = this.mapQuestionToRelationshipType(questionText);
      });
    }

    return mapping;
  }

  /**
   * 질문 텍스트를 관계 유형으로 매핑
   */
  private mapQuestionToRelationshipType(questionText: string): string {
    if (questionText.includes('가장 친한') || questionText.includes('베스트') || questionText.includes('친한 친구')) {
      return '친한 친구';
    } else if (questionText.includes('함께 놀고 싶은') || questionText.includes('놀이') || questionText.includes('놀고 싶은')) {
      return '함께 놀고 싶은 친구';
    } else if (questionText.includes('고민') || questionText.includes('상담') || questionText.includes('상담하고 싶은')) {
      return '고민 상담';
    } else if (questionText.includes('존경') || questionText.includes('닮고 싶은') || questionText.includes('존경하거나')) {
      return '존경/닮고 싶은';
    }
    return '기타';
  }

  /**
   * Python 결과를 통합 형식으로 변환
   */
  private convertPythonResultToUnifiedFormat(pythonResult: any, surveyId: string): CompleteAnalysisResult {
    
    const studentDetails = pythonResult.student_details || {};
    const centralityMetrics = pythonResult.centrality_metrics || {};
    const communities = pythonResult.communities || [];
    
    // 노드 데이터 변환
    const nodes: NetworkNode[] = Object.keys(studentDetails).map(studentId => {
      const details = studentDetails[studentId];
      const centrality = centralityMetrics[studentId] || {};
      
      const node = {
        id: studentId,
        name: details.name,
        grade: parseInt(details.grade.replace('학년', '')) || 1,
        class: parseInt(details.class.replace('반', '')) || 1,
        centrality: centrality.degree || 0,
        connection_count: details.connection_count || 0,
        community: details.community_id || 0,
        friendship_type: details.friendship_type || '분류 불가',
        neighbors: details.neighbors || [],
        degree_centrality: centrality.degree || 0,
        closeness_centrality: centrality.closeness || 0,
        betweenness_centrality: centrality.betweenness || 0,
        eigenvector_centrality: centrality.eigenvector || 0
      };
      
      return node;
    });
    
    
    // 엣지 데이터 변환
    const edges: NetworkEdge[] = [];
    nodes.forEach(node => {
      node.neighbors.forEach((neighborId: string) => {
        if (!edges.some(edge => 
          (edge.source === node.id && edge.target === neighborId) ||
          (edge.source === neighborId && edge.target === node.id)
        )) {
          edges.push({
            source: node.id,
            target: neighborId,
            weight: 1,
            relationship_type: 'friend'
          });
        }
      });
    });
    
    // 커뮤니티 데이터 변환
    const convertedCommunities: Community[] = communities.map((community: any, index: number) => ({
      id: index,
      members: community.members || [],
      size: community.size || 0,
      cohesion: community.cohesion || 0
    }));
    
    // 네트워크 메트릭 계산
    const metrics: NetworkMetrics = {
      totalConnections: edges.length,
      density: pythonResult.network_stats?.density || 0,
      averageClustering: pythonResult.network_stats?.average_clustering || 0,
      communitiesCount: convertedCommunities.length,
      averageCentrality: nodes.reduce((sum, node) => sum + node.centrality, 0) / nodes.length,
      isolationRiskCount: nodes.filter(node => node.connection_count < 2).length,
      popularStudentsCount: nodes.filter(node => node.centrality > 0.7).length
    };
    
    // 권장사항 변환
    const recommendations: GlobalRecommendations = {
      class_improvements: pythonResult.recommendations?.class_improvements || [],
      school_wide_actions: pythonResult.recommendations?.school_wide_actions || [],
      monitoring_strategies: pythonResult.recommendations?.monitoring_strategies || [],
      intervention_priorities: pythonResult.recommendations?.intervention_priorities || []
    };
    
    return {
      nodes,
      edges,
      metrics,
      communities: convertedCommunities,
      recommendations,
      analysisMetadata: {
        surveyId,
        analysisDate: new Date(),
        totalStudents: nodes.length,
        totalRelationships: edges.length,
        analysisVersion: '1.0.0'
      }
    };
  }

  /**
   * 학급별 분석 추출
   */
  private extractClassAnalysis(unifiedData: UnifiedNetworkData, classNumber: string): ClassAnalysisResult {
    const classStudents = unifiedData.completeAnalysis.nodes.filter(node => 
      node.class.toString() === classNumber
    );
    
    const classEdges = unifiedData.completeAnalysis.edges.filter(edge => {
      const sourceNode = unifiedData.completeAnalysis.nodes.find(n => n.id === edge.source);
      const targetNode = unifiedData.completeAnalysis.nodes.find(n => n.id === edge.target);
      return sourceNode?.class.toString() === classNumber && targetNode?.class.toString() === classNumber;
    });

    const classMetrics = this.calculateClassMetrics(classStudents, classEdges);
    
    return {
      classNumber,
      students: classStudents,
      networkData: {
        nodes: classStudents,
        edges: classEdges
      },
      classMetrics,
      recommendations: {
        class_improvements: unifiedData.completeAnalysis.recommendations.class_improvements,
        individual_interventions: [],
        monitoring_points: unifiedData.completeAnalysis.recommendations.monitoring_strategies
      }
    };
  }

  /**
   * 모든 학급별 분석 추출
   */
  private extractAllClassAnalyses(completeAnalysis: CompleteAnalysisResult): Map<string, ClassAnalysisResult> {
    const classAnalyses = new Map<string, ClassAnalysisResult>();
    
    // 학급별로 그룹화
    const classGroups = new Map<string, NetworkNode[]>();
    completeAnalysis.nodes.forEach(node => {
      const classKey = node.class.toString();
      if (!classGroups.has(classKey)) {
        classGroups.set(classKey, []);
      }
      classGroups.get(classKey)!.push(node);
    });

    // 각 학급별 분석 수행
    classGroups.forEach((students, classNumber) => {
      const classEdges = completeAnalysis.edges.filter(edge => {
        const sourceNode = completeAnalysis.nodes.find(n => n.id === edge.source);
        const targetNode = completeAnalysis.nodes.find(n => n.id === edge.target);
        return sourceNode?.class.toString() === classNumber && targetNode?.class.toString() === classNumber;
      });

      const classMetrics = this.calculateClassMetrics(students, classEdges);
      
      classAnalyses.set(classNumber, {
        classNumber,
        students,
        networkData: {
          nodes: students,
          edges: classEdges
        },
        classMetrics,
        recommendations: {
          class_improvements: completeAnalysis.recommendations.class_improvements,
          individual_interventions: [],
          monitoring_points: completeAnalysis.recommendations.monitoring_strategies
        }
      });
    });

    return classAnalyses;
  }

  /**
   * 개별 학생 분석 추출
   */
  private extractIndividualAnalysis(unifiedData: UnifiedNetworkData, studentId: string): IndividualAnalysisResult {
    
    // 타입 안전성 검사
    if (typeof studentId !== 'string') {
      console.error(`❌ 잘못된 studentId 타입: ${typeof studentId}, 값: ${JSON.stringify(studentId)}`);
      throw new Error(`학생 ID가 올바르지 않습니다: ${JSON.stringify(studentId)}`);
    }
    
    const student = unifiedData.completeAnalysis.nodes.find(n => n.id === studentId);
    
    if (!student) {
      console.error(`❌ 학생을 찾을 수 없음: ${studentId}`);
      console.error(`📋 전체 노드:`, unifiedData.completeAnalysis.nodes);
      throw new Error(`학생을 찾을 수 없습니다: ${studentId}`);
    }

    const centralityMetrics: CentralityMetrics = {
      degree: student.degree_centrality,
      betweenness: student.betweenness_centrality,
      closeness: student.closeness_centrality,
      eigenvector: student.eigenvector_centrality,
      centrality: student.centrality
    };

    const isolationRisk = this.calculateIsolationRisk(student);
    const socialInfluence = this.calculateSocialInfluence(student);
    const recommendations = this.generateIndividualRecommendations(student, isolationRisk, socialInfluence);
    const networkPosition = this.analyzeNetworkPosition(student, unifiedData.completeAnalysis);

    return {
      student,
      centralityMetrics,
      communityMembership: student.community,
      isolationRisk,
      socialInfluence,
      recommendations,
      networkPosition
    };
  }

  /**
   * 모든 개별 학생 분석 추출
   */
  private extractAllIndividualAnalyses(completeAnalysis: CompleteAnalysisResult): Map<string, IndividualAnalysisResult> {
    const individualAnalyses = new Map<string, IndividualAnalysisResult>();
    
    completeAnalysis.nodes.forEach(node => {
      const centralityMetrics: CentralityMetrics = {
        degree: node.degree_centrality,
        betweenness: node.betweenness_centrality,
        closeness: node.closeness_centrality,
        eigenvector: node.eigenvector_centrality,
        centrality: node.centrality
      };

      const isolationRisk = this.calculateIsolationRisk(node);
      const socialInfluence = this.calculateSocialInfluence(node);
      const recommendations = this.generateIndividualRecommendations(node, isolationRisk, socialInfluence);
      const networkPosition = this.analyzeNetworkPosition(node, completeAnalysis);

      individualAnalyses.set(node.id, {
        student: node,
        centralityMetrics,
        communityMembership: node.community,
        isolationRisk,
        socialInfluence,
        recommendations,
        networkPosition
      });
    });

    return individualAnalyses;
  }

  /**
   * 학급 메트릭 계산
   */
  private calculateClassMetrics(students: NetworkNode[], edges: NetworkEdge[]) {
    const totalPossibleConnections = students.length * (students.length - 1) / 2;
    const networkDensity = totalPossibleConnections > 0 ? edges.length / totalPossibleConnections : 0;
    
    const averageCentrality = students.reduce((sum, student) => sum + student.centrality, 0) / students.length;
    
    const isolationRiskStudents = students.filter(student => student.connection_count < 2);
    const popularStudents = students.filter(student => student.centrality > 0.7);
    
    // 커뮤니티 구조 분석
    const communityStructure: Community[] = [];
    const communityMap = new Map<number, NetworkNode[]>();
    
    students.forEach(student => {
      if (!communityMap.has(student.community)) {
        communityMap.set(student.community, []);
      }
      communityMap.get(student.community)!.push(student);
    });
    
    communityMap.forEach((members, communityId) => {
      communityStructure.push({
        id: communityId,
        members: members.map(m => m.id),
        size: members.length,
        cohesion: this.calculateCommunityCohesion(members, edges)
      });
    });

    return {
      averageCentrality,
      networkDensity,
      averageClustering: this.calculateAverageClustering(students, edges),
      communitiesCount: communityStructure.length,
      isolationRiskStudents,
      popularStudents,
      communityStructure
    };
  }

  /**
   * 고립 위험도 계산
   */
  private calculateIsolationRisk(student: NetworkNode): RiskLevel {
    const connectionCount = student.connection_count;
    const centrality = student.centrality;
    
    let level: 'low' | 'medium' | 'high';
    let score: number;
    let description: string;
    
    if (connectionCount < 2 || centrality < 0.2) {
      level = 'high';
      score = 0.8;
      description = '고립 위험이 높습니다. 적극적인 개입이 필요합니다.';
    } else if (connectionCount < 4 || centrality < 0.4) {
      level = 'medium';
      score = 0.5;
      description = '고립 위험이 보통입니다. 관찰 및 지원이 필요합니다.';
    } else {
      level = 'low';
      score = 0.2;
      description = '고립 위험이 낮습니다. 현재 상태를 유지하세요.';
    }
    
    return { level, score, description };
  }

  /**
   * 사회적 영향력 계산
   */
  private calculateSocialInfluence(student: NetworkNode): InfluenceLevel {
    const centrality = student.centrality;
    const connectionCount = student.connection_count;
    
    let level: 'low' | 'medium' | 'high';
    let score: number;
    let description: string;
    
    if (centrality > 0.7 || connectionCount > 8) {
      level = 'high';
      score = 0.8;
      description = '높은 사회적 영향력을 가지고 있습니다. 리더십 역할을 고려해보세요.';
    } else if (centrality > 0.4 || connectionCount > 4) {
      level = 'medium';
      score = 0.5;
      description = '보통 수준의 사회적 영향력을 가지고 있습니다.';
    } else {
      level = 'low';
      score = 0.2;
      description = '낮은 사회적 영향력을 가지고 있습니다. 관계 형성을 지원해보세요.';
    }
    
    return { level, score, description };
  }

  /**
   * 개별 권장사항 생성
   */
  private generateIndividualRecommendations(
    student: NetworkNode, 
    isolationRisk: RiskLevel, 
    socialInfluence: InfluenceLevel
  ): IndividualRecommendations {
    const immediate_actions: string[] = [];
    const short_term_goals: string[] = [];
    const long_term_goals: string[] = [];
    const monitoring_points: string[] = [];
    
    // 고립 위험도에 따른 권장사항
    if (isolationRisk.level === 'high') {
      immediate_actions.push('담임교사와 상담 일정 조율');
      immediate_actions.push('학급 내 소그룹 활동 참여 유도');
      short_term_goals.push('2-3명의 친구와 안정적인 관계 형성');
      long_term_goals.push('학급 내 적극적인 참여자로 성장');
      monitoring_points.push('일일 관계 형성 상황 체크');
    } else if (isolationRisk.level === 'medium') {
      immediate_actions.push('그룹 활동 참여 격려');
      short_term_goals.push('현재 관계 유지 및 확장');
      monitoring_points.push('주간 관계 변화 모니터링');
    }
    
    // 사회적 영향력에 따른 권장사항
    if (socialInfluence.level === 'high') {
      immediate_actions.push('리더십 역할 부여 검토');
      short_term_goals.push('긍정적인 영향력 발휘 지원');
      long_term_goals.push('학급 내 긍정적 리더로 성장');
    } else if (socialInfluence.level === 'low') {
      immediate_actions.push('소그룹 활동에서 발언 기회 제공');
      short_term_goals.push('자신감 향상을 위한 성취 경험 제공');
    }
    
    // 개입 수준 결정
    let intervention_level: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (isolationRisk.level === 'high') {
      intervention_level = 'high';
    } else if (isolationRisk.level === 'medium' || socialInfluence.level === 'low') {
      intervention_level = 'medium';
    } else if (socialInfluence.level === 'medium') {
      intervention_level = 'low';
    }
    
    return {
      immediate_actions,
      short_term_goals,
      long_term_goals,
      monitoring_points,
      intervention_level
    };
  }

  /**
   * 네트워크 위치 분석
   */
  private analyzeNetworkPosition(student: NetworkNode, completeAnalysis: CompleteAnalysisResult) {
    const isCenter = student.centrality > 0.7;
    const isIsolated = student.connection_count < 2;
    const isBridge = student.betweenness_centrality > 0.5;
    const isPeripheral = student.centrality < 0.3 && student.connection_count < 4;
    
    return {
      isCenter,
      isIsolated,
      isBridge,
      isPeripheral
    };
  }

  /**
   * 커뮤니티 응집도 계산
   */
  private calculateCommunityCohesion(members: NetworkNode[], edges: NetworkEdge[]): number {
    if (members.length < 2) return 0;
    
    const memberIds = new Set(members.map(m => m.id));
    const internalEdges = edges.filter(edge => 
      memberIds.has(edge.source) && memberIds.has(edge.target)
    );
    
    const totalPossibleEdges = members.length * (members.length - 1) / 2;
    return totalPossibleEdges > 0 ? internalEdges.length / totalPossibleEdges : 0;
  }

  /**
   * 평균 클러스터링 계수 계산
   */
  private calculateAverageClustering(students: NetworkNode[], edges: NetworkEdge[]): number {
    let totalClustering = 0;
    
    students.forEach(student => {
      const neighbors = student.neighbors.filter(neighborId => 
        students.some(s => s.id === neighborId)
      );
      
      if (neighbors.length < 2) {
        totalClustering += 0;
        return;
      }
      
      let neighborConnections = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          if (edges.some(edge => 
            (edge.source === neighbors[i] && edge.target === neighbors[j]) ||
            (edge.source === neighbors[j] && edge.target === neighbors[i])
          )) {
            neighborConnections++;
          }
        }
      }
      
      const possibleConnections = neighbors.length * (neighbors.length - 1) / 2;
      const clustering = possibleConnections > 0 ? neighborConnections / possibleConnections : 0;
      totalClustering += clustering;
    });
    
    return students.length > 0 ? totalClustering / students.length : 0;
  }

  /**
   * 캐시 유효성 검사
   */
  private isCacheValid(cache: AnalysisCache): boolean {
    const now = new Date();
    const cacheAge = now.getTime() - cache.lastRefresh.getTime();
    return cacheAge < this.CACHE_DURATION;
  }

  /**
   * DB에 분석 결과 저장
   */
  private async saveToDatabase(surveyId: string, unifiedData: UnifiedNetworkData): Promise<void> {
    try {
      const { error } = await supabase
        .from('network_analysis_results')
        .upsert({
          survey_id: surveyId,
          analysis_type: 'unified_network_analysis',
          analysis_data: unifiedData,
          calculated_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ DB 저장 오류:', error);
      } else {
      }
    } catch (error) {
      console.error('❌ DB 저장 중 오류:', error);
    }
  }

  /**
   * 기존 네트워크 분석 결과를 통합 형식으로 변환
   */
  private convertNetworkAnalysisToUnifiedFormat(
    networkResult: any,
    surveyId: string
  ): CompleteAnalysisResult {
    const nodes = networkResult.nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      grade: node.grade,
      class: node.class,
      friendship_type: node.friendship_type || '평균적인 학생',
      centrality: node.degree_centrality || 0,
      connection_count: node.connection_count || 0,
      community_id: node.community_id || 0,
    }));

    const edges = networkResult.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      relationship_type: edge.relationship_type || 'friend',
      strength_score: edge.strength_score || 1,
    }));

    const communities = networkResult.communities.map((community: any) => ({
      id: community.id,
      members: community.members,
      cohesion: community.cohesion || 0.5,
      size: community.members.length,
    }));

    return {
      nodes,
      edges,
      communities,
      metrics: {
        totalConnections: networkResult.metrics.totalConnections || networkResult.edges?.length || 0,
        density: networkResult.metrics.density || 0,
        averageClustering: networkResult.metrics.clustering_coefficient || networkResult.metrics.averageClustering || 0,
        communitiesCount: networkResult.metrics.connected_components || networkResult.communities?.length || 1,
        averageCentrality: networkResult.metrics.average_degree || 0,
        isolationRiskCount: 0, // 계산 필요
        popularStudentsCount: 0, // 계산 필요
      },
      recommendations: {
        class_improvements: [],
        school_wide_actions: [],
        monitoring_strategies: [],
        intervention_priorities: [],
      },
      analysisMetadata: {
        surveyId: surveyId,
        analysisDate: new Date(),
        totalStudents: nodes.length,
        totalRelationships: edges.length,
        analysisVersion: '2.0',
      },
    };
  }

  /**
   * Python 개별 분석 결과를 통합 형식으로 변환
   */
  private convertPythonIndividualResultToUnifiedFormat(
    pythonResult: any,
    studentId: string
  ): IndividualAnalysisResult {
    const student = {
      id: studentId,
      name: pythonResult.student_name || 'Unknown',
      grade: pythonResult.grade || 1,
      class: pythonResult.class || 1,
      centrality: pythonResult.centrality_metrics?.degree || 0,
      connection_count: pythonResult.degree || 0,
      community: pythonResult.community_id || 0,
      friendship_type: pythonResult.friendship_type || '평균적인 학생',
      neighbors: pythonResult.neighbors || [],
      degree_centrality: pythonResult.centrality_metrics?.degree || 0,
      closeness_centrality: pythonResult.centrality_metrics?.closeness || 0,
      betweenness_centrality: pythonResult.centrality_metrics?.betweenness || 0,
      eigenvector_centrality: pythonResult.centrality_metrics?.eigenvector || 0,
    };

    const centralityMetrics = {
      degree: pythonResult.centrality_metrics?.degree || 0,
      betweenness: pythonResult.centrality_metrics?.betweenness || 0,
      closeness: pythonResult.centrality_metrics?.closeness || 0,
      eigenvector: pythonResult.centrality_metrics?.eigenvector || 0,
      centrality: pythonResult.centrality_metrics?.degree || 0,
    };

    const isolationRisk = {
      level: pythonResult.isolation_risk?.level || 'medium',
      score: pythonResult.isolation_risk?.score || 50,
      description: pythonResult.isolation_risk?.description || '평균적인 위험도',
    };

    const socialInfluence = {
      level: pythonResult.social_influence?.level || 'medium',
      score: pythonResult.social_influence?.score || 50,
      description: pythonResult.social_influence?.description || '평균적인 영향력',
    };

    const recommendations = {
      immediate_actions: pythonResult.recommendations?.immediate_actions || [],
      short_term_goals: pythonResult.recommendations?.short_term_goals || [],
      long_term_goals: pythonResult.recommendations?.long_term_goals || [],
      monitoring_points: pythonResult.recommendations?.monitoring_points || [],
      intervention_level: pythonResult.recommendations?.intervention_level || 'none',
    };

    const networkPosition = {
      isCenter: pythonResult.centrality_metrics?.degree > 0.7,
      isIsolated: pythonResult.degree === 0,
      isBridge: pythonResult.centrality_metrics?.betweenness > 0.3,
      isPeripheral: pythonResult.centrality_metrics?.degree < 0.3,
    };

    return {
      student,
      centralityMetrics,
      communityMembership: pythonResult.community_id || 0,
      isolationRisk,
      socialInfluence,
      recommendations,
      networkPosition,
    };
  }

  /**
   * 캐시 클리어
   */
  clearCache(surveyId?: string): void {
    if (surveyId) {
      this.analysisCache.delete(surveyId);
      networkAnalysisSyncManager.invalidateSurveyCache(surveyId);
    } else {
      this.analysisCache.clear();
      networkAnalysisSyncManager.clearAllCache();
    }
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStatus(): { [surveyId: string]: { isStale: boolean; lastRefresh: Date } } {
    const status: { [surveyId: string]: { isStale: boolean; lastRefresh: Date } } = {};
    
    this.analysisCache.forEach((cache, surveyId) => {
      status[surveyId] = {
        isStale: cache.isStale,
        lastRefresh: cache.lastRefresh
      };
    });
    
    return status;
  }

  /**
   * 동기화 관리자 통계 조회
   */
  getSyncManagerStats(): any {
    return networkAnalysisSyncManager.getCacheStats();
  }

  /**
   * 설문 데이터 동기화 요청
   */
  requestSync(surveyId: string): void {
    networkAnalysisSyncManager.enqueueSync(surveyId);
  }
}

// 싱글톤 인스턴스 생성
export const unifiedNetworkAnalysisService = new UnifiedNetworkAnalysisService();
