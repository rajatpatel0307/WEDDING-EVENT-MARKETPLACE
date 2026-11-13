export function bookingAdvanceError(book) {
  if (!book) return null;
  if (
    !Number.isFinite(book.advance) ||
    book.advance < 0 ||
    book.advance > 10000000 ||
    Math.abs(book.advance * 100 - Math.round(book.advance * 100)) > 0.00001
  ) {
    return "Enter a valid advance booking amount, or 0 if no advance is required.";
  }
  if (Number.isFinite(book.price) && book.advance > book.price) {
    return "Advance booking amount per unit cannot exceed the booking price. Lower the advance amount or increase the booking price in Pricing.";
  }
  return null;
}
