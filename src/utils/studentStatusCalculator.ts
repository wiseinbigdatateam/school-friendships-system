/**
 * 학생 상태 계산 유틸리티
 * 
 * 네트워크 분석 데이터를 기반으로 학생의 현재 상태를 계산합니다.
 * 하드코딩된 조건을 중앙화하여 일관성 있는 분석을 제공합니다.
 */

export interface StudentMetrics {
  centrality: number;           // 중심성 점수 (0-1)
  friendCount: number;          // 친구 수
  networkDensity: number;       // 네트워크 밀도 (0-1)
  isolationRisk: string;        // 고립 위험도 (높음/보통/낮음)
  socialInfluence: string;      // 사회적 영향력 (높음/보통/낮음)
  totalStudents: number;        // 전체 학생 수
  communityId?: number;         // 커뮤니티 ID
}

export interface CurrentStatus {
  schoolSatisfaction: string;   // 학교생활 만족도
  teacherRelationship: string;  // 교사와의 관계
  peerRelationship: string;     // 또래 관계
  networkParticipation: string; // 네트워크 참여도
}

export interface NetworkStability {
  centralityScore: number;
  friendCount: number;
  networkDensity: number;
  groupDistribution: string;
  isolationRisk: string;
}

export interface RecommendationPlan {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  interventionLevel: string;
}

export interface MonitoringPoints {
  points: string[];
}

/**
 * 현재 상태 계산
 */
export const calculateCurrentStatus = (metrics: StudentMetrics): CurrentStatus => {
  // 1. 학교생활 만족도
  // - 네트워크 밀도와 사회적 영향력 기반
  // - 높은 밀도 + 높은 영향력 = 매우 높음
  const schoolSatisfaction = (() => {
    if (metrics.networkDensity > 0.6 && metrics.socialInfluence === "높음") {
      return "매우 높음";
    }
    if (metrics.networkDensity > 0.3 || metrics.socialInfluence === "보통") {
      return "높음";
    }
    if (metrics.networkDensity > 0.15 || metrics.socialInfluence !== "낮음") {
      return "보통";
    }
    return "낮음";
  })();

  // 2. 교사와의 관계
  // - 중심성 점수와 고립 위험도 기반
  // - 높은 중심성 + 낮은 고립 위험 = 매우 좋음
  const teacherRelationship = (() => {
    if (metrics.centrality > 0.6 && metrics.isolationRisk === "낮음") {
      return "매우 좋음";
    }
    if (metrics.centrality > 0.3 && metrics.isolationRisk !== "높음") {
      return "좋음";
    }
    if (metrics.centrality > 0.15) {
      return "보통";
    }
    return "관심 필요";
  })();

  // 3. 또래 관계
  // - 친구 수와 네트워크 밀도 기반
  // - 전체 학생 수 대비 비율 고려
  const peerRelationship = (() => {
    const friendRatio = metrics.friendCount / Math.max(metrics.totalStudents - 1, 1);
    
    if (metrics.friendCount >= 5 && friendRatio > 0.3) {
      return "매우 활발";
    }
    if (metrics.friendCount >= 3 && friendRatio > 0.2) {
      return "활발";
    }
    if (metrics.friendCount >= 1 && friendRatio > 0.1) {
      return "보통";
    }
    if (metrics.friendCount >= 1) {
      return "제한적";
    }
    return "고립";
  })();

  // 4. 네트워크 참여도
  // - 중심성 점수 기반
  const networkParticipation = (() => {
    if (metrics.centrality >= 0.7) return "매우 높음";
    if (metrics.centrality >= 0.4) return "높음";
    if (metrics.centrality >= 0.3) return "보통";
    if (metrics.centrality >= 0.15) return "낮음";
    return "매우 낮음";
  })();

  return {
    schoolSatisfaction,
    teacherRelationship,
    peerRelationship,
    networkParticipation,
  };
};

/**
 * 네트워크 안정성 계산
 */
export const calculateNetworkStability = (
  metrics: StudentMetrics,
  connectedStudentsCount: number
): NetworkStability => {
  const groupDistribution = connectedStudentsCount > 0
    ? `연결된 ${connectedStudentsCount}명${metrics.communityId !== undefined ? ` (커뮤니티 ${metrics.communityId})` : ""}`
    : "연결된 학생 없음";

  return {
    centralityScore: metrics.centrality,
    friendCount: metrics.friendCount,
    networkDensity: metrics.networkDensity,
    groupDistribution,
    isolationRisk: metrics.isolationRisk,
  };
};

/**
 * 개선방안 생성 (Python 분석 결과가 없을 때)
 */
