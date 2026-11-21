import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Clock3,
  History,
  Info,
  MessageSquare,
  MessagesSquare,
  RefreshCw,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";
import { communicationRequest } from "./api";

const metrics = [
  {
    key: "conversations",
    label: "Active conversations",
    scope: "Currently active",
    description:
      "Customer and vendor conversations currently marked as active.",
    icon: MessagesSquare,
    tone: "bg-teal-50 [&&]:text-teal-700",
  },
  {
    key: "messagesToday",
    label: "Messages sent",
    scope: "Last 24 hours",
    description:
      "Messages created across the marketplace during the last 24 hours.",
    icon: MessageSquare,
    tone: "bg-blue-50 [&&]:text-blue-600",
  },
  {
    key: "awaitingDelivery",
    label: "Awaiting acknowledgement",
    scope: "Current backlog",
    description:
      "Unread, non-deleted messages awaiting a delivery receipt from the recipient.",
    icon: Clock3,
    tone: "bg-amber-50 [&&]:text-amber-700",
  },
  {
    key: "unreadNotifications",
    label: "Unread notifications",
    scope: "Not dismissed",
    description:
      "Unread notifications across marketplace accounts, excluding dismissed updates.",
    icon: BellRing,
    tone: "bg-white/15 [&&]:text-teal-100",
  },
];
const counts = new Intl.NumberFormat("en-IN");
const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 [&&]:text-sm font-medium [&&]:text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:[&&]:text-teal-800 disabled:cursor-default disabled:opacity-50";

function displayDate(value, format) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? format.format(date)
    : "Unavailable";
}

