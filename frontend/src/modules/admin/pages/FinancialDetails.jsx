import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, ChevronRight, CreditCard, Wallet, CalendarDays, CalendarCheck, Store, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, FilePlus2, ReceiptText, History, Inbox, RotateCcw, PauseCircle, Landmark } from "lucide-react";
import { adminRequest, date } from "../api";
import { useAdminData } from "../services-management.api";
import { Skeleton, ErrorState } from "../components/AdminTable";
import AdminDialog from "../components/AdminDialog";
import { useAuth } from "../../../context/AuthContext";

const button = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#dce6df] bg-white px-3 py-2 text-[11px] font-medium text-[#557160] transition-colors hover:border-[#afccba] hover:bg-[#f0f6f2] disabled:cursor-not-allowed disabled:opacity-45";
const primaryButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-[#176b60] bg-[#176b60] px-3 py-2 text-[11px] font-medium text-white transition-colors hover:bg-[#12574e] disabled:cursor-not-allowed disabled:opacity-45";
const dangerButton = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45";
const panel = "min-w-0 overflow-hidden rounded-2xl border border-[#dfe8e1] bg-white shadow-sm shadow-[#254c3810]";
const labels = {
  id: "Record ID", name: "Reference", status: "Status", Currency: "Currency",
  GatewayName: "Payment gateway", GatewayTransactionId: "Gateway transaction ID",
  PaymentMethod: "Payment method", PaidAt: "Paid on", CreatedAt: "Created on",
  UpdatedAt: "Last updated", PaymentId: "Original payment ID", VendorId: "Vendor ID",
  BookingId: "Booking ID", BookingNumber: "Booking number", TransactionType: "Type",
  TransactionStatus: "Status", CommissionRate: "Commission rate",
};
const label = (key) => labels[key] || key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (s) => s.toUpperCase());
const format = (key, value, currency = "INR") => {
  if (value == null || value === "") return "Not recorded";
  if (/(At|Date|Until)$/.test(key)) return date(value);
  if (/(Amount|Total|PlatformCommission|TaxDeduction|RefundDeduction|ApplicableFees)$/i.test(key))
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number(value));
  if (/Rate$/.test(key)) return `${value}%`;
  return String(value);
};
const resources = {
  payments: { title: "Payment details", icon: CreditCard, amount: "Amount", amountLabel: "Payment amount" },
  refunds: { title: "Refund details", icon: RotateCcw, amount: "RefundAmount", amountLabel: "Refund amount" },
  payouts: { title: "Payout details", icon: Wallet, amount: "NetAmount", amountLabel: "Net vendor payable" },

  commission: { title: "Commission details", icon: Landmark, amount: "CommissionAmount", amountLabel: "Platform commission" },
};

function Status({ value }) {
  const tone = ["Success", "Paid", "Completed", "Approved", "Accepted", "Captured"].includes(value)
    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10"
    : ["Failed", "Rejected", "Cancelled"].includes(value) ? "bg-rose-50 text-rose-700 ring-rose-600/10"
      : ["Pending", "Processing", "OnHold", "Requested"].includes(value) ? "bg-amber-50 text-amber-800 ring-amber-600/10"
        : ["Refunded", "PartiallyRefunded"].includes(value) ? "bg-violet-50 text-violet-700 ring-violet-600/10"
          : "bg-slate-50 text-slate-600 ring-slate-500/10";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] leading-normal font-medium whitespace-nowrap ring-1 ring-inset ${tone}`}>
    <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />{label(value || "Recorded")}
  </span>;
}

function SectionHeading({ title, icon: Icon, count }) {
  return <div className="flex min-h-14 items-center gap-2 border-b border-[#e8eeea] px-4 py-3.5 sm:px-5">
    <Icon size={16} className="text-[#739581]" aria-hidden="true" /><h2 className="text-sm! font-semibold!">{title}</h2>
    {count !== undefined && <span className="ml-auto rounded-md bg-[#eff4f0] px-2 py-0.5 text-[10px] text-[#779180]">{count}</span>}
  </div>;
}

function Fields({ entries, currency, kind }) {
  return <dl className="grid min-w-0 gap-x-6 px-4 py-1 sm:grid-cols-2 sm:px-5">
    {entries.map(([key, value]) => <div key={key} className="min-w-0 border-b border-[#edf2ee] py-3.5 last:border-0">
      <dt className="mb-1.5 text-[10px] text-[#819587]">{key === "name" && kind === "payments" ? "Payment reference" : key === "id" && kind === "payments" ? "Payment ID" : label(key)}</dt>
      <dd className={`text-xs leading-relaxed text-[#3d5948] whitespace-pre-wrap [overflow-wrap:anywhere] ${/(Id|ID)$/.test(key) || key === "id" ? "font-mono text-[11px]" : ""}`}>
        {key === "status" ? <Status value={value} /> : format(key, value, currency)}
      </dd>
    </div>)}
  </dl>;
}

