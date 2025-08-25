import { supabase } from '../lib/supabase';

export interface NetworkAnalysisResult {
  period: string;
  network_stats: {
    total_students: number;
    total_relationships: number;
    average_degree: number;
    density: number;
    clustering_coefficient: number;
    average_path_length: number;
  };
  friendship_type_distribution: Record<string, number>;
  student_details: Record<string, any>;
  network_data: {
    nodes: any[];
    edges: any[];
  };
}

export interface TrendComparisonData {
  period: string;
  외톨이형: number;
  소수친구학생: number;
  평균적인학생: number;
  친구많은학생: number;
  사교스타: number;
}

export class NetworkAnalysisService {
  /**
   * 특정 시기의 교우관계 데이터를 가져와서 네트워크 분석 수행
   */
  static async analyzeFriendshipNetwork(
    period: string,
    schoolId: string,
    grade: string,
    classNumber: string
  ): Promise<NetworkAnalysisResult> {
    try {
      // 1. 학생 데이터 조회
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('current_school_id', schoolId)
        .eq('grade', grade)
        .eq('class', classNumber)
        .eq('is_active', true);

      if (studentsError) throw studentsError;

      // 2. 교우관계 데이터 조회 (설문 응답에서 추출)
      const { data: surveyResponses, error: responsesError } = await supabase
        .from('survey_responses')
        .select('*')
        .eq('survey_id', `survey-${period}`); // 실제 설문 ID로 변경 필요

      if (responsesError) throw responsesError;

      // 3. 교우관계 데이터 변환
      const friendshipData = this.extractFriendshipData(surveyResponses || []);

      // 4. 네트워크 분석 수행 (Python 스크립트 결과를 시뮬레이션)
      const analysisResult = this.performNetworkAnalysis(period, friendshipData, students || []);

      return analysisResult;
    } catch (error) {
      console.error('네트워크 분석 오류:', error);
      throw error;
    }
  }

  /**
   * 설문 응답에서 교우관계 데이터 추출
   */
  private static extractFriendshipData(surveyResponses: any[]): any[] {
    const friendshipData: any[] = [];

    surveyResponses.forEach(response => {
      if (response.responses && typeof response.responses === 'object') {
        // 설문 응답에서 친구 선택 데이터 추출
        Object.entries(response.responses).forEach(([questionId, answer]) => {
          if (Array.isArray(answer) && answer.length > 0) {
            // 각 질문에 대한 친구 선택을 교우관계로 변환
            answer.forEach((friendId: string) => {
              friendshipData.push({
                student_id: response.student_id,
                friend_student_id: friendId,
                strength_score: 5, // 기본 친밀도 점수
                relationship_type: 'friend',
                survey_id: response.survey_id
              });
            });
          }
        });
      }
    });

    return friendshipData;
  }

