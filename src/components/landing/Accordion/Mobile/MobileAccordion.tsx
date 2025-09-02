import MobileUsagePlanContent from "./MobileUsagePlanContent";
import MobileGuideSupportContent from "./MobileGuideSupportContent";

function MobileAccordion({ tabMenu }: { tabMenu: number }) {
  return (
    <div className="relative flex w-full flex-col">
      {tabMenu === 0 ? (
        <MobileUsagePlanContent />
      ) : (
        <MobileGuideSupportContent />
      )}
    </div>
  );
}

export default MobileAccordion;
