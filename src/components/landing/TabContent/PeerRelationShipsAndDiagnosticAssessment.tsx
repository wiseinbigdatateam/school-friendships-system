import SectionTitle from "../../SectionTitle";
import AccordionSection from "../Accordion/AccordionSection";

const teachersRights = {
  skills: [
    { title: "민원 방어", desc: "데이터 기반 지도 근거 확보" },
    { title: "법적 보호", desc: "허위신고·차별 주장에 대응 가능" },
    { title: "심리적 보호", desc: "교사 개인 판단이 아닌 데이터 근거 강조" },
    { title: "행정 지원", desc: "자동 리포트로 학교장·교육청이 공식 대응" },
  ],
  effects: [
    { title: "편파 민원 방지", desc: "생활지도가 객관적 데이터 기반임을 입증" },
    { title: "차별 주장 방어", desc: "특정 학생 지도 근거 확보" },
    {
      title: "법정 근거",
      desc: "사건 전후 데이터 기록으로 교사 조치 정당성 증명",
    },
    {
      title: "자의적 판단 논란 완화",
      desc: "교사 지도훈육이 표준화된 AI 기반임을 증명",
    },
  ],
};

function PeerRelationShipsAndDiagnosticAssessment() {
  return (
    <div className="mx-auto flex w-[1280px] flex-col gap-[72px] py-12 max-xl:w-full max-xl:px-6 max-md:gap-12 xl:py-[72px]">
      {/* 학생 교우관계 */}
      <div className="flex flex-col gap-5 max-md:gap-4">
        <SectionTitle
          title="학생 교우관계"
          desc={{
            point: "교우관계 분석은 소셜네트워크 분석방법론(SNA)을 적용",
            basic:
              "학급 내 학생들간의 교우관계를 시각적으로 표현하고 현 상태 진단",
          }}
        />

        {/* 하단 이미지 */}
        <div className="relative flex gap-6 rounded-3xl border border-gray-300 py-7 max-md:flex-col md:gap-12 md:px-10 md:pt-7 lg:h-fit lg:justify-center lg:pt-10">
          <div className="flex flex-col items-center gap-2.5 lg:h-[350px]">
            <p className="text-base text-indigo-500">
              간단한 설문방식으로 교우관계 조사
            </p>

            <div className="relative bottom-0 h-[240px] overflow-hidden rounded-t-[58px] border-x-8 border-t-8 border-[#e7e7e7] md:h-[250px] lg:absolute lg:h-fit lg:max-w-[282px]">
              <img
                src="/landing/tab1/section1_1.svg"
                alt="section1 첫 번째 이미지"
                className="w-full rounded-t-[50px]"
              />
              <div className="absolute top-0 flex h-full w-full flex-col items-center justify-center rounded-t-[50px] bg-black/65">
                <p className="py-[5px] text-xl font-bold text-white">
                  반 친구 중 누구와
                  <br />
                  친하게 지내나요?
                </p>
                <div className="h-[42px] w-[213px] rounded-[4px] border border-[#595959] bg-black"></div>
              </div>
            </div>
          </div>

          <img
            src="/landing/right_arrow.svg"
            alt="우측 화살표"
            className="self-center max-md:w-[18px] max-md:rotate-90 md:translate-x-4"
          />

          <div className="flex flex-col items-center gap-2.5">
            <p className="text-base text-indigo-500">자동으로 분석결과</p>
            <div className="flex items-center">
              <img
                src="/landing/tab1/section1_2.svg"
                alt="section1 두 번째 이미지"
                className="max-w-fit max-lg:hidden"
              />
              <img
                src="/landing/tab1/section1_3.svg"
                alt="section1 세 번째 이미지"
                className="max-w-fit md:py-12"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 소외 학생 예방 및 관리방안 자동화 */}
      <div className="flex flex-col gap-5 max-md:gap-4">
        <SectionTitle
          title="소외 학생 예방 및 관리방안 자동화"
          desc={{
            point:
              "매월 정기적 조사로 학생별 개인화된 상태진단 및 관리 방안 자동화 제공",
            basic: "소외 가능성이 있는 학생에 대한 모니터링 및 예방 가능",
          }}
        />

        {/* 하단 이미지 */}
        <div className="flex w-full justify-center rounded-3xl border border-gray-300 max-lg:gap-4 max-lg:p-6 max-md:flex-col lg:gap-5 lg:p-10">
          <div className="flex items-center gap-1">
            <div className="font-base flex w-full flex-col gap-2 font-semibold text-white max-md:gap-1">
              <span className="w-[172px] rounded-[30px] bg-amber-500 px-6 py-1 text-center max-md:w-full max-md:px-5 max-md:py-2">
                외톨이형 학생
              </span>
              <span className="w-[172px] rounded-[30px] bg-orange-500 px-6 py-1 text-center max-md:w-full max-md:px-5 max-md:py-2">
                학교 생활 불만 학생
              </span>
              <span className="w-[172px] rounded-[30px] bg-red-500 px-6 py-1 text-center max-md:w-full max-md:px-5 max-md:py-2">
                문제 사건 경험 학생
              </span>
            </div>
            <img
              src="/landing/tab1/section2_1.svg"
              alt="section2 첫 번째 이미지"
              className="hidden xl:block"
            />
          </div>

          <img
            src="/landing/right_arrow.svg"
            alt="우측 화살표"
            className="self-center max-md:w-[18px] max-md:rotate-90"
          />

          <div className="flex flex-col gap-1">
            <span className="rounded-[30px] bg-gray-600 px-6 py-3 text-center text-base font-semibold text-white max-md:px-5 max-md:py-2">
              정기적인 개인화 학생 관리
            </span>
            <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-100 px-3 py-6 md:py-8 lg:px-6 lg:py-10">
              <p className="text-xl font-semibold">김OO 학생</p>
              <div className="flex flex-col items-center gap-1">
                <img
                  src="/landing/tab1/section2_profile.svg"
                  alt="프로필 아이콘"
                  className="w-9 md:w-12"
                />
                <ul className="flex list-inside list-disc flex-col gap-1 text-base">
                  <li className="text-sm text-red-500 md:text-base">
                    최근 폭력 사건 경험
                  </li>
                  <li className="text-sm text-red-500 md:text-base">
                    급격한 정서수준 저하
                  </li>
                  <li className="text-sm text-red-500 md:text-base">
                    정상형 → 외톨이형 변화
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <img
            src="/landing/right_arrow.svg"
            alt="우측 화살표"
            className="block max-md:hidden"
          />

          <div className="block flex flex-col gap-1 max-md:hidden md:w-[182px] lg:w-[221px]">
            <span className="rounded-[30px] bg-sky-700 px-6 py-3 text-center text-base font-semibold text-white">
              AI LLM 가이드 활용
            </span>
            <div className="flex h-[248px] flex-col items-center gap-5 rounded-xl px-6 py-8">
              <img
                src="/landing/tab1/section2_ai.svg"
                alt="ai 아이콘"
                className="w-[70px]"
              />
              <ul className="flex list-inside list-disc flex-col gap-1">
                <li className="text-base">AI 심리 진단분석</li>
                <li className="text-base">맞춤형 대화 가이드 제공</li>
                <p className="text-center">..</p>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 학생 진단·평가 */}
      <div className="flex flex-col gap-5 max-md:hidden">
        <SectionTitle
          title="학생 진단·평가"
          desc={{
            point:
              "학교생활·정서심리진단 + 관계 네트워크분석으로 개인화된 학생 관리 가이드 자동 생성",
            basic: "과학적 방법론에 기반한 학생관리",
          }}
        />

        {/* 하단 이미지 */}
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-300 md:p-6 lg:p-10">
          <div className="rounded-[30px] bg-sky-700 px-10 py-3 text-xl font-semibold text-white lg:px-[72px] lg:py-4">
            과학적 방법론과 표준화된 학생 개인별 맞춤 관리
          </div>

          <img
            src="/landing/tab1/top_arrow.svg"
            alt="위쪽 화살표"
            className="w-[23px]"
          />

          <div className="flex w-full justify-center gap-3">
            <div className="flex flex-col gap-3 rounded-xl bg-gray-100 px-6 py-8">
              <span className="w-full rounded-xl bg-gray-500 px-5 py-2 text-center text-base font-semibold text-white lg:px-6">
                학생 관계 분석
              </span>
              <div className="flex flex-col gap-5">
                <p className="text-base font-semibold">• 소외된 학생 발견</p>
                <img
                  src="/landing/tab1/section4_1.svg"
                  alt="네트워크 이미지"
                  className="w-[180px] pt-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-gray-100 px-6 py-8">
              <span className="w-full rounded-xl bg-gray-700 px-5 py-2 text-center text-base font-semibold text-white lg:px-6">
                학교 생활·정서심리 만족
              </span>
              <div className="flex flex-col gap-5">
                <p className="text-base font-semibold">
                  • 학교 생활 정서·수준 추적
                </p>
                <img
                  src="/landing/tab1/section3_chart.svg"
                  alt="차트 이미지"
                  className="w-[244px]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl bg-gray-100 px-6 py-8">
              <span className="w-full rounded-xl bg-gray-500 px-5 py-2 text-center text-base font-semibold text-white lg:px-6">
                문제 사건 모니터링
              </span>
              <div className="flex flex-col gap-3">
                <p className="text-base font-semibold">• 최근 사건 모니터링</p>
                <img
                  src="/landing/tab1/section3_stress.svg"
                  alt="스트레스 범위 이미지"
                  className="w-[203px]"
                />
              </div>
            </div>

            <img
              src="/landing/tab1/section3_4.svg"
              alt="section3 네 번째 이미지"
              className="hidden xl:block"
            />
          </div>
        </div>
      </div>

      {/* 학생 진단·평가 활용방안 */}
      <div className="flex flex-col gap-5 max-md:gap-4">
        <SectionTitle title="학생 진단·평가 활용방안" />
        <AccordionSection tabMenu={0} />
      </div>

      {/* 교권보호 효과 */}
      <div className="flex flex-col gap-5 max-md:gap-4">
        <SectionTitle
          title="교권보호 효과"
          desc={{
            point: "교권보호 직접 지원 지능",
            basic: "교사를 지키는 데이터 기반 방패",
          }}
        />

        {/* 하단 컨텐츠 */}
        <div className="flex items-center gap-8 border-y border-gray-300 py-6 md:p-6 lg:p-10">
          {/* 왼쪽 텍스트 카드 */}
          <div className="flex w-full flex-col gap-5 lg:w-1/2">
            <ul className="flex list-inside list-disc flex-col gap-3 marker:text-sky-700">
              {teachersRights.skills.map((item) => (
                <li className="md:flex">
                  <span
                    className="mr-1 text-base font-semibold text-sky-700"
                    key={item.title}
                  >
                    {item.title}
                  </span>
                  <p className="text-base max-md:px-4 max-md:text-sm">
                    {" "}
                    : {item.desc}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-400 p-3">
              {teachersRights.effects.map((item) => (
                <div className="flex items-center gap-2 text-sm max-md:flex-col max-md:items-start max-md:gap-1">
                  <span className="min-w-[146px] rounded-[4px] border border-[#e7e7e7] px-3 py-1 text-center text-red-500">
                    {item.title}
                  </span>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 이미지  */}
          <img
            src="/landing/tab1/section5_1.svg"
            alt="section5 이미지"
            className="hidden lg:block lg:w-1/2"
          />
        </div>
      </div>
    </div>
  );
}

export default PeerRelationShipsAndDiagnosticAssessment;
