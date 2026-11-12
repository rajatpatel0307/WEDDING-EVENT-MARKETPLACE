import { Layers, Tags, CircleCheck, CircleX, BriefcaseBusiness, Store, Users, Clock, SearchCheck, BadgeCheck, ShieldBan } from "lucide-react";
import { number } from "../api";

const vendorCards = [
  ["total", "All Vendors", Store],
  ["pending", "Pending", Clock],
  ["underReview", "Under Review", SearchCheck],
  ["approved", "Approved", BadgeCheck],
  ["rejected", "Rejected", CircleX],
  ["suspended", "Suspended", ShieldBan],
];
const customerCards = [
  ["total", "All Customers", Users],
  ["active", "Active", CircleCheck],
  ["inactive", "Inactive", CircleX],
  ["blocked", "Blocked", ShieldBan],
];
const iconTones = {
  inactive: "bg-[#f9f5ec] text-[#ac8f59]",
  pending: "bg-[#f9f5ec] text-[#ac8f59]",
  underReview: "bg-[#eaf0fa] text-[#5c7fa8]",
  rejected: "bg-[#fae8e8] text-[#b65555]",
  blocked: "bg-[#fae8e8] text-[#b65555]",
  suspended: "bg-[#f3eaf7] text-[#9568a6]",
};

export default function ResourceStatistics({ resource, summary, loading, error }) {
  const vendors = resource === "vendors";
  const customers = resource === "customers";
  const subcategories = resource === "sub-categories";
  const label = subcategories ? "Subcategories" : "Categories";
  const cards = vendors ? vendorCards : customers ? customerCards : [
    ["total", `Total ${label}`, subcategories ? Layers : Tags],
    ["active", `Active ${label}`, CircleCheck],
    ["inactive", `Inactive ${label}`, CircleX],
    ["services", "Linked Services", BriefcaseBusiness],
  ];
  return (
    <div className="mb-6 grid grid-cols-[repeat(4,minmax(0,1fr))] gap-[16px] [@media(width<=1000px)]:grid-cols-[repeat(2,minmax(0,1fr))] [@media(width<=520px)]:grid-cols-[1fr] [@media(width<=767px)]:gap-[10px] [@media(width>=1500px)]:gap-[20px]" aria-label={vendors ? "Vendor statistics" : customers ? "Customer statistics" : subcategories ? "Subcategory statistics" : "Category statistics"} aria-busy={loading}>
      {cards.map(([key, label, Icon]) => {
        const featured = key === (vendors ? "approved" : customers ? "active" : "services");
        return (
          <article key={key} className={`ad-panel ad-kpi min-w-0 overflow-hidden rounded-[12px] border px-[19px] py-[17px] shadow-[0_3px_8px_#263f2d02] transition-[box-shadow,transform] duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_#243f3210] [@media(width<=1200px)]:p-[15px] [@media(width>=1500px)]:px-[23px] [@media(width>=1500px)]:py-[21px] ${featured ? "border-[#176b60] bg-[#176b60] text-white" : "border-[#e5ebe6] bg-white text-[#2e4d40]"}`}>
            <div className={`flex min-h-[31px] items-center justify-between gap-[8px] text-[10px] ${featured ? "text-[#abd2c3]" : "text-[#859289]"}`}>
              <span>{label}</span>
              <span className={`grid size-[31px] shrink-0 place-items-center rounded-[8px] ${featured ? "bg-white/[0.09] text-[#c5e2d3]" : iconTones[key] || "bg-[#f0f5ef] text-[#5e8975]"}`}><Icon size={18} aria-hidden="true" /></span>
            </div>
            <strong className="mt-[7px] block text-[28px] leading-[1.3] font-semibold tracking-[-0.8px] tabular-nums [overflow-wrap:anywhere] [@media(width>=1500px)]:text-[32px]" aria-live="polite">
              {loading ? <span className={`block h-[36px] w-[56px] animate-pulse rounded ${featured ? "bg-white/15" : "bg-[#edf2ed]"}`} aria-label="Loading count" /> : error || summary?.[key] == null ? "—" : number(summary[key])}
            </strong>
          </article>
        );
      })}
    </div>
  );
}
