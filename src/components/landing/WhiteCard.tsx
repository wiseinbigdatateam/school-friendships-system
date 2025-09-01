import { whiteCardData } from "../../data/whiteCardData";

type WhiteCardProps = {
  type: "detailedAnalysis" | "customizedSolution";
};

function WhiteCard({ type }: WhiteCardProps) {
  return (
    <div className="flex gap-3">
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
  );
}

export default WhiteCard;
