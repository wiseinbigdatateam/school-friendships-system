import { supabase } from '../lib/supabase';

// 네트워크 분석 결과 타입
export interface NetworkAnalysisResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: NetworkMetrics;
  communities: Community[];
  friendship_type_distribution: { [key: string]: number };
}

export interface NetworkNode {
  id: string;
  name: string;
  grade: number;
  class: number;
  centrality: number;
  community: number;
  friendship_type: string;
  connection_count: number;
  neighbors: string[];
  degree_centrality: number;
  closeness_centrality: number;
  betweenness_centrality: number;
  eigenvector_centrality: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  relationship_type: string;
}

export interface NetworkMetrics {
    total_students: number;
    total_relationships: number;
  density: number;
    average_degree: number;
    clustering_coefficient: number;
    average_path_length: number;
  modularity: number;
  connected_components: number;
  average_degree_centrality: number;
  average_closeness_centrality: number;
  average_betweenness_centrality: number;
  average_eigenvector_centrality: number;
}

export interface Community {
  id: number;
  members: string[];
  size: number;
  internal_density: number;
}

// 설문 응답 데이터 타입
interface SurveyResponse {
  student_id: string | null;
  responses: any;
}

// 학생 정보 타입
interface Student {
  id: string;
  name: string;
  grade: number;
  class: number;
}

class NetworkAnalysisService {
  /**
   * Supabase 데이터를 Python 스크립트용 형태로 변환합니다
   */
  async convertToPythonFormat(surveyId: string): Promise<{
    survey_data: Array<[string, string, string]>;
    student_info: Array<{id: string, name: string, grade: string, class: string}>;
  }> {
    return await this.generateSurveyDataForPython(surveyId);
  }

  /**
   * 설문 데이터를 기반으로 네트워크 분석을 수행합니다
   */
  async analyzeNetwork(surveyId: string): Promise<NetworkAnalysisResult> {
    try {
      console.log('🔍 네트워크 분석 시작:', surveyId);

      // 1. 설문 응답 데이터 가져오기
      const surveyResponses = await this.getSurveyResponses(surveyId);
      console.log('📋 설문 응답 개수:', surveyResponses.length);

      // 2. 학생 정보 가져오기
      const students = await this.getStudents(surveyId);
      console.log('👥 학생 수:', students.length);

      // 3. 네트워크 데이터 생성
      const networkData = this.createNetworkData(surveyResponses, students);
      console.log('🔗 네트워크 엣지 수:', networkData.edges.length);
      console.log('👤 네트워크 노드 수:', networkData.nodes.length);

      // 4. 네트워크 분석 수행
      const analysisResult = this.performNetworkAnalysis(networkData, students);
      console.log('✅ 네트워크 분석 완료:', analysisResult);

      // 5. 분석 결과 저장
      await this.saveAnalysis(surveyId, analysisResult);

      return analysisResult;
    } catch (error) {
      console.error('❌ 네트워크 분석 오류:', error);
      throw new Error('네트워크 분석에 실패했습니다.');
    }
  }

  /**
   * 설문 응답 데이터를 가져옵니다
   */
  private async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    const { data, error } = await supabase
      .from('survey_responses')
      .select('student_id, responses')
      .eq('survey_id', surveyId);

    if (error) {
      console.error('설문 응답 데이터 조회 오류:', error);
      throw error;
    }

