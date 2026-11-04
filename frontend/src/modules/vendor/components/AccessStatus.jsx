export default function AccessStatus({ state }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2"
      aria-label="Vendor access permissions"
    >
      {["service", "booking"].map((type) => {
        const status = state.data?.[`${type}Status`];
        return (
          <section
            key={type}
            className="rounded-xl border border-[#dfe7d8] bg-white p-5"
          >
            <h2 className="text-sm font-semibold text-[#2b4638]">
              {type === "service" ? "Service Access" : "Booking Access"}
            </h2>
            <p className="mt-2 text-sm font-medium" role="status">
              {status === "Pending"
                ? "Pending Approval"
                : status ||
                  (state.error ? "Unable to load access" : "Loading…")}
            </p>
            {status && (
              <p className="mt-2 text-xs leading-5 text-[#738567]">
                {type === "service"
                  ? status === "Approved"
                    ? "You can create and submit services through the existing approval process."
                    : "Creating and submitting services requires administrator approval."
                  : status === "Approved"
                    ? "Eligible published services can receive new bookings."
                    : "New bookings are unavailable. Existing bookings and their management remain accessible."}
              </p>
            )}
            {state.data?.[`${type}Reason`] && (
              <p className="mt-2 text-xs">
                Reason: {state.data[`${type}Reason`]}
              </p>
            )}
            {state.error && (
              <button
                type="button"
                className="mt-2 text-xs underline"
                onClick={state.retry}
              >
                Retry
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
