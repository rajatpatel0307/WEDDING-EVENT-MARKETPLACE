import { button } from "./api";
export function State({ state }) {
  return state.loading ? (
    <p role="status" className="py-8 text-sm text-[#7e8575]">
      Loading…
    </p>
  ) : state.error ? (
    <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
      {state.error}
    </p>
  ) : null;
}
export function Pagination({ data, page, setPage }) {
  return data && data.total > data.pageSize ? (
    <nav className="flex items-center gap-3 py-4" aria-label="Results pages">
      <button
        className={button}
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm">
        Page {page} of {Math.ceil(data.total / data.pageSize)}
      </span>
      <button
        className={button}
        disabled={page * data.pageSize >= data.total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </nav>
  ) : null;
}
