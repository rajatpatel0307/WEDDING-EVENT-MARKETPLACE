// Render synthetic examples only. This script does not access the DB or SMTP.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { renderLifecycleEmail } from "../src/modules/notifications/email.templates.js";

const output = new URL("../../.tmp/email-previews/", import.meta.url);
const logo = await readFile(new URL("../src/modules/notifications/assets/marrynest-logo.png", import.meta.url));
const brand = { name: "MarryNest", origin: "https://example.com", supportEmail: "support@example.com" };
const data = {
  id: "734b9588-c47c-40eb-8c17-1797d65a2800", name: "Asha Sharma", vendor: "The Celebration Studio",
  service: "Rose Garden Celebration", services: "Rose Garden Celebration", vendorEmail: "vendor@example.com", vendorPhone: "+91 90000 00000",
  reference: "MNBK2600042", bookingDate: "2026-12-20", startTime: "09:30:00", endTime: "12:30:00",
  deliveryDate: "2026-11-20", status: "Accepted", paymentStatus: "Pending", subtotal: 10000, tax: 1800, total: 11800,
  advance: 2000, paid: 0, address: { fullName: "Asha Sharma", line1: "10 Celebration Road", city: "New Delhi", state: "Delhi", postalCode: "110001", country: "India" },
  items: [{ name: "Rose Garden Celebration", quantity: 2, price: 5000, total: 11800 }],
};
const types = ["vendor.approved", "service.approved", "order.placed", "order.delivered", "booking.placed", "booking.accepted"];
await mkdir(output, { recursive: true });
for (const type of types) {
  const order = type.startsWith("order.");
  const sample = { ...data, ...(order ? { reference: "MNOR2600042", paymentStatus: "Paid", shipping: 0, advance: undefined, paid: undefined } : {}),
    ...(type === "booking.placed" ? { status: "Pending" } : {}) };
  const mail = renderLifecycleEmail(type, sample, brand);
  await writeFile(new URL(`${type}.html`, output), mail.html.replace("cid:marrynest-logo", `data:image/png;base64,${logo.toString("base64")}`));
  await writeFile(new URL(`${type}.txt`, output), mail.text);
}
await writeFile(new URL("index.html", output), `<!doctype html><html lang="en"><meta charset="utf-8"><title>MarryNest email previews</title><body style="font:16px Arial;background:#faf8f5;padding:32px;color:#68313d"><h1>MarryNest email previews</h1><p>Synthetic examples. No emails have been sent.</p><ul>${types.map(type => `<li style="margin:16px 0"><a href="${type}.html">${type}</a> · <a href="${type}.txt">Plain text</a></li>`).join("")}</ul></body></html>`);
console.log(`Synthetic email previews: ${fileURLToPath(new URL("index.html", output))}`);
