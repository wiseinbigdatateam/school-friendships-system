import clsx from "clsx";
import { accordionData } from "../../../data/accordionData";

function UsagePlanContent({ selectedItemId }: { selectedItemId: string }) {
  const selectedItem = accordionData.usagePlan.find(
    (item) => item.id === selectedItemId,
  );

  if (!selectedItem) return null;
  return (
    <div className="flex w-1/2 flex-col xl:items-center">
      <div
        className={clsx(
          "hidden h-10 w-fit rounded-[36px] border border-dashed border-gray-300 bg-gray-50 py-2 text-center text-base lg:block",
          selectedItem.id === "학교 폭력조사" ? "px-11" : "px-[60px]",
        )}
      >
        {selectedItem.question}
      </div>

      <div
        className={clsx(
          "flex h-[344px] w-full items-center p-10 pl-0",
          selectedItem.id === "교우관계분석"
            ? "justify-center gap-5 xl:gap-[30px]"
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
