import { useNavigate } from "react-router-dom";
import LandingHeader from "../components/LandingHeader";
import TabMenu from "../components/TabMenu";

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
      <header className="sticky top-0 z-50 h-[47px] bg-white px-[60px] py-2 text-gray-950">
        <div className="flex items-center justify-between text-base font-medium">
          <div className="flex gap-10">
            <img src="/header_logo.svg" alt="와이즈온 스쿨 로고" />

            <nav className="flex items-center gap-10">
              <button className="">서비스소개</button>
              <button className="">체험 신청하기</button>
            </nav>
          </div>

          <button
            onClick={handleLoginClick}
            className="h-8 rounded-[30px] bg-sky-700 px-6 py-1.5 text-white transition-all duration-200 hover:bg-sky-900"
          >
            로그인
          </button>
        </div>
      </header>

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
        <div className="absolute bottom-0 z-20 w-[1280px] bg-sky-700 py-2 text-center text-base text-white">
          <p className="text-lg font-medium">
            공공클라우드 선정 SaaS, 조달등록제품, 혁신조달선정
          </p>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-white py-16 text-gray-700">
        {/* 중앙: 회사 정보 */}
        <div className="mb-8 border-t border-gray-200 pt-8">
          <div className="md:items-right flex flex-col items-start justify-between md:flex-row">
            <div className="items-right mb-4 flex space-x-3 md:mb-0">
              <div className="items-right justify-right flex h-12 w-12">
                <img
                  src="/wise-footer-logo.png"
                  alt="WiseON Footer Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <p className="text-sm text-gray-600">
                대표이사 : 김원표, 사업자등록번호 : 113-86-13917
              </p>
              <p>
                서울특별시 강남구 언주로 309 기성빌딩 3층 (주)와이즈인컴퍼니
              </p>
              <p>wic@wiseinc.co.kr</p>
              <p className="font-semibold">고객센터 02.558.5144</p>
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
