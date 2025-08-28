import { useState } from "react";
import clsx from "clsx";

const menuLabel = [
  { label: "교우관계 및 진단평가" },
  { label: "AI 진단 레포트" },
];

function TabMenu() {
  const [tabMenu, setTabMenu] = useState(0);

  return (
    <div className="w-full bg-gray-300 py-5">
      <div className="mx-auto flex w-[349px] gap-3 rounded-[50px] bg-white p-2">
        {menuLabel.map((item, idx) => (
          <span
            key={item.label}
            className={clsx(
              "cursor-pointer rounded-[30px] px-6 py-3 text-base duration-200 ease-in",
              tabMenu === idx && "bg-gray-950 text-white",
            )}
            onClick={() => setTabMenu(idx)}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default TabMenu;
