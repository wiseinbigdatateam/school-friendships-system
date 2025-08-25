const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export interface StudentAnalysisData {
  studentName: string;
  grade: number;
  class: number;
  centrality: number;
  community: number;
  totalRelationships: number;
  isolationRisk: string;
  friendshipDevelopment: string;
  communityIntegration: string;
  personalSummary?: any;
}

export interface GeneratedReport {
  summary: string;
  currentStatus: string;
  riskAssessment: string;
  guidancePlan: string;
  specificActions: string[];
  monitoringPoints: string[];
  expectedOutcomes: string[];
}

export const generateStudentGuidanceReport = async (
  analysisData: StudentAnalysisData
): Promise<GeneratedReport> => {
  try {
    const prompt = `
다음은 중학생의 교우관계 네트워크 분석 결과입니다. 
이를 바탕으로 담임교사가 활용할 수 있는 상세한 지도 리포트를 생성해주세요.

[학생 정보]
- 이름: ${analysisData.studentName}
- 학년/반: ${analysisData.grade}학년 ${analysisData.class}반

[네트워크 분석 결과]
- 중심성 점수: ${(analysisData.centrality * 100).toFixed(1)}%
- 소속 커뮤니티: ${analysisData.community + 1}번 그룹
- 총 친구 관계 수: ${analysisData.totalRelationships}명
- 고립 위험도: ${analysisData.isolationRisk}
- 친구 관계 발전: ${analysisData.friendshipDevelopment}
- 커뮤니티 통합: ${analysisData.communityIntegration}

[요청사항]
다음 형식으로 JSON 형태의 지도 리포트를 생성해주세요:

{
  "summary": "학생의 전반적인 교우관계 상황을 2-3문장으로 요약",
  "currentStatus": "현재 네트워크 위치와 상황을 구체적으로 분석",
  "riskAssessment": "잠재적 위험 요소와 주의가 필요한 부분을 분석",
  "guidancePlan": "전반적인 지도 방향과 접근 방법을 제시",
  "specificActions": [
    "구체적인 지도 행동 1",
    "구체적인 지도 행동 2",
    "구체적인 지도 행동 3"
  ],
  "monitoringPoints": [
    "지속적으로 모니터링해야 할 포인트 1",
    "지속적으로 모니터링해야 할 포인트 2",
    "지속적으로 모니터링해야 할 포인트 3"
  ],
  "expectedOutcomes": [
    "기대되는 변화와 성과 1",
    "기대되는 변화와 성과 2",
    "기대되는 변화와 성과 3"
  ]
}

중요: 반드시 JSON 형태로만 응답하고, 다른 설명이나 텍스트는 포함하지 마세요.
`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 교육 전문가이자 학생 상담 전문가입니다. 교우관계 분석 결과를 바탕으로 구체적이고 실용적인 지도 방안을 제시합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('API 응답에서 내용을 찾을 수 없습니다.');
    }

    // JSON 파싱
    try {
      const report = JSON.parse(content);
      return report as GeneratedReport;
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      throw new Error('생성된 리포트 형식이 올바르지 않습니다.');
    }

  } catch (error) {
    console.error('ChatGPT API 호출 오류:', error);
    throw error;
  }
};

// 간단한 리포트 생성 (API 실패 시 대체)
export const generateFallbackReport = (
  analysisData: StudentAnalysisData
): GeneratedReport => {
  const centrality = analysisData.centrality;
  
  let summary = '';
  let guidancePlan = '';
  
  if (centrality < 0.3) {
    summary = `${analysisData.studentName} 학생은 교우관계에서 주변부에 위치하고 있어 친구 관계 확장이 필요한 상황입니다.`;
    guidancePlan = '친구 관계를 발전시키고 그룹 활동에 적극 참여할 수 있도록 지도합니다.';
  } else if (centrality < 0.6) {
    summary = `${analysisData.studentName} 학생은 적절한 교우관계를 유지하고 있으나, 더 다양한 친구들과의 교류가 필요합니다.`;
    guidancePlan = '현재 친구 관계를 유지하면서 네트워크를 확장할 수 있도록 지원합니다.';
  } else {
    summary = `${analysisData.studentName} 학생은 교우관계에서 중심적인 역할을 하고 있어, 다른 학생들의 롤모델이 될 수 있습니다.`;
    guidancePlan = '우수한 네트워크를 유지하면서 새로운 학생들과의 친교를 도울 수 있도록 격려합니다.';
  }

  return {
    summary,
    currentStatus: `중심성 ${(centrality * 100).toFixed(1)}%로 ${centrality < 0.3 ? '주변부' : centrality < 0.6 ? '중간' : '중심부'}에 위치`,
    riskAssessment: centrality < 0.3 ? '고립 위험이 높아 지속적인 관찰과 개입이 필요합니다.' : '현재는 안정적인 상태를 유지하고 있습니다.',
    guidancePlan,
    specificActions: [
      '정기적인 1:1 상담을 통한 교우관계 상태 파악',
      '그룹 활동 참여를 통한 새로운 친구 관계 형성 지원',
      '부모와의 협력을 통한 가정에서의 교우관계 개선'
    ],
    monitoringPoints: [
      '수업 시간과 쉬는 시간의 교우관계 변화',
      '그룹 활동 참여도와 적극성',
      '새로운 친구들과의 상호작용'
    ],
    expectedOutcomes: [
      '친구 관계 수의 증가',
      '그룹 활동 참여도 향상',
      '학교생활 만족도 증대'
    ]
  };
};
