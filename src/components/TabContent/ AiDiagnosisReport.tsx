import SectionTitle from "../SectionTitle";
import AccordionSection from "../Accordion/AccordionSection";

{
}

function AiDiagnosisReport() {
  return (
    <div className="mx-auto flex w-[1280px] flex-col gap-[72px] py-[72px]">
      {/* LLM 자동 가이드 지원 */}
      <div className="flex flex-col gap-5">
        <SectionTitle
          title="LLM 자동 가이드 지원"
          desc={{
            point: "초거대 LLM의 도움 “개인화된 회복 가이드” 참고",
            basic: "자연스럽게 배려할 수 있도록 지원",
          }}
        />
        <AccordionSection tabMenu={1} />
      </div>

      {/* ~학생의 LLM 레포트 */}
      <div className="flex flex-col gap-5"></div>
    </div>
  );
}

export default AiDiagnosisReport;
