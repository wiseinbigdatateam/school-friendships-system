import clsx from "clsx";

const usagePlan = [
  {
    id: "교우관계분석",
    question: "같은 반에서 누구와 친하게 지냅니까?",
    img1: "/landing/tab1/section4_1.svg",
    img2: "/landing/tab1/section4_2.svg",
  },
  {
    id: "학교 만족도",
    question: "나는 학교생활에 만족하고 있다",
    img1: "/landing/tab1/section4_3.svg",
    img2: "/landing/tab1/section4_4.svg",
  },
  {
    id: "학교 폭력조사",
    question: "최근 6개월 동안, 학교에서 친구들에게 놀림을 당한 적이 있나요?",
    img1: "/landing/tab1/section4_5.svg",
    img2: "/landing/tab1/section4_6.svg",
  },
];

function UsagePlanContent() {
  return (
    <div className="flex w-1/2 flex-col">
      {usagePlan.map((item, idx) => (
        <>
          <div className="flex w-full text-base" key={item.id}>
            <span className="h-10 w-[110px] rounded-[36px] border border-dashed border-gray-300 bg-gray-50 px-5 py-2">
              설문 문항1
            </span>
            <span
              className={clsx(
                "h-10 w-[474px] rounded-[36px] border border-dashed border-gray-300 bg-gray-50 py-2 text-center",
                item.id === "학교 폭력조사" ? "px-3" : "px-[72px]",
              )}
            >
              {item.question}
            </span>
          </div>
          <div className="flex h-[344px] items-center gap-1">
            <img src={item.img1} alt={`${item.id} 첫 번째 이미지`} />
            <img src={item.img2} alt={`${item.id} 두 번째 이미지`} />
          </div>
        </>
      ))}
    </div>
  );
}

export default UsagePlanContent;
