import * as repo from "../admin/admin.repository.js";
import {
  gateway,
  settle,
  recordFailedPayment,
} from "../customers/workspace.payments.js";
import { reconcileRefund } from "../admin/booking-refunds.service.js";
import { fail } from "../admin/booking-finance.js";
import { notifyAdmins } from "../notifications/admin-events.js";

export async function processPaymentEvents({ limit = 20 } = {}) {
  let processed = 0;
  for (let i = 0; i < limit; i++) {
    const event = await repo.transaction(async (tx) => {
      const [row] = await repo.select(
        "SELECT TOP(1) * FROM dbo.PaymentWebhookEvents WITH(UPDLOCK,READPAST,ROWLOCK) WHERE Status='Pending' AND (LeaseUntil IS NULL OR LeaseUntil<SYSUTCDATETIME()) AND (NextAttemptAt IS NULL OR NextAttemptAt<=SYSUTCDATETIME()) ORDER BY CreatedAt,EventId",
        {},
        tx,
      );
      if (!row) return null;
      await repo.update(
        { table: "PaymentWebhookEvents", id: "EventId" },
        row.EventId,
        {
          LeaseUntil: new Date(Date.now() + 120000),
          Attempts: row.Attempts + 1,
        },
        tx,
      );
      return row;
    });
    if (!event) break;
    try {
      const entity = JSON.parse(event.PayloadJson);
      if (event.EventType === "payment.captured") await settle(entity);
      else if (event.EventType === "payment.failed")
        await recordFailedPayment(entity);
      else await reconcileRefund(entity);
      await repo.update(
        { table: "PaymentWebhookEvents", id: "EventId" },
        event.EventId,
        {
          Status: "Processed",
          ProcessedAt: new Date(),
          LeaseUntil: null,
          LastError: null,
        },
      );
      processed++;
    } catch (error) {
      const review =
        [400, 404, 409].includes(error.status) || error.name === "ZodError";
      await repo.transaction(async (tx) => {
        await repo.update(
          { table: "PaymentWebhookEvents", id: "EventId" },
          event.EventId,
          {
            Status: review ? "Review" : "Pending",
            LeaseUntil: null,
            NextAttemptAt: new Date(
              Date.now() +
                Math.min(3600000, 30000 * 2 ** Math.min(event.Attempts, 7)),
            ),
            LastError: review
              ? "Provider references, amounts or status require review."
              : "Processing unavailable; retry scheduled.",
          },
          tx,
        );
        if (review) {
          const entity = JSON.parse(event.PayloadJson);
          const [source] = await repo.select(
            "SELECT BookingId FROM dbo.CustomerPaymentOrders WHERE GatewayOrderId=:id",
            { id: entity.order_id || "" },
            tx,
          );
          if (source)
            await notifyAdmins(
              "PAYMENT_RECONCILIATION_REVIEW",
              "Booking",
              source.BookingId,
              tx,
            );
        }
      });
    }
  }
  return { processed };
}

export async function refreshOrder(orderId, { request = gateway } = {}) {
  const [order] = await repo.select(
    "SELECT * FROM dbo.CustomerPaymentOrders WHERE OrderId=:id",
    { id: orderId },
  );
  if (!order) fail("Order not found.", 404);
  const remote = await request(`/orders/${order.GatewayOrderId}/payments`);
  if (!Array.isArray(remote.items))
    fail("Unexpected provider payment list.", 502);
  for (const payment of remote.items) {
    if (
      payment.order_id !== order.GatewayOrderId ||
      payment.amount !== Number(order.AmountMinor) ||
      payment.currency !== order.Currency
    )
      fail("Provider order amount or currency mismatch.", 409);
    if (payment.status === "captured") await settle(payment);
    else if (payment.status === "failed") await recordFailedPayment(payment);
  }
  await repo.update(
    { table: "CustomerPaymentOrders", id: "OrderId" },
    orderId,
    { LastCheckedAt: new Date() },
  );
  return {
    message: "Provider status checked. Only verified captures were applied.",
  };
}
export async function reconcilePendingPayments({ limit = 10 } = {}) {
  const rows = await repo.select(
    "SELECT TOP(:limit) OrderId FROM dbo.CustomerPaymentOrders WHERE Status='Created' AND (LastCheckedAt IS NULL OR LastCheckedAt<DATEADD(minute,-5,SYSUTCDATETIME())) ORDER BY COALESCE(LastCheckedAt,CreatedAt),OrderId",
    { limit },
  );
  let checked = 0;
  for (const row of rows) {
    try {
      await refreshOrder(row.OrderId);
      checked++;
    } catch {
      await repo.update(
        { table: "CustomerPaymentOrders", id: "OrderId" },
        row.OrderId,
        { LastCheckedAt: new Date() },
      );
    }
  }
  return { checked };
}
