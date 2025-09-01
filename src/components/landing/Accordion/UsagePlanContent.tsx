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
        <span className="h-10 w-[110px] rounded-[36px] border border-dashed border-gray-300 bg-gray-50 px-5 py-2">
          설문 문항1
        </span>
        <span
          className={clsx(
            "h-10 w-[474px] rounded-[36px] border border-dashed border-gray-300 bg-gray-50 py-2 text-center",
            selectedItem.id === "학교 폭력조사" ? "px-3" : "px-[72px]",
          )}
        >
          {selectedItem.question}
        </span>
      </div>
      <div className="flex h-[344px] items-center gap-1">
        <img
          src={selectedItem.img1}
          alt={`${selectedItem.id} 첫 번째 이미지`}
        />
        <img
          src={selectedItem.img2}
          alt={`${selectedItem.id} 두 번째 이미지`}
        />
      </div>
    </div>
  );
}

export default UsagePlanContent;