  /**
   * 네트워크 분석 수행 (Python 스크립트 결과를 시뮬레이션)
   */
  private static performNetworkAnalysis(
    period: string,
    friendshipData: any[],
    students: any[]
  ): NetworkAnalysisResult {
    // 실제로는 Python 스크립트를 호출하여 분석 수행
    // 여기서는 샘플 결과를 반환

    // 학생별 연결 수 계산
    const studentConnections = new Map<string, number>();
    friendshipData.forEach(relation => {
      studentConnections.set(
        relation.student_id,
        (studentConnections.get(relation.student_id) || 0) + 1
      );
      studentConnections.set(
        relation.friend_student_id,
        (studentConnections.get(relation.friend_student_id) || 0) + 1
      );
    });

    // 교우관계 유형 분류
    const friendshipTypes: Record<string, number> = {
      '외톨이형': 0,
      '소수 친구 학생': 0,
      '평균적인 학생': 0,
      '친구 많은 학생': 0,
      '사교 스타': 0
    };

    students.forEach(student => {
      const connections = studentConnections.get(student.id) || 0;
      if (connections === 0) {
        friendshipTypes['외톨이형']++;
      } else if (connections <= 2) {
        friendshipTypes['소수 친구 학생']++;
      } else if (connections <= 5) {
        friendshipTypes['평균적인 학생']++;
      } else if (connections <= 8) {
        friendshipTypes['친구 많은 학생']++;
      } else {
        friendshipTypes['사교 스타']++;
      }
    });

    // 네트워크 통계 계산
    const totalStudents = students.length;
    const totalRelationships = friendshipData.length;
    const averageDegree = totalStudents > 0 ? (totalRelationships * 2) / totalStudents : 0;

    // D3.js용 네트워크 데이터 생성
    const networkData = {
      nodes: students.map(student => ({
        id: student.id,
        name: student.name,
        grade: student.grade,
        class: student.class,
        friendship_type: this.getFriendshipType(studentConnections.get(student.id) || 0),
        centrality: (studentConnections.get(student.id) || 0) / Math.max(...Array.from(studentConnections.values()), 1),
        community: 0,
        connection_count: studentConnections.get(student.id) || 0
      })),
      edges: friendshipData.map(relation => ({
        source: relation.student_id,
        target: relation.friend_student_id,
        weight: relation.strength_score,
        relationship_type: relation.relationship_type
      }))
    };

    return {
      period,
      network_stats: {
        total_students: totalStudents,
        total_relationships: totalRelationships,
        average_degree: averageDegree,
        density: totalStudents > 1 ? (totalRelationships * 2) / (totalStudents * (totalStudents - 1)) : 0,
        clustering_coefficient: 0.3, // 샘플 값
        average_path_length: 2.5 // 샘플 값
      },
      friendship_type_distribution: friendshipTypes,
      student_details: {},
      network_data: networkData
    };
  }

  /**
   * 연결 수에 따른 교우관계 유형 반환
   */
  private static getFriendshipType(connections: number): string {
    if (connections === 0) return '외톨이형';
    if (connections <= 2) return '소수 친구 학생';
    if (connections <= 5) return '평균적인 학생';
    if (connections <= 8) return '친구 많은 학생';
    return '사교 스타';
  }

  /**
   * 시기별 비교 데이터 생성
   */
  static async getTrendComparisonData(
    periods: string[],
    schoolId: string,
    grade: string,
    classNumber: string
  ): Promise<TrendComparisonData[]> {
    try {
      const trendData: TrendComparisonData[] = [];

      for (const period of periods) {
        const analysis = await this.analyzeFriendshipNetwork(period, schoolId, grade, classNumber);
        
        trendData.push({
          period,
          외톨이형: analysis.friendship_type_distribution['외톨이형'] || 0,
          소수친구학생: analysis.friendship_type_distribution['소수 친구 학생'] || 0,
          평균적인학생: analysis.friendship_type_distribution['평균적인 학생'] || 0,
          친구많은학생: analysis.friendship_type_distribution['친구 많은 학생'] || 0,
          사교스타: analysis.friendship_type_distribution['사교 스타'] || 0
        });
      }

      return trendData;
    } catch (error) {
      console.error('트렌드 비교 데이터 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 학생별 상세 분석 결과 조회
   */
  static async getStudentAnalysis(
    studentId: string,
    period: string
  ): Promise<any> {
    try {
      // 학생별 상세 분석 데이터 조회
      const { data, error } = await supabase
        .from('network_analysis_results')
        .select('*')
        .eq('student_id', studentId)
        .eq('survey_id', `survey-${period}`)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('학생별 분석 결과 조회 오류:', error);
      return null;
    }
  }

  /**
   * 커뮤니티 탐지 결과 조회
   */
  static async getCommunityAnalysis(
    schoolId: string,
    grade: string,
    classNumber: string,
    period: string
  ): Promise<any[]> {
    try {
      // 커뮤니티 분석 결과 조회 (임시로 빈 배열 반환)
      // 실제로는 community_analysis 테이블이 필요
      console.log('커뮤니티 분석 결과 조회:', { schoolId, grade, classNumber, period });
      return [];
    } catch (error) {
      console.error('커뮤니티 분석 결과 조회 오류:', error);
      return [];
    }
  }
}
