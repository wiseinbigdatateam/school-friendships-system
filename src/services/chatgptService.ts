const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// API 사용량 추적 (로컬 스토리지에 저장)
const STORAGE_KEY = 'openai_usage_count';
const STORAGE_DATE_KEY = 'openai_usage_date';

export const getApiUsageCount = () => {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem(STORAGE_DATE_KEY);
  
  // 날짜가 바뀌었으면 카운트 리셋
  if (storedDate !== today) {
    localStorage.setItem(STORAGE_KEY, '0');
    localStorage.setItem(STORAGE_DATE_KEY, today);
    return 0;
  }
  
  return parseInt(localStorage.getItem(STORAGE_KEY) || '0');
};

export const incrementApiUsageCount = () => {
  const currentCount = getApiUsageCount();
  const newCount = currentCount + 1;
  localStorage.setItem(STORAGE_KEY, newCount.toString());
  return newCount;
};

export const resetApiUsageCount = () => {
  localStorage.setItem(STORAGE_KEY, '0');
  localStorage.setItem(STORAGE_DATE_KEY, new Date().toDateString());
};

export const checkApiUsageLimit = () => {
  const MAX_DAILY_USAGE = 50; // 일일 최대 사용량 설정
  const currentUsage = getApiUsageCount();
  if (currentUsage >= MAX_DAILY_USAGE) {
    throw new Error(`일일 API 사용량 한도에 도달했습니다. (${currentUsage}/${MAX_DAILY_USAGE}) 내일 다시 시도해주세요.`);
  }
};

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
  satisfaction?: number; // 학교생활 만족도 (0-1)
  violenceExperience?: number; // 폭력 경험도 (0-1)
  personalSummary?: any;
}

export interface GeneratedReport {
  // 종합진단
  comprehensiveDiagnosis: {
    studentType: string;
    summary: string;
    keyCharacteristics: string[];
    challenges: string[];
  };
  
  // 세부 분석
  detailedAnalysis: {
    schoolLifeSatisfaction: {
      surveyResults: {
        question: string;
        answer: string;
      }[];
      analysis: string;
    };
    violenceExperience: {
      surveyResults: {
        question: string;
        answer: string;
      }[];
      analysis: string;
    };
    peerNetworkAnalysis: {
      receivedChoices: number;
      madeChoices: number;
      networkPosition: string;
      analysis: string;
    };
  };
  
  // 강점 및 개선 영역
  strengthsAndImprovements: {
    strengths: {
      title: string;
      description: string;
    }[];
    improvementAreas: {
      title: string;
      description: string;
    }[];
  };
  
  // 맞춤 솔루션 및 제안
  customizedSolutions: {
    overallGoal: string;
    shortTermSolutions: {
      title: string;
      description: string;
    }[];
    midTermSolutions: {
      title: string;
      description: string;
    }[];
    longTermSolutions: {
      title: string;
      description: string;
    }[];
  };
  
  // 기존 필드들 (호환성을 위해 유지)
  summary?: string;
  currentStatus?: string | {
    schoolLifeSatisfaction?: string;
    relationshipWithTeacher?: string;
    peerRelationship?: string;
    networkParticipation?: string;
    schoolSatisfaction?: string;
    teacherRelationship?: string;
  };
  riskAssessment?: string | {
    overall?: string;
    strengths?: string;
    concerns?: string;
    recommendations?: string;
  };
  guidancePlan?: string;
  specificActions?: string[];
  monitoringPoints?: string[];
  expectedOutcomes?: string[];
  individualSummary?: {
    studentType: string;
    currentStatus: {
      schoolSatisfaction: string;
      teacherRelationship: string;
      peerRelationship: string;
      networkParticipation: string;
    };
    networkStability: {
      centralityScore: string;
      friendCount: string;
      networkDensity: string;
      groupDistribution: string;
      isolationRisk: string;
    };
    improvementPlan: {
      shortTerm: string[];
      longTerm: string[];
    };
    monitoringPoints: {
      frequency: string;
      focus: string;
      keyAreas: string[];
    };
  };
}