    return (data || []).filter(response => response.student_id !== null);
  }

  /**
   * 학생 정보를 가져옵니다
   */
  private async getStudents(surveyId: string): Promise<Student[]> {
    // 설문에 응답한 학생들의 ID를 먼저 가져옵니다
    const { data: responses, error: responseError } = await supabase
      .from('survey_responses')
      .select('student_id')
      .eq('survey_id', surveyId);

    if (responseError) {
      console.error('응답 학생 조회 오류:', responseError);
      throw responseError;
    }

    const studentIds = Array.from(new Set(responses?.map(r => r.student_id).filter((id): id is string => id !== null) || []));

    if (studentIds.length === 0) {
      return [];
    }

    // 학생 정보를 가져옵니다
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, name, grade, class')
      .in('id', studentIds)
      .eq('is_active', true);

    if (studentError) {
      console.error('학생 정보 조회 오류:', studentError);
      throw studentError;
    }

    return (students || []).map(student => ({
      id: student.id,
      name: student.name,
      grade: parseInt(student.grade) || 1,
      class: parseInt(student.class) || 1,
    }));
  }

  /**
   * 설문 응답을 기반으로 네트워크 데이터를 생성합니다
   */
  private createNetworkData(responses: SurveyResponse[], students: Student[]) {
    const studentMap = new Map(students.map(s => [s.id, s]));
    const edges: NetworkEdge[] = [];
    const processedPairs = new Set<string>();

    responses.forEach(response => {
      if (!response.student_id || !response.responses) return;

      const responsesData = typeof response.responses === 'string' 
        ? JSON.parse(response.responses) 
        : response.responses;

      Object.values(responsesData).forEach((questionResponses: any) => {
        if (Array.isArray(questionResponses)) {
          questionResponses.forEach((friendId: string) => {
            if (friendId && friendId !== response.student_id && studentMap.has(friendId)) {
              // 중복 엣지 방지
              const pairKey = [response.student_id, friendId].sort().join('-');
              if (!processedPairs.has(pairKey)) {
                edges.push({
                  source: response.student_id!,
                  target: friendId,
                  weight: 1,
                  relationship_type: 'friend'
                });
                processedPairs.add(pairKey);
              }
          }
        });
      }
      });
    });

    return {
      nodes: students,
      edges
    };
  }

  /**
   * Supabase 데이터를 network_analysis.py 형태로 변환합니다
   */
  async generateSurveyDataForPython(surveyId: string): Promise<{
    survey_data: Array<[string, string, string]>;
    student_info: Array<{id: string, name: string, grade: string, class: string}>;
  }> {
    try {
      // 1. 설문 정보와 질문 구조 가져오기
      const { data: surveyData, error: surveyError } = await supabase
        .from('surveys')
        .select(`
          *,
          survey_templates!surveys_template_id_fkey(questions, metadata)
        `)
        .eq('id', surveyId)
        .single();

      if (surveyError) {
        console.error('설문 정보 조회 오류:', surveyError);
        throw surveyError;
      }

      // 2. 설문 응답 데이터 가져오기
      const { data: responses, error: responseError } = await supabase
        .from('survey_responses')
        .select('student_id, responses')
        .eq('survey_id', surveyId);

      if (responseError) {
        console.error('설문 응답 조회 오류:', responseError);
        throw responseError;
      }

      // 3. 학생 정보 가져오기
      const studentIds = Array.from(new Set(responses?.map(r => r.student_id).filter((id): id is string => id !== null) || []));
      
      if (studentIds.length === 0) {
        return { survey_data: [], student_info: [] };
      }

      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id, name, grade, class')
        .in('id', studentIds)
        .eq('is_active', true);

      if (studentError) {
        console.error('학생 정보 조회 오류:', studentError);
        throw studentError;
      }

      // 4. 질문 구조 분석
      const templateQuestions = surveyData?.survey_templates?.questions as any;
      const templateMetadata = surveyData?.survey_templates?.metadata as any;
      
      
      // 질문별 관계 유형 매핑 (템플릿 메타데이터에서 추출)
      const questionRelationshipMapping: { [key: string]: string } = {};
      
      if (templateQuestions) {
        
        // 질문이 배열 형태인 경우 처리
        if (Array.isArray(templateQuestions)) {
          templateQuestions.forEach((question, index) => {
            const questionText = typeof question === 'string' ? question : question?.question || '';
            const questionKey = `q${index + 1}`;
            
            let mappedType = '기타';
            let reason = '기본값';
            
            // 관계 유형 매핑 로직
            if (questionText.includes('가장 친한') || questionText.includes('베스트') || questionText.includes('친한 친구')) {
              mappedType = '친한 친구';
              reason = '질문에 "가장 친한", "베스트", "친한 친구" 키워드 포함';
            } else if (questionText.includes('함께 놀고 싶은') || questionText.includes('놀이') || questionText.includes('놀고 싶은')) {
              mappedType = '함께 놀고 싶은 친구';
              reason = '질문에 "함께 놀고 싶은", "놀이" 키워드 포함';
            } else if (questionText.includes('고민') || questionText.includes('상담') || questionText.includes('상담하고 싶은')) {
              mappedType = '고민 상담';
              reason = '질문에 "고민", "상담" 키워드 포함';
            } else if (questionText.includes('존경') || questionText.includes('닮고 싶은') || questionText.includes('존경하거나')) {
              mappedType = '존경/닮고 싶은';
              reason = '질문에 "존경", "닮고 싶은" 키워드 포함';
            }
            
            questionRelationshipMapping[questionKey] = mappedType;
          });
        } else {
          // 객체 형태인 경우 기존 로직 사용
          Object.keys(templateQuestions).forEach((questionKey, index) => {
            const questionText = templateQuestions[questionKey]?.question || '';
            
            let mappedType = '기타';
            let reason = '기본값';
            
            // 관계 유형 매핑 로직
            if (questionText.includes('가장 친한') || questionText.includes('베스트') || questionText.includes('친한 친구')) {
              mappedType = '친한 친구';
              reason = '질문에 "가장 친한", "베스트", "친한 친구" 키워드 포함';
            } else if (questionText.includes('함께 놀고 싶은') || questionText.includes('놀이') || questionText.includes('놀고 싶은')) {
              mappedType = '함께 놀고 싶은 친구';
              reason = '질문에 "함께 놀고 싶은", "놀이" 키워드 포함';
            } else if (questionText.includes('고민') || questionText.includes('상담') || questionText.includes('상담하고 싶은')) {
              mappedType = '고민 상담';
              reason = '질문에 "고민", "상담" 키워드 포함';
            } else if (questionText.includes('존경') || questionText.includes('닮고 싶은') || questionText.includes('존경하거나')) {
              mappedType = '존경/닮고 싶은';
              reason = '질문에 "존경", "닮고 싶은" 키워드 포함';
            }
            
            questionRelationshipMapping[questionKey] = mappedType;
          });
        }
        
      } else {
      }

      // 5. survey_data 생성 (network_analysis.py 형태)
      const survey_data: Array<[string, string, string]> = [];
      const studentMap = new Map(students?.map(s => [s.id, s]) || []);

      responses?.forEach((response, responseIndex) => {
        if (!response.student_id || !response.responses) return;

        const responsesData = typeof response.responses === 'string' 
          ? JSON.parse(response.responses) 
          : response.responses;

        // 각 질문별 응답 처리
        Object.entries(responsesData).forEach(([questionKey, answer]: [string, any]) => {
          const relationshipType = questionRelationshipMapping[questionKey] || '기타';
          
          
          if (Array.isArray(answer)) {
            // 여러 친구 선택한 경우
            answer.forEach((friendId: string, friendIndex) => {
              if (friendId && friendId !== response.student_id && studentMap.has(friendId)) {
                survey_data.push([response.student_id!, friendId, relationshipType]);
              } else {
              }
            });
          } else if (typeof answer === 'string' && answer !== response.student_id && studentMap.has(answer)) {
            // 단일 친구 선택한 경우
            survey_data.push([response.student_id!, answer, relationshipType]);
          } else {
          }
        });
      });

      // 6. student_info 생성
      const student_info = students?.map(student => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class
      })) || [];

      const relationshipDistribution = this.getRelationshipTypeDistribution(survey_data);
      Object.entries(relationshipDistribution).forEach(([type, count]) => {
        const percentage = ((count / survey_data.length) * 100).toFixed(1);
      });
      
      Object.keys(questionRelationshipMapping).forEach(questionKey => {
      });

      return {
        survey_data,
        student_info
      };

    } catch (error) {
      console.error('Python용 데이터 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 관계 유형별 분포 계산
   */
  private getRelationshipTypeDistribution(survey_data: Array<[string, string, string]>): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    
    survey_data.forEach(([source, target, relationshipType]) => {
      distribution[relationshipType] = (distribution[relationshipType] || 0) + 1;
    });
    
    return distribution;
  }

  /**
   * 네트워크 분석을 수행합니다
   */
  private performNetworkAnalysis(networkData: any, students: Student[]): NetworkAnalysisResult {
    const { nodes: studentNodes, edges } = networkData;

    // 노드 생성 (중심성 계산 포함)
    const nodes: NetworkNode[] = studentNodes.map((student: Student) => {
      const connectionCount = edges.filter(
        (edge: NetworkEdge) => edge.source === student.id || edge.target === student.id
      ).length;

      // 중심성 계산 (연결 수 기반)
      const centrality = connectionCount > 0 ? Math.min(0.1 + connectionCount * 0.1, 1.0) : 0.1;

      // 커뮤니티 할당은 detectCommunities에서 처리하므로 임시값 사용
      const community = 0; // detectCommunities에서 실제 할당됨

      // 교우관계 유형 분류
      const friendshipType = this.classifyFriendshipType(connectionCount);

      // 이웃 노드 찾기
      const neighbors = edges
        .filter((edge: NetworkEdge) => edge.source === student.id)
        .map((edge: NetworkEdge) => edge.target);

      return {
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        centrality,
        community,
        friendship_type: friendshipType,
        connection_count: connectionCount,
        neighbors,
        degree_centrality: 0,
        closeness_centrality: 0,
        betweenness_centrality: 0,
        eigenvector_centrality: 0
      };
    });

    // 커뮤니티 생성
    const communities = this.detectCommunities(nodes, edges);

    // 노드에 실제 커뮤니티 ID 할당
    const nodesWithCommunities = nodes.map(node => {
      const community = communities.find(c => c.members.includes(node.id));
      return {
        ...node,
        community: community ? community.id : 0
      };
    });

    // 중심성 지표 계산
    const nodesWithCentrality = this.calculateCentralityMetrics(nodesWithCommunities, edges);

    // 메트릭 계산
    const metrics = this.calculateMetrics(nodesWithCentrality, edges, communities);

    // 교우관계 유형별 분포
    const friendshipTypeDistribution = this.calculateFriendshipTypeDistribution(nodesWithCentrality);

    return {
      nodes: nodesWithCentrality,
      edges,
      metrics,
      communities,
      friendship_type_distribution: friendshipTypeDistribution
    };
  }

  /**
   * 교우관계 유형을 분류합니다
   */
  private classifyFriendshipType(connectionCount: number): string {
    if (connectionCount === 0) return "외톨이형";
    if (connectionCount <= 2) return "소수 친구 학생";
    if (connectionCount <= 5) return "평균적인 학생";
    if (connectionCount <= 8) return "친구 많은 학생";
    return "사교 스타";
  }

  /**
   * 중심성 지표들을 계산합니다
   */
  private calculateCentralityMetrics(nodes: NetworkNode[], edges: NetworkEdge[]): NetworkNode[] {
    const totalNodes = nodes.length;
    
    return nodes.map(node => {
      // 연결 중심성 (degree centrality)
      const degreeCentrality = node.connection_count / Math.max(totalNodes - 1, 1);
      
      // 근접 중심성 (closeness centrality) - 간단한 계산
      const shortestPaths = this.calculateShortestPaths(node.id, nodes, edges);
      const reachableNodes = Object.keys(shortestPaths).length - 1; // 자기 자신 제외
      const totalDistance = Object.values(shortestPaths).reduce((sum, dist) => sum + dist, 0) - shortestPaths[node.id];
      const closenessCentrality = reachableNodes > 0 ? reachableNodes / totalDistance : 0;
      
      // 매개 중심성 (betweenness centrality) - 간단한 계산
      const betweennessCentrality = this.calculateBetweennessCentrality(node.id, nodes, edges);
      
      // 고유벡터 중심성 (eigenvector centrality) - 간단한 계산
      const eigenvectorCentrality = this.calculateEigenvectorCentrality(node.id, nodes, edges);
      
      return {
        ...node,
        degree_centrality: degreeCentrality,
        closeness_centrality: closenessCentrality,
        betweenness_centrality: betweennessCentrality,
        eigenvector_centrality: eigenvectorCentrality
      };
    });
  }

  /**
   * 최단 경로를 계산합니다 (BFS 사용)
   */
  private calculateShortestPaths(sourceId: string, nodes: NetworkNode[], edges: NetworkEdge[]): { [key: string]: number } {
    const distances: { [key: string]: number } = {};
    const queue: string[] = [sourceId];
    distances[sourceId] = 0;
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentDistance = distances[currentId];
      
      // 현재 노드와 연결된 모든 노드를 찾습니다
      edges.forEach(edge => {
        let neighborId: string | null = null;
        if (edge.source === currentId) neighborId = edge.target;
        if (edge.target === currentId) neighborId = edge.source;
        
        if (neighborId && distances[neighborId] === undefined) {
          distances[neighborId] = currentDistance + 1;
          queue.push(neighborId);
        }
      });
    }
    
    return distances;
  }

  /**
   * 매개 중심성을 계산합니다
   */
  private calculateBetweennessCentrality(nodeId: string, nodes: NetworkNode[], edges: NetworkEdge[]): number {
    let betweenness = 0;
    
    // 모든 노드 쌍에 대해 최단 경로를 계산하고 해당 노드가 얼마나 자주 포함되는지 확인
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const sourceId = nodes[i].id;
        const targetId = nodes[j].id;
        
        if (sourceId === nodeId || targetId === nodeId) continue;
        
        const shortestPaths = this.findAllShortestPaths(sourceId, targetId, edges);
        const pathsThroughNode = shortestPaths.filter(path => path.includes(nodeId));
        
        if (shortestPaths.length > 0) {
          betweenness += pathsThroughNode.length / shortestPaths.length;
        }
      }
    }
    
    return betweenness;
  }

  /**
   * 두 노드 간의 모든 최단 경로를 찾습니다
   */
  private findAllShortestPaths(sourceId: string, targetId: string, edges: NetworkEdge[]): string[][] {
    const paths: string[][] = [];
    const queue: { path: string[], distance: number }[] = [{ path: [sourceId], distance: 0 }];
    const visited = new Set<string>();
    let minDistance = Infinity;
    
    while (queue.length > 0) {
      const { path, distance } = queue.shift()!;
      const currentNode = path[path.length - 1];
      
      if (currentNode === targetId) {
        if (distance < minDistance) {
          minDistance = distance;
          paths.length = 0; // 더 짧은 경로를 찾았으므로 이전 경로들을 제거
        }
        if (distance === minDistance) {
          paths.push([...path]);
        }
        continue;
      }
      
      if (distance > minDistance) continue;
      
      // 현재 노드와 연결된 모든 노드를 찾습니다
      edges.forEach(edge => {
        let neighborId: string | null = null;
        if (edge.source === currentNode) neighborId = edge.target;
        if (edge.target === currentNode) neighborId = edge.source;
        
        if (neighborId && !path.includes(neighborId)) {
          queue.push({ path: [...path, neighborId], distance: distance + 1 });
        }
      });
    }
    
    return paths;
  }

  /**
   * 고유벡터 중심성을 계산합니다 (간단한 반복 방법)
   */
  private calculateEigenvectorCentrality(nodeId: string, nodes: NetworkNode[], edges: NetworkEdge[]): number {
    const adjacencyMatrix: { [key: string]: { [key: string]: number } } = {};
    
    // 인접 행렬 생성
    nodes.forEach(node => {
      adjacencyMatrix[node.id] = {};
      nodes.forEach(otherNode => {
        adjacencyMatrix[node.id][otherNode.id] = 0;
      });
    });
    
    edges.forEach(edge => {
      adjacencyMatrix[edge.source][edge.target] = 1;
      adjacencyMatrix[edge.target][edge.source] = 1;
    });
    
    // 간단한 고유벡터 중심성 계산 (반복 방법)
    let centrality: { [key: string]: number } = {};
    nodes.forEach(node => {
      centrality[node.id] = 1.0;
    });
    
    // 몇 번의 반복으로 근사값 계산
    for (let iter = 0; iter < 10; iter++) {
      const newCentrality: { [key: string]: number } = {};
      let maxCentrality = 0;
      
      nodes.forEach(node => {
        let sum = 0;
        nodes.forEach(otherNode => {
          sum += adjacencyMatrix[node.id][otherNode.id] * centrality[otherNode.id];
        });
        newCentrality[node.id] = sum;
        maxCentrality = Math.max(maxCentrality, sum);
      });
      
      // 정규화
      if (maxCentrality > 0) {
        nodes.forEach(node => {
          newCentrality[node.id] /= maxCentrality;
        });
      }
      
      centrality = newCentrality;
    }
    
    return centrality[nodeId] || 0;
  }

  /**
   * 커뮤니티를 탐지합니다
   */
  private detectCommunities(nodes: NetworkNode[], edges: NetworkEdge[]): Community[] {
    const communities: Community[] = [];
    const visited = new Set<string>();
    let communityIdCounter = 1; // 고유한 ID 생성을 위한 카운터

    nodes.forEach(node => {
      if (visited.has(node.id)) return;

      const communityMembers: string[] = [];
      const queue = [node.id];
      visited.add(node.id);

      // BFS로 연결된 노드들을 찾습니다
      while (queue.length > 0) {
        const currentNodeId = queue.shift()!;
        communityMembers.push(currentNodeId);

        // 현재 노드와 연결된 노드들을 찾습니다
        edges.forEach(edge => {
          let neighborId: string | null = null;
          if (edge.source === currentNodeId) neighborId = edge.target;
          if (edge.target === currentNodeId) neighborId = edge.source;

          if (neighborId && !visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      if (communityMembers.length > 0) {
        communities.push({
          id: communityIdCounter++, // 고유한 ID 생성
          members: communityMembers,
          size: communityMembers.length,
          internal_density: this.calculateInternalDensity(communityMembers, edges)
        });
      }
    });

    return communities;
  }

  /**
   * 커뮤니티 내부 밀도를 계산합니다
   */
  private calculateInternalDensity(members: string[], edges: NetworkEdge[]): number {
    if (members.length < 2) return 0;

    const internalEdges = edges.filter(edge => 
      members.includes(edge.source) && members.includes(edge.target)
    ).length;

    const maxPossibleEdges = members.length * (members.length - 1) / 2;
    return maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;
  }

  /**
   * 네트워크 메트릭을 계산합니다
   */
  private calculateMetrics(nodes: NetworkNode[], edges: NetworkEdge[], communities: Community[]): NetworkMetrics {
    const totalStudents = nodes.length;
    const totalRelationships = edges.length;

    // 밀도 계산
    const density = totalStudents > 1 
      ? totalRelationships / (totalStudents * (totalStudents - 1) / 2)
      : 0;

    // 평균 연결 수
    const averageDegree = totalStudents > 0 ? (totalRelationships * 2) / totalStudents : 0;

    // 클러스터링 계수
    const clusteringCoefficient = this.calculateClusteringCoefficient(nodes, edges);

    // 평균 경로 길이
    const averagePathLength = this.calculateAveragePathLength(nodes, edges);

    // 모듈성
    const modularity = this.calculateModularity(edges, communities);

    // 연결된 구성요소 수
    const connectedComponents = communities.length;

    // 평균 중심성 지표들
    const averageDegreeCentrality = totalStudents > 0 
      ? nodes.reduce((sum, node) => sum + node.degree_centrality, 0) / totalStudents 
      : 0;
    
    const averageClosenessCentrality = totalStudents > 0 
      ? nodes.reduce((sum, node) => sum + node.closeness_centrality, 0) / totalStudents 
      : 0;
    
    const averageBetweennessCentrality = totalStudents > 0 
      ? nodes.reduce((sum, node) => sum + node.betweenness_centrality, 0) / totalStudents 
      : 0;
    
    const averageEigenvectorCentrality = totalStudents > 0 
      ? nodes.reduce((sum, node) => sum + node.eigenvector_centrality, 0) / totalStudents 
      : 0;

    return {
      total_students: totalStudents,
      total_relationships: totalRelationships,
      density,
      average_degree: averageDegree,
      clustering_coefficient: clusteringCoefficient,
      average_path_length: averagePathLength,
      modularity,
      connected_components: connectedComponents,
      average_degree_centrality: averageDegreeCentrality,
      average_closeness_centrality: averageClosenessCentrality,
      average_betweenness_centrality: averageBetweennessCentrality,
      average_eigenvector_centrality: averageEigenvectorCentrality
    };
  }

  /**
   * 클러스터링 계수를 계산합니다
   */
  private calculateClusteringCoefficient(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length === 0) return 0;

    let totalCoefficient = 0;
    let validNodes = 0;

    nodes.forEach(node => {
      const neighbors = edges
        .filter(edge => edge.source === node.id || edge.target === node.id)
        .map(edge => edge.source === node.id ? edge.target : edge.source);

      if (neighbors.length < 2) {
        totalCoefficient += 0;
        validNodes++;
        return;
      }

      let triangles = 0;
      let possibleTriangles = 0;

      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          possibleTriangles++;
          const hasEdge = edges.some(edge =>
            (edge.source === neighbors[i] && edge.target === neighbors[j]) ||
            (edge.source === neighbors[j] && edge.target === neighbors[i])
          );
          if (hasEdge) triangles++;
        }
      }

      const coefficient = possibleTriangles > 0 ? triangles / possibleTriangles : 0;
      totalCoefficient += coefficient;
      validNodes++;
    });

    return validNodes > 0 ? totalCoefficient / validNodes : 0;
  }

  /**
   * 평균 경로 길이를 계산합니다
   */
  private calculateAveragePathLength(nodes: NetworkNode[], edges: NetworkEdge[]): number {
    if (nodes.length === 0 || edges.length === 0) return 0;

    // Floyd-Warshall 알고리즘으로 최단 경로 계산
    const distances: { [key: string]: { [key: string]: number } } = {};

    // 초기화
    nodes.forEach(node => {
      distances[node.id] = {};
      nodes.forEach(otherNode => {
        distances[node.id][otherNode.id] = node.id === otherNode.id ? 0 : Infinity;
      });
    });

    // 직접 연결된 노드들
    edges.forEach(edge => {
      distances[edge.source][edge.target] = 1;
      distances[edge.target][edge.source] = 1;
    });

    // Floyd-Warshall
    nodes.forEach(k => {
      nodes.forEach(i => {
        nodes.forEach(j => {
          if (distances[i.id][k.id] + distances[k.id][j.id] < distances[i.id][j.id]) {
            distances[i.id][j.id] = distances[i.id][k.id] + distances[k.id][j.id];
          }
        });
      });
    });

    // 평균 경로 길이 계산
    let totalDistance = 0;
    let pathCount = 0;

    nodes.forEach(i => {
      nodes.forEach(j => {
        if (i.id !== j.id && distances[i.id][j.id] !== Infinity) {
          totalDistance += distances[i.id][j.id];
          pathCount++;
        }
      });
    });

    return pathCount > 0 ? totalDistance / pathCount : 0;
  }

  /**
   * 모듈성을 계산합니다
   */
  private calculateModularity(edges: NetworkEdge[], communities: Community[]): number {
    if (edges.length === 0 || communities.length === 0) return 0;

    const m = edges.length;
    let modularity = 0;

    edges.forEach(edge => {
      const sourceCommunity = communities.find(c => c.members.includes(edge.source));
      const targetCommunity = communities.find(c => c.members.includes(edge.target));

      if (sourceCommunity && targetCommunity && sourceCommunity.id === targetCommunity.id) {
        const ki = edges.filter(e => e.source === edge.source || e.target === edge.source).length;
        const kj = edges.filter(e => e.source === edge.target || e.target === edge.target).length;
        modularity += 1 - (ki * kj) / (2 * m);
      }
    });

    return m > 0 ? modularity / (2 * m) : 0;
  }

  /**
   * 교우관계 유형별 분포를 계산합니다
   */
  private calculateFriendshipTypeDistribution(nodes: NetworkNode[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};

    nodes.forEach(node => {
      const type = node.friendship_type;
      distribution[type] = (distribution[type] || 0) + 1;
    });

    return distribution;
  }

  /**
   * 저장된 네트워크 분석 결과를 불러옵니다
   */
  async loadSavedAnalysis(surveyId: string): Promise<NetworkAnalysisResult | null> {
    try {
      const { data, error } = await supabase
        .from('network_analysis_results')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터가 없는 경우
          return null;
        }
        console.error('저장된 분석 결과 조회 오류:', error);
        throw error;
      }

      if (!data || !data.centrality_scores) {
        return null;
      }

      // 기존 데이터 구조를 새로운 구조로 변환
      const centralityScores = data.centrality_scores as any;
      const communityMembership = data.community_membership as any;
      
      // 간단한 변환 (실제로는 더 복잡한 변환이 필요할 수 있음)
      return {
        nodes: [],
        edges: [],
        metrics: {
          total_students: 0,
          total_relationships: 0,
          density: 0,
          average_degree: 0,
          clustering_coefficient: 0,
          average_path_length: 0,
          modularity: 0,
          connected_components: 0,
          average_degree_centrality: 0,
          average_closeness_centrality: 0,
          average_betweenness_centrality: 0,
          average_eigenvector_centrality: 0
        },
        communities: [],
        friendship_type_distribution: {}
      };
    } catch (error) {
      console.error('저장된 분석 결과 불러오기 오류:', error);
      return null;
    }
  }

  /**
   * 네트워크 분석 결과를 저장합니다
   */
  async saveAnalysis(surveyId: string, analysisResult: NetworkAnalysisResult): Promise<void> {
    try {
      // 기존 데이터 구조에 맞게 변환
      const centralityScores = analysisResult.nodes.reduce((acc, node) => {
        acc[node.id] = {
          degree_centrality: node.degree_centrality,
          closeness_centrality: node.closeness_centrality,
          betweenness_centrality: node.betweenness_centrality,
          eigenvector_centrality: node.eigenvector_centrality
        };
        return acc;
      }, {} as any);

      const communityMembership = analysisResult.communities.reduce((acc, community) => {
        community.members.forEach(memberId => {
          acc[memberId] = community.id;
        });
        return acc;
      }, {} as any);

      const recommendations = this.generateImprovementRecommendations(analysisResult);
      const riskIndicators = this.generateRiskIndicators(analysisResult);

      // 상세 메트릭 생성
      const detailedMetrics = {
        network_density: analysisResult.metrics.density,
        clustering_coefficient: analysisResult.metrics.clustering_coefficient,
        average_path_length: analysisResult.metrics.average_path_length,
        modularity: analysisResult.metrics.modularity,
        connected_components: analysisResult.metrics.connected_components,
        average_degree: analysisResult.metrics.average_degree,
      };

      const { error } = await supabase
        .from('network_analysis_results')
        .insert({
          survey_id: surveyId,
          analysis_type: 'network_analysis',
          centrality_scores: centralityScores,
          community_membership: communityMembership,
          recommendations: recommendations,
          risk_indicators: riskIndicators,
          detailed_metrics: detailedMetrics,
          calculated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('분석 결과 저장 오류:', error);
        throw error;
      }

    } catch (error) {
      console.error('분석 결과 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 개별 학생 분석 결과를 저장합니다 (current_status 포함)
   */
  async saveIndividualAnalysis(
    studentId: string,
    surveyId: string,
    analysisResult: any
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('network_analysis_results')
        .upsert({
          student_id: studentId,
          survey_id: surveyId,
          analysis_type: 'individual_analysis',
          centrality_scores: analysisResult.centrality_metrics,
          community_membership: analysisResult.community_id?.toString(),
          recommendations: analysisResult.recommendations,
          risk_indicators: {
            isolation_risk: analysisResult.isolation_risk,
            social_influence: analysisResult.social_influence,
          },
          current_status: analysisResult.current_status,
          detailed_metrics: {
            network_density: analysisResult.network_density,
            clustering_coefficient: analysisResult.clustering_coefficient,
            degree: analysisResult.degree,
            friendship_type: analysisResult.friendship_type,
          },
          calculated_at: new Date().toISOString(),
        }, {
          onConflict: 'student_id,survey_id,analysis_type'
        });

      if (error) {
        console.error('개별 분석 결과 저장 오류:', error);
        throw error;
      }

    } catch (error) {
      console.error('개별 분석 결과 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 개선 권장사항을 생성합니다
   */
  private generateImprovementRecommendations(analysisResult: NetworkAnalysisResult): any {
    const recommendations = [];
    
    // 고립된 학생들에 대한 권장사항
    const isolatedStudents = analysisResult.nodes.filter(node => node.connection_count === 0);
    if (isolatedStudents.length > 0) {
      recommendations.push({
        type: 'social_integration',
        priority: 'high',
        description: `${isolatedStudents.length}명의 학생이 고립되어 있습니다.`,
        action: '소그룹 활동을 통해 사회적 연결을 촉진하세요.'
      });
    }

    // 커뮤니티 간 연결 부족
    if (analysisResult.communities.length > 1) {
      recommendations.push({
        type: 'community_bridging',
        priority: 'medium',
        description: '여러 커뮤니티가 존재하여 전체적인 연결성이 부족합니다.',
        action: '커뮤니티 간 교류를 촉진하는 활동을 계획하세요.'
      });
    }

    return recommendations;
  }

  /**
   * 위험 지표를 생성합니다
   */
  private generateRiskIndicators(analysisResult: NetworkAnalysisResult): any {
    const indicators = {
      isolation_risk: 0,
      bullying_risk: 0,
      academic_risk: 0
    };

    // 고립 위험도
    const isolatedCount = analysisResult.nodes.filter(node => node.connection_count === 0).length;
    indicators.isolation_risk = isolatedCount / analysisResult.nodes.length;

    // 괴롭힘 위험도 (매개 중심성이 높은 학생들)
    const highBetweennessStudents = analysisResult.nodes.filter(node => node.betweenness_centrality > 0.5);
    indicators.bullying_risk = highBetweennessStudents.length / analysisResult.nodes.length;

    return indicators;
  }
}

export const networkAnalysisService = new NetworkAnalysisService();