export function CommunicationActivityTable({ data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[660px] [&&]:text-left [&&]:text-sm">
        <caption className="sr-only">
          Marketplace communication activity totals and metric definitions
        </caption>
        <thead className="border-y border-slate-100 bg-slate-50 [&&]:text-xs font-semibold uppercase tracking-wider [&&]:text-slate-500">
          <tr>
            {["Activity", "Total", "Coverage", "Details"].map((label) => (
              <th key={label} scope="col" className="px-6 py-3">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {metrics.map(({ key, label, scope, description }) => (
            <tr key={key} className="hover:bg-slate-50/70">
              <th
                scope="row"
                className="px-6 py-4 font-medium [&&]:text-slate-700"
              >
                {label}
              </th>
              <td className="px-6 py-4 font-semibold tabular-nums [&&]:text-teal-800">
                {data[key] == null ? "—" : counts.format(data[key])}
              </td>
              <td className="whitespace-nowrap px-6 py-4 [&&]:text-slate-500">
                {scope}
              </td>
              <td className="px-6 py-4 leading-relaxed [&&]:text-slate-500">
                {description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Participant({ id, name, role }) {
  const customer = role === "customer";
  const label =
    name?.trim() || (customer ? "Unnamed customer" : "Unnamed vendor");
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className={`flex size-10 shrink-0 items-center justify-center rounded-full [&&]:text-xs font-semibold ${customer ? "bg-indigo-50 [&&]:text-indigo-600" : "bg-teal-50 [&&]:text-teal-700"}`}
      >
        {initials}
      </span>
      <div className="min-w-0">
        <span className="mb-0.5 block [&&]:text-xs [&&]:text-slate-400 lg:hidden">
          {customer ? "Customer" : "Vendor"}
        </span>
        <Link
          to={`/admin/${customer ? "customers" : "vendors"}/${id}`}
          className="block break-words [&&]:text-sm font-semibold [&&]:text-slate-800 decoration-teal-400 underline-offset-4 hover:[&&]:text-teal-700 hover:underline"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}

export function ConversationTable({ rows }) {
  return (
    <table className="block w-full [&&]:text-left lg:table lg:table-fixed">
      <caption className="sr-only">
        Customers and vendors in active conversations, most recent activity
        first
      </caption>
      <thead className="hidden border-y border-slate-100 bg-slate-50/80 lg:table-header-group">
        <tr>
          {[
            "Customer",
            "Vendor",
            "Event / booking",
            "Messages",
            "Last activity",
          ].map((label, index) => (
            <th
              key={label}
              scope="col"
              className={`px-6 py-3.5 [&&]:text-xs font-semibold uppercase tracking-wider [&&]:text-slate-500 ${index < 2 ? "w-[25%]" : index === 2 ? "w-[22%]" : index === 3 ? "w-[11%]" : "w-[17%]"}`}
            >
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block divide-y divide-slate-100 lg:table-row-group">
        {rows.map((row) => (
          <tr
            key={row.id}
            className="grid grid-cols-2 gap-x-4 gap-y-5 p-5 transition-colors hover:bg-teal-50/30 sm:p-6 lg:table-row lg:p-0"
          >
            <td className="min-w-0 lg:px-6 lg:py-5">
              <Participant
                id={row.customerId}
                name={row.customerName}
                role="customer"
              />
            </td>
            <td className="min-w-0 lg:px-6 lg:py-5">
              <Participant
                id={row.vendorId}
                name={row.vendorName}
                role="vendor"
              />
            </td>
            <td className="col-span-2 min-w-0 lg:px-6 lg:py-5">
              <span className="mb-1 block [&&]:text-xs [&&]:text-slate-400 lg:hidden">
                Event / booking
              </span>
              <p className="break-words [&&]:text-sm font-medium [&&]:text-slate-700">
                {row.eventName || "General enquiry"}
              </p>
              {row.bookingNumber && (
                <p className="mt-1 break-words [&&]:text-xs [&&]:text-slate-500">
                  {row.bookingNumber}
                </p>
              )}
            </td>
            <td className="lg:px-6 lg:py-5">
              <span className="mb-1 block [&&]:text-xs [&&]:text-slate-400 lg:hidden">
                Messages
              </span>
              <span className="inline-flex items-center gap-1.5 [&&]:text-sm font-medium tabular-nums [&&]:text-slate-600">
                <MessageSquare
                  size={14}
                  className="[&&]:text-slate-400"
                  aria-hidden="true"
                />
                {counts.format(row.messageCount ?? 0)}
              </span>
            </td>
            <td className="lg:px-6 lg:py-5">
              <span className="mb-1 block [&&]:text-xs [&&]:text-slate-400 lg:hidden">
                Last activity
              </span>
              <time
                dateTime={row.updatedAt || undefined}
                className="[&&]:text-sm [&&]:text-slate-600"
              >
                {displayDate(row.updatedAt, dateFormat)}
                <span className="mt-1 block [&&]:text-xs [&&]:text-slate-400">
                  {displayDate(row.updatedAt, timeFormat)} IST
                </span>
              </time>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CommunicationOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [conversations, setConversations] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    communicationRequest("Admin", "/overview", { signal: abort.signal })
      .then((result) => {
        if (abort.signal.aborted) return;
        setData(result);
        setUpdatedAt(new Date().toISOString());
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [revision]);

  useEffect(() => {
    const abort = new AbortController();
    setListLoading(true);
    setListError("");
    communicationRequest(
      "Admin",
      `/overview/conversations?${new URLSearchParams({ q: query, page })}`,
      { signal: abort.signal },
    )
      .then((result) => {
        if (abort.signal.aborted) return;
        if (!result.rows.length && page > 1) {
          setPage(1);
          return;
        }
        setConversations(result);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setListError(e.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setListLoading(false);
      });
    return () => abort.abort();
  }, [query, page, revision]);

  function refresh() {
    setRevision((value) => value + 1);
  }
  const busy = loading || listLoading;
  const searchPending = search.trim() !== query;

  return (
    <div className="min-w-0 space-y-6 [&&]:text-slate-800 [font-family:inherit] [&_button]:cursor-pointer [&_button:disabled]:cursor-default [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-teal-600 [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-teal-600">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-2 flex items-center gap-2 [&&]:text-xs font-semibold uppercase tracking-[0.18em] [&&]:text-teal-700">
            <span className="h-px w-5 bg-teal-600" aria-hidden="true" />
            Operations / Communications
          </p>
          <h1 className="[&&]:m-0 [&&]:text-2xl font-semibold tracking-tight [&&]:text-slate-900 sm:[&&]:text-3xl">
            Communication overview
          </h1>
          <p className="mt-2 max-w-2xl [&&]:text-sm leading-relaxed [&&]:text-slate-500 sm:[&&]:text-base">
            A clear view of marketplace conversations and the people behind
            them.
          </p>
        </div>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={refresh}
        >
          <RefreshCw
            size={16}
            className={busy ? "animate-spin" : ""}
            aria-hidden="true"
          />
          {busy ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 [&&]:text-sm [&&]:text-red-800"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={refresh}
            className="font-semibold underline underline-offset-4"
          >
            Retry overview
          </button>
        </div>
      )}

      <section
        aria-label="Communication statistics"
        aria-busy={loading}
        className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map(({ key, label, scope, icon: Icon, tone }) => {
          const featured = key === "unreadNotifications";
          return (
            <article
              key={key}
              className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm sm:p-6 ${featured ? "border-teal-800 bg-teal-800 [&&]:text-white" : "border-slate-200/80 bg-white"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={`[&&]:text-sm font-medium ${featured ? "[&&]:text-teal-50" : "[&&]:text-slate-600"}`}
                >
                  {label}
                </p>
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
                >
                  <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
                </span>
              </div>
              <div
                className="mt-5 text-4xl font-semibold tracking-tight tabular-nums"
                aria-live="polite"
              >
                {loading ? (
                  <span
                    className={`block h-10 w-16 animate-pulse rounded ${featured ? "bg-white/15" : "bg-slate-100"}`}
                    aria-label="Loading count"
                  />
                ) : error || data?.[key] == null ? (
                  "—"
                ) : (
                  counts.format(data[key])
                )}
              </div>
              <p
                className={`mt-2 [&&]:text-xs ${featured ? "[&&]:text-teal-100/80" : "[&&]:text-slate-400"}`}
              >
                {scope}
              </p>
            </article>
          );
        })}
      </section>

      <section
        aria-labelledby="conversations-heading"
        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-teal-100 bg-teal-50 [&&]:text-teal-700">
              <Users size={21} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2
                  id="conversations-heading"
                  className="[&&]:text-lg font-semibold tracking-tight [&&]:text-slate-900"
                >
                  Who's talking
                </h2>
                <span className="rounded-full border border-teal-100 bg-teal-50 px-2.5 py-1 [&&]:text-xs font-medium [&&]:text-teal-700">
                  Active conversations
                </span>
              </div>
              <p className="mt-1 [&&]:text-sm leading-relaxed [&&]:text-slate-500">
                See which customers and vendors are connected.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">
          <label className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 transition focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 sm:max-w-md">
            <Search
              size={17}
              className="shrink-0 [&&]:text-slate-400"
              aria-hidden="true"
            />
            <span className="sr-only">
              Search conversations by customer, vendor, event or booking
            </span>
            <input
              type="search"
              maxLength={100}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, vendor or event…"
              className="min-w-0 flex-1 border-0! bg-transparent! p-0! [font:inherit]! [&&]:text-sm [&&]:text-slate-800 outline-none! shadow-none! placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded p-0.5 [&&]:text-slate-400 hover:[&&]:text-slate-700"
                aria-label="Clear search"
              >
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </label>
          <p className="[&&]:text-xs [&&]:text-slate-400" role="status">
            {listLoading || searchPending
              ? "Updating conversations…"
              : listError
                ? "Could not load conversations"
                : `${counts.format(conversations?.total ?? 0)} ${query ? "matching" : "active"} conversations`}
          </p>
        </div>

        <div aria-busy={listLoading || searchPending}>
          {listError ? (
            <div
              role="alert"
              className="m-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 [&&]:text-sm [&&]:text-red-800"
            >
              <span>{listError}</span>
              <button
                type="button"
                onClick={refresh}
                className="font-semibold underline underline-offset-4"
              >
                Retry conversations
              </button>
            </div>
          ) : listLoading || searchPending ? (
            <div
              role="status"
              className="space-y-5 border-t border-slate-100 px-6 py-8"
            >
              <span className="sr-only">Loading conversations</span>
              {[0, 1, 2].map((value) => (
                <div
                  key={value}
                  aria-hidden="true"
                  className="flex animate-pulse items-center gap-4"
                >
                  <span className="size-10 rounded-full bg-slate-100" />
                  <span className="h-4 w-1/4 rounded bg-slate-100" />
                  <span className="ml-auto h-4 w-1/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          ) : conversations?.rows.length ? (
            <ConversationTable rows={conversations.rows} />
          ) : (
            <div className="border-t border-slate-100 px-6 py-14 [&&]:text-center">
              <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-slate-50 [&&]:text-slate-400">
                <MessagesSquare
                  size={26}
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </span>
              <h3 className="[&&]:text-base font-semibold [&&]:text-slate-700">
                {query
                  ? "No matching conversations"
                  : "No active conversations yet"}
              </h3>
              <p className="mt-2 [&&]:text-sm [&&]:text-slate-500">
                {query
                  ? "Try another customer, vendor, event or booking."
                  : "Customer and vendor connections will appear here when a conversation starts."}
              </p>
              {query && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="mt-4 [&&]:text-sm font-semibold [&&]:text-teal-700 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-6">
          <p className="flex items-start gap-2 [&&]:text-xs leading-relaxed [&&]:text-slate-500">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            Conversation participants and activity. Times shown in IST.
          </p>
          {!listError && conversations?.total > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="[&&]:text-xs tabular-nums [&&]:text-slate-500">
                {counts.format(
                  (conversations.page - 1) * conversations.pageSize + 1,
                )}
                –
                {counts.format(
                  Math.min(
                    conversations.page * conversations.pageSize,
                    conversations.total,
                  ),
                )}{" "}
                of {counts.format(conversations.total)}
              </span>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white p-2 [&&]:text-slate-600 transition hover:bg-teal-50 disabled:opacity-40"
                aria-label="Previous conversation page"
                disabled={listLoading || searchPending || page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-200 bg-white p-2 [&&]:text-slate-600 transition hover:bg-teal-50 disabled:opacity-40"
                aria-label="Next conversation page"
                disabled={
                  listLoading || searchPending || !conversations.hasMore
                }
                onClick={() => setPage((value) => value + 1)}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </footer>
      </section>

      {data && !error && (
        <details className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 marker:content-none sm:px-6">
            <span className="flex items-center gap-3">
              <Info
                size={18}
                className="[&&]:text-slate-400"
                aria-hidden="true"
              />
              <span>
                <span className="block [&&]:text-sm font-semibold [&&]:text-slate-700">
                  About these metrics
                </span>
                <span className="mt-0.5 block [&&]:text-xs [&&]:text-slate-400">
                  Reporting coverage and definitions
                </span>
              </span>
            </span>
            <ChevronRight
              size={17}
              className="shrink-0 [&&]:text-slate-400 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
          </summary>
          <CommunicationActivityTable data={data} />
        </details>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <nav
          aria-label="Communication tools"
          className="flex flex-wrap gap-x-6 gap-y-3 [&&]:text-sm font-medium [&&]:text-slate-500"
        >
          <Link
            to="/admin/audit-logs"
            className="inline-flex items-center gap-2 transition hover:[&&]:text-teal-700"
          >
            <History size={16} aria-hidden="true" />
            Audit history
          </Link>
          <Link
            to="/admin/notifications"
            className="inline-flex items-center gap-2 transition hover:[&&]:text-teal-700"
          >
            <Bell size={16} aria-hidden="true" />
            Notifications
          </Link>
          <Link
            to="/admin/vendors"
            className="inline-flex items-center gap-2 transition hover:[&&]:text-teal-700"
          >
            <Store size={16} aria-hidden="true" />
            Vendor directory
          </Link>
        </nav>
        {updatedAt && (
          <time
            dateTime={updatedAt}
            className="[&&]:text-xs [&&]:text-slate-400"
          >
            Overview refreshed {displayDate(updatedAt, timeFormat)} IST
          </time>
        )}
      </footer>
    </div>
  );
}
