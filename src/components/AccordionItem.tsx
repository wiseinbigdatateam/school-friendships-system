import { useState, useEffect } from "react";
import clsx from "clsx";

const usagePlan = [
  {
    id: "교우관계분석",
    descTitle: "기대효과",
    desc1: "학생들간의 관계를 시각적으로 표현하고 현 상태를 진단합니다",
    desc2:
      "인간관계로 인해 발생할 수 있는 다양한 문제의 징후를 사전에 인지하여 예방할 수 있습니다.",
  },
  {
    id: "학교 만족도",
    descTitle: "기대효과",
    desc1:
      "학교생활 전반, 정서적 안정 수준을 고려하여 학교생활에 대한 불만 학생을 모니터링 합니다.",
    desc2: "고불만군을 대상으로 악화되지 않도록 지도할 수 있습니다.",
  },
  {
    id: "학교 폭력조사",
    descTitle: "기대효과",
    desc1:
      "학생의 정서·심리적으로 큰 문제가 발생할 수 있는 이별, 폭력, 정서불안 사건의 경험을 파악하여 개인적 배려와 상담이 필요한 학생을 모니터링합니다",
  },
];

const guideSupport = [
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
    id: "편지/메세지 자동 작성",
    descTitle: "가이드 지원",
    desc1: "초거대 LLM이 개인 학생에게 맞는 따뜻하고 개인화된 편지/메시지 작성",
  },
  {
    id: "소그룹 친구&활동 계획",
    descTitle: "가이드 지원",
    desc1:
      "학생의 성향과 상황에 맞는 특정 활동 추천 (독서, 운동, 취미활동, 자기계발 등)",
  },
];

function AccordionItem({ tabMenu }: { tabMenu: number }) {
  const [openItem, setOpenItem] = useState<string | null>("교우관계분석");
  const [isToggleActive, setIsToggleActive] = useState<boolean>(true);
  const [currentData, setCurrentData] = useState(usagePlan);

  const handleCloseAccordion = () => {
    setOpenItem(null);
    setIsToggleActive(false);
  };

  const handleOpenAccordion = (id: string) => {
    setOpenItem(id);
    setIsToggleActive(true);
  };

  useEffect(() => {
    if (tabMenu === 0) {
      setCurrentData(usagePlan);
    } else {
      setCurrentData(guideSupport);
    }
  }, [tabMenu]);

  return (
    <>
      {currentData.map((item, idx) => (
        <div
          className="relative flex flex-col border-b border-gray-200 py-8 pl-5"
          key={item.id}
        >
          <div
            className={clsx(
              "flex justify-between",
              openItem === item.id &&
                "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
            )}
          >
            <h3 className="text-xl font-semibold">{`${idx + 1}. ${item.id}`}</h3>
            {openItem === item.id && isToggleActive ? (
              <img
                src="/landing/toggle_up.svg"
                alt="토글 닫기 아이콘"
                className="cursor-pointer"
                onClick={() => handleCloseAccordion()}
              />
            ) : (
              <img
                src="/landing/toggle_down.svg"
                alt="토글 열기 아이콘"
                className="cursor-pointer"
                onClick={() => handleOpenAccordion(item.id)}
              />
            )}
          </div>

          <div
            className={clsx(
              "duration-400 origin-top transform overflow-hidden pr-10 transition-all ease-in",
              openItem === item.id && isToggleActive
                ? "mt-3 max-h-[96px] opacity-100"
                : "h-0 opacity-0",
            )}
          >
            <span className="text-base text-sky-500">{item.descTitle}</span>
            <p>{item.desc1}</p>
            {item.desc2 && <p>{item.desc2}</p>}
          </div>
        </div>
      ))}
    </>
  );
}

export default AccordionItem;
