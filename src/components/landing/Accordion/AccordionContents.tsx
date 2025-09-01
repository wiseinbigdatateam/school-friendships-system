import UsagePlanContent from "./UsagePlanContent"; // 교우관계 진단 및 평가 - 학생 진단·평가 활용방안
import GuideSupportContent from "./GuideSupportContent"; // AI 진단 레포트 - LLM 자동 가이드 지원

type AccordionContentsProps = {
  tabMenu: number;
  selectedItemId: string;
};

function AccordionContents({
  tabMenu,
  selectedItemId,
}: AccordionContentsProps) {
  return (
    <>
      {tabMenu === 0 ? (
        <UsagePlanContent selectedItemId={selectedItemId} />
      ) : (
        <GuideSupportContent selectedItemId={selectedItemId} />
      )}
    </>
  );
}

export default AccordionContents;
