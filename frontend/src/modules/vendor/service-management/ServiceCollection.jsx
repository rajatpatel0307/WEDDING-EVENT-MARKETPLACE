import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FilePenLine,
  Layers3,
  MapPin,
  ShieldBan,
  ShieldCheck,
  Star,
  XCircle,
} from "lucide-react";
import { Image } from "../components/WorkspaceUI";
import { date, money } from "../services/workspace.api";
import { ServiceActions } from "./shared";

export const approvalViews = {
  "": {
    title: "Your service collection",
    description: "All your listings, from first draft to fully booked.",
    empty: "Your next great service starts here",
    help: "Create your first listing, add your best work, and send it for approval.",
    icon: Layers3,
    tone: "border-[#dde8df] bg-[#f4f8f4] text-[#3e654b]",
    stat: "totalServices",
  },
  Draft: {
    title: "Draft services",
    description: "Finish your listings and submit them when you’re ready.",
    empty: "No draft services",
    help: "Your unfinished listings will appear here. Create a service to get started.",
    icon: FilePenLine,
    tone: "border-[#dfe4e9] bg-[#f5f7f9] text-[#536477]",
    stat: "draftServices",
  },
  Pending: {
    title: "Pending approval",
    description:
      "Submitted and waiting for the team to begin review. Editing is locked during approval.",
    empty: "No services waiting for approval",
    help: "Services appear here after you submit them for approval.",
    icon: Clock3,
    tone: "border-[#f0dfb7] bg-[#fff9ed] text-[#926b24]",
    stat: "pendingServices",
  },
  UnderReview: {
    title: "Under admin review",
    description:
      "The team is reviewing these listings. Open a service to follow its approval progress.",
    empty: "No services under review",
    help: "Services move here when an administrator starts reviewing them.",
    icon: ShieldCheck,
    tone: "border-[#d6e3f4] bg-[#f0f6ff] text-[#426ca4]",
    stat: "underReviewServices",
  },
  Approved: {
    title: "Approved services",
    description:
      "Ready for customers. Activate or pause your listings from the actions menu.",
    empty: "No approved services yet",
    help: "Your services will appear here once the team approves them.",
    icon: CheckCircle2,
    tone: "border-[#cfe4d5] bg-[#eef8f1] text-[#33724c]",
    stat: "approvedServices",
  },
  Rejected: {
    title: "Services needing changes",
    description:
      "Open a service to read the review feedback, make changes, and submit it again.",
    empty: "No rejected services",
    help: "Services that need corrections after review will appear here.",
    icon: XCircle,
    tone: "border-[#f0d5cf] bg-[#fff3f0] text-[#ac5849]",
    stat: "rejectedServices",
  },
  Suspended: {
    title: "Suspended services",
    description:
      "These listings are unavailable to customers. Open a service to check the suspension details.",
    empty: "No suspended services",
    help: "Any services suspended by the team will appear here.",
    icon: ShieldBan,
    tone: "border-[#e6d8ec] bg-[#f8f1fb] text-[#805495]",
    stat: "suspendedServices",
  },
};

