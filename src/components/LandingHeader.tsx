import { useNavigate } from "react-router-dom";

function LandingHeader() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
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
  );
}

export default LandingHeader;
