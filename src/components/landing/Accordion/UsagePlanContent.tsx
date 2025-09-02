import clsx from "clsx";
import { accordionData } from "../../../data/accordionData";

function UsagePlanContent({ selectedItemId }: { selectedItemId: string }) {
  const selectedItem = accordionData.usagePlan.find(
    (item) => item.id === selectedItemId,
  );

  if (!selectedItem) return null;
  return (
    <div className="flex w-1/2 flex-col">
      <div className="flex w-full text-base" key={selectedItem.id}>
        <span className="hidden h-10 w-[110px] rounded-[36px] border border-dashed border-gray-300 bg-gray-50 px-5 py-2 xl:block">
          설문 문항1
        </span>
        <span
          className={clsx(
            "hidden h-10 w-full rounded-[36px] border border-dashed border-gray-300 bg-gray-50 py-2 text-center lg:block xl:w-[474px]",
            selectedItem.id === "학교 폭력조사" ? "px-3" : "px-[72px]",
          )}
        >
          {selectedItem.question}
        </span>
      </div>
      <div
        className={clsx(
          "flex h-[344px] w-full items-center",
          selectedItem.id === "교우관계분석"
            ? "justify-center lg:gap-5 xl:gap-[30px]"
            : "gap-1",
        )}
      >
        <img
          src={selectedItem.img1}
          alt={`${selectedItem.id} 첫 번째 이미지`}
          className="w-2/3"
        />
        <img
          src={selectedItem.img2}
          alt={`${selectedItem.id} 두 번째 이미지`}
          className="w-1/3"
        />
      </div>
    </div>
  );
}

export default UsagePlanContent;
