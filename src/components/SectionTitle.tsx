type DescType = {
  point: string;
  basic: string;
};

function SectionTitle({ title, desc }: { title: string; desc?: DescType }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {desc && (
        <p className="flex flex-col items-center">
          <span className="font-semibold text-sky-700">{desc.point}</span>
          {desc.basic}
        </p>
      )}
    </div>
  );
}

export default SectionTitle;
