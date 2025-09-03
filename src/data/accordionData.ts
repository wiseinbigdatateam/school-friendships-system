export const accordionData = {
  usagePlan: [
    {
      id: "교우관계분석",
      descTitle: "기대효과",
      desc1: "학생들간의 관계를 시각적으로 표현하고 현 상태를 진단합니다",
      desc2:
        "인간관계로 인해 발생할 수 있는 다양한 문제의 징후를 사전에 인지하여 예방할 수 있습니다.",
      question: "같은 반에서 누구와 친하게 지냅니까?",
      img1: "/landing/tab1/section4_1.svg",
      img2: "/landing/tab1/section4_2.svg",
    },
    {
      id: "학교 만족도",
      descTitle: "기대효과",
      desc1:
        "학교생활 전반, 정서적 안정 수준을 고려하여 학교생활에 대한 불만 학생을 모니터링 합니다.",
      desc2: "고불만군을 대상으로 악화되지 않도록 지도할 수 있습니다.",
      question: "나는 학교생활에 만족하고 있다",
      img1: "/landing/tab1/section4_3.svg",
      img2: "/landing/tab1/section4_4.svg",
    },
    {
      id: "학교 폭력조사",
      descTitle: "기대효과",
      desc1:
        "학생의 정서·심리적으로 큰 문제가 발생할 수 있는 이별, 폭력, 정서불안 사건의 경험을 파악하여 개인적 배려와 상담이 필요한 학생을 모니터링합니다",
      question: "최근 6개월 동안, 학교에서 친구들에게 놀림을 당한 적이 있나요?",
      img1: "/landing/tab1/section4_5.svg",
      img2: "/landing/tab1/section4_6.svg",
    },
  ],
  guideSupport: [
    {
      id: "AI 심리 진단 분석",
      descTitle: "가이드 지원",
      desc1:
        "초거대 LLM을 활용한 심리적 상태 분석을 바탕으로 진단 및 조치 방안 검토",
    },
    {
      id: "맞춤형 대화 가이드 제공",
      descTitle: "가이드 지원",
      desc1:
        "교사와 친구들이 해당 학생과 어떻게 대화해야 할지 실제적인 맞춤형 가이드 제공",
    },
    {
      id: "편지/메시지 자동 작성",
      descTitle: "가이드 지원",
      desc1:
        "초거대 LLM이 개인 학생에게 맞는 따뜻하고 개인화된 편지/메시지 작성",
    },
    {
      id: "소그룹 친구&활동 계획",
      descTitle: "가이드 지원",
      desc1:
        "학생의 성향과 상황에 맞는 특정 활동 추천 (독서, 운동, 취미활동, 자기계발 등)",
    },
  ],
};

export type AccordionItem = {
  id: string;
  descTitle: string;
  desc1: string;
  desc2?: string;
  question?: string;
  img1?: string;
  img2?: string;
};

export type TabType = keyof typeof accordionData;
