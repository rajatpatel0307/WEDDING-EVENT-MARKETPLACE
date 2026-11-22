import PDFDocument from "pdfkit";
import { orderDetails } from "./order-management.js";
import { select, transaction } from "../admin/admin.repository.js";

// Render only a number assigned by the persistent invoice ledger.
export function invoiceNumber(order) {
  const match = /^NESTIN(\d{2})(\d{5,})$/.exec(order.invoiceNumber || "");
  if (!match || !/[1-9]/.test(match[2])) throw new Error("This order does not have a valid invoice reference.");
  return order.invoiceNumber;
}

export async function allocateInvoice(id, customer, tx) {
  if (!tx || tx.finished) throw new Error("Invoice allocation requires an active transaction.");
  try {
    const [invoice] = await select("EXEC dbo.IssueOrderInvoice @order=:id,@customer=:customer", { id, customer }, tx);
    if (!invoice?.number) throw new Error("Invoice allocation failed. Apply migration 036-order-invoices.");
    return invoice;
  } catch (error) {
    const number = error.original?.number || error.parent?.number;
    if ([51001, 51002, 51003].includes(number))
      throw Object.assign(new Error(error.original?.message || error.message), { status: number === 51001 ? 404 : 409 });
    throw error;
  }
}

const money = value => `INR ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = value => value && !Number.isNaN(new Date(value).getTime())
  ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value))
  : "Not recorded";
const clean = value => String(value ?? "").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, " ");

// Authorize through the existing role-scoped order query. Never accept prices,
// customer details, payment state or delivery state supplied by the browser.
export async function orderInvoice(id, ctx, role = "Customer") {
  const order = await orderDetails(id, ctx, role);
  if (!order.invoiceAvailable || (role !== "Vendor" && order.status !== "Delivered"))
    throw Object.assign(new Error("Your invoice is available after payment is verified and your order is delivered."), { status: 409 });
  // Orders do not store a dispatch-location snapshot. Use each seller's primary
  // active business location, falling back to their oldest active location.
  // Scope this lookup to this customer's order as well as the authorized read above.
  const vendors = await select(`SELECT v.VendorId AS vendorId,v.BusinessName AS name,v.ContactEmail AS email,
    COALESCE(NULLIF(LTRIM(RTRIM(origin.ContactNumber)),''),v.ContactPhone) AS phone,
    origin.AddressLine1 AS line1,origin.AddressLine2 AS line2,origin.City AS city,
    origin.State AS state,origin.PostalCode AS postalCode,origin.Country AS country
    FROM dbo.Vendors v OUTER APPLY(SELECT TOP(1) vl.AddressLine1,vl.AddressLine2,vl.City,vl.State,
      vl.PostalCode,vl.Country,vl.ContactNumber FROM dbo.VendorLocations vl
      WHERE vl.VendorId=v.VendorId AND vl.IsActive=1
      ORDER BY vl.IsPrimary DESC,vl.CreatedAt,vl.VendorLocationId) origin
    WHERE EXISTS(SELECT 1 FROM dbo.OrderLineItems i JOIN dbo.Orders o ON o.OrderId=i.OrderId
      WHERE i.VendorId=v.VendorId AND o.OrderId=:id AND o.CustomerId=:customer)
      ${role === "Vendor" ? "AND v.VendorId=:vendor" : ""}
    ORDER BY v.BusinessName,v.VendorId`, { id: order.id, customer: order.customer.id,
      ...(role === "Vendor" ? { vendor: ctx.auth.user.vendor.id } : {}) });
  const senders = vendors.map(vendor => ({
    name: vendor.name, phone: vendor.phone, email: vendor.email,
    address: [vendor.line1, vendor.line2,
      [vendor.city, vendor.state, vendor.postalCode].filter(Boolean).join(", "), vendor.country].filter(Boolean),
  }));
  return transaction(async tx => {
    const invoice = await allocateInvoice(order.id, order.customer.id, tx);
    const document = { ...order, invoiceNumber: invoice.number, invoiceIssuedAt: invoice.issuedAt };
    return {
      name: `${invoiceNumber(document)}.pdf`,
      buffer: await renderOrderInvoice(document, senders),
    };
  });
}

export function renderOrderInvoice(order, senders = []) {
  if (!senders.length) senders = [...new Set((order.lines || []).map(line => line.vendor).filter(Boolean))]
    .map(name => ({ name }));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, bufferPages: true,
      info: { Title: invoiceNumber(order), Author: "MarryNest", Subject: `Delivered order ${clean(order.number)}` } });
    const chunks = [];
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    try {
      const width = doc.page.width, right = width - 40, content = width - 80;
      const blue = "#104A87", navy = "#122956", ink = "#333E4D", muted = "#68717C";
      const text = (value, x, y, w, options = {}) => {
        doc.font(options.bold ? "Helvetica-Bold" : "Helvetica").fontSize(options.size || 10)
          .fillColor(options.color || ink).text(clean(value), x, y, { width: w, lineGap: 3, ...options });
      };
      const height = (value, w, size = 10, bold = false) => doc.font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(size).heightOfString(clean(value), { width: w, lineGap: 3 });
      const header = (continuation = false) => {
        doc.rect(0, 0, width, 150).fill(navy);
        doc.path(`M 0 0 L ${width * .83} 0 C ${width * .55} 55 120 0 0 65 Z`).fill("#1260A4");
        doc.path(`M 0 30 C 110 -5 190 30 300 0 L 0 0 Z`).fill("#277BB8");
        doc.path(`M 0 150 C 140 50 245 160 ${width} 100 L ${width} 160 L 0 160 Z`).fill("#FFFFFF");
        text("INVOICE", 40, 56, 240, { bold: true, size: 30, color: "#FFFFFF", characterSpacing: 2 });
        text(`NO: ${invoiceNumber(order)}`, 292, 66, right - 292, { bold: true, color: "#FFFFFF", align: "right" });
        if (continuation) text(`Order ${order.number} - continued`, 40, 166, content, { size: 9, color: muted });
      };
      const tableHeader = y => {
        doc.rect(40, y, content, 28).fill(blue);
        text("Description", 49, y + 8, 236, { color: "#FFFFFF", size: 9 });
        text("Qty", 290, y + 8, 36, { color: "#FFFFFF", size: 9, align: "center" });
        text("Price", 332, y + 8, 91, { color: "#FFFFFF", size: 9, align: "right" });
        text("Total", 434, y + 8, right - 443, { color: "#FFFFFF", size: 9, align: "right" });
        return y + 28;
      };
      let y;
      const newPage = (table = false) => {
        doc.addPage(); header(true); y = table ? tableHeader(195) : 200;
      };
      header();
      const address = order.address || {};
      const billed = [address.fullName || order.customer?.name, address.phone || order.customer?.phone,
        order.customer?.email, address.line1, address.line2,
        [address.city, address.state, address.postalCode].filter(Boolean).join(", "), address.country].filter(Boolean);
      text("Bill To:", 40, 155, 250, { bold: true, size: 12 });
      text("From:", 326, 155, right - 326, { bold: true, size: 12, align: "right" });
      let leftY = 177, rightY = 177;
      // Wrapped parties grow naturally; the table starts below the taller block.
      for (const line of billed) { text(line, 40, leftY, 260, { color: muted }); leftY += height(line, 260) + 1; }
      const senderPage = () => {
        newPage();
        text("From (continued):", 326, 200, right - 326, { bold: true, size: 12, align: "right" });
        rightY = 222; leftY = 200;
      };
      for (const [senderIndex, sender] of senders.entries()) {
        if (senderIndex > 0) rightY += 12;
        const senderAddress = (Array.isArray(sender.address) ? sender.address : [sender.address]).filter(Boolean);
        const from = [sender.name, sender.phone, sender.email,
          ...(senderAddress.length ? senderAddress : ["Shipping address not available"])].filter(Boolean);
        const blockHeight = from.reduce((sum, line, index) => sum + height(line, right - 326, 10, index === 0) + 1, 0);
        if (rightY + blockHeight > 735 && rightY > 222) senderPage();
        for (let index = 0; index < from.length; index++) {
          const line = from[index], lineHeight = height(line, right - 326, 10, index === 0) + 1;
          if (rightY + lineHeight > 735) senderPage();
          text(line, 326, rightY, right - 326, { color: muted, align: "right", bold: index === 0 });
          rightY += lineHeight;
        }
      }
      y = Math.max(leftY, rightY) + 16;
      const delivered = [...(order.history || [])].filter(event => event.status === "Delivered")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]?.createdAt || order.statusUpdatedAt;
      if (y > 650) newPage();
      text(`Date: ${date(delivered)}`, 40, y, content, { color: muted }); y += 21;
      text(`Order: ${order.number}  |  Placed: ${date(order.createdAt)}`, 40, y, content, { size: 9, color: muted }); y += 25;
      y = tableHeader(y);
      for (const line of order.lines || []) {
        const label = [line.name, line.vendor && `Seller: ${line.vendor}`, line.status === "Cancelled" && "Cancelled item"].filter(Boolean).join("\n");
        const rowHeight = Math.max(44, height(label, 226, 9) + 20);
        if (y + rowHeight > 735) newPage(true);
        doc.rect(40, y, content, rowHeight).fillAndStroke("#FFFFFF", "#D9DFE6");
        for (const x of [284, 330, 431]) doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor("#D9DFE6").stroke();
        text(label, 49, y + 10, 226, { size: 9 });
        text(line.quantity, 290, y + 10, 34, { size: 9, align: "center" });
        text(money(line.price), 335, y + 10, 88, { size: 9, align: "right" });
        // Show the merchandise amount here; tax and shipping appear once below.
        text(money(Number(line.price) * Number(line.quantity)), 436, y + 10, right - 445, { size: 9, align: "right" });
        y += rowHeight;
      }
      if (y + 247 > 765) newPage();
      y += 18;
      for (const [label, amount] of [["Subtotal", order.subtotal], ["Delivery charges", order.shipping], ["Tax", order.tax], ["Discount", -Number(order.discount || 0)]]) {
        text(label, 320, y, 100, { color: muted });
        text(money(amount), 425, y, right - 425, { align: "right" }); y += 23;
      }
      doc.rect(309, y, right - 309, 31).fill(blue);
      text("Total", 320, y + 10, 70, { bold: true, color: "#FFFFFF" });
      text(money(order.total), 392, y + 10, right - 402, { bold: true, color: "#FFFFFF", align: "right" }); y += 56;
      text("Payment Information:", 40, y, 275, { bold: true });
      text(`Status: ${order.paymentStatus}  |  Method: ${order.paymentMethod || "Online payment"}`, 40, y + 22, 290, { size: 9, color: muted });
      text("Thank You!", 350, y + 14, right - 350, { size: 25, color: navy, align: "right" });
      text("Note: Thank you for choosing MarryNest for your celebration.", 40, y + 52, content, { size: 9, color: muted });
      text(order.vendorScoped ? "Vendor copy: amounts cover only items fulfilled by your business. Refunds are recorded separately."
        : "Amounts reflect the saved order. Any refunds are recorded separately.", 40, y + 69, content, { size: 8, color: muted });
      const pages = doc.bufferedPageRange();
      for (let index = 0; index < pages.count; index++) {
        doc.switchToPage(index);
        doc.moveTo(40, 780).lineTo(right, 780).strokeColor("#D9DFE6").stroke();
        text(`MarryNest  |  ${invoiceNumber(order)}`, 40, 791, 420, { size: 8, color: muted, lineGap: 0 });
        text(`${index + 1} / ${pages.count}`, right - 55, 791, 55, { size: 8, color: muted, align: "right", lineGap: 0 });
      }
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
