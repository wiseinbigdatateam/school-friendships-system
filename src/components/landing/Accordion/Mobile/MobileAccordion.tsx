import UsagePlanContent from "./UsagePlanContent";

function MobileAccordion({ tabMenu }: { tabMenu: number }) {
  return (
    <div className="relative flex w-full flex-col">
      {tabMenu === 0 && <UsagePlanContent />}
    </div>
  );
}

export default MobileAccordion;
