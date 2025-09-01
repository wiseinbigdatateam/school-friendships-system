import { useState } from "react";
import { useNavigate } from "react-router-dom";

import LandingHeader from "../components/landing/LandingHeader";
import TabMenu from "../components/landing/TabMenu";
import PeerRelationShipsAndDiagnosticAssessment from "../components/landing/TabContent/PeerRelationShipsAndDiagnosticAssessment";
import AiDiagnosisReport from "../components/landing/TabContent/AiDiagnosisReport";

const Landing: React.FC = () => {
  const [tabMenu, setTabMenu] = useState(0);
  const navigate = useNavigate();

  const handleSolutionClick = () => {
    navigate("/dashboard");
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
            className="w-[191px] rounded-[50px] bg-sky-700 px-8 py-4 text-xl font-semibold text-white transition-all duration-200 hover:bg-sky-500"
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
        {/* 탭 메뉴 */}
        <TabMenu value={tabMenu} onChange={setTabMenu} />

        {/* 해당 컨텐츠 */}
        {tabMenu === 0 ? (
          <PeerRelationShipsAndDiagnosticAssessment />
        ) : (
          <AiDiagnosisReport />
        )}
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
