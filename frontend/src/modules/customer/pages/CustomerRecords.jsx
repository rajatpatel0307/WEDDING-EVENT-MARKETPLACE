import { ReviewForm as CompleteReviewForm } from '../../reviews/Reviews';
import { LocationFields } from "../components/LocationFields";
import { useEffect, useState } from "react";
import {
  Link,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  MessagesSquare,
  ShieldCheck,
  Camera,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Save,
  UserRound,
} from "lucide-react";
import { gql } from "@apollo/client";
import { useAuth } from "../../../context/AuthContext";
import { client, userFields } from "../../../services/apollo";
import PhotoUpload from "../../../components/common/PhotoUpload";
import {
  useCustomerData,
  Heading,
  Loading,
  ErrorView,
  Empty,
  Badge,
  Modal,
  Field,
} from "../components/WorkspaceUI";
import { ServiceCard } from "../components/ServiceCards";
import {
  save,
  money,
  date,
  timestamp,
  customerRequest,
  today,
} from "../services/workspace.api";
import BookingItemDetails from "../../bookings/BookingItemDetails";
import CustomerBookingDetails from "./CustomerBookingDetails";
import CustomerBookingsPage from "./CustomerBookingsPage";
import CustomerPaymentsPage from "./CustomerPaymentsPage";
import CustomerSettingsPage from "./CustomerSettingsPage";
import { AddressHeader, AddressSearch, AddressGrid, AddressLoading, AddressEmpty, AddressPagination } from "../components/CustomerAddressUI";
const columns = {
  bookings: [
    ["number", "Booking"],
    ["vendor", "Vendor"],
    ["services", "Services"],
    ["event", "Event"],
    ["bookingDate", "Event date"],
    ["amount", "Amount"],
    ["paymentStatus", "Payment"],
    ["status", "Status"],
  ],
  quotations: [
    ["number", "Quotation"],
    ["vendor", "Vendor"],
    ["event", "Event"],
    ["services", "Services"],
    ["amount", "Total"],
    ["validUntil", "Valid until"],
    ["status", "Status"],
  ],
  payments: [
    ["reference", "Reference"],
    ["booking", "Booking"],
    ["amount", "Amount"],
    ["method", "Method"],
    ["gateway", "Gateway"],
    ["status", "Status"],
    ["paidAt", "Payment date"],
  ],
  requests: [
    ["vendor", "Vendor"],
    ["event", "Event"],
    ["service", "Service"],
    ["message", "Requirements"],
    ["status", "Status"],
    ["createdAt", "Requested"],
  ],
  reviews: [
    ["vendor", "Vendor"],
    ["rating", "Rating"],
    ["title", "Title"],
    ["review", "Your review"],
    ["status", "Published"],
    ["createdAt", "Date"],
  ],
};
const names = {
  bookings: "My bookings",
  quotations: "My quotations",
  requests: "Quotation requests",
  wishlist: "Saved with love",
  payments: "Payments",
  reviews: "Your experiences",
  addresses: "My addresses",
  notifications: "Notifications",
};
function Cell({ name, value, row }) {
  if (name === "reference" && row.id)
    return <Link to={`/customer/payments/${row.id}`}>{value}</Link>;
  if (name === "amount") return money(value, false, row.currency || "INR");
  if (["validUntil", "bookingDate", "paidAt", "createdAt"].includes(name))
    return date(value);
  if (name === "status" || name === "paymentStatus")
    return <Badge>{value}</Badge>;
  if (name === "rating") return <span>{value} / 5 ★</span>;
  return value || "—";
}
export default function CustomerRecords({ section: explicit }) {
  const location = useLocation();
  const section = explicit || location.pathname.split("/")[2];
  if (section === "bookings") return <CustomerBookingsPage />;
  if (section === "payments") return <CustomerPaymentsPage />;
  return <CustomerRecordList section={section} />;
}
function CustomerRecordList({ section }) {
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [version, setVersion] = useState(0),
    [edit, setEdit] = useState(null),
    [remove, setRemove] = useState(null),
    [busy, setBusy] = useState(false),
    { notify, reload } = useAuth(),
    r = useCustomerData(
      section === "wishlist"
        ? "/wishlist"
        : `/records/${section}?${new URLSearchParams({ page, q: search })}`,
      version,
    );
  useEffect(() => {
    setPage(1);
    setEdit(null);
    setRemove(null);
  }, [section]);
  const refresh = () => setVersion((v) => v + 1);
  const rows = section === "wishlist" ? r.data : r.data?.rows;
  if (section === "addresses") {
    const changeSearch = (value) => { setSearch(value); setPage(1); };
    return (
      <div className="mx-auto w-full min-w-0 max-w-[1440px] space-y-6 text-sm text-slate-700 [&_svg]:shrink-0">
        <AddressHeader onAdd={() => setEdit({})} />
        <AddressSearch search={search} onSearch={changeSearch} total={r.data?.total || 0} loading={r.loading || !!r.error} />
        {r.loading ? <AddressLoading /> : r.error ? <ErrorView error={r.error} retry={r.retry} /> : !rows?.length ? (
          page > 1 ? <div className="rounded-2xl border border-[#e3e6e0] bg-white p-8 text-center"><p className="mb-4 text-slate-500">No addresses on this page.</p><button type="button" onClick={() => setPage(1)} className="rounded-xl border border-[#e3d5d8] px-4 py-3 text-xs font-medium text-[#873f52] hover:bg-[#faf3f5] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]">Back to first page</button></div> : <AddressEmpty filtered={!!search.trim()} onClear={() => changeSearch("")} onAdd={() => setEdit({})} />
        ) : <AddressGrid rows={rows} busy={busy} onEdit={setEdit} onRemove={setRemove} onDefault={async (address) => {
          if (busy) return;
          setBusy(true);
          try {
            await save(`/addresses/${address.id}/default`, "PATCH", {});
            refresh();
            notify("Default address updated.");
          } catch (e) {
            notify(e.message);
          } finally {
            setBusy(false);
          }
        }} />}
        {!r.error && r.data?.total > r.data?.pageSize && <AddressPagination page={page} pageSize={r.data.pageSize} total={r.data.total} loading={r.loading} onPage={setPage} />}
        {edit && (
          <AddressForm
            address={edit.id ? edit : null}
            close={() => setEdit(null)}
            done={refresh}
          />
        )}
        {remove && (
          <Modal title="Remove address" busy={busy} close={() => setRemove(null)}>
            <div className="space-y-5 p-5 sm:p-6">
            <p>Remove this {(remove.type || "saved").toLowerCase()} address?</p>
            <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} onClick={() => setRemove(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]">Cancel</button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-rose-700 bg-rose-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-rose-700"
              disabled={busy}
              onClick={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  await save(`/addresses/${remove.id}`, "DELETE", {});
                  setRemove(null);
                  refresh();
                  notify("Address removed.");
                } catch (e) {
                  notify(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Removing…" : "Remove address"}
            </button>
            </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }
  return (
    <>
      <Heading
        title={names[section] || "Your account"}
        description={
          {
            bookings: "Your dream team, from the first request to the big day.",
            quotations: "Compare the details. Choose what feels right.",
            wishlist: "Beautiful possibilities, kept in one place.",
            payments: "Every payment, clearly accounted for.",
            reviews: "Help another celebration find its perfect match.",
            addresses: "Keep your contact details ready for every occasion.",
            notifications: "All the little updates that matter.",
          }[section]
        }
      >
        {["wishlist", "bookings", "quotations"].includes(section) ? (
          <Link className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" to="/customer/discover">
            Find services <ArrowUpRight size={15} />
          </Link>
        ) : null}
      </Heading>
      {section === "quotations" && (
        <div className="cw-inline-tabs flex gap-[25px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e8ded5] mb-[25px] [&_>_a]:pt-[13px] [&_>_a]:pr-[3px] [&_>_a]:pb-[13px] [&_>_a]:pl-[3px] [&_>_a]:text-[12px] [&_>_a]:text-[#a38a7b] [&_>_a.active]:text-[#9a5b70] [&_>_a.active]:[border-bottom-width:2px] [&_>_a.active]:[border-bottom-style:solid] [&_>_a.active]:[border-bottom-color:#9a5b70]">
          <Link to="/customer/quotations" className="active">
            Received quotations
          </Link>
          <Link to="/customer/requests">My requests</Link>
        </div>
      )}
      {section === "requests" && (
        <div className="cw-inline-tabs flex gap-[25px] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e8ded5] mb-[25px] [&_>_a]:pt-[13px] [&_>_a]:pr-[3px] [&_>_a]:pb-[13px] [&_>_a]:pl-[3px] [&_>_a]:text-[12px] [&_>_a]:text-[#a38a7b] [&_>_a.active]:text-[#9a5b70] [&_>_a.active]:[border-bottom-width:2px] [&_>_a.active]:[border-bottom-style:solid] [&_>_a.active]:[border-bottom-color:#9a5b70]">
          <Link to="/customer/quotations">Received quotations</Link>
          <Link to="/customer/requests" className="active">
            My requests
          </Link>
        </div>
      )}
      {section === "payments" && (
        <section className="cw-info-strip flex items-center gap-[15px] [background:#f0f2e9] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e1e5d4] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e1e5d4] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e1e5d4] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e1e5d4] pt-[16px] pr-[22px] pb-[16px] pl-[22px] rounded-[7px] mb-[24px] text-[#93a07d] [&_p]:mt-[0] [&_p]:mr-[0] [&_p]:mb-[0] [&_p]:ml-[0]">
          <ShieldCheck size={22} />
          <p>
            Payments are made securely through Razorpay after your vendor
            accepts the booking.{" "}
            <Link to="/customer/bookings">Go to your bookings →</Link>{" "}
            <Link to="/customer/refunds">Refund requests</Link>
          </p>
        </section>
      )}
      {r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorView error={r.error} retry={r.retry} />
      ) : !rows?.length ? (
        <Empty
          title={
            {
              wishlist: "Keep a little inspiration",
              bookings: "Your dream team is waiting",
              quotations: "Good things are on their way",
              payments: "Your payment history starts here",
              reviews: "Your experience matters",
              addresses: "Make yourself at home",
              notifications: "You’re all caught up",
              requests: "Tell a vendor what you have in mind",
            }[section]
          }
          text={
            {
              wishlist:
                "Save the vendors, services and packages you love while you explore.",
              quotations:
                "Request a quotation from a service to receive a tailored proposal.",
              reviews: "Review a completed booking from its details page.",
              notifications: "New updates from your vendors will appear here.",
            }[section] ||
            "Your records will appear here as you plan your celebration."
          }
        />
      ) : section === "wishlist" ? (
        <div className="cw-discovery-grid grid grid-cols-[repeat(3,_minmax(0,_1fr))] [@media(width<=520px)]:grid-cols-[minmax(0,_1fr)] [@media(520px<width<=1250px)]:grid-cols-[repeat(2,_minmax(0,_1fr))] gap-[24px]">
          {rows.map((i) => (
            <ServiceCard
              key={i.id}
              item={i}
              saved
              onChange={() => {
                refresh();
                reload();
              }}
            />
          ))}
        </div>
      ) : section === "notifications" ? (
        <div className="cw-notifications flex flex-col gap-[14px] [&_>_article]:pt-[23px] [@media(width<=520px)]:[&_>_article]:pt-[20px] [&_>_article]:pr-[27px] [@media(width<=520px)]:[&_>_article]:pr-[20px] [&_>_article]:pb-[23px] [@media(width<=520px)]:[&_>_article]:pb-[20px] [&_>_article]:pl-[27px] [@media(width<=520px)]:[&_>_article]:pl-[20px] [&_>_article]:[background:white] [&_>_article]:[border-top-width:1px] [&_>_article]:[border-top-style:solid] [&_>_article]:[border-top-color:#e9e0d7] [&_>_article]:[border-right-width:1px] [&_>_article]:[border-right-style:solid] [&_>_article]:[border-right-color:#e9e0d7] [&_>_article]:[border-bottom-width:1px] [&_>_article]:[border-bottom-style:solid] [&_>_article]:[border-bottom-color:#e9e0d7] [&_>_article]:[border-left-width:1px] [&_>_article]:[border-left-style:solid] [&_>_article]:[border-left-color:#e9e0d7] [&_>_article]:rounded-[8px] [&_>_article]:flex [&_>_article]:justify-between [&_>_article]:gap-[25px] [@media(width<=520px)]:[&_>_article]:gap-[12px] [&_>_article]:items-center [@media(width<=520px)]:[&_>_article]:items-start [&_>_article.unread]:[border-left-width:3px] [&_>_article.unread]:[border-left-style:solid] [&_>_article.unread]:[border-left-color:#b98191] [&_>_article.unread]:[background:#fffdfb] [&_h3]:text-[14px] [&_h3]:font-[500] [&_h3]:mt-[0] [&_h3]:mr-[0] [&_h3]:mb-[0] [&_h3]:ml-[0] [&_p]:mt-[8px] [&_p]:mr-[0] [&_p]:mb-[8px] [&_p]:ml-[0] [&_small]:text-[#b5a091] [&_small]:text-[10px] [@media(width<=520px)]:[&_>_article]:flex-col">
          {rows.map((n) => (
            <article className={n.isRead ? "" : "unread"} key={n.id}>
              <div>
                <span className="cw-notification-dot" />
                <h3>{n.title}</h3>
                <p>{n.message}</p>
                <small>{timestamp(n.createdAt)}</small>
                {["Quotation", "QuotationRequest"].includes(n.referenceType) &&
                  /^[0-9a-f-]{36}$/i.test(n.referenceId || "") && (
                    <Link
                      className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                      to={`/customer/${n.referenceType === "Quotation" ? "quotations" : "requests"}/${n.referenceId}`}
                    >
                      View details
                    </Link>
                  )}
              </div>
              {!n.isRead && (
                <button
                  className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await save(`/notifications/${n.id}/read`, "PATCH", {});
                      refresh();
                      await reload();
                    } catch (e) {
                      notify(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Check size={14} /> Mark read
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="cw-panel cw-table-wrap [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-auto overflow-y-hidden max-w-full">
          <table>
            <thead>
              <tr>
                {columns[section]?.map(([key, title]) => (
                  <th key={key}>{title}</th>
                ))}
                {["bookings", "quotations"].includes(section) && (
                  <th>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns[section]?.map(([key]) => (
                    <td key={key}>
                      <Cell name={key} value={row[key]} row={row} />
                    </td>
                  ))}
                  {["bookings", "quotations"].includes(section) && (
                    <td>
                      <Link
                        className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                        to={`/customer/${section}/${row.id}`}
                      >
                        View details <ArrowUpRight size={13} />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section !== "wishlist" && r.data?.total > r.data?.pageSize && (
        <div className="cw-pagination flex items-center justify-center gap-[20px] mt-[25px] mr-[0] mb-[25px] ml-[0] text-[11px] text-[#a59187]">
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            disabled={page === 1 || r.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} · {r.data.total} records
          </span>
          <button
            className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
            disabled={page * r.data.pageSize >= r.data.total || r.loading}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}

    </>
  );
}
function AddressForm({ address, close, done }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth();
  return (
    <Modal
      title={address ? "Edit address" : "Add address"}
      busy={busy}
      close={close}
    >
      <form
        className="grid min-w-0 gap-4 p-5 sm:grid-cols-2 sm:p-6 [&_.cw-field]:text-xs [&_.cw-field]:text-slate-600 [&_input:not([type=checkbox])]:min-h-11 [&_input:not([type=checkbox])]:rounded-xl [&_select]:min-h-11 [&_select]:rounded-xl [&_input]:text-sm! [&_select]:text-sm! [&_>_p]:col-span-full"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          const f = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            const r = await save(
              `/addresses${address ? `/${address.id}` : ""}`,
              address ? "PUT" : "POST",
              { ...f, isDefault: f.isDefault === "on" },
            );
            notify(r.message);
            done();
            close();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Address type">
          <select name="type" defaultValue={address?.type || "Home"}>
            {["Home", "Work", "Billing", "Other"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {["fullName", "phone"].map((k) => (
          <Field
            key={k}
            label={k === "fullName" ? "Contact name" : "Phone number"}
          >
            <input
              name={k}
              maxLength={k === "phone" ? 30 : 200}
              defaultValue={address?.[k] || ""}
            />
          </Field>
        ))}
        <LocationFields value={address || {}} />
        <label className="col-span-full flex items-center gap-2.5 text-xs font-medium text-slate-600 [&_input]:size-4 [&_input]:accent-[#873f52]">
          <input
            name="isDefault"
            type="checkbox"
            defaultChecked={address?.isDefault}
          />{" "}
          Set as default address
        </label>
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="col-span-full inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#873f52] bg-[#873f52] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#723247] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#873f52]">
          {busy ? "Saving…" : "Save address"}
        </button>
      </form>
    </Modal>
  );
}
export function CustomerRecordDetails({ quote = false }) {
  const { id } = useParams(),
    [version, setVersion] = useState(0),
    r = useCustomerData(`/${quote ? "quotations" : "bookings"}/${id}`, version),
    config = useCustomerData("/payments/config"),
    [decision, setDecision] = useState(null),
    [review, setReview] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    { notify } = useAuth(),
    navigate = useNavigate();
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;
  const b = quote ? r.data.quotation : r.data.booking;
  async function message() {
    setBusy(true);
    try {
      const c = await save("/conversations", "POST", {
        vendorId: b.VendorId,
        eventId: b.EventId,
        ...(!quote ? { bookingId: b.BookingId } : { quotationId: b.QuotationId }),
      });
      navigate(`/customer/messages?conversation=${c.id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!quote) return (
    <>
      <CustomerBookingDetails
        id={id}
        data={r.data}
        config={config}
        busy={busy}
        setBusy={setBusy}
        error={error}
        setError={setError}
        message={message}
        refresh={(notice) => {
          if (notice) notify(notice);
          setVersion((v) => v + 1);
        }}
        onReview={() => setReview(true)}
      />
      {review && <ReviewForm bookingId={id} close={() => setReview(false)} />}
    </>
  );
  return (
    <>
      <Link
        className="cw-back"
        to={`/customer/${quote ? "quotations" : "bookings"}`}
      >
        ← {quote ? "My quotations" : "My bookings"}
      </Link>
      <Heading
        title={b.QuotationNumber || b.BookingNumber}
        description={
          quote
            ? "Every detail of your proposal, in one place."
            : "Follow your booking from first request to lasting memories."
        }
      >
        <Badge>{b.Status || b.BookingStatus}</Badge>
        <button className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" onClick={message} disabled={busy}>
          <MessagesSquare size={16} /> Message vendor
        </button>
      </Heading>
      <section className="cw-panel cw-prose [background:#fff] [border-top-width:1px] [border-top-style:solid] [border-top-color:#e4eade] [border-right-width:1px] [border-right-style:solid] [border-right-color:#e4eade] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#e4eade] [border-left-width:1px] [border-left-style:solid] [border-left-color:#e4eade] rounded-[10px] min-w-0 overflow-x-hidden overflow-y-hidden pt-[25px] [@media(width<=520px)]:pt-[23px] pr-[28px] [@media(width<=520px)]:pr-[20px] pb-[25px] [@media(width<=520px)]:pb-[23px] pl-[28px] [@media(width<=520px)]:pl-[20px] mb-[24px] [&_>_h2]:mb-[20px] [&_>_h3]:mt-[24px] [&_p]:[white-space:pre-line]">
        <div className="cw-record-line flex justify-between items-center gap-[18px] pt-[12px] pr-[0] pb-[12px] pl-[0] [&_>_h2]:mt-[0] [&_>_h2]:mr-[0] [&_>_h2]:mb-[0] [&_>_h2]:ml-[0] [@media(width<=520px)]:flex-wrap">
          <div>
            <span className="cw-eyebrow text-[#9aa890] text-[8px] tracking-[1.6px] font-[500]">
              {quote ? "QUOTATION TOTAL" : "BOOKING TOTAL"}
            </span>
            <h2>{money(b.TotalAmount)}</h2>
          </div>
          {quote ? (
            <p>Valid until {date(b.ValidUntil)}</p>
          ) : (
            <div>
              <Badge>{b.PaymentStatus}</Badge>
              <p>
                {money(b.PaidAmount)} paid · {money(b.RemainingAmount)}{" "}
                remaining
              </p>
              <p>Event date: {date(b.BookingDate)}</p>
            </div>
          )}
        </div>
        <div className="cw-table-wrap overflow-x-auto max-w-full min-w-0">
          <table>
            <thead>
              <tr>
                <th>Service / package</th>
                <th>Quantity</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {r.data.items.map((i, k) => (
                <tr key={k}>
                  <td>
                    {i.name}
                    <BookingItemDetails description={i.description} />
                  </td>
                  <td>
                    {Number(i.quantity)}
                  </td>
                  <td>{money(i.price)}</td>
                  <td>{money(i.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <dl>
          <dt>Subtotal</dt>
          <dd>{money(b.SubTotal)}</dd>
          <dt>Discount</dt>
          <dd>{money(b.DiscountAmount)}</dd>
          <dt>Tax</dt>
          <dd>{money(b.TaxAmount)}</dd>

        </dl>
        {b.VendorMessage && <p>{b.VendorMessage}</p>}
        {b.CustomerMessage && <p>Your note: {b.CustomerMessage}</p>}
        {quote && r.data.revisions?.length > 0 && (
          <section>
            <h2>Requested revisions</h2>
            {r.data.revisions.map((revision) => (
              <p key={revision.id}>
                {timestamp(revision.createdAt)} · {revision.status} ·{" "}
                {revision.message}
              </p>
            ))}
          </section>
        )}
        {quote && ["Sent", "Viewed"].includes(b.Status) && (
          <div className="cw-detail-actions flex gap-[12px] flex-wrap mt-[22px] [@media(width<=520px)]:[&_>_.cw-button]:text-[11px]">
            <button
              className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Accept")}
            >
              Accept quotation
            </button>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Modify")}
            >
              Request modification
            </button>
            <button
              className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
              disabled={busy}
              onClick={() => setDecision("Reject")}
            >
              Reject
            </button>
          </div>
        )}
        {error && (
          <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
            {error}
          </p>
        )}
      </section>
      {decision && (
        <Modal
          title={
            {
              Accept: "Accept this quotation?",
              Reject: "Reject this quotation?",
              Modify: "Request a revised quotation",
            }[decision]
          }
          close={() => setDecision(null)}
          busy={busy}
        >
          <form
            className="cw-form min-w-0 [&_fieldset]:[border-top-width:0] [&_fieldset]:[border-top-style:none] [&_fieldset]:[border-top-color:currentColor] [&_fieldset]:[border-right-width:0] [&_fieldset]:[border-right-style:none] [&_fieldset]:[border-right-color:currentColor] [&_fieldset]:[border-bottom-width:0] [&_fieldset]:[border-bottom-style:none] [&_fieldset]:[border-bottom-color:currentColor] [&_fieldset]:[border-left-width:0] [&_fieldset]:[border-left-style:none] [&_fieldset]:[border-left-color:currentColor] [&_fieldset]:pt-[0] [&_fieldset]:pr-[0] [&_fieldset]:pb-[0] [&_fieldset]:pl-[0] [&_fieldset]:mt-[0] [&_fieldset]:mr-[0] [&_fieldset]:mb-[0] [&_fieldset]:ml-[0] [&_fieldset]:min-w-0 [&_>_.cw-panel_+_.cw-panel]:mt-[22px]"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              setError("");
              try {
                const result = await save(
                  `/quotations/${id}/decision`,
                  "POST",
                  { action: decision, message: f.get("message") || "" },
                );
                notify(result.message);
                setDecision(null);
                if (result.id && decision === "Accept")
                  navigate(`/customer/bookings/${result.id}`);
                else setVersion((v) => v + 1);
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>
              {decision === "Accept"
                ? "This creates a booking request at the quoted price. Your vendor will confirm availability before payment."
                : decision === "Modify"
                  ? "Describe your changes. A new request will be sent and the current quotation will be closed, preserving its history."
                  : "The vendor will be notified of your decision."}
            </p>
            <Field
              label={
                decision === "Modify" ? "Changes needed" : "Note (optional)"
              }
            >
              <textarea
                name="message"
                required={decision === "Modify"}
                minLength={decision === "Modify" ? 5 : 0}
                maxLength="2000"
                rows="4"
              />
            </Field>
            {error && (
              <p className="cw-form-error [background:#fff4ee] [border-top-width:1px] [border-top-style:solid] [border-top-color:#f0ddcf] [border-right-width:1px] [border-right-style:solid] [border-right-color:#f0ddcf] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#f0ddcf] [border-left-width:1px] [border-left-style:solid] [border-left-color:#f0ddcf] text-[#b6836e]! pt-[12px] pr-[15px] pb-[12px] pl-[15px] rounded-[6px] text-[11px]! leading-[1.8] [overflow-wrap:anywhere]" role="alert">
                {error}
              </p>
            )}
            <div className="cw-form-actions">
              <button
                type="button"
                className="cw-button inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]"
                onClick={() => setDecision(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button className="cw-button cw-primary inline-flex items-center justify-center gap-[7px] [border-top-width:1px] [border-top-style:solid] [border-top-color:#dfe7d8] [border-right-width:1px] [border-right-style:solid] [border-right-color:#dfe7d8] [border-bottom-width:1px] [border-bottom-style:solid] [border-bottom-color:#dfe7d8] [border-left-width:1px] [border-left-style:solid] [border-left-color:#dfe7d8] rounded-[6px] text-[#738567] [background:#fff] pt-[9px] pr-[13px] pb-[9px] pl-[13px] text-[10px] leading-[1.5] font-[500] whitespace-nowrap [&:hover]:[background:#f0f5e9] [&:hover]:text-[#406b42] [&.cw-primary:hover]:[background:#2b523a] [&.cw-primary:hover]:text-[white] [&.cw-danger]:text-[#bd7b69] [&.cw-danger]:[background:#fff8f4] [&.cw-danger]:[border-top-color:#f0dfd4] [&.cw-danger]:[border-right-color:#f0dfd4] [&.cw-danger]:[border-bottom-color:#f0dfd4] [&.cw-danger]:[border-left-color:#f0dfd4] [&.cw-accept]:text-[#5f8650] [&.cw-accept]:[background:#f0f6e9] [&.cw-accept]:[border-top-color:#dfebd3] [&.cw-accept]:[border-right-color:#dfebd3] [&.cw-accept]:[border-bottom-color:#dfebd3] [&.cw-accept]:[border-left-color:#dfebd3]" disabled={busy}>
                {busy
                  ? "Saving…"
                  : decision === "Modify"
                    ? "Send changes"
                    : `${decision} quotation`}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function ReviewForm({bookingId,close}) {
 const {notify}=useAuth();
 return <div className="rr-module [&&]:text-[#344936] [&&]:[font-family:inherit] [&&]:text-[14px] [&&]:leading-[1.6] [&&]:min-w-0 [&&]:w-full [&_*]:box-border [&_h1]:text-[clamp(25px,_3vw,_34px)] [&_h1]:font-semibold [&_h1]:leading-[1.25] [&_h1]:mt-0 [&_h1]:mx-0 [&_h1]:mb-[10px] [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:mt-0 [&_h2]:mx-0 [&_h2]:mb-[12px] [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:my-[10px] [&_h3]:mx-0 [&_p]:my-[8px] [&_p]:mx-0 [&_p]:wrap-anywhere [&_button]:border [&_button]:border-[#dce4d7] [&_button]:rounded-[8px] [&_button]:py-[9px] [&_button]:px-[15px] [&_button]:bg-[#fff] [&_button]:text-[#36533d] [&_button]:text-[13px] [&_button]:cursor-pointer [&_button]:no-underline [&_button]:inline-flex [&_button]:gap-[7px] [&_button]:items-center [&_button]:justify-center [&_button:hover]:bg-[#f2f6ee] [&_button:disabled]:[cursor:wait] [&_button:disabled]:opacity-55 [&_label]:grid [&_label]:gap-[6px] [&_label]:text-[13px] [&_label]:font-medium [&_label]:min-w-0 [&_input]:w-full [&_input]:min-w-0 [&_input]:border [&_input]:border-[#dce4d7] [&_input]:rounded-[8px] [&_input]:py-[10px] [&_input]:px-[12px] [&_input]:[font:inherit] [&_input]:bg-[#fff] [&_input]:text-[#344936] [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:border-[#dce4d7] [&_textarea]:rounded-[8px] [&_textarea]:py-[10px] [&_textarea]:px-[12px] [&_textarea]:[font:inherit] [&_textarea]:bg-[#fff] [&_textarea]:text-[#344936] [&_textarea]:[resize:vertical] [&_select]:w-full [&_select]:min-w-0 [&_select]:border [&_select]:border-[#dce4d7] [&_select]:rounded-[8px] [&_select]:py-[10px] [&_select]:px-[12px] [&_select]:[font:inherit] [&_select]:bg-[#fff] [&_select]:text-[#344936] [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-[#648d66] [&_:focus-visible]:outline-offset-[3px] [&_progress]:w-full [&_progress]:h-[8px] [&_progress]:[accent-color:#8b9e72] [&_table]:border-collapse [&_table]:w-full [&_table]:text-[13px] [&_th]:text-left [&_th]:p-[10px] [&_th]:border-b [&_th]:border-b-[#e2e8dd] [&_th]:whitespace-nowrap [&_td]:text-left [&_td]:p-[10px] [&_td]:border-b [&_td]:border-b-[#e2e8dd] [&_td]:whitespace-nowrap"><CompleteReviewForm bookingId={bookingId} close={close} done={message=>{notify(message);close();}} /></div>;
}
export function CustomerProfile({ settings = false }) {
  const { user, setUser, reload, notify } = useAuth(),
    r = useCustomerData("/profile"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [failedPhoto, setFailedPhoto] = useState("");
  if (settings) return <CustomerSettingsPage user={user} />;
  if (r.loading) return <Loading />;
  if (r.error) return <ErrorView error={r.error} retry={r.retry} />;

  const inputClass = "block min-h-12 w-full min-w-0 rounded-xl border border-[#dce5d5] bg-white px-4 py-3 text-[13px] text-[#3f5537] transition placeholder:text-[#a1ac95] hover:border-[#b4c4a4] focus:border-[#7d9a66] focus:outline-none focus:ring-4 focus:ring-[#7d9a66]/10 disabled:cursor-not-allowed disabled:bg-[#f5f7f1] disabled:text-[#7c8970] motion-reduce:transition-none";
  const labelClass = "grid min-w-0 content-start gap-2 text-xs font-medium text-[#53684a]";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const initials = [user.firstName, user.lastName].filter(Boolean).map((name) => name.charAt(0)).join("").toUpperCase() || "M";

  return (
    <div className="min-w-0 space-y-6 text-[#3e5438] sm:space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[#879577]">Your celebration, beautifully planned</p>
          <h1 className="mt-2 font-serif text-[30px] leading-tight tracking-[-0.8px] text-[#304735] sm:text-[36px]">The person behind the celebration<span className="text-[#b09374]">.</span></h1>
          <p className="mt-3 text-xs leading-relaxed text-[#7c8971] sm:text-[13px]">Your profile, your details, your next chapter.</p>
        </div>
        <Link to="/customer/settings" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#dfe6d6] bg-white px-3.5 py-2 text-[11px] font-medium text-[#6d805c] transition hover:border-[#b9caa7] hover:bg-[#f3f6ed] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7d9a66] motion-reduce:transition-none"><ShieldCheck size={15} aria-hidden="true" />Account settings<ArrowUpRight size={13} aria-hidden="true" /></Link>
      </header>

      <div className="grid min-w-0 items-start gap-5 min-[1100px]:grid-cols-[280px_minmax(0,1fr)] min-[1400px]:grid-cols-[310px_minmax(0,1fr)] min-[1400px]:gap-6">
        <aside aria-label="Your profile photo and account" className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7d7] bg-white shadow-[0_3px_16px_#263c2803]">
          <div className="h-24 border-b border-[#e4e9db] bg-linear-to-br from-[#e3ebd6] via-[#eff3e7] to-[#f5f0e3]"><p className="px-6 pt-5 text-[9px] font-medium uppercase tracking-[0.2em] text-[#85966f]">A little more you</p></div>
          <div className="px-5 pb-6 sm:px-6">
            <div className="-mt-9 flex items-end justify-between gap-3">
              <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#e5edd9] font-serif text-[32px] text-[#6f8854] shadow-[0_3px_12px_#394b2912]">
                {user.profilePhotoUrl && failedPhoto !== user.profilePhotoUrl ? (
                  <img src={user.profilePhotoUrl} alt={fullName ? fullName + "'s profile photo" : "Your profile photo"} width="96" height="96" onError={() => setFailedPhoto(user.profilePhotoUrl)} className="size-full object-cover" />
                ) : <span aria-label="Your initials">{initials}</span>}
              </div>
              <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-[#dfe8d4] bg-[#f1f6e9] px-2.5 py-1 text-[9px] font-medium text-[#738c58]"><ShieldCheck size={12} aria-hidden="true" />Verified</span>
            </div>
            <h2 className="mt-4 break-words font-serif text-[25px] leading-tight text-[#3b5235]">{fullName || "Your profile"}</h2>
            <p className="mt-2 break-all text-[11px] leading-relaxed text-[#839173]">{user.email}</p>
            <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.16em] text-[#a0aa94]">MarryNest customer</p>

            <fieldset disabled={busy} className="mt-6 min-w-0 border-0 border-t border-solid border-[#e9ede2] pt-5">
              <legend className="sr-only">Profile photo</legend>
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-[#526a44]"><Camera size={15} className="text-[#8c9d78]" aria-hidden="true" />Make it feel like you</div>
              <div className="[&_.field]:mb-0! [&_.field>span]:text-xs! [&_.field>span]:text-[#637654]! [&_input]:min-w-0 [&_input]:rounded-xl! [&_input]:border-[#dce5d2]! [&_input]:bg-[#f8faf5]! [&_input]:p-2! [&_input]:text-[10px]! [&_input]:text-[#76856c]! [&_input]:file:mr-2 [&_input]:file:cursor-pointer [&_input]:file:rounded-lg [&_input]:file:border-0 [&_input]:file:bg-[#e6eddc] [&_input]:file:px-2.5 [&_input]:file:py-2 [&_input]:file:text-[10px] [&_input]:file:font-medium [&_input]:file:text-[#4c6740] [&_input:focus]:border-[#8ba773]! [&_input:focus]:shadow-none! [&_input:focus-visible]:outline-2! [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-[#8ba773]! [&_small]:mt-3! [&_small]:text-[10px]! [&_small]:leading-relaxed [&_small]:text-[#879478]!">
                <PhotoUpload
                  onBusy={setBusy}
                  onUploaded={async ({ uploadToken }) => {
                    const { data } = await client.mutate({
                      mutation: gql("mutation UpdateProfilePhoto($uploadToken:String!){updateProfilePhoto(uploadToken:$uploadToken){success message user{" + userFields + "}}}"),
                      variables: { uploadToken },
                    });
                    setUser((previous) => ({ ...previous, ...data.updateProfilePhoto.user }));
                    notify(data.updateProfilePhoto.message);
                    r.retry();
                  }}
                />
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-[#9aa58c]">Your photo is saved automatically when you upload it.</p>
            </fieldset>
          </div>
        </aside>

        <section aria-labelledby="profile-details-title" className="min-w-0 overflow-hidden rounded-2xl border border-[#e0e7d7] bg-white shadow-[0_3px_16px_#263c2803]">
          <header className="flex items-start gap-3 border-b border-[#eaf0e2] p-5 sm:px-7 sm:py-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f4e9] text-[#8ca373]"><UserRound size={20} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><h2 id="profile-details-title" className="font-serif text-[24px] leading-tight tracking-[-0.3px] text-[#3b5334]">Personal information</h2><p className="mt-1.5 text-[11px] leading-relaxed text-[#869478]">A few details to make your planning space your own.</p></div>
          </header>
          <form onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            const fields = Object.fromEntries(new FormData(event.currentTarget));
            setBusy(true);
            setError("");
            try {
              const result = await save("/profile", "PUT", { ...fields, expectedUpdatedAt: r.data.updatedAt });
              notify(result.message);
              await reload();
              r.retry();
            } catch (error) {
              setError(error.message);
            } finally {
              setBusy(false);
            }
          }}>
            <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
              <legend className="sr-only">Edit your personal and contact details</legend>
              <div className="space-y-6 p-5 sm:p-7">
                <p className="text-[10px] text-[#98a18e]"><span className="text-[#a08065]">*</span> Required field</p>
                <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-5 min-[600px]:grid-cols-2">
                  <label className={labelClass}>
                    <span>First name <span className="text-[#a08065]">*</span></span>
                    <input className={inputClass} name="firstName" autoComplete="given-name" defaultValue={r.data.firstName || ""} placeholder="Your first name" required maxLength={100} />
                  </label>
                  <label className={labelClass}>
                    <span>Last name <span className="ml-1 text-[10px] font-normal text-[#9aa58c]">Optional</span></span>
                    <input className={inputClass} name="lastName" autoComplete="family-name" defaultValue={r.data.lastName || ""} placeholder="Your last name" maxLength={100} />
                  </label>
                  <label className={labelClass}>
                    <span>Phone number <span className="ml-1 text-[10px] font-normal text-[#9aa58c]">Optional</span></span>
                    <input className={inputClass} name="phone" type="tel" autoComplete="tel" defaultValue={r.data.phone || ""} placeholder="Your phone number" maxLength={20} />
                  </label>
                  <label className={labelClass}>
                    <span>Date of birth <span className="ml-1 text-[10px] font-normal text-[#9aa58c]">Optional</span></span>
                    <input className={inputClass} name="dateOfBirth" type="date" autoComplete="bday" max={today()} defaultValue={r.data.dateOfBirth?.slice(0, 10) || ""} />
                  </label>
                </div>
                <div className="border-t border-[#ecf0e5] pt-6">
                  <label className={labelClass}>
                    <span className="flex flex-wrap items-center justify-between gap-2"><span>Email address</span><span className="inline-flex items-center gap-1 text-[10px] font-normal text-[#8ba374]"><ShieldCheck size={12} aria-hidden="true" />Verified email</span></span>
                    <span className="relative block min-w-0">
                      <Mail size={16} className="pointer-events-none absolute top-4 left-4 text-[#a1ae92]" aria-hidden="true" />
                      <input value={r.data.email || ""} type="email" autoComplete="email" disabled readOnly className={inputClass + " pl-11 pr-10"} />
                      <LockKeyhole size={13} className="pointer-events-none absolute top-[18px] right-4 text-[#a7b19a]" aria-hidden="true" />
                    </span>
                    <span className="text-[10px] leading-relaxed font-normal text-[#96a087]">This email is linked to your account and can’t be edited here.</span>
                  </label>
                </div>
                {error && <p role="alert" className="rounded-xl border border-[#edc9c9] bg-[#fff5f3] px-4 py-3 text-xs leading-relaxed break-words text-[#ab5b56]">{error}</p>}
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#eaf0e2] bg-[#fbfcf9] px-5 py-5 sm:px-7">
                <p className="flex items-center gap-2 text-[10px] text-[#8e9c7c]"><ShieldCheck size={15} className="shrink-0 text-[#9bae88]" aria-hidden="true" />Keep your contact details up to date.</p>
                <button type="submit" disabled={busy} className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#46683a] bg-[#46683a] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:border-[#335528] hover:bg-[#335528] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7d9a66] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none sm:w-auto">
                  {busy ? <LoaderCircle size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save size={15} aria-hidden="true" />}
                  {busy ? "Saving…" : "Save profile"}
                </button>
              </footer>
            </fieldset>
          </form>
        </section>
      </div>
      <p className="flex items-center justify-center gap-2 pt-1 text-center text-[10px] text-[#9ba68d]"><Camera size={13} aria-hidden="true" />A familiar face. A celebration that’s yours.</p>
    </div>
  );
}
