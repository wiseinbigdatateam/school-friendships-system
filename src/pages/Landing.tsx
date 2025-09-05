import { useState } from "react";
import { useNavigate } from "react-router-dom";

import LandingHeader from "../components/landing/LandingHeader";
import Footer from "../components/landing/Footer";
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
      <section className="relative flex h-[700px] items-center justify-center overflow-hidden max-md:h-[480px]">
        {/* 배경 이미지  */}
        <div
          className="absolute top-0 z-0 h-[700px] w-full bg-cover bg-center bg-no-repeat max-md:h-[480px]"
          style={{
            backgroundImage: `url('/mask_bg.png')`,
          }}
        ></div>

        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        <div className="absolute inset-0 z-10 h-[700px] w-full bg-black/40"></div>

        <div className="z-20 mx-auto flex w-full flex-col items-center gap-3 px-4 text-center text-white">
          <h1 className="text-5xl font-bold leading-[120%] max-md:text-4xl">
            <span className="animate-fade-in-up delay-100">학생 진단·평가</span>
            <br />
            <span className="animate-fade-in-up delay-300">AI 플랫폼</span>
          </h1>
          <p className="animate-fade-in-up text-base delay-500 max-md:text-sm">
            과학적 방법론과 표준화된 학생 개인별 맞춤 관리
          </p>
          <button
            onClick={handleSolutionClick}
            className="w-[191px] rounded-[50px] bg-sky-700 px-8 py-4 text-xl text-white transition-all duration-200 hover:bg-sky-500 max-md:w-[150px] max-md:px-6 max-md:py-3 max-md:text-base"
          >
            솔루션 체험하기
          </button>
        </div>
      </section>

      {/* 메인 컨텐츠 */}
      <section className="text-gray-950">
        {/* 탭 메뉴 */}
        <TabMenu value={tabMenu} onChange={setTabMenu} />

        {/* 해당 컨텐츠 */}
        {tabMenu === 0 ? (
          <PeerRelationShipsAndDiagnosticAssessment />
        ) : (
          <AiDiagnosisReport />
        )}
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