export const generateRecommendationPlan = (metrics: StudentMetrics): RecommendationPlan => {
  const immediate: string[] = [];
  const shortTerm: string[] = [];
  const longTerm: string[] = [];
  let interventionLevel = "관찰";

  // 고립 위험도에 따른 즉시 조치
  if (metrics.isolationRisk === "높음") {
    interventionLevel = "긴급";
    immediate.push("담임교사 1:1 상담 진행");
    immediate.push("또래 멘토링 프로그램 배정");
    immediate.push("학급 내 역할 부여 (청소, 심부름 등)");
  } else if (metrics.isolationRisk === "보통") {
    interventionLevel = "주의";
    immediate.push("그룹 활동 참여 독려");
    immediate.push("관심사 기반 동아리 활동 권장");
  } else {
    immediate.push("현재 관계 유지 및 강화");
    immediate.push("리더십 역할 기회 제공");
  }

  // 친구 수에 따른 단기 목표
  if (metrics.friendCount < 3) {
    shortTerm.push("한 달 내 최소 2명 이상의 새로운 친구 관계 형성");
    shortTerm.push("주 2-3회 그룹 활동 참여");
    shortTerm.push("점심시간 혼자 먹지 않도록 지원");
  } else if (metrics.friendCount < 5) {
    shortTerm.push("친구 관계의 질적 향상 도모");
    shortTerm.push("다양한 그룹과의 교류 확대");
  } else {
    shortTerm.push("리더십 기술 개발");
    shortTerm.push("또래 중재자 역할 수행");
  }

  // 중심성에 따른 장기 목표
  if (metrics.centrality < 0.3) {
    longTerm.push("학급 내 긍정적 영향력 확대 (3-6개월)");
    longTerm.push("자신감 향상 프로그램 참여");
    longTerm.push("사회성 기술 훈련");
  } else if (metrics.centrality < 0.6) {
    longTerm.push("학급 대표성 역할 수행");
    longTerm.push("교내 활동 주도적 참여");
  } else {
    longTerm.push("학생회 활동 또는 학급 임원 역할");
    longTerm.push("멘토링 프로그램 멘토로 활동");
  }

  return {
    immediate,
    shortTerm,
    longTerm,
    interventionLevel,
  };
};

/**
 * 모니터링 포인트 생성 (Python 분석 결과가 없을 때)
 */
export const generateMonitoringPoints = (metrics: StudentMetrics): MonitoringPoints => {
  const points: string[] = [];

  // 고립 위험도에 따른 모니터링
  if (metrics.isolationRisk === "높음") {
    points.push("주간 상담 및 관계 개선 상황 점검");
    points.push("정서적 안정성 및 학교 적응도 평가");
  } else {
    points.push("월간 네트워크 변화 추이 모니터링");
    points.push("학업 성취도와 사회적 관계의 균형 평가");
  }

  // 친구 수에 따른 모니터링
  if (metrics.friendCount < 3) {
    points.push("새로운 친구 관계 형성 여부 확인");
    points.push("그룹 활동 참여 빈도 추적");
  } else {
    points.push("기존 관계의 질적 향상 여부 확인");
    points.push("다양한 그룹과의 교류 확대 여부 점검");
  }

  // 중심성에 따른 모니터링
  if (metrics.centrality < 0.4) {
    points.push("사회적 참여도 및 활동 참여 빈도 점검");
    points.push("자신감 및 자존감 변화 관찰");
  } else {
    points.push("리더십 발휘 기회 및 역할 수행 평가");
    points.push("긍정적 영향력 확대 여부 모니터링");
  }

  return { points };
};

/**
 * 위험 수준 평가
 */
export const assessRiskLevel = (metrics: StudentMetrics): {
  level: "긴급" | "주의" | "관찰" | "양호";
  description: string;
} => {
  // 복합적 위험 평가
  const riskScore = 
    (metrics.isolationRisk === "높음" ? 3 : metrics.isolationRisk === "보통" ? 1 : 0) +
    (metrics.friendCount === 0 ? 3 : metrics.friendCount < 2 ? 2 : 0) +
    (metrics.centrality < 0.15 ? 2 : metrics.centrality < 0.3 ? 1 : 0) +
    (metrics.networkDensity < 0.2 ? 1 : 0);

  if (riskScore >= 6) {
    return {
      level: "긴급",
      description: "즉각적인 개입과 지원이 필요한 상태입니다. 담임교사 및 상담교사와의 협력이 시급합니다.",
    };
  }
  if (riskScore >= 4) {
    return {
      level: "주의",
      description: "면밀한 관찰과 적절한 개입이 필요한 상태입니다. 정기적인 모니터링을 권장합니다.",
    };
  }
  if (riskScore >= 2) {
    return {
      level: "관찰",
      description: "일반적인 수준의 관심과 지원이 필요합니다. 예방적 차원의 활동을 권장합니다.",
    };
  }
  return {
    level: "양호",
    description: "안정적인 교우 관계를 유지하고 있습니다. 현재 상태를 유지하도록 지원합니다.",
  };
};