export const generateStudentGuidanceReport = async (
  analysisData: StudentAnalysisData,
  additionalSurveyData?: any
): Promise<GeneratedReport> => {
  // API 키가 없으면 대체 리포트 생성
  if (!OPENAI_API_KEY) {
    return generateFallbackReport(analysisData);
  }

  try {
    const prompt = `
당신은 교육심리학 전문가이자 학생 상담 전문가입니다. 교우관계 네트워크 분석 결과를 바탕으로 매우 상세하고 전문적인 지도 리포트를 생성해주세요.

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
- 학교생활 만족도: ${((analysisData.satisfaction || 0) * 100).toFixed(1)}% (${(analysisData.satisfaction || 0) >= 0.7 ? '높음' : (analysisData.satisfaction || 0) >= 0.4 ? '보통' : '낮음'})
- 폭력 경험도: ${((analysisData.violenceExperience || 0) * 100).toFixed(1)}% (${(analysisData.violenceExperience || 0) >= 0.7 ? '높음' : (analysisData.violenceExperience || 0) >= 0.4 ? '보통' : '낮음'})

${additionalSurveyData ? `
[추가 설문 데이터]
${JSON.stringify(additionalSurveyData, null, 2)}
` : ''}

[설문 내용 안내]
종합조사 설문은 다음과 같은 9개 문항으로 구성됩니다:

1. 교우관계 조사 (1문항):
   Q1. 최근 한달 동안 가장 많이 함께 한 친구들을 학생이름으로 적어주세요 (최대 3명)
   
2. 학교생활 만족도 조사 (4문항):
   Q2. 쉬는 시간에 친구들과 잘 논다
   Q3. 수업 시간에 즐겁게 참여한다
   Q4. 학교에 오고 싶다는 생각이 든다
   Q5. 선생님과 이야기하는 것이 편하다
   (응답: 예 / 아니오)
   
3. 학교폭력 경험도 조사 (3문항):
   Q6. 친구들이 나를 때리거나 발로 차거나 밀치는 행동을 한 적이 있나요?
   Q7. 친구들이 나에게 욕을 하거나 놀린 적이 있나요?
   Q8. 친구들이 나를 따돌리거나 괴롭힌 적이 있나요?
   (응답: 전혀 없다 / 한 두번 당한 적 있다 / 자주 있다)
   
4. 주관식 (1문항):
   Q9. 학교생활에서 가장 힘든 점이나 바라는 점을 자유롭게 적어주세요

분석 시 이 설문 구조를 고려하여 학생의 교우관계, 학교생활 만족도, 폭력 경험을 종합적으로 평가해야 합니다.

[분석 기준]
교우관계 유형 분류 (연결 수 기준):
- 연결 수 0개: 외톨이형 (네트워크 외곽부)
- 연결 수 1-2개: 소수 친구 학생 (네트워크 주변부)
- 연결 수 3-5개: 평균적인 학생 (네트워크 중간부)
- 연결 수 6-8개: 친구 많은 학생 (네트워크 중심부)
- 연결 수 9개 이상: 사교 스타 (네트워크 핵심부)

만족도와 폭력 경험도 종합 고려사항:
- 학교생활 만족도가 낮은 경우: 학교생활 부적응, 학습 동기 저하, 우울감 등의 위험
- 폭력 경험도가 높은 경우: 가해자/피해자 위험, 학교폭력 예방 교육 필요
- 교우관계 유형과 만족도/폭력 경험도를 종합하여 맞춤형 지도 방안 제시 필요

[요청사항]
다음과 같이 매우 상세하고 전문적인 JSON 형태의 지도 리포트를 생성해주세요. 첨부된 파일 형태를 참고하여 다음 구조로 작성해주세요:

{
  "comprehensiveDiagnosis": {
    "studentType": "주도형",
    "summary": "${analysisData.studentName} 학생은 교우관계 네트워크의 중심에 위치한 '주도형' 학생입니다. 뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인 영향을 미치고 있으며, 이는 학급 전체에 활기를 불어넣는 중요한 강점입니다. 하지만 선생님과의 관계를 다소 불편하게 느끼고, 스스로 참여를 결정하는 활동 외에는 소극적인 모습을 보입니다. 이는 리더 역할의 부담감이나, 수직적인 관계에 대한 심리적 저항감에서 비롯될 수 있으므로, 학생의 영향력을 긍정적으로 이끌어주기 위한 지원이 필요합니다.",
    "keyCharacteristics": [
      "뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인 영향을 미치고 있음",
      "학급 전체에 활기를 불어넣는 중요한 역할을 수행함"
    ],
    "challenges": [
      "선생님과의 관계를 다소 불편하게 느끼고 있음",
      "스스로 참여를 결정하는 활동 외에는 소극적인 모습을 보임",
      "리더 역할의 부담감이나 수직적인 관계에 대한 심리적 저항감"
    ]
  },
  "detailedAnalysis": {
    "schoolLifeSatisfaction": {
      "surveyResults": [
        {"question": "Q2. 쉬는 시간에 친구들과 잘 논다", "answer": "예"},
        {"question": "Q3. 수업 시간에 즐겁게 참여한다", "answer": "예"},
        {"question": "Q4. 학교에 오고 싶다는 생각이 든다", "answer": "예"},
        {"question": "Q5. 선생님과 이야기하는 것이 편하다", "answer": "아니오"}
      ],
      "analysis": "친구 관계에 대한 긍정 응답과 달리, 교사와의 관계에는 부정적으로 답했습니다. 이는 자신이 주도하지 않는 관계에는 큰 흥미를 느끼지 못하는 성향을 시사합니다."
    },
    "violenceExperience": {
      "surveyResults": [
        {"question": "Q6. 친구들이 나를 때리거나 발로 차거나 밀치는 행동을 한 적이 있나요?", "answer": "전혀 없다"},
        {"question": "Q7. 친구들이 나에게 욕을 하거나 놀린 적이 있나요?", "answer": "한 두번 당한 적 있다"},
        {"question": "Q8. 친구들이 나를 따돌리거나 괴롭힌 적이 있나요?", "answer": "전혀 없다"}
      ],
      "analysis": "신체적 폭력이나 따돌림은 경험하지 않았으나, 언어적 괴롭힘을 경험한 것으로 나타나 주의 깊은 관찰이 필요합니다."
    },
    "peerNetworkAnalysis": {
      "receivedChoices": ${analysisData.totalRelationships},
      "madeChoices": ${Math.max(1, analysisData.totalRelationships - 1)},
      "networkPosition": "사교 스타",
      "analysis": "다수의 학생으로부터 선택을 받아 관계망의 중심에 있으며, 본인 역시 여러 친구들과 상호작용하며 네트워크 허브 역할을 하고 있습니다. 학급 내 여론 형성이나 분위기를 주도하는 핵심적인 인물입니다."
    }
  },
  "strengthsAndImprovements": {
    "strengths": [
      {
        "title": "뛰어난 사회성 및 리더십",
        "description": "많은 친구들에게 신뢰와 인기를 얻고 있어 관계의 중심 역할을 합니다."
      },
      {
        "title": "긍정적 또래 영향력",
        "description": "학생의 즐거운 학교생활 태도는 주변 친구들에게도 긍정적인 영향을 미칠 수 있습니다."
      }
    ],
    "improvementAreas": [
      {
        "title": "권위와의 관계 설정",
        "description": "교사와의 관계를 불편하게 여겨, 지도나 조언을 받아들이는 데 어려움을 겪을 수 있습니다."
      },
      {
        "title": "역할에 대한 부담감",
        "description": "네트워크의 중심에 있다는 사실이 때로는 압박감이나 과도한 책임감으로 작용할 수 있습니다."
      },
      {
        "title": "선택적 참여",
        "description": "자신이 흥미를 느끼거나 주도하는 활동에만 참여하려는 경향이 있어, 다양한 경험의 기회를 놓칠 수 있습니다."
      }
    ]
  },
  "customizedSolutions": {
    "overallGoal": "${analysisData.studentName} 학생의 뛰어난 리더십을 긍정적으로 발휘하도록 돕고, 모든 관계에서 건강한 상호작용을 배울 수 있도록 지원해야 합니다.",
    "shortTermSolutions": [
      {
        "title": "역할 부여 및 책임감 강화",
        "description": "학급 내에서 학생의 리더십을 공식적으로 인정해 주는 역할(예: 모둠 리더, 프로젝트 팀장)을 맡겨 긍정적인 방향으로 영향력을 발휘하도록 합니다."
      },
      {
        "title": "수평적 소통 시도",
        "description": "지시나 지도보다는 학생의 의견을 먼저 묻고 존중하는 방식으로 대화하여 교사와의 관계에 대한 심리적 장벽을 낮춥니다."
      }
    ],
    "midTermSolutions": [
      {
        "title": "리더십 멘토링",
        "description": "학생에게 리더의 진정한 의미(타인에 대한 배려, 책임감, 경청 등)에 대해 생각해 볼 기회를 제공하고, 교사가 조력자로서 함께 고민하도록 합니다."
      },
      {
        "title": "새로운 영역으로 관심 확장",
        "description": "학생이 평소에 참여하지 않았던 활동(예: 봉사활동, 특정 주제 탐구)의 중요성을 설명하고, 친구들과 함께 도전해 보도록 제안하여 경험을 넓힙니다."
      }
    ],
    "longTermSolutions": [
      {
        "title": "협력적 문제 해결 능력 강화",
        "description": "학급 전체가 참여하는 프로젝트에서 ${analysisData.studentName} 학생이 주도자 역할뿐만 아니라, 다른 친구의 의견을 듣고 지원하는 조력자 역할도 경험하도록 키웁니다."
      },
      {
        "title": "정기적인 관계 변화 추이 관찰",
        "description": "교우관계 서비스 데이터를 통해 학생의 영향력이 어떻게 변화하는지, 새로운 관계가 형성되는지 등을 지속적으로 모니터링하며 건강한 성장을 지원합니다."
      }
    ]
  }
}

중요: 
1. 반드시 JSON 형태로만 응답하고, 다른 설명이나 텍스트는 포함하지 마세요.
2. 각 항목은 첨부된 파일처럼 매우 구체적이고 상세한 내용으로 작성해주세요.
3. 교육 전문가의 관점에서 전문적이고 실용적인 분석을 제공해주세요.
4. 학생의 이름을 적절히 활용하여 개인화된 내용을 작성해주세요.
5. 중심성 점수에 따라 학생 유형을 정확히 분류하고, 해당 유형에 맞는 맞춤형 분석을 제공해주세요.
6. 반드시 다음 필드들을 모두 포함해야 합니다: comprehensiveDiagnosis, detailedAnalysis, strengthsAndImprovements, customizedSolutions
7. 모든 배열과 객체 필드는 완전히 채워져야 합니다.
`;

    // API 사용량 한도 확인
    checkApiUsageLimit();
    
    // API 호출 (재시도 로직 포함)
    let response: Response;
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount < maxRetries) {
      try {
        response = await fetch(OPENAI_API_URL, {
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

        if (response.status === 429) {
          // Rate limit - 재시도
          if (retryCount >= maxRetries - 1) {
            throw new Error('API 사용량 제한에 도달했습니다. 잠시 후 다시 시도해주세요.');
          }
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 2000 + Math.random() * 1000; // 지수 백오프 + 랜덤 지연
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        if (!response.ok) {
          throw new Error(`OpenAI API 오류: ${response.status}`);
        }

        // API 사용량 증가
        incrementApiUsageCount();
        break; // 성공하면 루프 종료
      } catch (error) {
        if (retryCount >= maxRetries - 1) {
          throw error; // 최대 재시도 횟수 초과
        }
        retryCount++;
        const waitTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    // response가 정의되지 않은 경우 (이론적으로 발생하지 않아야 함)
    if (!response!) {
      throw new Error('API 호출이 실패했습니다.');
    }

    const data = await response.json();
    
    // 응답 데이터 구조 검증
    if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
      console.error('API 응답 구조 오류:', data);
      throw new Error('API 응답 구조가 올바르지 않습니다.');
    }
    
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      console.error('API 응답 내용 없음:', data);
      throw new Error('API 응답에서 내용을 찾을 수 없습니다.');
    }

    // JSON 파싱 - 더 강력한 파싱 로직
    try {
      // JSON 문자열 정리 (불완전한 문자열 제거)
      let cleanedContent = content.trim();
      
      // 마지막 불완전한 문자열 제거
      if (cleanedContent.endsWith('"') && !cleanedContent.endsWith('"}}')) {
        // 마지막 따옴표가 닫히지 않은 경우 제거
        const lastQuoteIndex = cleanedContent.lastIndexOf('"');
        if (lastQuoteIndex > 0) {
          cleanedContent = cleanedContent.substring(0, lastQuoteIndex);
        }
      }
      
      // JSON 구조 완성 시도
      if (!cleanedContent.endsWith('}')) {
        cleanedContent += '}';
      }
      
      const report = JSON.parse(cleanedContent);
      
      // 새로운 구조 검증
      if (!report.comprehensiveDiagnosis) {
        throw new Error('comprehensiveDiagnosis 필드가 누락되었습니다.');
      }
      if (!report.detailedAnalysis) {
        throw new Error('detailedAnalysis 필드가 누락되었습니다.');
      }
      if (!report.strengthsAndImprovements) {
        throw new Error('strengthsAndImprovements 필드가 누락되었습니다.');
      }
      if (!report.customizedSolutions) {
        throw new Error('customizedSolutions 필드가 누락되었습니다.');
      }
      
      // comprehensiveDiagnosis 검증
      if (!report.comprehensiveDiagnosis.studentType) {
        report.comprehensiveDiagnosis.studentType = '일반형';
      }
      if (!report.comprehensiveDiagnosis.summary) {
        report.comprehensiveDiagnosis.summary = '학생의 교우관계를 분석한 결과입니다.';
      }
      if (!Array.isArray(report.comprehensiveDiagnosis.keyCharacteristics)) {
        report.comprehensiveDiagnosis.keyCharacteristics = [];
      }
      if (!Array.isArray(report.comprehensiveDiagnosis.challenges)) {
        report.comprehensiveDiagnosis.challenges = [];
      }
      
      // detailedAnalysis 검증
      if (!report.detailedAnalysis.schoolLifeSatisfaction) {
        report.detailedAnalysis.schoolLifeSatisfaction = {
          surveyResults: [],
          analysis: '설문 결과 분석이 필요합니다.'
        };
      }
      if (!report.detailedAnalysis.peerNetworkAnalysis) {
        report.detailedAnalysis.peerNetworkAnalysis = {
          receivedChoices: 0,
          madeChoices: 0,
          networkPosition: '분석 필요',
          analysis: '네트워크 분석이 필요합니다.'
        };
      }
      
      // strengthsAndImprovements 검증
      if (!Array.isArray(report.strengthsAndImprovements.strengths)) {
        report.strengthsAndImprovements.strengths = [];
      }
      if (!Array.isArray(report.strengthsAndImprovements.improvementAreas)) {
        report.strengthsAndImprovements.improvementAreas = [];
      }
      
      // customizedSolutions 검증
      if (!report.customizedSolutions.overallGoal) {
        report.customizedSolutions.overallGoal = '학생의 전인적 성장을 지원합니다.';
      }
      if (!Array.isArray(report.customizedSolutions.shortTermSolutions)) {
        report.customizedSolutions.shortTermSolutions = [];
      }
      if (!Array.isArray(report.customizedSolutions.midTermSolutions)) {
        report.customizedSolutions.midTermSolutions = [];
      }
      if (!Array.isArray(report.customizedSolutions.longTermSolutions)) {
        report.customizedSolutions.longTermSolutions = [];
      }
      
      return report as GeneratedReport;
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError);
      
      // 더 구체적인 오류 메시지 제공
      if (parseError instanceof Error) {
        throw new Error(`생성된 리포트 형식이 올바르지 않습니다: ${parseError.message}`);
      } else {
        throw new Error('생성된 리포트 형식이 올바르지 않습니다.');
      }
    }

  } catch (error) {
    // 사용자 친화적인 에러 메시지
    if (error instanceof Error) {
      if (error.message.includes('429') || error.message.includes('사용량 제한')) {
        throw new Error('AI 서비스 사용량이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else if (error.message.includes('insufficient_quota') || error.message.includes('quota')) {
        throw new Error('AI 서비스 결제 한도에 도달했습니다. 결제 정보를 확인해주세요.');
      } else if (error.message.includes('401') || error.message.includes('인증')) {
        throw new Error('AI 서비스 인증에 실패했습니다. 관리자에게 문의해주세요.');
      } else if (error.message.includes('500')) {
        throw new Error('AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } else {
        throw new Error(`AI 리포트 생성 중 오류가 발생했습니다: ${error.message}`);
      }
    } else {
      throw new Error('AI 리포트 생성 중 알 수 없는 오류가 발생했습니다.');
    }
  }
};

// 정확한 대체 리포트 생성 (API 실패 시 사용)
export const generateFallbackReport = (
  analysisData: StudentAnalysisData
): GeneratedReport => {
  const centrality = analysisData.centrality;
  const studentName = analysisData.studentName;
  const satisfaction = analysisData.satisfaction || 0;
  const violenceExperience = analysisData.violenceExperience || 0;
  
  // 만족도와 폭력 경험도 반영한 분석
  const satisfactionLevel = satisfaction >= 0.7 ? '높음' : satisfaction >= 0.4 ? '보통' : '낮음';
  const violenceRisk = violenceExperience >= 0.7 ? '높음' : violenceExperience >= 0.4 ? '보통' : '낮음';
  
  let summary = '';
  let currentStatus = '';
  let riskAssessment = '';
  let guidancePlan = '';
  let studentTypeClassification = '';
  
  // 중심성과 만족도, 폭력 경험도를 종합적으로 분석
  const connectionCount = analysisData.totalRelationships;
  
  if (connectionCount === 0) {
    studentTypeClassification = '외톨이형';
    summary = `${studentName} 학생은 교우관계에서 고립된 상태입니다. 연결 수 0개로 네트워크 외곽부에 위치하며, 학교생활 만족도는 ${satisfactionLevel} 수준, 폭력 경험도는 ${violenceRisk} 수준입니다. 친구 관계 형성에 어려움을 겪고 있으며, 즉각적인 개입과 지원이 필요한 상태입니다.`;
    
    currentStatus = `교우관계 네트워크 분석: 연결 수 0개로 네트워크의 외곽부에 위치합니다. 다른 학생들과의 연결이 전혀 없어 고립된 상태입니다. 학교생활 만족도: ${satisfactionLevel} 수준 (${(satisfaction * 100).toFixed(1)}%)으로 ${satisfaction >= 0.5 ? '일부 만족스러운 부분이 있음' : '학교생활에 심각한 어려움을 겪고 있을 가능성'}이 있습니다. 폭력 경험도: ${violenceRisk} 수준 (${(violenceExperience * 100).toFixed(1)}%)으로 ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 위험이 매우 높음' : '고립 상황으로 인한 위험이 높음'}입니다.`;
    
    riskAssessment = `긍정적인 요인: 1. 학교생활 만족도 ${satisfactionLevel} - ${satisfaction >= 0.5 ? '일부 긍정적인 학교생활 경험' : '제한적이지만 긍정적 요소 존재'}가 있습니다. 주의가 필요한 부분: 1. 고립 위험 - 네트워크 외곽부에 위치하여 고립될 위험이 매우 높습니다. 2. 폭력 경험도 ${violenceRisk} - ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 위험이 매우 높아 즉각적인 개입이 필요' : '고립 상황으로 인한 폭력 위험이 높음'}합니다. 3. 사회적 기술 부족 - 친구 관계 형성에 어려움을 겪고 있습니다. 4. 자존감 저하 - 학교생활 부적응 가능성이 높습니다.`;
    
    guidancePlan = '즉각적인 개입을 통해 친구 관계 형성을 지원하고, 사회적 기술 향상을 위한 체계적인 프로그램과 폭력 예방 교육을 통해 안전한 학교생활을 유지할 수 있도록 지원해야 합니다.';
  } else if (connectionCount <= 2) {
    studentTypeClassification = '소수 친구 학생';
    summary = `${studentName} 학생은 교우관계에서 주변부에 위치한 소수 친구 학생입니다. 연결 수 ${connectionCount}개로 네트워크의 주변부에 위치하며, 학교생활 만족도는 ${satisfactionLevel} 수준, 폭력 경험도는 ${violenceRisk} 수준입니다. 소수의 친구들과 깊은 관계를 유지하고 있지만, 전체 네트워크와의 연결이 상대적으로 약한 상태입니다.`;
    
    currentStatus = `교우관계 네트워크 분석: 연결 수 ${connectionCount}개로 네트워크의 주변부에 위치합니다. 소규모 그룹 내에서 안정적인 관계를 유지하고 있습니다. 학교생활 만족도: ${satisfactionLevel} 수준 (${(satisfaction * 100).toFixed(1)}%)으로 ${satisfaction >= 0.5 ? '만족스러운 학교생활' : '학교생활에 어려움을 겪고 있을 가능성'}이 있습니다. 폭력 경험도: ${violenceRisk} 수준 (${(violenceExperience * 100).toFixed(1)}%)으로 ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 위험이 높음' : '상대적으로 안전한 상태'}입니다.`;
    
    riskAssessment = `긍정적인 요인: 1. 소규모 그룹 내 안정적 관계 - 깊이 있는 친구 관계를 유지하고 있습니다. 2. 학교생활 만족도 ${satisfactionLevel} - ${satisfaction >= 0.5 ? '전반적으로 만족스러운 학교생활' : '일부 어려움을 겪고 있을 가능성'}이 있습니다. 주의가 필요한 부분: 1. 네트워크 확장 어려움 - 전체 네트워크와의 연결이 약합니다. 2. 폭력 경험도 ${violenceRisk} - ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 위험이 높아 주의 깊은 관찰이 필요' : '상대적으로 안전한 상태'}합니다. 3. 사회적 기술 부족 - 더 다양한 친구들과의 교류 기회가 필요합니다.`;
    
    guidancePlan = '친구 관계를 점진적으로 확장하고, 그룹 활동 참여를 통해 사회적 기술을 향상시키며, 폭력 예방 교육을 통해 안전한 학교생활을 유지할 수 있도록 지원해야 합니다.';
  } else if (connectionCount <= 5) {
    studentTypeClassification = '평균적인 학생';
    summary = `${studentName} 학생은 교우관계에서 안정적인 위치를 유지하고 있는 평균적인 학생입니다. 연결 수 ${connectionCount}개로 네트워크의 중간부에 위치하며, 학교생활 만족도는 ${satisfactionLevel} 수준, 폭력 경험도는 ${violenceRisk} 수준입니다. 적절한 수준의 친구 관계를 형성하고 있으며, 대부분의 학교 활동에 균형 있게 참여하고 있습니다.`;
    
    currentStatus = `교우관계 네트워크 분석: 연결 수 ${connectionCount}개로 네트워크의 중간부에 위치합니다. 안정적이면서도 확장 가능한 교우관계를 유지하고 있습니다. 학교생활 만족도: ${satisfactionLevel} 수준 (${(satisfaction * 100).toFixed(1)}%)으로 전반적으로 만족스러운 학교생활을 하고 있습니다. 폭력 경험도: ${violenceRisk} 수준 (${(violenceExperience * 100).toFixed(1)}%)으로 ${violenceExperience >= 0.5 ? '주의 관찰이 필요' : '안전한 상태'}합니다.`;
    
    riskAssessment = `긍정적인 요인: 1. 안정적인 교우관계 - 균형 잡힌 관계를 유지하고 있습니다. 2. 긍정적 학교생활 - 만족도가 ${satisfactionLevel} 수준으로 학교생활에 잘 적응하고 있습니다. 주의가 필요한 부분: 1. 네트워크 확장 기회 - 더 다양한 친구들과의 교류 기회가 필요합니다. 2. 폭력 경험도 ${violenceRisk} - ${violenceExperience >= 0.5 ? '폭력 상황에 대한 예방 교육이 필요' : '현재 안전한 상태를 유지하고 있음'}합니다.`;
    
    guidancePlan = '현재의 안정적인 교우관계를 유지하면서 네트워크를 점진적으로 확장하고, 폭력 예방 교육을 통해 안전한 학교생활을 유지할 수 있도록 지원해야 합니다.';
  } else if (connectionCount <= 8) {
    studentTypeClassification = '친구 많은 학생';
    summary = `${studentName} 학생은 교우관계에서 중심부에 위치한 친구 많은 학생입니다. 연결 수 ${connectionCount}개로 네트워크의 중심부에 위치하며, 학교생활 만족도는 ${satisfactionLevel} 수준, 폭력 경험도는 ${violenceRisk} 수준입니다. 많은 친구들과 좋은 관계를 유지하고 있으며, 학급 내에서 영향력 있는 역할을 하고 있습니다.`;
    
    currentStatus = `교우관계 네트워크 분석: 연결 수 ${connectionCount}개로 네트워크의 중심부에 위치합니다. 학급 내에서 영향력 있는 역할을 하고 있습니다. 학교생활 만족도: ${satisfactionLevel} 수준 (${(satisfaction * 100).toFixed(1)}%)으로 전반적으로 긍정적인 학교생활을 하고 있습니다. 폭력 경험도: ${violenceRisk} 수준 (${(violenceExperience * 100).toFixed(1)}%)으로 ${violenceExperience >= 0.5 ? '주의가 필요' : '안전한 상태'}합니다.`;
    
    riskAssessment = `긍정적인 요인: 1. 뛰어난 사회성 - 많은 친구들과 좋은 관계를 유지하고 있습니다. 2. 긍정적 학교생활 - 만족도가 ${satisfactionLevel} 수준으로 학교생활에 잘 적응하고 있습니다. 주의가 필요한 부분: 1. 리더십 부담감 - 네트워크의 중심에 있다는 사실이 때로는 압박감으로 작용할 수 있습니다. 2. 폭력 경험도 ${violenceRisk} - ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 가능성이 있으므로 주의 깊은 관찰이 필요' : '현재 안전한 상태를 유지하고 있음'}합니다.`;
    
    guidancePlan = `${studentName} 학생의 뛰어난 사회성을 긍정적으로 발휘하도록 돕고, 폭력 예방 교육을 통해 안전한 학교생활을 유지할 수 있도록 지원해야 합니다.`;
  } else {
    studentTypeClassification = '사교 스타';
    summary = `${studentName} 학생은 교우관계에서 핵심부에 위치한 사교 스타입니다. 연결 수 ${connectionCount}개로 네트워크의 핵심부에 위치하며, 학교생활 만족도는 ${satisfactionLevel} 수준, 폭력 경험도는 ${violenceRisk} 수준입니다. 뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인 영향을 미치고 있으며, 이는 학급 전체에 활기를 불어넣는 중요한 강점입니다.`;
    
    currentStatus = `교우관계 네트워크 분석: 연결 수 ${connectionCount}개로 네트워크의 핵심부에 위치합니다. 학급 내 여론 형성이나 분위기를 주도하는 역할을 하고 있습니다. 학교생활 만족도: ${satisfactionLevel} 수준 (${(satisfaction * 100).toFixed(1)}%)으로 전반적으로 긍정적인 학교생활을 하고 있습니다. 폭력 경험도: ${violenceRisk} 수준 (${(violenceExperience * 100).toFixed(1)}%)으로 ${violenceExperience >= 0.5 ? '주의가 필요' : '안전한 상태'}합니다.`;
    
    riskAssessment = `긍정적인 요인: 1. 뛰어난 사회성 및 리더십 - 많은 친구들에게 신뢰와 인기를 얻고 있어 관계의 중심 역할을 합니다. 2. 긍정적 학교생활 - 만족도가 ${satisfactionLevel} 수준으로 학교생활에 잘 적응하고 있습니다. 주의가 필요한 부분: 1. 리더십 부담감 - 네트워크의 중심에 있다는 사실이 때로는 압박감으로 작용할 수 있습니다. 2. 폭력 경험도 ${violenceRisk} - ${violenceExperience >= 0.5 ? '폭력 상황에 노출될 가능성이 있으므로 주의 깊은 관찰이 필요' : '현재 안전한 상태를 유지하고 있음'}합니다.`;
    
    guidancePlan = `${studentName} 학생의 뛰어난 리더십을 긍정적으로 발휘하도록 돕고, 폭력 예방 교육을 통해 안전한 학교생활을 유지할 수 있도록 지원해야 합니다.`;
  }

  return {
    comprehensiveDiagnosis: {
      studentType: studentTypeClassification,
      summary,
      keyCharacteristics: centrality >= 0.7 ? [
        "뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인 영향을 미치고 있음",
        "학급 전체에 활기를 불어넣는 중요한 역할을 수행함"
      ] : centrality >= 0.4 ? [
        "안정적인 교우관계를 유지하고 있음",
        "대부분의 학교 활동에 균형 있게 참여함"
      ] : centrality >= 0.3 ? [
        "소수의 친구들과 깊은 관계를 유지함",
        "소규모 그룹 내에서 안정적인 관계를 형성함"
      ] : [
        "친구 관계 형성에 어려움을 겪고 있음",
        "네트워크 외곽부에 위치함"
      ],
      challenges: centrality >= 0.7 ? [
        "선생님과의 관계를 다소 불편하게 느끼고 있음",
        "스스로 참여를 결정하는 활동 외에는 소극적인 모습을 보임",
        "리더 역할의 부담감이나 수직적인 관계에 대한 심리적 저항감"
      ] : centrality >= 0.4 ? [
        "더 다양한 친구들과의 교류 기회가 필요함",
        "리더십 발휘 기회를 통한 잠재력 개발 필요"
      ] : centrality >= 0.3 ? [
        "네트워크 확장의 어려움",
        "사회적 기술 부족",
        "고립될 가능성"
      ] : [
        "고립 위험이 매우 높음",
        "사회적 기술 부족, 자존감 저하, 학교생활 부적응 등의 위험"
      ]
    },
    detailedAnalysis: {
      schoolLifeSatisfaction: {
        surveyResults: [
          {"question": "Q2. 쉬는 시간에 친구들과 잘 논다", "answer": connectionCount >= 3 ? "예" : "보통"},
          {"question": "Q3. 수업 시간에 즐겁게 참여한다", "answer": satisfaction >= 0.5 ? "예" : "보통"},
          {"question": "Q4. 학교에 오고 싶다는 생각이 든다", "answer": satisfaction >= 0.5 ? "예" : "아니오"},
          {"question": "Q5. 선생님과 이야기하는 것이 편하다", "answer": connectionCount >= 6 ? "보통" : satisfaction >= 0.7 ? "예" : "아니오"}
        ],
        analysis: connectionCount >= 6 ? 
          "친구 관계에 대한 긍정 응답과 달리, 교사와의 관계에는 미묘한 거리감을 보입니다." :
          connectionCount >= 3 ?
          "친구 관계에서는 어느 정도 만족감을 보이며, 전반적으로 균형잡힌 학교생활을 하고 있습니다." :
          "학교생활 전반에 대한 만족도가 낮으며, 특히 교사와의 관계와 학교생활 적응에 어려움을 겪고 있습니다."
      },
      violenceExperience: {
        surveyResults: [
          {"question": "Q6. 친구들이 나를 때리거나 발로 차거나 밀치는 행동을 한 적이 있나요?", "answer": violenceExperience >= 0.7 ? "자주 있다" : violenceExperience >= 0.4 ? "한 두번 당한 적 있다" : "전혀 없다"},
          {"question": "Q7. 친구들이 나에게 욕을 하거나 놀린 적이 있나요?", "answer": violenceExperience >= 0.6 ? "자주 있다" : violenceExperience >= 0.3 ? "한 두번 당한 적 있다" : "전혀 없다"},
          {"question": "Q8. 친구들이 나를 따돌리거나 괴롭힌 적이 있나요?", "answer": violenceExperience >= 0.7 ? "자주 있다" : violenceExperience >= 0.4 ? "한 두번 당한 적 있다" : "전혀 없다"}
        ],
        analysis: violenceExperience >= 0.7 ?
          "신체적, 언어적, 관계적 폭력을 자주 경험하고 있어 즉각적인 개입이 필요합니다." :
          violenceExperience >= 0.4 ?
          "일부 폭력 경험이 있어 주의 깊은 관찰과 예방 교육이 필요합니다." :
          "현재까지 심각한 폭력 경험은 없으나, 예방 교육을 통해 안전한 학교생활을 유지해야 합니다."
      },
      peerNetworkAnalysis: {
        receivedChoices: analysisData.totalRelationships,
        madeChoices: Math.max(1, analysisData.totalRelationships - 1),
        networkPosition: studentTypeClassification,
        analysis: connectionCount >= 9 ?
          "다수의 학생으로부터 선택을 받아 관계망의 중심에 있으며, 학급 내 여론 형성이나 분위기를 주도하는 핵심적인 인물입니다." :
          connectionCount >= 6 ?
          "많은 친구들과 연결되어 있으며, 학급 내에서 영향력 있는 역할을 하고 있습니다." :
          connectionCount >= 3 ?
          "안정적인 교우관계를 유지하고 있으며, 적절한 수준의 친구 관계를 형성하고 있습니다." :
          connectionCount >= 1 ?
          "소수의 친구들과 관계를 유지하고 있으나, 전체 네트워크와의 연결이 약한 편입니다." :
          "친구 관계 형성에 어려움을 겪고 있으며, 고립될 위험이 높습니다."
      }
    },
    strengthsAndImprovements: {
      strengths: centrality >= 0.7 ? [
        {
          title: "뛰어난 사회성 및 리더십",
          description: "많은 친구들에게 신뢰와 인기를 얻고 있어 관계의 중심 역할을 합니다."
        },
        {
          title: "긍정적 또래 영향력",
          description: "학생의 즐거운 학교생활 태도는 주변 친구들에게도 긍정적인 영향을 미칠 수 있습니다."
        }
      ] : centrality >= 0.4 ? [
        {
          title: "안정적인 교우관계",
          description: "적절한 수준의 친구 관계를 형성하고 있어 학교생활에 안정감을 제공합니다."
        },
        {
          title: "균형 잡힌 참여",
          description: "대부분의 학교 활동에 균형 있게 참여하여 다양한 경험을 쌓고 있습니다."
        }
      ] : centrality >= 0.3 ? [
        {
          title: "깊은 관계 형성",
          description: "소수의 친구들과 깊고 의미 있는 관계를 유지하고 있습니다."
        },
        {
          title: "안정적인 소그룹 참여",
          description: "소규모 그룹 내에서 안정적인 역할을 수행하고 있습니다."
        }
      ] : [
        {
          title: "개별적 특성",
          description: "독립적인 성향을 보이며 자신만의 방식으로 학교생활을 영위하고 있습니다."
        }
      ],
      improvementAreas: centrality >= 0.7 ? [
        {
          title: "권위와의 관계 설정",
          description: "교사와의 관계를 불편하게 여겨, 지도나 조언을 받아들이는 데 어려움을 겪을 수 있습니다."
        },
        {
          title: "역할에 대한 부담감",
          description: "네트워크의 중심에 있다는 사실이 때로는 압박감이나 과도한 책임감으로 작용할 수 있습니다."
        },
        {
          title: "선택적 참여",
          description: "자신이 흥미를 느끼거나 주도하는 활동에만 참여하려는 경향이 있어, 다양한 경험의 기회를 놓칠 수 있습니다."
        }
      ] : centrality >= 0.4 ? [
        {
          title: "네트워크 확장",
          description: "더 다양한 친구들과의 교류 기회가 필요합니다."
        },
        {
          title: "리더십 발휘",
          description: "리더십 발휘 기회를 통한 잠재력 개발이 필요합니다."
        }
      ] : centrality >= 0.3 ? [
        {
          title: "네트워크 확장의 어려움",
          description: "전체 네트워크와의 연결을 강화할 필요가 있습니다."
        },
        {
          title: "사회적 기술 부족",
          description: "사회적 기술 향상을 위한 지원이 필요합니다."
        },
        {
          title: "고립 위험",
          description: "고립될 가능성이 있어 지속적인 관찰과 개입이 필요합니다."
        }
      ] : [
        {
          title: "친구 관계 형성 어려움",
          description: "즉각적인 개입을 통한 친구 관계 형성 지원이 필요합니다."
        },
        {
          title: "사회적 기술 부족",
          description: "사회적 기술 향상을 위한 체계적인 프로그램이 필요합니다."
        },
        {
          title: "자존감 저하",
          description: "자존감 향상을 위한 정서적 지원이 필요합니다."
        },
        {
          title: "학교생활 부적응",
          description: "학교생활 적응을 위한 종합적인 지원이 필요합니다."
        }
      ]
    },
    customizedSolutions: {
      overallGoal: guidancePlan,
      shortTermSolutions: centrality >= 0.7 ? [
        {
          title: "역할 부여 및 책임감 강화",
          description: "학급 내에서 학생의 리더십을 공식적으로 인정해 주는 역할(예: 모둠 리더, 프로젝트 팀장)을 맡겨 긍정적인 방향으로 영향력을 발휘하도록 합니다."
        },
        {
          title: "수평적 소통 시도",
          description: "지시나 지도보다는 학생의 의견을 먼저 묻고 존중하는 방식으로 대화하여 교사와의 관계에 대한 심리적 장벽을 낮춥니다."
        }
      ] : centrality >= 0.4 ? [
        {
          title: "현재 관계 유지 및 점진적 확장",
          description: "현재의 안정적인 교우관계를 유지하면서 네트워크를 점진적으로 확장합니다."
        },
        {
          title: "리더십 기회 제공",
          description: "학생의 잠재력을 개발할 수 있는 리더십 기회를 제공합니다."
        }
      ] : centrality >= 0.3 ? [
        {
          title: "친구 관계 확장을 위한 그룹 활동 참여",
          description: "소규모 그룹 활동을 통해 친구 관계를 점진적으로 확장합니다."
        },
        {
          title: "교사와의 래포 형성 필요",
          description: "교사와의 관계 개선을 위한 개별 상담을 진행합니다."
        }
      ] : [
        {
          title: "긴급한 관계 개선 필요 - 상담사 연계 권장",
          description: "즉각적인 개입을 위해 전문 상담사와의 연계를 권장합니다."
        },
        {
          title: "소규모 그룹 활동 참여 유도",
          description: "소규모 그룹 활동을 통해 자연스러운 관계 형성을 유도합니다."
        }
      ],
      midTermSolutions: centrality >= 0.7 ? [
        {
          title: "리더십 멘토링",
          description: "학생에게 리더의 진정한 의미(타인에 대한 배려, 책임감, 경청 등)에 대해 생각해 볼 기회를 제공하고, 교사가 조력자로서 함께 고민하도록 합니다."
        },
        {
          title: "새로운 영역으로 관심 확장",
          description: "학생이 평소에 참여하지 않았던 활동(예: 봉사활동, 특정 주제 탐구)의 중요성을 설명하고, 친구들과 함께 도전해 보도록 제안하여 경험을 넓힙니다."
        }
      ] : centrality >= 0.4 ? [
        {
          title: "또래 상담자 역할 기회 제공",
          description: "학생의 안정적인 교우관계를 활용하여 또래 상담자 역할을 제공합니다."
        },
        {
          title: "다양한 경험 확장 기회 제공",
          description: "다양한 활동 참여를 통해 경험의 폭을 넓힙니다."
        }
      ] : centrality >= 0.3 ? [
        {
          title: "관심사 기반 동아리 활동 권장",
          description: "학생의 관심사를 바탕으로 한 동아리 활동 참여를 권장합니다."
        },
        {
          title: "사회적 기술 향상 프로그램 참여",
          description: "사회적 기술 향상을 위한 체계적인 프로그램에 참여하도록 합니다."
        }
      ] : [
        {
          title: "또래 멘토링 프로그램 참여",
          description: "또래 멘토링 프로그램을 통해 자연스러운 관계 형성을 지원합니다."
        },
        {
          title: "정서적 안정성 향상 프로그램",
          description: "정서적 안정성 향상을 위한 전문 프로그램에 참여하도록 합니다."
        }
      ],
      longTermSolutions: centrality >= 0.7 ? [
        {
          title: "협력적 문제 해결 능력 강화",
          description: "학급 전체가 참여하는 프로젝트에서 학생이 주도자 역할뿐만 아니라, 다른 친구의 의견을 듣고 지원하는 조력자 역할도 경험하도록 키웁니다."
        },
        {
          title: "정기적인 관계 변화 추이 관찰",
          description: "교우관계 서비스 데이터를 통해 학생의 영향력이 어떻게 변화하는지, 새로운 관계가 형성되는지 등을 지속적으로 모니터링하며 건강한 성장을 지원합니다."
        }
      ] : centrality >= 0.4 ? [
        {
          title: "지속적인 네트워크 확장 지원",
          description: "지속적인 네트워크 확장을 위한 다양한 기회를 제공합니다."
        },
        {
          title: "리더십 역량 개발",
          description: "리더십 역량 개발을 위한 장기적인 프로그램을 제공합니다."
        }
      ] : centrality >= 0.3 ? [
        {
          title: "사회적 기술 지속적 향상",
          description: "사회적 기술 향상을 위한 지속적인 지원을 제공합니다."
        },
        {
          title: "네트워크 통합 지원",
          description: "전체 네트워크와의 통합을 위한 지속적인 지원을 제공합니다."
        }
      ] : [
        {
          title: "종합적인 사회적 기술 향상",
          description: "종합적인 사회적 기술 향상을 위한 장기적인 프로그램을 제공합니다."
        },
        {
          title: "지속적인 관계 형성 지원",
          description: "지속적인 관계 형성을 위한 장기적인 지원을 제공합니다."
        }
      ]
    },
    // 기존 필드들 (호환성을 위해 유지)
    summary,
    currentStatus,
    riskAssessment,
    guidancePlan,
    specificActions: [
      '역할 부여 및 책임감 강화: 학급 내에서 학생의 리더십을 공식적으로 인정해 주는 역할(예: 모둠 리더, 프로젝트 팀장)을 맡겨 긍정적인 방향으로 영향력을 발휘하도록 격려합니다.',
      '수평적 소통 시도: 지시나 지도보다는 학생의 의견을 먼저 묻고 존중하는 방식으로 대화하여 교사와의 관계에 대한 심리적 장벽을 낮춥니다.'
    ],
    monitoringPoints: [
      '리더십 멘토링: 학생에게 리더의 진정한 의미(타인에 대한 배려, 책임감, 경청 등)에 대해 생각해 볼 기회를 제공하고, 교사가 조력자로서 함께 고민해 줍니다.',
      '새로운 영역으로 관심 확장: 학생이 평소에 참여하지 않았던 활동(예: 봉사활동, 특정 주제 탐구)의 중요성을 설명하고, 친구들과 함께 도전해 보도록 제안하여 경험의 폭을 넓혀줍니다.'
    ],
    expectedOutcomes: [
      '협력적 문제 해결 능력 강화: 학급 전체가 참여하는 프로젝트에서 학생이 주도자 역할뿐만 아니라, 다른 친구의 의견을 듣고 지원하는 조력자 역할도 경험하게 하여 균형 잡힌 리더십을 키웁니다.',
      '정기적인 관계 변화 추이 관찰: 교우관계 서비스 데이터를 통해 학생의 영향력이 어떻게 변화하는지, 새로운 관계가 형성되는지 등을 지속적으로 모니터링하며 건강한 리더로 성장할 수 있도록 지원합니다.'
    ],
    individualSummary: {
      studentType: studentTypeClassification,
      currentStatus: {
        schoolSatisfaction: centrality >= 0.7 ? '매우 높음' : centrality >= 0.4 ? '높음' : centrality >= 0.3 ? '보통' : '낮음',
        teacherRelationship: centrality >= 0.7 ? '매우 좋음' : centrality >= 0.4 ? '좋음' : centrality >= 0.3 ? '보통' : '개선 필요',
        peerRelationship: analysisData.totalRelationships >= 5 ? '매우 활발' : analysisData.totalRelationships >= 3 ? '활발' : analysisData.totalRelationships >= 1 ? '보통' : '제한적',
        networkParticipation: centrality >= 0.7 ? '매우 높음' : centrality >= 0.4 ? '높음' : centrality >= 0.3 ? '보통' : '낮음'
      },
      networkStability: {
        centralityScore: `${(centrality * 100).toFixed(1)}%`,
        friendCount: `${analysisData.totalRelationships}명`,
        networkDensity: centrality >= 0.7 ? '높음' : centrality >= 0.4 ? '보통' : '낮음',
        groupDistribution: centrality >= 0.7 ? '중심 그룹' : centrality >= 0.4 ? '중간 그룹' : centrality >= 0.3 ? '주변 그룹' : '외곽 그룹',
        isolationRisk: centrality < 0.3 ? '높음' : centrality < 0.4 ? '보통' : '낮음'
      },
      improvementPlan: {
        shortTerm: centrality >= 0.7 ? ['리더십 역할 강화', '또래 상담자 역할 수행'] : centrality >= 0.4 ? ['현재 관계 유지 및 점진적 확장', '리더십 기회 제공'] : centrality >= 0.3 ? ['친구 관계 확장을 위한 그룹 활동 참여', '교사와의 래포 형성 필요'] : ['긴급한 관계 개선 필요 - 상담사 연계 권장', '소규모 그룹 활동 참여 유도'],
        longTerm: centrality >= 0.7 ? ['긍정적 영향력 확산', '네트워크 연결 지원 역할'] : centrality >= 0.4 ? ['또래 상담자 역할 기회 제공', '다양한 경험 확장 기회 제공'] : centrality >= 0.3 ? ['관심사 기반 동아리 활동 권장', '사회적 기술 향상 프로그램 참여'] : ['또래 멘토링 프로그램 참여', '정서적 안정성 향상 프로그램']
      },
      monitoringPoints: {
        frequency: centrality < 0.3 ? '주간' : '월간',
        focus: centrality < 0.3 ? '관계 개선 상황 점검' : '네트워크 변화 추이 모니터링',
        keyAreas: [
          analysisData.totalRelationships < 3 ? '새로운 친구 관계 형성 여부 확인' : '기존 관계의 질적 향상 여부 확인',
          centrality < 0.4 ? '사회적 참여도 및 활동 참여 빈도 점검' : '리더십 발휘 기회 및 역할 수행 평가',
          centrality < 0.3 ? '정서적 안정성 및 학교 적응도 평가' : '학업 성취도와 사회적 관계의 균형 평가'
        ]
      }
    }
  };
};
