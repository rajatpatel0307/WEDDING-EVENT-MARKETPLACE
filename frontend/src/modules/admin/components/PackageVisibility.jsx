export default function PackageVisibility({ value }) {
  const known = typeof value.customerVisible === "boolean";
  return (
    <div className="grid min-w-0 max-w-[340px] gap-2 text-[11px] leading-[1.6] [overflow-wrap:anywhere]">
      <span className={`w-fit rounded-full border px-2 py-0.5 font-medium ${known && value.customerVisible ? "border-[#cfe1d6] bg-[#eff7f1] text-[#2a7a58]" : "border-[#e8ddc7] bg-[#fbf6eb] text-[#8b6935]"}`}>
        {known ? value.customerVisible ? "Visible" : "Hidden" : "Visibility unavailable"}
      </span>
      {value.visibilityReasons?.length > 0 && (
        <ul className="m-0 grid list-none gap-1 p-0 text-[#7b6850]">
          {value.visibilityReasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
      {value.customerVisible && <span className="text-[#7b8b80]">{value.homepageEligible ? "Eligible for homepage features." : "Not featured on the homepage."}</span>}
    </div>
  );
}