export function ApprovalBadge({ status }) {
  const view = approvalViews[status] || approvalViews[""];
  const Icon = view.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-medium ${view.tone}`}
    >
      <Icon size={13} />
      {status === "Pending"
        ? "Pending approval"
        : status === "UnderReview"
          ? "Admin review"
          : status}
    </span>
  );
}

function ListingBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${active ? "bg-[#eaf5ed] text-[#37734c]" : "bg-[#f0f2ef] text-[#758070]"}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#4b9162]" : "bg-[#9ba594]"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Performance({ service }) {
  return (
    <div className="grid gap-1.5 text-[11px]">
      <span className="inline-flex items-center gap-1.5 text-[#546d5b]">
        <CalendarCheck size={13} className="text-[#8a9e8c]" />
        <strong className="font-semibold tabular-nums">
          {service.bookings || 0}
        </strong>{" "}
        {Number(service.bookings) === 1 ? "booking" : "bookings"}
      </span>
      <span className="inline-flex items-center gap-1.5 text-[#8c743c]">
        <Star size={13} className="fill-[#d4b565] text-[#d4b565]" />
        {service.rating ? Number(service.rating).toFixed(1) : "No ratings yet"}
      </span>
    </div>
  );
}

export default function ServiceCollection({ rows, onChange }) {
  return (
    <>
      <div className="overflow-x-auto service-mobile:hidden">
        <table
          aria-label="Services"
          className="w-full min-w-[1080px] border-collapse text-left text-xs [&_th]:whitespace-nowrap [&_th]:border-y [&_th]:border-[#e7ede5] [&_th]:bg-[#f6f8f4] [&_th]:px-4 [&_th]:py-3.5 [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.6px] [&_th]:text-[#7a8b77] [&_td]:border-b [&_td]:border-[#edf0e9] [&_td]:px-4 [&_td]:py-5 [&_td]:align-middle [&_th:first-child]:pl-6 [&_td:first-child]:pl-6 [&_th:last-child]:pr-6 [&_td:last-child]:pr-6"
        >
          <thead>
            <tr>
              {[
                "Service",
                "Starting price",
                "Location",
                "Listing",
                "Approval",
                "Performance",
                "Updated",
                "Actions",
              ].map((label) => (
                <th
                  key={label}
                  scope="col"
                  className={
                    label === "Actions" ? "sticky right-0 z-[1] text-right" : ""
                  }
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((service) => (
              <tr
                key={service.id}
                className="group bg-white transition-colors hover:bg-[#fafcf8]"
              >
                <td className="w-[26%] min-w-[235px]">
                  <Link
                    to={`/vendor/services/${service.id}`}
                    className="flex items-center gap-3.5"
                  >
                    <Image
                      src={service.image}
                      alt={service.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <strong
                        className="block max-w-[230px] truncate text-[13px] font-semibold text-[#2f513b]"
                        title={service.name}
                      >
                        {service.name}
                      </strong>
                      <span
                        className="mt-1 block max-w-[230px] truncate text-[11px] text-[#6c826c]"
                        title={[service.category, service.subcategory]
                          .filter(Boolean)
                          .join(" · ")}
                      >
                        {service.category}
                        {service.subcategory ? ` · ${service.subcategory}` : ""}
                      </span>
                    </div>
                  </Link>
                </td>
                <td className="whitespace-nowrap font-semibold tabular-nums text-[#385c42]">
                  {money(service.price)}
                  <span className="mt-1 block text-[10px] font-normal text-[#94a08d]">
                    Starting price
                  </span>
                </td>
                <td>
                  <span className="inline-flex max-w-[130px] items-start gap-1.5 text-[11px] text-[#6c806b]">
                    <MapPin
                      size={13}
                      className="mt-px shrink-0 text-[#9aa990]"
                    />
                    {service.location || "Not set"}
                  </span>
                </td>
                <td>
                  <ListingBadge active={service.active} />
                </td>
                <td>
                  <ApprovalBadge status={service.status} />
                </td>
                <td className="whitespace-nowrap">
                  <Performance service={service} />
                </td>
                <td className="whitespace-nowrap text-[11px] text-[#7b8b76]">
                  {date(service.updatedAt)}
                </td>
                <td className="sticky right-0 w-[140px] min-w-[140px] bg-white group-hover:bg-[#fafcf8]">
                  <ServiceActions service={service} onChange={onChange} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="hidden gap-3 p-4 service-mobile:grid">
        {rows.map((service) => (
          <article
            key={service.id}
            className="rounded-xl border border-[#e2e9de] bg-white p-4"
          >
            <div className="flex items-start gap-3">
              <Image
                src={service.image}
                alt={service.name}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to={`/vendor/services/${service.id}`}
                  className="block truncate text-sm font-semibold text-[#2f513b]"
                >
                  {service.name}
                </Link>
                <p className="mt-1 truncate text-[11px] text-[#7a8b74]">
                  {service.category}
                  {service.subcategory ? ` · ${service.subcategory}` : ""}
                </p>
              </div>
            </div>
            <div className="my-3 flex flex-wrap gap-2">
              <ApprovalBadge status={service.status} />
              <ListingBadge active={service.active} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-[#edf0e9] py-3">
              <div>
                <strong className="block text-sm text-[#385c42]">
                  {money(service.price)}
                </strong>
                <span className="mt-1 block text-[11px] text-[#7a8b74]">
                  {service.location || "Location not set"}
                </span>
              </div>
              <Performance service={service} />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-[#edf0e9] pt-3">
              <span className="text-[10px] text-[#8a9982]">
                Updated {date(service.updatedAt)}
              </span>
              <ServiceActions service={service} onChange={onChange} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
