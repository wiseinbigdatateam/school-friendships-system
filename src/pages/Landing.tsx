import { useNavigate } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleSolutionClick = () => {
    navigate("/dashboard");
  };

  const handleContactClick = () => {
    navigate("/contact");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <LandingHeader />

      {/* 히어로 섹션 */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* 배경 이미지 (학생들이 태블릿을 사용하는 이미지) */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('/mask_bg.png')`,
          }}
        ></div>

        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        <div className="absolute inset-0 z-10 bg-black/40"></div>

        <div className="z-20 mx-auto flex w-full flex-col items-center gap-3 px-4 text-center text-white">
          <h1 className="text-5xl font-bold leading-[120%]">
            학생 진단·평가
            <br />
            AI 플랫폼
          </h1>
          <p className="text-xl text-blue-100">
            과학적 방법론과 표준화된 학생 개인별 맞춤 관리
          </p>
          <button
            onClick={handleSolutionClick}
            className="w-[191px] rounded-[50px] bg-sky-700 px-8 py-4 text-xl font-semibold text-white transition-all duration-200 hover:bg-sky-900"
          >
            솔루션 체험하기
          </button>
        </div>

        {/* 하단 배너 */}
        <div className="absolute bottom-0 z-20 w-[1280px] bg-sky-700 py-2 text-white">
          <p className="text-center text-base">
            공공클라우드 선정 SaaS, 조달등록제품, 혁신조달선정
          </p>
        </div>
      </section>

      {/* 메인 컨텐츠 */}
      <section className="w-full text-gray-950">
        {/* 스위치 토글 */}
        <div className="w-full bg-gray-300 py-5">
          <div className="mx-auto flex w-[349px] gap-3 rounded-[50px] bg-white p-2">
            <span className="cursor-pointer rounded-[30px] px-6 py-3 text-base">
              교우관계 및 진단평가
            </span>
            <span className="cursor-pointer rounded-[30px] px-6 py-3 text-base">
              AI 진단 레포트
            </span>
          </div>
        </div>

        {/* 해당 컨텐츠 */}
        <div className="mx-auto flex w-[1280px] flex-col gap-[72px] py-[72px]">
          {/* 학생 교우관계 */}
          <div className="flex flex-col gap-5">
            {/* 상단 문구 */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold">학생 교우관계</h2>
              <p className="flex flex-col items-center">
                <span className="font-semibold text-sky-700">
                  교우관계 분석은 소셜네트워크 분석방법론(SNA)을 적용
                </span>
                학급 내 학생들간의 교우관계를 시각적으로 표현하고 현 상태 진단
              </p>
            </div>

            {/* 하단 이미지 */}
            <div className="flex justify-center gap-12 rounded-3xl border border-gray-300 pt-10">
              <div className="flex flex-col items-center gap-2.5">
                <p className="text-base text-indigo-500">
                  간단한 설문방식으로 교우관계 조사
                </p>

                <div className="relative rounded-t-[50px] border-x-8 border-t-8 border-[#e7e7e7]">
                  <img
                    src="/landing/tab1/section1_1.svg"
                    alt="section1 첫 번째 이미지"
                    className="rounded-t-[50px]"
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

              <img src="/landing/tab1/right_arrow.svg" alt="우측 화살표" />

              <div className="flex flex-col items-center gap-2.5">
                <p className="text-base text-indigo-500">자동으로 분석결과</p>
                <div className="flex items-center">
                  <img
                    src="/landing/tab1/section1_2.svg"
                    alt="section1 두 번째 이미지"
                  />
                  <img
                    src="/landing/tab1/section1_3.svg"
                    alt="section1 세 번째 이미지"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 소외 학생 예방 및 관리방안 자동화 */}
          <div className="flex flex-col gap-5">
            {/* 상단 문구 */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold">
                소외 학생 예방 및 관리방안 자동화
              </h2>
              <p className="flex flex-col items-center">
                <span className="font-semibold text-sky-700">
                  매월 정기적 조사로 학생별 개인화된 상태진단 및 관리 방안
                  자동화 제공
                </span>
                소외 가능성이 있는 학생에 대한 모니터링 및 예방 가능
              </p>
            </div>

            {/* 하단 이미지 */}
            <div className="flex justify-center gap-5 rounded-3xl border border-gray-300 p-10">
              <div className="flex items-center gap-1">
                <div className="font-base flex flex-col gap-2 font-semibold text-white">
                  <span className="w-[172px] rounded-[30px] bg-amber-500 px-6 py-1 text-center">
                    외톨이형 학생
                  </span>
                  <span className="w-[172px] rounded-[30px] bg-orange-500 px-6 py-1 text-center">
                    학교 생활 불만 학생
                  </span>
                  <span className="w-[172px] rounded-[30px] bg-red-500 px-6 py-1 text-center">
                    문제 사건 경험 학생
                  </span>
                </div>
                <img
                  src="/landing/tab1/section2_1.svg"
                  alt="section2 첫 번째 이미지"
                />
              </div>

              <img src="/landing/tab1/right_arrow.svg" alt="우측 화살표" />

              <div className="flex flex-col gap-1">
                <span className="w-[221px] rounded-[30px] bg-sky-500 px-6 py-3 text-center text-base font-semibold text-white">
                  정기적인 개인화 학생 관리
                </span>
                <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-100 px-6 py-10">
                  <p className="text-xl font-semibold">김OO 학생</p>
                  <div className="flex flex-col items-center gap-1">
                    <img
                      src="/landing/tab1/section2_profile.svg"
                      alt="프로필 아이콘"
                      className="w-12"
                    />
                    <ul className="flex list-inside list-disc flex-col gap-1">
                      <li className="text-base text-red-500">
                        최근 폭력 사건 경험
                      </li>
                      <li className="text-base text-red-500">
                        급격한 정서수준 저하
                      </li>
                      <li className="text-base text-red-500">
                        정상형 → 외톨이형 변화
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <img src="/landing/tab1/right_arrow.svg" alt="우측 화살표" />

              <div className="flex flex-col gap-1">
                <span className="w-[224px] rounded-[30px] bg-sky-700 px-6 py-3 text-center text-base font-semibold text-white">
                  AI LLM 가이드 활용
                </span>
                <div className="flex flex-col items-center gap-5 rounded-xl px-6 py-8">
                  <img
                    src="/landing/tab1/section2_ai.svg"
                    alt="ai 아이콘"
                    className="w-[70px]"
                  />
                  <ul className="flex list-inside list-disc flex-col gap-1">
                    <li className="text-base">AI 심리 진단분석</li>
                    <li className="text-base">맞춤형 대화 가이드 제공</li>
                    <li className="text-base">소그룹 친구 추천</li>
                    <p className="text-center">..</p>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 학생 진단·평가 */}
          <div className="flex flex-col gap-5">
            {/* 상단 문구 */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold">학생 진단·평가</h2>
              <p className="flex flex-col items-center">
                <span className="font-semibold text-sky-700">
                  학교생활·정서심리진단 + 관계 네트워크분석으로 개인화된 학생
                  관리 가이드 자동 생성
                </span>
                과학적 방법론에 기반한 학생관리
              </p>
            </div>

            {/* 하단 이미지 */}
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-gray-300 p-10">
              <div className="rounded-[30px] bg-sky-700 px-[72px] py-4 text-xl font-semibold text-white">
                과학적 방법론과 표준화된 학생 개인별 맞춤 관리
              </div>

              <img
                src="/landing/tab1/top_arrow.svg"
                alt="위쪽 화살표"
                className="w-[23px]"
              />

              <div className="flex gap-3">
                <img
                  src="/landing/tab1/section3_1.svg"
                  alt="section3 첫 번째 이미지"
                />
                <img
                  src="/landing/tab1/section3_2.svg"
                  alt="section3 두 번째 이미지"
                />
                <img
                  src="/landing/tab1/section3_3.svg"
                  alt="section3 세 번째 이미지"
                />
                <img
                  src="/landing/tab1/section3_4.svg"
                  alt="section3 네 번째 이미지"
                />
              </div>
            </div>
          </div>

          {/* 교권보호 효과 */}
          <div className="flex flex-col gap-5">
            {/* 상단 문구 */}
            <div className="flex flex-col items-center gap-2">
              <h2 className="text-2xl font-semibold">교권보호 효과</h2>
              <p className="flex flex-col items-center">
                <span className="font-semibold text-sky-700">
                  교권보호 직접 지원 지능
                </span>
                교사를 지키는 데이터 기반 방패
              </p>
            </div>

            {/* 하단 이미지 */}
            <div className="flex items-center gap-8 border-y border-gray-300 p-10">
              <div className="rounded-xlp-10 flex w-1/2 flex-col gap-5">
                <ul className="flex list-inside list-disc flex-col gap-3 text-base marker:text-sky-700">
                  <li>
                    <span className="mr-1 font-semibold text-sky-700">
                      심리적 보호
                    </span>
                    : 데이터 기반 지도 근거 확보
                  </li>
                  <li>
                    <span className="mr-1 font-semibold text-sky-700">
                      법적 보호
                    </span>
                    : 허위신고·차별 주장에 대응 가능
                  </li>
                  <li>
                    <span className="mr-1 font-semibold text-sky-700">
                      심리적 보호
                    </span>
                    : 교사 개인 판단이 아닌 데이터 근거 강조
                  </li>
                  <li>
                    <span className="mr-1 font-semibold text-sky-700">
                      행정 지원
                    </span>
                    : 자동 리포트로 학교장·교육청이 공식 대응
                  </li>
                </ul>

                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-gray-400 p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-[146px] rounded-[4px] border border-[#e7e7e7] px-3 py-1 text-center text-red-500">
                      편파 민원 방지
                    </span>
                    <p>생활지도가 객관적 데이터 기반임 입증</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-[146px] rounded-[4px] border border-[#e7e7e7] px-3 py-1 text-center text-red-500">
                      차별 주장 방어
                    </span>
                    <p>특정 학생 지도 근거 확보</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-[146px] rounded-[4px] border border-[#e7e7e7] px-3 py-1 text-center text-red-500">
                      법정 근거
                    </span>
                    <p>사건 전후 데이터 기록으로 교사 조치 정당성 증명</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-[146px] rounded-[4px] border border-[#e7e7e7] px-3 py-1 text-center text-red-500">
                      자의적 판단 논란 완화
                    </span>
                    <p>교사 지도훈육이 표준화된 AI 기반임 증명</p>
                  </div>
                </div>
              </div>

              <img src="/landing/tab1/section5_1.svg" alt="section5 이미지" />
            </div>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="w-full border-t border-gray-300 bg-white py-10 text-gray-700">
        <div className="mx-auto flex w-[1280px] flex-col">
          <img
            src="/wise-footer-logo.png"
            alt="와이즈인 컴퍼니 푸터 로고"
            className="w-[42px]"
          />
          <div className="mt-[7px] flex flex-col gap-1 text-xs text-[#818181]">
            <p>대표이사 : 김원표, 사업자등록번호 : 113-86-13917</p>
            <p>
              서울특별시 강남구 언주로 309 기성빌딩 3층 ㈜와이즈인컴퍼니
              wic@wiseinc.co.kr
            </p>
            <p>고객센터 02.558.5144</p>
          </div>
          <p className="mt-2.5 text-xs text-[#818181]">
            Copyright WISEINCOMPANY CO.,LTD ALL Right Reserved
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
