function Footer() {
  return (
    <footer className="w-full border-t border-gray-300 bg-white px-6 py-10 text-gray-700 xl:px-0">
      <div className="mx-auto flex w-full flex-col xl:w-[1280px]">
        <img
          src="/wise-footer-logo.png"
          alt="와이즈인 컴퍼니 푸터 로고"
          className="w-[42px]"
        />
        <div className="mt-[7px] flex w-full flex-col gap-1 text-xs text-[#818181]">
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
  );
}

export default Footer;
