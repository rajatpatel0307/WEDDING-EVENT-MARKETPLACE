const enabled = (value) => value === true || value === 1 || value === "true";
export function offerState(item) {
  const type = item.offer?.type || item.offerType;
  const sell = item.offer?.sell;
  const book = item.offer?.book;
  const stock = Number(sell?.stock ?? item.sellingStock ?? 0);
  const available = item.available !== false && item.available !== 0;
  const remaining = book?.remaining ?? item.bookingRemaining;
  return {
    type,
    stock,
    sellingPrice: sell?.price ?? item.sellingPrice,
    bookingPrice: book?.price ?? item.bookingPrice,
    canSell:
      available &&
      !!type &&
      type !== "Book" &&
      enabled(item.sellEnabled) &&
      enabled(sell?.available ?? item.sellingAvailable) &&
      stock >= Number(sell?.minimum || item.sellingMinimum || 1),
    canBook:
      available &&
      !!type &&
      type !== "Sell" &&
      enabled(item.bookEnabled) &&
      enabled(book?.available ?? item.bookingAvailable) &&
      item.bookingAccessStatus === "Approved" &&
      (remaining == null ||
        remaining >= (book?.minimum || item.bookingMinimum || 1)),
  };
}