function Rows({ rows, currency = "INR" }) {
  if (!rows?.length) return <div className="flex flex-col items-center gap-2 px-5 py-10 text-center"><span className="grid size-10 place-items-center rounded-xl bg-[#eff5f0] text-[#8aa390]"><Inbox size={20} strokeWidth={1.6} aria-hidden="true" /></span><p className="text-xs! text-[#819587]!">No related transactions recorded.</p></div>;
  const columns = Object.keys(rows[0]);
  return <div className="min-w-0 overflow-x-auto">
    <table className="w-full min-w-[720px] border-collapse text-left text-xs [&_th]:border-b [&_th]:border-[#e5ece7] [&_th]:bg-[#f5f8f6] [&_th]:px-4 [&_th]:py-3 [&_th]:text-[10px] [&_th]:font-medium [&_th]:tracking-wide [&_th]:whitespace-nowrap [&_th]:text-[#7b9081] [&_th]:uppercase [&_td]:border-b [&_td]:border-[#edf2ee] [&_td]:px-4 [&_td]:py-3.5 [&_td]:align-middle [&_tbody_tr:last-child_td]:border-0 [&_tbody_tr:hover]:bg-[#fafcfb]">
      <caption className="sr-only">Related financial transaction records</caption>
      <thead><tr>{columns.map((key) => <th key={key} scope="col">{label(key)}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={row.id || index}>{columns.map((key) => <td key={key}>
        {/status$/i.test(key) ? <Status value={row[key]} /> : <span title={format(key, row[key], row.Currency || currency)} className={/(Id|ID)$/.test(key) || key === "id" ? "block max-w-52 truncate font-mono text-[10px] text-[#7b9081]" : "block max-w-64 text-[11px] text-[#45614f] [overflow-wrap:anywhere]"}>{format(key, row[key], row.Currency || currency)}</span>}
      </td>)}</tr>)}</tbody>
    </table>
  </div>;
}

