import { select } from "../admin/admin.repository.js";
export async function allocateOrderNumber(transaction) {
  if (!transaction || transaction.finished) throw new Error("Order number allocation requires an active transaction.");
  const [row] = await select("EXEC dbo.AllocateOrderNumber", {}, transaction);
  if (!row?.number) throw new Error("Order number allocation failed. Apply migration 033-order-management.");
  return row.number;
}
