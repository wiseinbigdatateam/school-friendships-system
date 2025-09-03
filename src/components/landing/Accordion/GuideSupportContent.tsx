function GuideSupportContent({ selectedItemId }: { selectedItemId: string }) {
  return (
    <div className="flex w-full flex-col lg:w-1/2">
      {/* 1. AI 심리 진단 분석 */}
      {selectedItemId === "AI 심리 진단 분석" && (
        <div className="flex w-full items-center justify-center gap-2 pb-10 md:gap-6 lg:h-[428px] lg:py-10">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-100 p-5 md:p-6 lg:px-6 lg:py-10">
            <p className="text-base font-semibold md:text-xl">김OO 학생</p>
            <div className="flex flex-col items-center gap-1">
              <img
                src="/landing/tab1/section2_profile.svg"
                alt="프로필 아이콘"
                className="w-10 md:w-12"
              />
              <ul className="flex list-inside list-disc flex-col gap-1">
                <li className="text-sm text-red-500 md:text-base">
                  최근 폭력 사건 경험
                </li>
                <li className="text-sm text-red-500 md:text-base">
                  급격한 정서수준 저하
                </li>
                <li className="text-sm text-red-500 md:text-base">
                  학교생활 만족 40점
                </li>
                <li className="text-sm text-red-500 md:text-base">
                  정상형 → 외톨이형 변화
                </li>
              </ul>
            </div>
          </div>

          <img src="/landing/right_arrow.svg" alt="우측 화살표" />

          <div className="flex flex-col items-center gap-2.5">
            <img
              src="/landing/tab2/robot.svg"
              alt="AI 로봇 아이콘"
              className="max-md:w-20"
            />
            <p className="text-base font-semibold text-sky-700 md:text-xl">
              All LLM 활용
            </p>
          </div>
        </div>
      )}

      {/* 2. 맞춤형 대화 가이드 제공 */}
      {selectedItemId === "맞춤형 대화 가이드 제공" && (
        <div className="flex w-full flex-col items-center justify-center gap-6 pb-10 lg:h-[456px] lg:gap-7 lg:py-10">
          <img
            src="/landing/tab2/section2_1.svg"
            alt="맞춤형 대화 가이드 제공 이미지"
          />
        </div>
      )}

      {/* 3. 편지/메시지 자동 작성 */}
      {selectedItemId === "편지/메시지 자동 작성" && (
        <div className="flex items-center justify-center pb-10 lg:h-[428px]">
          <img
            src="/landing/tab2/section3_1.svg"
            alt="편지/메시지 자동 작성 이미지"
            className="h-[230px] md:h-[290px] lg:h-[328px]"
          />
        </div>
      )}

      {/* 4. 소그룹 친구&활동 계획 */}
      {selectedItemId === "소그룹 친구&활동 계획" && (
        <div className="flex flex-col items-center justify-center max-lg:pb-10 lg:h-[452px]">
          <img
            src="/landing/tab2/section4_basic.svg"
            alt="소그룹 친구&활동 계획 일반 사이즈"
            className="hidden lg:block"
          />
          <img
            src="/landing/tab2/section4_mobile.svg"
            alt="소그룹 친구&활동 계획 일반 사이즈"
            className="block lg:hidden"
          />
        </div>
      )}
    </div>
  );
}

export default GuideSupportContent;