function AuditHistory({ rows }) {
  if (!rows?.length) return <div className="flex items-center gap-2 px-5 py-6 text-xs text-[#819587]"><History size={16} aria-hidden="true" />No administrative history recorded.</div>;
  return <ol className="px-5 py-5">
    {rows.map((entry, index) => <li key={entry.id || index} className="relative ml-1 border-l border-[#dfe9e2] pb-5 pl-5 last:border-transparent last:pb-0 before:absolute before:top-1 before:-left-[4.5px] before:size-2 before:rounded-full before:bg-[#7fa18b] before:ring-4 before:ring-[#f0f6f2]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><strong className="text-xs font-medium text-[#3b5947]">{label(String(entry.action || "Record updated").toLowerCase().replaceAll("_", " "))}</strong><time className="text-[10px] text-[#8b9e90]">{format("createdAt", entry.createdAt)}</time></div>
      <span className="mt-1 block text-[10px] text-[#819587]">{entry.actor || "System"}</span>
      {entry.note && <p className="mt-2 rounded-lg bg-[#f6f9f7] p-3 text-xs! leading-relaxed whitespace-pre-wrap text-[#698171]! [overflow-wrap:anywhere]">{entry.note}</p>}
      {entry.reference && <span className="mt-2 block font-mono text-[10px] text-[#819587] [overflow-wrap:anywhere]">Reference: {entry.reference}</span>}
    </li>)}
  </ol>;
}

export default function FinancialDetails() {
  const { kind, id } = useParams();
  const [revision, setRevision] = useState(0),
    [decision, setDecision] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const state = useAdminData(`/finance/${kind}/${id}`, revision);
  const { notify } = useAuth();
  if (state.loading) return <Skeleton />;
  if (state.error)
    return <ErrorState error={state.error} retry={state.retry} />;
  const { record: row, rows, history, settlementMode } = state.data;
  const actions =
    kind === "payouts" && row.status !== "Paid"
      ? row.status === "Processing"
        ? settlementMode === "manual"
          ? [
              ["confirm-paid", "Record confirmed external settlement"],
              ["record-failure", "Record externally confirmed failure"],
            ]
          : []
        : [
            ["approve", "Approve payout"],
            ["hold", "Place on hold"],
            ["reject", "Reject payout"],
            ...(row.ReviewStatus === "Approved" && settlementMode === "manual"
              ? [["start-settlement", "Reserve for external settlement"]]
              : []),
          ]
      : [];
  const config = resources[kind] || resources.payments;
  const RecordIcon = config.icon;
  const currency = row.Currency || "INR";
  const transactionRows = Array.isArray(rows) ? rows : [];
  const auditRows = Array.isArray(history) ? history : [];
  const detailEntries = Object.entries(row).filter(([key, value]) => !Array.isArray(value) && !["VendorId", "vendor", "BookingId", "BookingNumber", "PaymentId", "reconciliation"].includes(key));
  const reconciled = typeof row.reconciliation === "string" && row.reconciliation.startsWith("Recorded capture amounts match");
  const ReconciliationIcon = reconciled ? ShieldCheck : ShieldAlert;
  const actionIcons = { approve: CheckCircle2, hold: PauseCircle, reject: XCircle, "start-settlement": Wallet, "confirm-paid": CheckCircle2, "record-failure": XCircle };
  const links = [
    ...(row.BookingId ? [{type:"Booking",name:row.BookingNumber || "View booking",id:row.BookingId,to:`/admin/bookings/${row.BookingId}`,icon:CalendarCheck}] : []),
    ...(row.VendorId ? [{type:"Vendor",name:row.vendor || "View vendor",id:row.VendorId,to:`/admin/vendors/${row.VendorId}`,icon:Store}] : []),
    ...(row.PaymentId ? [{type:"Original payment",name:"View original payment",id:row.PaymentId,to:`/admin/finance/payments/${row.PaymentId}`,icon:CreditCard}] : []),
  ];
  return (
    <div className="grid w-full min-w-0 gap-5 text-[#2b4638] [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-3 [&_:focus-visible]:outline-[#176b60]">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#91a095]">
        <Link className="inline-flex items-center gap-2 font-medium text-[#678372] transition-colors hover:text-[#176b60]" to={`/admin/${kind}`}><ArrowLeft size={14} aria-hidden="true" />Back to {kind}</Link>
        <ChevronRight size={12} aria-hidden="true" /><span>{config.title}</span>
      </div>

      <header className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-1 hidden size-11 shrink-0 place-items-center rounded-xl bg-[#eaf3ed] text-[#176b60] sm:grid"><RecordIcon size={21} strokeWidth={1.6} aria-hidden="true" /></span>
            <div className="min-w-0">
              <span className="text-[9px] font-medium tracking-[1.5px] text-[#84988a] uppercase">{config.title}</span>
              <h1 className="mt-1! mb-2! text-xl! leading-tight! font-semibold! tracking-tight! [overflow-wrap:anywhere] sm:text-[26px]!">{row.name || row.id}</h1>
              <p className="max-w-2xl text-xs! leading-relaxed text-[#819587]!">{"Transaction details, linked records and administrative history."}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3"><Status value={row.status || "Recorded"} /><button type="button" className={primaryButton} onClick={() => {setError("");setDecision(["note", "Add internal note"]);}}><FilePlus2 size={14} aria-hidden="true" />Add internal note</button></div>
        </div>
        {actions.length > 0 && <div className="flex flex-wrap gap-2 border-t border-[#e8eeea] bg-[#fcfdfc] px-4 py-3 sm:px-5">
          {actions.map(([action,title]) => {const Icon=actionIcons[action];return <button type="button" key={action} className={["reject","record-failure"].includes(action) ? dangerButton : ["approve","confirm-paid"].includes(action) ? primaryButton : button} onClick={() => {setError("");setDecision([action,title,crypto.randomUUID()]);}}><Icon size={14} aria-hidden="true" />{title}</button>;})}
        </div>}
      </header>

      <section aria-label="Financial summary" className="grid min-w-0 grid-cols-1 gap-3 min-[460px]:grid-cols-2 min-[1100px]:grid-cols-4">
        <article className="min-w-0 rounded-xl border border-[#176b60] bg-[#176b60] px-4 py-4 text-white shadow-sm">
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-[#abd2c3]">{config.amountLabel}</span><Wallet size={17} className="text-[#c5e2d3]" aria-hidden="true" /></div>
          <strong className="mt-3 block text-[25px] leading-tight font-semibold tracking-tight tabular-nums [overflow-wrap:anywhere]">{format(config.amount,row[config.amount],currency)}</strong><span className="mt-1.5 block text-[10px] text-[#abd2c3]">{currency}</span>
        </article>
        {[
          [kind === "payments" ? "Payment method" : "Record status",kind === "payments" ? row.PaymentMethod : row.status,CreditCard],
          [kind === "payments" ? "Payment gateway" : "Vendor",kind === "payments" ? row.GatewayName : row.vendor,kind === "payments" ? Landmark : Store],
          [row.PaidAt ? "Paid on" : "Created on",date(row.PaidAt || row.CreatedAt),CalendarDays],
        ].map(([title,value,Icon]) => (
          <article key={title} className="min-w-0 rounded-xl border border-[#e0e9e3] bg-white px-4 py-4 shadow-sm shadow-[#254c3810]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#819587]">{title}</span>
              <span className="grid size-7 place-items-center rounded-lg bg-[#f0f5ef] text-[#6e927b]"><Icon size={15} aria-hidden="true" /></span>
            </div>
            <strong className="mt-2 block text-base leading-relaxed font-semibold text-[#355542] capitalize [overflow-wrap:anywhere]">{value || "Not recorded"}</strong>
          </article>
        ))}
      </section>

      {row.reconciliation && <section aria-label="Payment reconciliation" className={`flex items-start gap-3 rounded-xl border p-4 ${reconciled ? "border-[#dbe8df] bg-[#eff6f1] text-[#4e775b]" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <ReconciliationIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><h2 className="mb-1 text-xs! font-semibold! text-inherit!">Reconciliation</h2><p className="text-[11px]! leading-relaxed text-inherit!">{row.reconciliation}</p></div>
      </section>}

      <div className="grid min-w-0 items-start gap-5 min-[1250px]:grid-cols-[minmax(0,1fr)_310px] min-[1600px]:grid-cols-[minmax(0,1fr)_340px]">
        <section className={panel} aria-label={kind === "payments" ? "Payment information" : "Record information"}>
          <SectionHeading title={kind === "payments" ? "Payment information" : "Record information"} icon={ReceiptText} />
          <Fields entries={detailEntries} currency={currency} kind={kind} />
          {kind === "payouts" && <div className="m-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800"><ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /><p className="text-[11px]! leading-relaxed text-inherit!">Net payable comes from the recorded ledger. Approval does not transfer money. {settlementMode === "manual" ? "Reserve funds before using your approved external settlement procedure; record payment only after confirming its external reference." : "External settlement recording is disabled until the server operator configures an approved procedure."}</p></div>}
          {kind === "refunds" && <p className="m-4 rounded-lg bg-[#f5f8f6] p-3 text-[11px]! leading-relaxed text-[#789080]!">Use the booking's reviewed refund workflow. Completion is recorded only after gateway confirmation.</p>}
        </section>

        <aside className={panel} aria-label="Linked records">
          <SectionHeading title="Linked records" icon={CalendarCheck} count={links.length} />
          <div className="grid gap-3 p-4">
            {links.map(({type,name,id,to,icon:Icon}) => <Link key={type} to={to} title={type === "Booking" ? "View booking, refund eligibility and ledger" : `View ${type.toLowerCase()}`} className="group min-w-0 rounded-xl border border-[#e2eae4] bg-[#fcfdfc] p-3 transition-colors hover:border-[#accbb7] hover:bg-[#f3f8f5]"><div className="flex items-center gap-2 text-[10px] text-[#819587]"><Icon size={14} className="text-[#769a81]" aria-hidden="true" />{type}<ArrowUpRight size={13} className="ml-auto text-[#94aa9b] group-hover:text-[#176b60]" aria-hidden="true" /></div><strong className="mt-2 block text-xs font-semibold text-[#3c6049] [overflow-wrap:anywhere]">{name}</strong><span className="mt-1 block font-mono text-[10px] text-[#8fa295] [overflow-wrap:anywhere]">{id}</span></Link>)}
            {!links.length && <p className="py-2 text-xs! text-[#819587]!">No linked booking or vendor records.</p>}
          </div>
          {(row.bookings?.length > 0 || row.refunds?.length > 0) && <div className="border-t border-[#e8eeea] p-4">
            {row.bookings?.length > 0 && <h3 className="mb-2 text-[10px] font-medium text-[#819587]">Linked bookings</h3>}
            {row.bookings?.map((booking) => <Link key={booking.id} to={`/admin/bookings/${booking.id}`} className="mb-2 flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-[#e2eae4] p-2.5 text-[11px] text-[#456b52]"><CalendarCheck size={13} aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{booking.name}</span><Status value={booking.status} /></Link>)}
            {row.refunds?.length > 0 && <h3 className="mb-2 text-[10px] font-medium text-[#819587]">Related refunds</h3>}
            {row.refunds?.map((refund) => <Link key={refund.id} to={`/admin/finance/refunds/${refund.id}`} className="mb-2 grid gap-2 rounded-lg border border-[#e2eae4] p-2.5 text-[11px] text-[#456b52]"><span className="flex min-w-0 items-center gap-2"><RotateCcw size={13} className="shrink-0" aria-hidden="true" /><span className="[overflow-wrap:anywhere]">{refund.name}</span></span><span className="flex flex-wrap items-center justify-between gap-2"><strong className="font-semibold tabular-nums">{format("amount",refund.amount,currency)}</strong><Status value={refund.status} /></span></Link>)}
          </div>}
        </aside>
      </div>

      <section className={panel} aria-label={"Related transactions"}>
        <SectionHeading title={"Related transactions"} icon={ReceiptText} count={transactionRows.length} />
        <Rows rows={transactionRows} currency={currency} />
      </section>
      <section className={panel} aria-label="Administrative history">
        <SectionHeading title="Administrative history" icon={History} count={auditRows.length} />
        <AuditHistory rows={auditRows} />
      </section>
      {decision && (
        <AdminDialog
          title={decision[1]}
          busy={busy}
          close={() => setDecision(null)}
        >
          <form
            className="grid gap-4 [&_label]:flex [&_label]:flex-col [&_label]:gap-2 [&_label]:text-xs [&_label]:text-[#60796b] [&_input]:w-full [&_input]:text-xs! [&_input[type=checkbox]]:w-auto [&_input[type=checkbox]]:self-start [&_textarea]:min-h-28 [&_textarea]:w-full [&_textarea]:text-xs! [&_p]:text-xs! [&_p]:leading-relaxed"
            onSubmit={async (event) => {
              event.preventDefault();
              const values = Object.fromEntries(
                new FormData(event.currentTarget),
              );
              setBusy(true);
              setError("");
              try {
                const result = await adminRequest(
                  decision[0] === "note"
                    ? `/finance/${kind}/${id}/notes`
                    : `/payouts/${id}/decision`,
                  {
                    method: "POST",
                    body: JSON.stringify(
                      decision[0] === "note"
                        ? { note: values.note }
                        : {
                            action: decision[0],
                            expectedUpdatedAt: row.UpdatedAt,
                            note: values.note,
                            ...(decision[0] === "start-settlement"
                              ? {
                                  destination: values.destination,
                                  destinationVerified:
                                    values.destinationVerified === "on",
                                }
                              : {}),
                            ...(["confirm-paid", "record-failure"].includes(
                              decision[0],
                            )
                              ? {
                                  reference: values.reference,
                                  idempotencyKey: decision[2],
                                }
                              : {}),
                          },
                    ),
                  },
                );
                notify(result.message);
                setDecision(null);
                setRevision((value) => value + 1);
              } catch (failure) {
                setError(failure.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <p>This action will be recorded in the audit history.</p>
            {decision[0] === "start-settlement" && (
              <>
                <label>
                  Masked external destination reference
                  <input
                    name="destination"
                    required
                    minLength={6}
                    maxLength={150}
                    placeholder="Verified beneficiary — account ending 1234"
                  />
                </label>
                <label>
                  <input name="destinationVerified" type="checkbox" required />{" "}
                  I verified the external beneficiary belongs to this vendor and
                  is eligible for settlement.
                </label>
              </>
            )}
            <label>
              Reason / internal note
              <textarea name="note" required minLength={3} maxLength={2000} />
            </label>
            {["confirm-paid", "record-failure"].includes(decision[0]) && (
              <>
                <p>
                  Record only a verified external result. Successful settlements
                  must be confirmed as paid; failures must be confirmed before
                  releasing the reservation. This application will not initiate
                  a transfer.
                </p>
                <label>
                  External settlement reference
                  <input
                    name="reference"
                    required
                    minLength={6}
                    maxLength={150}
                  />
                </label>
              </>
            )}
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700" role="alert">
                {error}
              </p>
            )}
            <button className={primaryButton} disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </button>
          </form>
        </AdminDialog>
      )}
    </div>
  );
}
