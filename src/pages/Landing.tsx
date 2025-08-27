import React from "react";
import { useNavigate } from "react-router-dom";

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

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
        </div>
      </footer>
    </div>
  );
};

export default Landing;
