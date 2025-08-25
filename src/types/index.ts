// 네비게이션 관련 타입
export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  isActive?: boolean;
  hasDropdown?: boolean;
  children?: NavigationItem[];
  icon?: string;
}

export interface HeaderProps {
  logo: string;
  navigationItems: NavigationItem[];
  currentUser?: User;
}

export interface HeroSectionProps {
  title: string;
  backgroundImage: string;
  ctaButtonText: string;
  onCtaClick: () => void;
}

// 학교 및 교육청 관리 타입
export interface District {
  id: string;
  name: string;
  code: string;
  region: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface School {
  id: string;
  districtId: string;
  schoolCode: string;
  name: string;
  type: 'elementary' | 'middle' | 'high' | 'special';
  address: string;
  contactInfo: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface User {
  id: string;
  lifelongEducationId?: string; // 영구 교육 식별자
  schoolId: string; // 기존 호환성을 위한 필드
  school_id?: string; // Supabase users 테이블의 실제 컬럼명
  name: string;
  email: string;
  phone: string;
  role: 'main_admin' | 'district_admin' | 'school_admin' | 'grade_teacher' | 'homeroom_teacher';
  permissions: string[];
  grade?: string;
  class?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// 학생 관리 타입
export interface Student {
  id: string;
  lifelongEducationId: string; // 영구 교육 식별자
  currentSchoolId: string;
  studentNumber: string;
  name: string;
  birthDate: Date;
  gender: 'male' | 'female';
  grade: string;
  class: string;
  parentContact: {
    fatherName?: string;
    fatherPhone?: string;
    motherName?: string;
    motherPhone?: string;
    guardianName?: string;
    guardianPhone?: string;
    email?: string;
  };
  enrolledAt: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface StudentSchoolHistory {
  id: string;
  lifelongEducationId: string;
  schoolId: string;
  grade: string;
  class: string;
  startDate: Date;
  endDate?: Date;
  transferType: 'enrollment' | 'transfer_in' | 'transfer_out' | 'graduation';
  additionalInfo?: Record<string, any>;
}

// 교우관계 분석 타입
export interface FriendshipData {
  id: string;
  surveyResponseId: string;
  studentId: string; // 응답자
  friendId: string; // 언급된 친구
  relationshipType: 'best_friend' | 'close_friend' | 'classmate' | 'avoid';
  relationshipStrength: number; // 1-5 척도
  reason?: string;
  recordedAt: Date;
}

export interface NetworkAnalysisResult {
  id: string;
  surveyId: string;
  studentId: string;
  centralityMetrics: {
    degree: number;
    betweenness: number;
    closeness: number;
    eigenvector: number;
  };
  communityDetection: {
    clusterId: number;
    clusterSize: number;
    clusterRole: 'leader' | 'member' | 'bridge';
  };
  isolationScore: number; // 0-1 척도
  socialStatus: {
    popularity: number;
    influence: number;
    risk: 'low' | 'medium' | 'high';
  };
  analyzedAt: Date;
  analysisVersion: string;
}

// 개별 학생 추적 관리
export interface InterventionLog {
  id: string;
  studentId: string;
  teacherId: string;
  interventionType: 'counseling' | 'group_activity' | 'parent_meeting' | 'peer_mediation';
  description: string;
  goal: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  startDate: Date;
  targetCompletionDate: Date;
  actualCompletionDate?: Date;
  outcomeMetrics?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherMemo {
  id: string;
  studentId: string;
  teacherId: string;
  memoContent: string;
  memoType: 'observation' | 'concern' | 'achievement' | 'general';
  visibility: 'private' | 'school_staff' | 'transferable';
  createdAt: Date;
  updatedAt: Date;
}

// 데이터 이관 관리
export interface DataTransferRequest {
  id: string;
  studentLifelongId: string;
  fromSchoolId: string;
  toSchoolId: string;
  requestedBy: string;
  status: 'pending' | 'parent_consent_required' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  transferScope: {
    friendshipData: boolean;
    analysisResults: boolean;
    interventionLogs: boolean;
    teacherMemos: boolean;
  };
  requestedAt: Date;
  parentConsentAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface ParentConsent {
  id: string;
  transferRequestId: string;
  parentName: string;
  parentContact: string;
  consentStatus: 'pending' | 'approved' | 'rejected';
  consentedDataTypes: string[];
  digitalSignature: string;
  consentGivenAt?: Date;
  ipAddress: string;
  legalDocumentation: Record<string, any>;
}

// LLM 분석 결과
export interface LLMAnalysisResult {
  id: string;
  studentId: string;
  surveyId: string;
  analysisContent: string;
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  riskFactors: {
    social: string[];
    emotional: string[];
    academic: string[];
  };
  strengths: string[];
  analysisType: 'individual' | 'comparative' | 'longitudinal';
  generatedAt: Date;
  modelVersion: string;
}

// 설문 관련 타입
export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  organizationType: 'military' | 'school' | 'company';
  questions: SurveyQuestion[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyQuestion {
  id: string;
  type: 'relationship' | 'rating' | 'multiple_choice' | 'text';
  question: string;
  options?: string[];
  required: boolean;
  order: number;
  targetField?: string; // 관계 질문의 경우 대상 필드 (예: 'colleagues', 'subordinates')
}

export interface Survey {
  id: string;
  templateId: string;
  organizationId: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  startDate: Date;
  endDate: Date;
  respondents: string[]; // Respondent IDs
  responseRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  respondentId: string;
  answers: SurveyAnswer[];
  submittedAt: Date;
  duration?: number; // 응답 소요 시간 (초)
}

export interface SurveyAnswer {
  questionId: string;
  answer: string | number | string[];
  targetPersonId?: string; // 관계 질문의 경우 대상자 ID
}

// 네트워크 분석 타입
export interface NetworkNode {
  id: string;
  name: string;
  department?: string;
  position?: string;
  grade?: string;
  centrality?: number;
  cluster?: number;
  isIsolated?: boolean;
  attributes?: Record<string, any>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  relationshipType?: string;
  attributes?: Record<string, any>;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: {
    totalNodes: number;
    totalEdges: number;
    averageDegree: number;
    density: number;
    clusters: number;
    isolatedNodes: number;
  };
}

// 통계 및 분석 타입
export interface SurveyStatistics {
  totalRespondents: number;
  completedResponses: number;
  responseRate: number;
  averageResponseTime: number;
  departmentStats: DepartmentStat[];
  questionStats: QuestionStat[];
}

export interface DepartmentStat {
  department: string;
  totalMembers: number;
  responseRate: number;
  averageScore: number;
}

export interface QuestionStat {
  questionId: string;
  question: string;
  averageScore: number;
  minScore: number;
  maxScore: number;
  standardDeviation: number;
  responseCount: number;
}

// 대시보드 및 모니터링 타입
export interface DashboardData {
  surveyOverview: SurveyOverview;
  responseTrends: ResponseTrend[];
  networkMetrics: NetworkMetrics;
  alerts: Alert[];
}

export interface SurveyOverview {
  activeSurveys: number;
  totalResponses: number;
  averageResponseRate: number;
  pendingReminders: number;
}

export interface ResponseTrend {
  date: Date;
  responses: number;
  cumulativeResponses: number;
}

export interface NetworkMetrics {
  totalConnections: number;
  averageCentrality: number;
  isolatedIndividuals: number;
  highCentralityIndividuals: number;
  clusterCount: number;
}

export interface Alert {
  id: string;
  type: 'low_response_rate' | 'isolated_individual' | 'high_conflict' | 'survey_expiring';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  isRead: boolean;
  actionRequired: boolean;
}

// UI 컴포넌트 타입
export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface FilterOptions {
  departments?: string[];
  positions?: string[];
  grades?: string[];
  responseStatus?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// API 응답 타입
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 