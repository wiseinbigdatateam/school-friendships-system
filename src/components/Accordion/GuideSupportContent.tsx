import { accordionData } from "../../data/accordionData";

function GuideSupportContent({ selectedItemId }: { selectedItemId: string }) {
  return (
    <div className="flex w-1/2 flex-col">
      {/* 1. AI 심리 진단 분석 */}
      {selectedItemId === "AI 심리 진단 분석" && (
        <div className="flex h-[428px] w-full items-center justify-center gap-6 py-10">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-gray-100 px-6 py-10">
            <p className="text-xl font-semibold">김OO 학생</p>
            <div className="flex flex-col items-center gap-1">
              <img
                src="/landing/tab1/section2_profile.svg"
                alt="프로필 아이콘"
                className="w-12"
              />
              <ul className="flex list-inside list-disc flex-col gap-1">
                <li className="text-base text-red-500">최근 폭력 사건 경험</li>
                <li className="text-base text-red-500">급격한 정서수준 저하</li>
                <li className="text-base text-red-500">학교생활 만족 40점</li>
                <li className="text-base text-red-500">
                  정상형 → 외톨이형 변화
                </li>
              </ul>
            </div>
          </div>

          <img src="/landing/right_arrow.svg" alt="우측 화살표" />

          <div className="flex flex-col items-center gap-2.5">
            <img src="/landing/tab2/robot.svg" alt="AI 로봇 아이콘" />
            <p className="text-xl font-semibold text-sky-700">All LLM 활용</p>
          </div>
        </div>
      )}

      {/* 2. 맞춤형 대화 가이드 제공 */}
      {selectedItemId === "맞춤형 대화 가이드 제공" && (
        <div className="flex h-[456px] w-full flex-col items-center justify-center gap-7 py-10">
          <div className="flex gap-3">
            <img
              src="/landing/tab2/robot.svg"
              alt="AI 로봇 아이콘"
              className="w-20"
            />
            <img src="/landing/tab2/left_msg.svg" alt="왼쪽 말풍선" />
          </div>

          <div className="flex gap-3">
            <img src="/landing/tab2/right_msg.svg" alt="오른쪽 말풍선" />
            <img src="/landing/tab2/section2_profile.svg" alt="프로필 아이콘" />
          </div>

          <div className="flex gap-3 self-start pl-[71px]">
            <img
              src="/landing/tab2/robot.svg"
              alt="AI 로봇 아이콘"
              className="w-20"
            />
            <img src="/landing/tab2/small_msg.svg" alt="입력중 말풍선" />
          </div>
        </div>
      )}

      {/* 3. 편지/메세지 자동 작성 */}
      {selectedItemId === "편지/메세지 자동 작성" && (
        <div className="flex h-[428px] items-center justify-center">
          <img
            src="/landing/tab2/section3_1.svg"
            alt="편지/메세지 자동 작성 이미지"
            className="h-[328px]"
          />
        </div>
      )}

      {/* 4. 소그룹 친구&활동 계획 */}
      {selectedItemId === "소그룹 친구&활동 계획" && (
        <div className="flex h-[452px] flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/landing/tab2/robot.svg"
              alt="AI 로봇 아이콘"
              className="w-20"
            />
            <img
              src="/landing/tab2/left_msg.svg"
              alt="왼쪽 말풍선"
              className="w-[253px]"
            />
          </div>

          <img
            src="/landing/tab2/section4_1.svg"
            alt="소그룹 친구&활동 계획 이미지"
          />
        </div>
      )}
    </div>
  );
}

export default GuideSupportContent;
