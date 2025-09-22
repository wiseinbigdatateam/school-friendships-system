// 통합 네트워크 분석을 위한 공통 데이터 모델

export interface NetworkNode {
  id: string;
  name: string;
  grade: number;
  class: number;
  centrality: number;
  connection_count: number;
  community: number;
  friendship_type: string;
  neighbors: string[];
  // 추가 중심성 메트릭
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
  totalConnections: number;
  density: number;
  averageClustering: number;
  communitiesCount: number;
  averageCentrality: number;
  isolationRiskCount: number;
  popularStudentsCount: number;
}

export interface Community {
  id: number;
  members: string[];
  size: number;
  cohesion: number;
}

export interface CentralityMetrics {
  degree: number;
  betweenness: number;
  closeness: number;
  eigenvector: number;
  centrality: number; // 통합 중심성 점수
}

export interface RiskLevel {
  level: 'low' | 'medium' | 'high';
  score: number;
  description: string;
}

export interface InfluenceLevel {
  level: 'low' | 'medium' | 'high';
  score: number;
  description: string;
}

export interface IndividualRecommendations {
  immediate_actions: string[];
  short_term_goals: string[];
  long_term_goals: string[];
  monitoring_points: string[];
  intervention_level: 'none' | 'low' | 'medium' | 'high';
}

export interface GlobalRecommendations {
  class_improvements: string[];
  school_wide_actions: string[];
  monitoring_strategies: string[];
  intervention_priorities: string[];
}

export interface CompleteAnalysisResult {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: NetworkMetrics;
  communities: Community[];
  recommendations: GlobalRecommendations;
  analysisMetadata: {
    surveyId: string;
    analysisDate: Date;
    totalStudents: number;
    totalRelationships: number;
    analysisVersion: string;
  };
}

export interface ClassAnalysisResult {
  classNumber: string;
  students: NetworkNode[];
  networkData: {
    nodes: NetworkNode[];
    edges: NetworkEdge[];
  };
  classMetrics: {
    averageCentrality: number;
    networkDensity: number;
    averageClustering: number;
    communitiesCount: number;
    isolationRiskStudents: NetworkNode[];
    popularStudents: NetworkNode[];
    communityStructure: Community[];
  };
  recommendations: {
    class_improvements: string[];
    individual_interventions: string[];
    monitoring_points: string[];
  };
}

export interface IndividualAnalysisResult {
  student: NetworkNode;
  centralityMetrics: CentralityMetrics;
  communityMembership: number;
  isolationRisk: RiskLevel;
  socialInfluence: InfluenceLevel;
  recommendations: IndividualRecommendations;
  networkPosition: {
    isCenter: boolean;
    isIsolated: boolean;
    isBridge: boolean;
    isPeripheral: boolean;
  };
}

export interface UnifiedNetworkData {
  // 전체 네트워크 정보
  completeAnalysis: CompleteAnalysisResult;
  
  // 학급별 분석 결과
  classAnalyses: Map<string, ClassAnalysisResult>;
  
  // 개별 학생 분석 결과
  individualAnalyses: Map<string, IndividualAnalysisResult>;
  
  // 메타데이터
  lastUpdated: Date;
  surveyId: string;
  analysisVersion: string;
  cacheExpiry: Date;
}

export interface AnalysisCache {
  data: UnifiedNetworkData;
  isStale: boolean;
  lastRefresh: Date;
}

// 분석 요청 타입
export interface AnalysisRequest {
  surveyId: string;
  analysisType: 'complete' | 'class' | 'individual';
  targetId?: string; // classNumber 또는 studentId
  forceRefresh?: boolean;
}

// 분석 응답 타입
export interface AnalysisResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata: {
    analysisDate: Date;
    processingTime: number;
    cacheHit: boolean;
  };
}
