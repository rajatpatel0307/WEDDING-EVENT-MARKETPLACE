const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const money = value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(value || 0));
const date = value => {
  if (!value) return "To be arranged";
  // SQL date values represent the booked calendar day, not a UTC instant.
  const day = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const parsed = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "To be arranged" : new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "UTC" }).format(parsed);
};
const time = value => {
  if (!value) return "To be arranged with your vendor";
  const text = value instanceof Date ? value.toISOString().slice(11, 16) : String(value).slice(0, 5);
  return /^\d{2}:\d{2}$/.test(text) ? `${text} IST` : "To be arranged with your vendor";
};
export function siteOrigin(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}
export function validEmail(value) {
  // A single registered mailbox only; never accept a comma-separated envelope.
  return typeof value === "string" && value.length <= 320 && /^[^\s<>@,;"\r\n]+@[^\s<>@,;"\r\n]+\.[^\s<>@,;"\r\n]+$/.test(value);
}
const descriptions = {
  "vendor.approved": ["Your vendor account is approved", "Welcome to your next chapter", "Your vendor registration has been approved. You can now access your vendor panel and manage your services.", "Open vendor panel", "/vendor/dashboard"],
  "service.approved": ["Your listing is approved", "Ready for your customers", "Your service/product has been approved. It is now available to customers according to its listing configuration, availability and visibility settings.", "Manage your services", "/vendor/services"],
  "order.placed": ["Your order is confirmed", "Something special is on its way", "Your order has been placed successfully and your payment has been confirmed. Keep this summary for your records.", "View your order", "/customer/orders/"],
  "order.delivered": ["Your order has been delivered", "Delivered with care", "Your order has been marked as delivered. We hope it brings something special to your celebration.", "View your order", "/customer/orders/"],
  "booking.placed": ["Your booking request is received", "A step closer to your celebration", "Your booking has been placed successfully and is awaiting vendor acceptance. Your requested date and time are shown below.", "View your booking", "/customer/bookings/"],
  "booking.accepted": ["Your booking has been accepted", "Your plans are coming together", "Your vendor has accepted your booking. Review the agreed date, time and booking details below. Payment requirements continue to apply as shown in your account.", "View your booking", "/customer/bookings/"],
};

export function renderLifecycleEmail(type, data, brand) {
  if (!descriptions[type]) throw new Error("Unsupported email event.");
  const [title, eyebrow, intro, action, path] = descriptions[type];
  const rows = [];
  if (type === "vendor.approved") rows.push(["Vendor", data.vendor], ["Approval status", "Approved"]);
  else if (type === "service.approved") rows.push(["Service / product", data.service], ["Approval status", "Approved"], ["Vendor", data.vendor]);
  else if (type.startsWith("order.")) {
    rows.push(["Order ID", data.reference], ["Payment status", data.paymentStatus]);
    if (type === "order.delivered") rows.push(["Delivery date", date(data.deliveryDate)]);
  } else {
    rows.push(["Booking ID", data.reference], ["Service(s)", data.services], ["Vendor", data.vendor]);
    if (data.vendorEmail) rows.push(["Vendor email", data.vendorEmail]);
    if (data.vendorPhone) rows.push(["Vendor phone", data.vendorPhone]);
    rows.push([type === "booking.accepted" ? "Accepted booking date" : "Booking date", date(data.bookingDate)],
      [type === "booking.accepted" ? "Accepted booking time" : "Booking time", time(data.startTime)],
      ...(data.endTime ? [["End time", time(data.endTime)]] : []),
      ["Booking status", data.status], ["Payment status", data.paymentStatus]);
  }
  if (data.total !== undefined) {
    rows.push(["Subtotal", money(data.subtotal)], ["Tax", money(data.tax)]);
    if (data.shipping !== undefined) rows.push(["Delivery", money(data.shipping)]);
    if (Number(data.discount)) rows.push(["Discount", money(data.discount)]);
    if (Number(data.platformFee)) rows.push(["Platform fee", money(data.platformFee)]);
    rows.push([type.startsWith("booking.") ? "Booking amount" : "Total amount", money(data.total)]);
    if (data.advance !== undefined) rows.push(["Required advance", money(data.advance)]);
    if (data.paid !== undefined) rows.push(["Amount paid", money(data.paid)]);
  }
  const address = data.address ? [data.address.fullName, data.address.line1, data.address.line2,
    data.address.city, data.address.state, data.address.postalCode, data.address.country].filter(Boolean).join(", ") : "";
  if (address) rows.push([type.startsWith("order.") ? "Delivery address" : "Booking location", address]);
  const url = brand.origin ? `${brand.origin}${path}${path.endsWith("/") ? encodeURIComponent(data.id) : ""}` : null;
  const contactUrl = brand.origin ? `${brand.origin}/contact` : null;
  const supportEmail = validEmail(brand.supportEmail) ? brand.supportEmail : null;
  const reference = data.reference ? ` — ${data.reference}` : "";
  const subject = `${brand.name}: ${title}${reference}`.replace(/[\r\n]/g, " ").slice(0, 250);
  const greeting = `Hello ${data.name || "there"},`;
  const items = data.items || [];
  const text = [brand.name, title, greeting, intro, ...rows.map(([label, value]) => `${label}: ${value ?? "—"}`),
    ...items.map(i => `${i.name} | Quantity: ${i.quantity} | Unit price: ${money(i.price)} | Total: ${money(i.total)}${i.status ? ` | ${i.status}` : ""}`),
    url ? `${action}: ${url}` : "", `${brand.name} · Wedding & Event Marketplace`,
    supportEmail ? `Support: ${supportEmail}` : "", brand.phone ? `Phone: ${brand.phone}` : "", contactUrl ? `Contact and support: ${contactUrl}` : ""].filter(Boolean).join("\n\n");
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escape(title)}</title>
<style>@media only screen and (max-width:620px){.card{width:100%!important}.pad{padding:24px 18px!important}h1{font-size:28px!important}.detail-label{width:36%!important}.outer{padding:16px 8px!important}}</style></head>
<body style="margin:0;padding:0;background:#faf8f5;color:#382c30;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escape(title + reference)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#faf8f5"><tr><td class="outer" align="center" style="padding:36px 12px">
<table role="presentation" class="card" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #eadfe0;border-radius:16px;overflow:hidden">
<tr><td align="center" style="padding:24px;border-top:6px solid #8c414e;background:#faf8f5"><img src="cid:marrynest-logo" width="160" height="68" alt="${escape(brand.name)}" style="display:block;max-width:160px;height:auto;margin:auto"></td></tr>
<tr><td class="pad" style="padding:36px 36px 20px"><p style="margin:0 0 12px;color:#8c414e;font-size:11px;letter-spacing:2px;text-transform:uppercase">${escape(eyebrow)}</p>
<h1 style="margin:0 0 24px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:34px;line-height:1.2;color:#68313d">${escape(title)}</h1>
<p style="margin:0 0 12px;font-size:15px;line-height:1.7">${escape(greeting)}</p><p style="margin:0;font-size:15px;line-height:1.7;color:#65565c">${escape(intro)}</p></td></tr>
<tr><td class="pad" style="padding:12px 36px 24px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;border-top:1px solid #eadfe0">${rows.map(([label, value]) => `<tr><td class="detail-label" width="38%" valign="top" style="padding:13px 10px 13px 0;border-bottom:1px solid #f1e9ea;font-size:12px;line-height:1.6;color:#78666e">${escape(label)}</td><td valign="top" style="padding:13px 0;border-bottom:1px solid #f1e9ea;font-size:14px;line-height:1.6;font-weight:bold;word-wrap:break-word;overflow-wrap:anywhere">${escape(value ?? "—")}</td></tr>`).join("")}</table>
${items.length ? `<h2 style="font-family:Georgia,serif;font-weight:normal;font-size:22px;color:#68313d;margin:26px 0 12px">${type.startsWith("order.") ? "Your products" : "Your services"}</h2>${items.map(i => `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="table-layout:fixed;margin:0 0 10px;background:#faf8f5;border-radius:8px"><tr><td style="padding:16px;word-wrap:break-word"><p style="margin:0 0 6px;font-size:14px;font-weight:bold">${escape(i.name)}</p><p style="margin:0;font-size:12px;line-height:1.8;color:#78666e">Quantity: ${escape(i.quantity)} &nbsp;·&nbsp; Unit price: ${escape(money(i.price))}<br>Total: ${escape(money(i.total))}${i.status ? ` &nbsp;·&nbsp; ${escape(i.status)}` : ""}</p></td></tr></table>`).join("")}` : ""}
${url ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px"><tr><td bgcolor="#8c414e" style="border-radius:8px"><a href="${escape(url)}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:14px;text-decoration:none;font-weight:bold">${escape(action)}</a></td></tr></table>` : ""}</td></tr>
<tr><td align="center" style="padding:24px 18px;background:#faf8f5;border-top:1px solid #eadfe0;font-size:12px;line-height:1.9;color:#78666e"><strong style="color:#8c414e">${escape(brand.name)}</strong><br>Wedding &amp; Event Marketplace<br>${supportEmail ? `<a href="mailto:${escape(supportEmail)}" style="color:#8c414e">${escape(supportEmail)}</a><br>` : ""}${brand.phone ? `${escape(brand.phone)}<br>` : ""}${contactUrl ? `<a href="${escape(contactUrl)}" style="color:#8c414e">Contact &amp; support</a><br>` : ""}This is an automatic update about your account or purchase.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, text, html, ...(supportEmail ? { replyTo: supportEmail } : {}) };
}
