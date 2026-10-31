// Only the server's booking payment state can produce a success screen.
export function selectedPaymentMinor(booking, mode = "balance", customAmount = "") {
  const remaining = Math.round(Number(booking.RemainingAmount) * 100);
  if (mode === "custom")
    return /^\d{1,14}(\.\d{1,2})?$/.test(customAmount) ? Math.round(Number(customAmount) * 100) : 0;
  if (mode === "advance")
    return Math.min(remaining, Math.max(0, Math.round(Number(booking.AdvanceAmount) * 100) - Math.round(Number(booking.PaidAmount) * 100)));
  if (["balance", "100"].includes(mode)) return remaining;
  if (["10", "25", "50", "75"].includes(mode))
    return Number((BigInt(remaining) * BigInt(mode) + 50n) / 100n);
  return 0;
}

export function paymentScreen(booking, stage = "review") {
  if (booking.PaymentStatus === "Paid") return "success";
  if (booking.PaymentStatus === 'PartiallyPaid' && stage === 'verified') return 'success';
  if (["processing", "pending", "failed"].includes(stage)) return stage;
  return booking.PaymentStatus === "Failed" ? "failed" : "review";
}
