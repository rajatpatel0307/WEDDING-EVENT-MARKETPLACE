import * as repo from "../admin/admin.repository.js";
// This projection is used only where the existing approved/public predicates
// already apply. Stock is on hand less unresolved purchase reservations.
export const commerceFields = `JSON_VALUE(s.DetailsJson,'$.offer.type') AS offerType,
 c.AllowBuyOnline AS sellEnabled,c.AllowBooking AS bookEnabled,
 TRY_CONVERT(decimal(18,2),JSON_VALUE(s.DetailsJson,'$.offer.sell.price')) AS sellingPrice,
 TRY_CONVERT(decimal(18,2),JSON_VALUE(s.DetailsJson,'$.offer.book.price')) AS bookingPrice,
 JSON_VALUE(s.DetailsJson,'$.offer.sell.available') AS sellingAvailable,
 JSON_VALUE(s.DetailsJson,'$.offer.book.available') AS bookingAvailable,
 TRY_CONVERT(int,JSON_VALUE(s.DetailsJson,'$.offer.sell.minimum')) AS sellingMinimum,
 TRY_CONVERT(int,JSON_VALUE(s.DetailsJson,'$.offer.book.minimum')) AS bookingMinimum,
 CASE WHEN JSON_VALUE(s.DetailsJson,'$.offer.book.mode')='Quantity' THEN
  TRY_CONVERT(int,JSON_VALUE(s.DetailsJson,'$.offer.book.capacity'))-
  COALESCE((SELECT SUM(br.Quantity) FROM dbo.BookingReservations br JOIN dbo.Booking bb ON bb.BookingId=br.BookingId WHERE br.ServiceId=s.ServiceId AND bb.BookingStatus IN('Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed')),0)
 END AS bookingRemaining,
 (SELECT p.Stock-COALESCE((SELECT SUM(i.Quantity) FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId WHERE i.ProductId=p.ProductId AND o.StockReserved=1 AND o.PaymentStatus<>'Paid'),0) FROM dbo.Products p WHERE p.ServiceId=s.ServiceId AND p.IsActive=1 AND p.IsPublished=1) AS sellingStock`;
export async function publicOffer(id, document) {
  const offer = document.offer;
  if (!offer) return null;
  let sell = offer.sell;
  if (sell) {
    const [p] = await repo.select(
      "SELECT p.Stock-COALESCE((SELECT SUM(i.Quantity) FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId WHERE i.ProductId=p.ProductId AND o.StockReserved=1 AND o.PaymentStatus<>'Paid'),0) AS stock FROM dbo.Products p WHERE p.ServiceId=:id AND p.IsActive=1 AND p.IsPublished=1",
      { id },
    );
    sell = { ...sell, stock: Math.max(0, Number(p?.stock || 0)) };
  }
  let book = offer.book;
  if (book?.mode === "Quantity") {
    const [used] = await repo.select(
      "SELECT COALESCE(SUM(r.Quantity),0) AS quantity FROM dbo.BookingReservations r JOIN dbo.Booking b ON b.BookingId=r.BookingId WHERE r.ServiceId=:id AND b.BookingStatus IN('Pending','Accepted','PaymentPending','Confirmed','InProgress','Disputed')",
      { id },
    );
    book = {
      ...book,
      remaining: Math.max(0, book.capacity - Number(used.quantity)),
    };
  }
  return { ...offer, ...(sell ? { sell } : {}), ...(book ? { book } : {}) };
}
