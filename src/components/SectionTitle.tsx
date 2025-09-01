type DescType = {
  point: string;
  basic: string;
};

function SectionTitle({ title, desc }: { title: string; desc?: DescType }) {
  return (
    <div className="flex flex-col items-center gap-2 max-md:items-start max-md:gap-1">
      <h2 className="text-2xl font-semibold max-md:text-lg">{title}</h2>
      {desc && (
        <p className="flex flex-col items-center max-md:items-start max-md:text-sm">
          <span className="font-semibold text-sky-700">{desc.point}</span>
          {desc.basic}
        </p>
      )}
    </div>
  );
}

export default SectionTitle;
