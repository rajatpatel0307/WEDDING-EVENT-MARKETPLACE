export function bookingQuantityState(value, book) {
  const min = Number(book.minimum ?? 1);
  const max = Number(book.maximum ?? 100000);
  const quantity = Number(value);
  const empty = value == null || String(value).trim() === "";
  const numeric = !empty && Number.isFinite(quantity);
  const valid = numeric && Number.isInteger(quantity) && quantity >= min && quantity <= max;

  // Invalid manual entry must not disable the direction that returns to range.
  const decrease = !numeric ? min : quantity > max ? max : quantity <= min
    ? null : Math.max(min, Math.ceil(quantity) - 1);
  const increase = !numeric ? min : quantity < min ? min : quantity >= max
    ? null : Math.min(max, Math.floor(quantity) + 1);

  return { min, max, valid, decrease, increase };
}
