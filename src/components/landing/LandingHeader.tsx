import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ContactModal from "./ContactModal";

function LandingHeader() {
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleContactClick = () => {
    setIsContactModalOpen(true);
  };

  return (
    <header className="sticky top-0 z-50 h-[47px] bg-white py-2 text-gray-950 md:px-2 lg:px-6 xl:px-[60px]">
      <div className="flex items-center justify-between font-medium">
        <img src="/landing/header_logo.svg" alt="와이즈온 스쿨 로고" />

        <div className="flex gap-3 lg:gap-10">
          <nav className="flex items-center gap-10">
            <button className="hidden text-base lg:block">서비스소개</button>
            <button
              className="text-sm lg:text-base"
              onClick={handleContactClick}
            >
              체험 신청하기
            </button>
          </nav>

          <button
            onClick={handleLoginClick}
            className="h-8 rounded-[30px] bg-sky-700 px-6 py-1.5 text-base text-white transition-all duration-200 hover:bg-sky-500"
          >
            로그인
          </button>
        </div>
      </div>
    </header>
  );
}

export default LandingHeader;
