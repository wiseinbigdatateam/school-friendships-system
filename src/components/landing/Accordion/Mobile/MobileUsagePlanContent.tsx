import { useState } from "react";
import { accordionData } from "../../../../data/accordionData";
import clsx from "clsx";

function MobileUsagePlanContent() {
  const [openItem, setOpenItem] = useState<string | null>("교우관계분석");
  const [isToggleActive, setIsToggleActive] = useState<boolean>(true);

  const handleAccordion = (id: string) => {
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
    <>
      {accordionData.usagePlan.map((item, idx) => (
        <div className="relative flex flex-col border-b border-gray-200 pl-5">
          {/* 아코디언 텍스트 */}
          <div
            className={clsx(
              "flex cursor-pointer justify-between py-5 md:py-6",
              openItem === item.id &&
                "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-gray-600 before:content-['']",
            )}
            key={item.id}
            onClick={() => handleAccordion(item.id)}
          >
            <h3 className="text-base md:text-xl">{`${idx + 1}. ${item.id}`}</h3>
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
              "duration-400 origin-top transform overflow-hidden transition-all ease-in",
              openItem === item.id && isToggleActive
                ? "max-h-[500px] opacity-100"
                : "h-0 opacity-0",
            )}
          >
            <div className="flex flex-col">
              <div className="flex flex-col">
                <span className="text-base text-sky-500 md:text-xl">
                  {item.descTitle}
                </span>
                <p className="text-sm md:text-base">{item.desc1}</p>
                {item.desc2 && (
                  <p className="text-sm md:text-base">{item.desc2}</p>
                )}
              </div>

              {/* 아코디언 이미지 */}
              <div className="flex justify-center gap-5 p-10 max-md:gap-2 max-md:p-5">
                <img
                  src={item.img1}
                  alt="교우관계분석 첫 번째 이미지"
                  className="max-sm:w-2/3"
                />
                <img
                  src={item.img2}
                  alt="교우관계분석 두 번째 이미지"
                  className="max-sm:w-1/3"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

export default MobileUsagePlanContent;
