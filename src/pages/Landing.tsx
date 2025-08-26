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
      <header className="bg-white h-[47px] px-[60px] text-gray-950 sticky top-0 z-50 py-2">
        <div className="flex justify-between items-center text-base font-medium">
          <div className="flex gap-10">
            <img src="/header_logo.svg" alt="와이즈온 스쿨 로고" />

            <nav className="flex items-center gap-10 ">
              <button className="">서비스소개</button>
              <button className="">체험 신청하기</button>
            </nav>
          </div>

          <button
            onClick={handleLoginClick}
            className="bg-sky-700 text-white px-6 py-1.5 rounded-[30px] h-8  hover:transition-all duration-200"
          >
            로그인
          </button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* 배경 이미지 (학생들이 태블릿을 사용하는 이미지) */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
          style={{
            backgroundImage: `url('/studentsimg.png')`,
          }}
        ></div>

        {/* 어두운 오버레이로 텍스트 가독성 향상 */}
        <div className="absolute inset-0 bg-black/40 z-10"></div>

        <div className="relative z-20 text-center text-white max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            학교 업무경감을 위한
            <br />
            스마트스쿨 학교관리 솔루션
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-blue-100">
            교사: 상시적 교우관계조사 분석과 편리한 학급조사
          </p>
          <button
            onClick={handleSolutionClick}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-200 mb-8"
          >
            솔루션사용하기
          </button>

          {/* 페이지네이션 인디케이터 */}
          {/* <div className="flex justify-center items-center space-x-2 mb-8">
            <div className="w-8 h-1 bg-white/50 rounded"></div>
            <div className="w-8 h-1 bg-white rounded"></div>
            <div className="w-8 h-1 bg-white/50 rounded"></div>
            <div className="w-8 h-1 bg-white/50 rounded"></div>
          </div> */}
        </div>

        {/* 하단 배너 */}
        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white py-4 text-center">
          <p className="text-lg font-medium">
            공공클라우드 선정 SaaS, 조달등록제품, 혁신조달선정
          </p>
        </div>
      </section>

      {/* 핵심 기능 섹션 */}
      <section id="core-features" className="py-20 bg-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              학교의 모든 관리, 디지털로 현명하게 켜세요!
            </h2>
            <p className="text-xl text-blue-200">
              조사분석 학생관계관리 지도관리까지
            </p>
          </div>

          {/* 기능 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white text-gray-800 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">학교운영조사 자동분석</h3>
              <p className="text-gray-600">
                학교 운영에 필요한 다양한 조사를 자동으로 분석하고 보고서를
                생성합니다.
              </p>
            </div>
            <div className="bg-white text-gray-800 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">교우관계분석</h3>
              <p className="text-gray-600">
                학생들의 교우관계를 쉽게 모니터링하고 분석할 수 있습니다.
              </p>
            </div>
            <div className="bg-white text-gray-800 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">
                LLM 기반의 지도 리포트 제공
              </h3>
              <p className="text-gray-600">
                LLM 기반으로 학생들의 지도 리포트를 자동으로 생성합니다.
              </p>
            </div>
          </div>

          <div className="text-center mb-12">
            <p className="text-2xl text-blue-400 font-semibold">
              학교운영에 대한 다양한 조사, 분석, 보고서 작성 등 업무 부담 감소
            </p>
          </div>

          {/* 기능 쇼케이스 */}
          {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="bg-gray-700 p-8 rounded-lg">
              <h3 className="text-2xl font-bold mb-4">학교업무의 정상화</h3>
              <p className="text-xl mb-6">행정의 DX로 획기적인 업무경감</p>
              <div className="space-y-2">
                <button className="block text-left text-blue-300 hover:text-white transition-colors">학교운영 조사 {'>'}</button>
                <button className="block text-left text-blue-300 hover:text-white transition-colors">교우관계분석 {'>'}</button>
                <button className="block text-left text-blue-300 hover:text-white transition-colors">현장시설 모니터링 {'>'}</button>
              </div>
            </div>
            <div className="text-center">
              <div className="bg-white p-8 rounded-lg inline-block">
                <div className="w-64 h-40 bg-gray-100 rounded flex items-center justify-center mb-4">
                  <span className="text-gray-600 font-medium">WiseON-School</span>
                </div>
                <div className="relative">
                  <div className="w-32 h-20 bg-blue-400 rounded-lg flex items-center justify-center text-white text-sm mx-auto">
                    학교 업무의 간편화
                  </div>
                  <div className="w-8 h-8 bg-white rounded-full border-2 border-gray-300 mx-auto mt-2"></div>
                </div>
              </div>
            </div>
          </div> */}

          {/* CTA 배너 */}
          <div className="bg-blue-600 text-white text-center py-8 rounded-lg mt-12">
            <p className="text-2xl font-bold mb-4">
              학교업무를 획기적으로 경감할 수 있습니다
            </p>
            <button
              onClick={handleContactClick}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              문의하기
            </button>
          </div>
        </div>
      </section>

      {/* 학교운영조사 상세 섹션 */}
      <section id="survey-analysis" className="py-3 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                학교 운영 조사
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                학교 운영에 대한 피드백을 쉽고 빠르게 수집할 수 있으며, 50개
                이상의 검증된 학교 전용 설문을 원클릭으로 제공합니다
              </p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                더보기 {">"}
              </button>
            </div>
            {/* 오른쪽: 이미지만 표시 */}
            <div className="bg-gray-100 p-2 rounded-lg">
              <img
                src="/landing/third-section1.png"
                alt="학생들이 태블릿을 사용하는 모습"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
        {/* 섹션 구분선 */}
        <div className="border-b border-gray-200 mt-8"></div>
      </section>

      {/* 분석보고서 자동화 섹션 */}
      <section className="py-3 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                분석보고서 자동화
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                AI가 표, 그래프, 해석이 포함된 분석보고서를 자동으로 생성하며,
                모든 결과는 웹/리포트로 제공되고 자동 해석이 포함됩니다
              </p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                더보기 {">"}
              </button>
            </div>
            {/* 오른쪽: 이미지만 표시 */}
            <div className="bg-gray-100 p-2 rounded-lg">
              <img
                src="/landing/third-section2.png"
                alt="분석보고서"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
        {/* 섹션 구분선 */}
        <div className="border-b border-gray-200 mt-8"></div>
      </section>

      {/* 교우관계분석 섹션 */}
      <section className="py-3 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                교우관계분석
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                WiseON의 교우관계분석은 소셜네트워크분석방법론 (SNA)을 적용하여
                학급 내 학생들간의 교우관계를 시각적으로 표현하고 현 상태를
                진단합니다
              </p>
              <button className="text-blue-800 hover:text-blue-800 font-medium">
                더보기 {">"}
              </button>
            </div>
            {/* 오른쪽: 이미지만 표시 */}
            <div className="bg-gray-100 p-2 rounded-lg">
              <img
                src="/landing/third-section4.png"
                alt="교우관계분석"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
        {/* 섹션 구분선 */}
        <div className="border-b border-gray-200 mt-8"></div>
      </section>

      {/* 고급 통계 분석 섹션 */}
      <section className="py-3 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-800 mb-6">
                고급 통계 분석
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                코로나로 인한 비대면수업교육이 학생의 학업 무기력에 어떤 영향을
                미쳤나?(회귀분석) 학교 현장연구 / 논문분석 / 학생 연구지도를
                위한 자동화 통계분석 솔루션도
              </p>
              <button className="text-blue-600 hover:text-blue-800 font-medium">
                더보기 {">"}
              </button>
            </div>
            {/* 오른쪽: 이미지만 표시 */}
            <div className="bg-gray-100 p-2 rounded-lg">
              <img
                src="/landing/third-section5.png"
                alt="고급 통계 분석"
                className="w-full h-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
        {/* 섹션 구분선 */}
        <div className="border-b border-gray-200 mt-8"></div>
      </section>

      {/* 수상 및 인증 섹션 */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-6">
              공공 클라우드 선정 SaaS, 조달등록제품
            </h2>
          </div>

          {/* 수상 내역 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-0">
            {/* 2023 공공 SaaS 선정 */}
            <div className="bg-white border-2 border-blue-300 p-6 rounded-full text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="font-bold text-lg mb-2 text-gray-800">2023</div>
              <h3 className="font-bold text-lg mb-2 text-gray-800">
                공공 SaaS 선정
              </h3>
              <p className="text-sm text-gray-600 mb-1">100개 솔루션 중 4위</p>
              <p className="text-sm text-gray-600">2025 조달청 등록</p>
            </div>

            {/* 인텔리전스 대상 */}
            <div className="bg-white border-2 border-blue-300 p-6 rounded-full text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="font-bold text-lg mb-2 text-gray-800">
                인텔리전스
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-800">대상</h3>
              <p className="text-sm text-gray-600 mb-1">
                AI조사분석자동레포팅 솔루션
              </p>
              <p className="text-sm text-gray-600">'데이터인'개발</p>
            </div>

            {/* 2009 제14회 디지털이노베이션 대상 */}
            <div className="bg-white border-2 border-blue-300 p-6 rounded-full text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="font-bold text-lg mb-2 text-gray-800">
                2009 제 14회
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-800">
                디지털이노베이션 대상
              </h3>
              <p className="text-sm text-gray-600 mb-1">과학기술정보통신부</p>
              <p className="text-sm text-gray-600">한국일보</p>
            </div>

            {/* 2023 경제부총리상 수상 */}
            <div className="bg-white border-2 border-blue-300 p-6 rounded-full text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="font-bold text-lg mb-2 text-gray-800">2023</div>
              <h3 className="font-bold text-lg mb-2 text-gray-800">
                경제부총리상 수상
              </h3>
              <p className="text-sm text-gray-600 mb-1">서비스산업</p>
              <p className="text-sm text-gray-600">유공자</p>
            </div>

            {/* 디지털 서비스 혁신 제품 등록 */}
            <div className="bg-white border-2 border-blue-300 p-6 rounded-full text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="font-bold text-lg mb-2 text-gray-800">
                디지털 서비스
              </div>
              <h3 className="font-bold text-lg mb-2 text-gray-800">
                혁신제품 등록
              </h3>
              <p className="text-sm text-gray-600 mb-1">2025.7월</p>
              <p className="text-sm text-gray-600">혁신제품으로 등록</p>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl font-bold mb-6">
            교우관리, 학교관리, 지도관리를 한 번에 관리할 수 있습니다
          </p>
          <button
            onClick={handleContactClick}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            문의하기
          </button>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="bg-white text-gray-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 상단: 네비게이션 링크 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* 서비스 소개 */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">
                서비스 소개
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    학교운영조사
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    분석 보고서 자동화
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    학교 시설 관리
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    교우관계분석
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    고급통계분석
                  </a>
                </li>
              </ul>
            </div>

            {/* 헬프센터 */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">
                헬프센터
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    공지사항
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* 문의하기 */}
            <div>
              <h4 className="text-lg font-semibold mb-4 text-gray-800">
                문의하기
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li>
                  <a href="#" className="hover:text-blue-600 transition-colors">
                    문의하기
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* 중앙: 회사 정보 */}
          <div className="border-t border-gray-200 pt-8 mb-8">
            <div className="flex flex-col md:flex-row items-start md:items-right justify-between">
              <div className="flex items-right space-x-3 mb-4 md:mb-0">
                <div className="w-12 h-12 flex items-right justify-right">
                  <img
                    src="/wise-footer-logo.png"
                    alt="WiseON Footer Logo"
                    className="w-full h-full object-contain"
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

          {/* 하단: 법률 및 소셜 미디어 */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6 mb-4 md:mb-0">
                <a
                  href="#"
                  className="text-gray-600 hover:text-blue-600 underline font-medium"
                >
                  개인정보처리방침
                </a>
                <a
                  href="#"
                  className="text-gray-600 hover:text-blue-600 underline font-medium"
                >
                  이용약관
                </a>
                <p className="text-sm text-gray-500">
                  Copyright WISEINCOMPANY CO.,LTD ALL Right Reserved
                </p>
              </div>

              {/* 소셜 미디어 아이콘 */}
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <span className="text-xs font-medium">blog</span>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
