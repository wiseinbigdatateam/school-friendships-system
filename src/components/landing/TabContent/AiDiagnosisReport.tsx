import SectionTitle from "../../SectionTitle";
import AccordionSection from "../Accordion/AccordionSection";
import WhiteCard from "../WhiteCard";

function AiDiagnosisReport() {
  return (
    <div className="mx-auto flex w-[1280px] flex-col gap-[72px] py-[72px] max-xl:w-full max-xl:px-6">
      {/* LLM 자동 가이드 지원 */}
      <div className="flex flex-col gap-5 max-md:gap-4">
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
      <div className="flex flex-col gap-5 max-md:gap-4">
        <SectionTitle title="김OO 학생의 LLM 레포트" />

        <div className="flex flex-col">
          {/* 회색 카드 영역 */}
          <div className="flex flex-col gap-2 rounded-t-3xl bg-[#f4f4f4] p-10 max-md:rounded-t-xl max-md:px-3 max-md:py-6">
            {/* 종합진단 */}
            <div className="flex flex-col items-center gap-3">
              <p className="pt-1 text-base font-semibold text-emerald-500">
                종합진단
              </p>
              <div className="flex items-center gap-2 text-xl font-semibold max-md:flex-col max-md:text-base">
                김OO 학생의 네트워크 유형{" "}
                <span className="rounded-[28px] bg-indigo-500 px-6 py-2 text-white">
                  주도형
                </span>
              </div>
              <p className="text-base max-md:text-center max-md:text-sm">
                뛰어난 사회성과 리더십을 바탕으로 많은 친구들에게 긍정적인
                영향을 미치고 있으며, 이는 학급 전체에 활기를 불어넣는 중요한
                강점입니다.
              </p>
              <img
                src="/landing/tab2/ellipsis_vertical_gray.svg"
                alt="말줄임표 아이콘"
                className="w-4 pb-10 pt-3 max-md:py-6"
              />
            </div>

            {/* 세부분석 */}
            <div className="flex flex-col gap-3">
              <p className="pt-1 text-center text-base font-semibold text-emerald-500">
                세부분석
              </p>
              <p className="gap-2 text-center text-xl font-semibold max-md:text-base">
                학교생활과 네트워크 위치
              </p>

              {/* 카드영역 */}
              <WhiteCard type="detailedAnalysis" />
            </div>
          </div>

          {/* 초록색 카드 영역 */}
          <div className="flex flex-col gap-2 rounded-b-3xl bg-emerald-600 p-10 max-md:rounded-b-xl max-md:px-3 max-md:py-6">
            <img
              src="/landing/tab2/ellipsis_vertical_white.svg"
              alt="말줄임표 아이콘"
              className="w-4 self-center pb-10 pt-6 max-md:py-6"
            />

            <div className="flex flex-col gap-3">
              <div className="py-1 text-center text-base font-semibold text-white">
                <span className="block text-amber-400">(Insight)</span>
                맞춤 솔루션 제안
              </div>
              <p className="text-center text-xl font-semibold text-white max-md:text-base">
                김OO 학생의 뛰어난 리더십을 긍정적으로 발휘하도록 돕고..
              </p>

              {/* 카드영역 */}
              <WhiteCard type="customizedSolution" />

              <img
                src="/landing/tab2/green_card_img.svg"
                alt="맞춤 솔루션 제안 이미지"
                className="block max-md:hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiDiagnosisReport;
