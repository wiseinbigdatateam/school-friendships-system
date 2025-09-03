import { useState } from "react";
import AccordionContents from "./AccordionContents";
import AccordionList from "./AccordionList";
import MobileAccordion from "./Mobile/MobileAccordion";

function AccordionSection({ tabMenu }: { tabMenu: number }) {
  const [selectedItemId, setSelectedItemId] = useState<string>("교우관계분석");

  return (
    <>
      {/* 1024px ~ */}
      <div className="hidden p-10 lg:flex lg:gap-5 xl:gap-10">
        {/* 이미지 영역 */}
        <AccordionContents tabMenu={tabMenu} selectedItemId={selectedItemId} />
        {/* 토글 카드 */}
        <AccordionList tabMenu={tabMenu} onItemSelect={setSelectedItemId} />
      </div>

      {/* ~ 1023px */}
      <div className="block lg:hidden">
        <MobileAccordion tabMenu={tabMenu} />
      </div>
    </>
  );
}

export default AccordionSection;
