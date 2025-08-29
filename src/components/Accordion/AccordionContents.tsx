import UsagePlanContent from "./UsagePlanContent"; // 교우관계 진단 및 평가 - 학생 진단·평가 활용방안
import GuideSupportContent from "./GuideSupportContent"; // AI 진단 레포트 - LLM 자동 가이드 지원

function AccordionContents({ tabMenu }: { tabMenu: number }) {
  return <>{tabMenu === 0 ? <UsagePlanContent /> : <GuideSupportContent />}</>;
}

export default AccordionContents;
