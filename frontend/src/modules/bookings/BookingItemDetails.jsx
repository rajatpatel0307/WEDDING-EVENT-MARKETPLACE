export default function BookingItemDetails({ description }) {
  if (!description) return null;
  let snapshot;
  try {
    snapshot = JSON.parse(description);
  } catch {
    return <p className="mt-1 text-sm text-stone-500">{description}</p>;
  }
  if (!snapshot || typeof snapshot !== "object") return null;
  return (
    <div className="mt-1 text-sm text-stone-500">
      <p>{snapshot.description}</p>
      {snapshot.inclusions?.length > 0 && (
        <details>
          <summary>Package inclusions</summary>
          <ul className="ml-4 list-disc">
            {snapshot.inclusions.map((i, k) => (
              <li key={k}>
                {i.name}
                {i.quantity ? ` × ${Number(i.quantity)}` : ""}
                {i.description ? ` — ${i.description}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
