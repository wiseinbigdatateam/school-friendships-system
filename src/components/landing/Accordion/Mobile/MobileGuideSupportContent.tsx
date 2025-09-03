import { useState } from "react";
import GuideSupportContent from "../GuideSupportContent";

import clsx from "clsx";

function MobileGuideSupportContent() {
  const [openItem, setOpenItem] = useState<number | null>(1);
  const [isToggleActive, setIsToggleActive] = useState<boolean>(true);

  const handleAccordion = (id: number) => {
    if (openItem === id && isToggleActive) {
      // 현재 열린 아이템을 다시 클릭하면 닫기
      setOpenItem(null);
      setIsToggleActive(false);
    } else {
      // 다른 아이템을 클릭하거나 닫힌 상태에서 클릭하면 열기
      setOpenItem(id);
      setIsToggleActive(true);
    }
  };

  return (
    <div className="flex flex-col">
      {/* 1. AI 심리 진단 분석 */}
      <div className="relative flex flex-col border-b border-gray-200 pl-5">
        {/* 아코디언 텍스트 */}
        <div
          className={clsx(
            "flex cursor-pointer justify-between py-5 md:py-6",
            openItem === 1 &&
              "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
          )}
          onClick={() => handleAccordion(1)}
        >
          <h3 className="text-base md:text-xl">1. AI 심리 진단 분석</h3>
          {openItem === 1 && isToggleActive ? (
            <img
              src="/landing/toggle_up.svg"
              alt="토글 닫기 아이콘"
              className="cursor-pointer"
            />
          ) : (
            <img
              src="/landing/toggle_down.svg"
              alt="토글 열기 아이콘"
              className="cursor-pointer"
            />
          )}
        </div>

        <div
          className={clsx(
            "duration-400 origin-top transform overflow-hidden transition-all ease-in",
            openItem === 1 && isToggleActive
              ? "max-h-[500px] opacity-100"
              : "h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-6 max-md:gap-5">
            <div className="flex flex-col">
              <span className="text-base text-sky-500 md:text-xl">
                가이드 지원
              </span>
              <p className="text-sm md:text-base">
                초거대 LLM을 활용한 심리적 상태 분석을 바탕으로 심층적인 진단 및
                조치 방안 검토
              </p>
            </div>

            {/* 아코디언 이미지 */}
            <GuideSupportContent selectedItemId="AI 심리 진단 분석" />
          </div>
        </div>
      </div>

      {/* 2. 맞춤형 대화 가이드 제공 */}
      <div className="relative flex flex-col border-b border-gray-200 pl-5">
        {/* 아코디언 텍스트 */}
        <div
          className={clsx(
            "flex cursor-pointer justify-between py-5 md:py-6",
            openItem === 2 &&
              "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
          )}
          onClick={() => handleAccordion(2)}
        >
          <h3 className="text-base md:text-xl">2. 맞춤형 대화 가이드 제공</h3>
          {openItem === 2 && isToggleActive ? (
            <img
              src="/landing/toggle_up.svg"
              alt="토글 닫기 아이콘"
              className="cursor-pointer"
            />
          ) : (
            <img
              src="/landing/toggle_down.svg"
              alt="토글 열기 아이콘"
              className="cursor-pointer"
            />
          )}
        </div>

        <div
          className={clsx(
            "duration-400 origin-top transform overflow-hidden transition-all ease-in",
            openItem === 2 && isToggleActive
              ? "mt-3 max-h-[500px] opacity-100"
              : "h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-6 max-md:gap-5">
            <div className="flex flex-col">
              <span className="text-base text-sky-500 md:text-xl">
                가이드 지원
              </span>
              <p className="text-sm md:text-base">
                교사와 친구들이 해당 학생과 어떻게 대화해야 할지 실제적인 맞춤형
                가이드 제공
              </p>
            </div>

            {/* 아코디언 이미지 */}
            <GuideSupportContent selectedItemId="맞춤형 대화 가이드 제공" />
          </div>
        </div>
      </div>

      {/* 3. 편지/메시지 자동 작성 */}
      <div className="relative flex flex-col border-b border-gray-200 pl-5">
        {/* 아코디언 텍스트 */}
        <div
          className={clsx(
            "flex cursor-pointer justify-between py-5 md:py-6",
            openItem === 3 &&
              "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
          )}
          onClick={() => handleAccordion(3)}
        >
          <h3 className="text-base md:text-xl">3. 편지/메시지 자동 작성</h3>
          {openItem === 3 && isToggleActive ? (
            <img
              src="/landing/toggle_up.svg"
              alt="토글 닫기 아이콘"
              className="cursor-pointer"
            />
          ) : (
            <img
              src="/landing/toggle_down.svg"
              alt="토글 열기 아이콘"
              className="cursor-pointer"
            />
          )}
        </div>

        <div
          className={clsx(
            "duration-400 origin-top transform overflow-hidden transition-all ease-in",
            openItem === 3 && isToggleActive
              ? "mt-3 max-h-[500px] opacity-100"
              : "h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-6 max-md:gap-5">
            <div className="flex flex-col">
              <span className="text-base text-sky-500 md:text-xl">
                가이드 지원
              </span>
              <p className="text-sm md:text-base">
                초거대 LLM가 개인 학생에게 맞는 따뜻하고 개인화된 편지/메시지
                작성
              </p>
            </div>

            {/* 아코디언 이미지 */}
            <GuideSupportContent selectedItemId="편지/메시지 자동 작성" />
          </div>
        </div>
      </div>

      {/* 4. 소그룹 친구&활동 계획 */}
      <div className="relative flex flex-col border-b border-gray-200 pl-5">
        {/* 아코디언 텍스트 */}
        <div
          className={clsx(
            "flex cursor-pointer justify-between py-5 md:py-6",
            openItem === 4 &&
              "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
          )}
          onClick={() => handleAccordion(4)}
        >
          <h3 className="text-base md:text-xl">4. 소그룹 친구&활동 계획</h3>
          {openItem === 4 && isToggleActive ? (
            <img
              src="/landing/toggle_up.svg"
              alt="토글 닫기 아이콘"
              className="cursor-pointer"
            />
          ) : (
            <img
              src="/landing/toggle_down.svg"
              alt="토글 열기 아이콘"
              className="cursor-pointer"
            />
          )}
        </div>

        <div
          className={clsx(
            "duration-400 origin-top transform overflow-hidden transition-all ease-in",
            openItem === 4 && isToggleActive
              ? "mt-3 max-h-[500px] opacity-100"
              : "h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-6 max-md:gap-5">
            <div className="flex flex-col">
              <span className="text-base text-sky-500 md:text-xl">
                가이드 지원
              </span>
              <p className="text-sm md:text-base">
                학생의 성향과 상황에 맞는 특정 활동 추천 (독서, 운동, 취미활동,
                자기계발 등)
              </p>
            </div>

            {/* 아코디언 이미지 */}
            <GuideSupportContent selectedItemId="소그룹 친구&활동 계획" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default MobileGuideSupportContent;
