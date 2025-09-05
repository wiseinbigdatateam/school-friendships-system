import { useState, useEffect } from "react";
import clsx from "clsx";
import { accordionData, type AccordionItem } from "../../../data/accordionData";

type AccordionListProps = {
  tabMenu: number;
  onItemSelect: (id: string) => void;
};

function AccordionList({ tabMenu, onItemSelect }: AccordionListProps) {
  const [openItem, setOpenItem] = useState<string | null>("교우관계분석");
  const [isToggleActive, setIsToggleActive] = useState<boolean>(true);
  const [currentData, setCurrentData] = useState<AccordionItem[]>(
    accordionData.usagePlan,
  );

  const handleAccordion = (id: string) => {
    if (openItem === id && isToggleActive) {
      // 현재 열린 아이템을 다시 클릭하면 닫기
      setOpenItem(null);
      setIsToggleActive(false);
    } else {
      // 다른 아이템을 클릭하거나 닫힌 상태에서 클릭하면 열기
      setOpenItem(id);
      setIsToggleActive(true);
      onItemSelect(id);
    }
  };

  useEffect(() => {
    if (tabMenu === 0) {
      setCurrentData(accordionData.usagePlan);
      setOpenItem("교우관계분석");
      onItemSelect("교우관계분석");
    } else {
      setCurrentData(accordionData.guideSupport);
      setOpenItem("AI 심리 진단 분석");
      onItemSelect("AI 심리 진단 분석");
    }
  }, [tabMenu, onItemSelect]);

  return (
    <div className="flex w-1/2 flex-col">
      {currentData.map((item, idx) => (
        <div
          className="relative flex flex-col border-b border-gray-200 py-8 pl-5"
          key={item.id}
        >
          <div
            className={clsx(
              "flex cursor-pointer justify-between",
              openItem === item.id &&
                "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
            )}
            onClick={() => handleAccordion(item.id)}
          >
            <p className="text-xl">{`${idx + 1}. ${item.id}`}</p>
            {openItem === item.id && isToggleActive ? (
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
    </div>
  );
}

export default AccordionList;
