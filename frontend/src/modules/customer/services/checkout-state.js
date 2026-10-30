// Only the server's booking payment state can produce a success screen.
export function paymentScreen(booking, stage = "review") {
  if (booking.PaymentStatus === "Paid") return "success";
  if (booking.PaymentStatus === 'PartiallyPaid' && stage === 'verified') return 'success';
  if (["processing", "pending", "failed"].includes(stage)) return stage;
  return booking.PaymentStatus === "Failed" ? "failed" : "review";
}
