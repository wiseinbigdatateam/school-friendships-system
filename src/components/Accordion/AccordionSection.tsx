import { useState } from "react";
import AccordionContents from "./AccordionContents";
import AccordionList from "./AccordionList";

function AccordionSection({ tabMenu }: { tabMenu: number }) {
  const [selectedItemId, setSelectedItemId] = useState<string>("교우관계분석");

  return (
    <div className="flex gap-8 p-10">
      {/* 이미지 영역 */}
      <AccordionContents tabMenu={tabMenu} selectedItemId={selectedItemId} />
      {/* 토글 카드 */}
      <AccordionList tabMenu={tabMenu} onItemSelect={setSelectedItemId} />
    </div>
  );
}

export default AccordionSection;
