import { whiteCardData } from "../../data/whiteCardData";

type WhiteCardProps = {
  type: "detailedAnalysis" | "customizedSolution";
};

const mobileCardData = [
  {
    title: "단기 솔루션(즉시 실행)",
    step: "1. 역할 부여 및 책임감 강화",
    stepColor: "text-sky-500",
    desc: "학급 내에서 학생의 리더십을 공식적으로 인정해 주는 역할( 예: 리더, 프로젝트 팀장)을 맡겨 긍정적인 방향으로 영향력을 발쉬 할 수 있도록 격려합니다",
  },
  {
    title: "장기 솔루션(계획적 도입)",
    step: "2. 멘토링",
    stepColor: "text-indigo-500",
    desc: "학생에게 리더의 진정한 의미(타인에 대한 배려, 책임감, 경청 등)에 대해 생각해 볼 기회를 제공하고, 교사가 조력자로서 함께 고민해 줍니다",
  },
];

function WhiteCard({ type }: WhiteCardProps) {
  return (
    <>
      {/* 768px ~  */}
      <div className="hidden gap-3 md:flex">
        {/* 회색 배경에 들어가는 카드 */}
        {type === "detailedAnalysis" &&
          whiteCardData.detailedAnalysis.map((item) => (
            <div
              className="flex w-1/2 flex-col gap-3 rounded-xl bg-white px-10 py-6"
              key={item.title}
            >
              <div className="flex flex-col gap-1 text-center">
                <p className="text-base font-semibold">{item.title}</p>
                <p className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold text-sky-700">
                  {item.titleDesc}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-700">{item.desc1}</p>
                <p className="text-sm text-gray-700">{item.desc2}</p>
                <img
                  src="/landing/tab2/ellipsis_vertical_gray.svg"
                  alt="말줄임표 아이콘"
                  className="w-4 self-center py-2"
                />
              </div>
            </div>
          ))}

        {/* 초록생 배경에 들어가는 카드 */}
        {type === "customizedSolution" &&
          whiteCardData.customizedSolution.map((item) => (
            <div
              className="flex w-1/3 flex-col items-center gap-3 rounded-xl bg-white px-10 py-6"
              key={item.title}
            >
              <p className="text-base font-semibold">{item.title}</p>
              <div className="flex flex-col items-center gap-1">
                <p className={`text-base font-semibold ${item.stepColor}`}>
                  {item.step}
                </p>
                <p className="text-sm text-gray-700">{item.desc}</p>
                <img
                  src="/landing/tab2/ellipsis_vertical_gray.svg"
                  alt="말줄임표 아이콘"
                  className="w-4 py-2"
                />
              </div>
            </div>
          ))}
      </div>

      {/* ~ 767px */}
      <div className="hidden flex-col gap-3 max-md:flex">
        {/* 회색 배경에 들어가는 카드 */}
        {type === "detailedAnalysis" && (
          <div className="flex w-full flex-col gap-3 rounded-xl bg-white p-6">
            <div className="flex flex-col gap-1 text-center">
              <p className="text-base font-semibold">교우관계 관계도</p>
              <p className="text-base font-semibold text-sky-700">주도형</p>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-700">
                다수의 학생으로부터 선택을 받아 관계망의 중심에 있으며...
              </p>
              <img
                src="/landing/tab2/ellipsis_vertical_gray.svg"
                alt="말줄임표 아이콘"
                className="w-4 self-center py-2"
              />
            </div>
          </div>
        )}

        {/* 초록생 배경에 들어가는 카드 */}
        {type === "customizedSolution" &&
          mobileCardData.map((item) => (
            <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-white px-10 py-6 max-md:p-6">
              <p className="text-base font-semibold">{item.title}</p>
              <div className="flex flex-col items-center gap-1">
                <p className={`text-base font-semibold ${item.stepColor}`}>
                  {item.step}
                </p>
                <p className="text-sm text-gray-700">{item.desc}</p>
                <img
                  src="/landing/tab2/ellipsis_vertical_gray.svg"
                  alt="말줄임표 아이콘"
                  className="w-4 py-2"
                />
              </div>
            </div>
          ))}
      </div>
    </>
  );
}

export default WhiteCard;
