import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { allocateOrderNumber } from "../src/modules/shopping/order-numbers.js";
import { orderStatuses, aggregateOrderStatus, assertOrderTransition } from "../src/modules/shopping/order-policy.js";
import { listOrders, orderDetails, updateOrderStatus, orderQuery, statusInput } from "../src/modules/shopping/order-management.js";
import { setRealtimeServer } from "../src/modules/messaging/realtime-bus.js";
import { inflateSync } from "node:zlib";
import express from "express";
import { createCustomerRouter } from "../src/modules/customers/workspace.routes.js";
import { createAdminRouter } from "../src/modules/admin/admin.routes.js";
import { createVendorRouter } from "../src/modules/vendors/workspace.routes.js";
import { invoiceNumber, orderInvoice, renderOrderInvoice, allocateInvoice } from "../src/modules/shopping/order-invoice.js";

const id=randomUUID(), customerId=randomUUID(), vendorId=randomUUID(), otherVendor=randomUUID(), ownerId=randomUUID();
const context=role=>({auth:{user:{id:role==='Customer'?customerId:ownerId,active:true,blocked:false,emailVerified:true,roles:[{code:role.toUpperCase(),active:true}],vendor:{id:vendorId,active:true,verificationStatus:'Approved'}}},req:{ip:'127.0.0.1',get:()=> 'test'}});
function fixture(t, { paid=true, status='Pending', foreign=false }={}) {
  const callbacks=[];
  const tx={afterCommit:fn=>callbacks.push(fn)};
  const order={OrderId:id,OrderNumber:'MNOR2600001',CustomerId:customerId,OrderStatus:status,PaymentStatus:paid?'Paid':'Pending',StatusVersion:0,Subtotal:300,ShippingAmount:0,TaxAmount:0,DiscountAmount:0,TotalAmount:300,AddressSnapshot:'{}',CustomerName:'Customer',CustomerEmail:'customer@example.test'};
  const lines=[{ItemId:randomUUID(),VendorId:vendorId,FulfillmentStatus:status,UnitPrice:100,Quantity:1,LineTotal:100},{ItemId:randomUUID(),VendorId:otherVendor,FulfillmentStatus:'Pending',UnitPrice:200,Quantity:1,LineTotal:200}];
  t.mock.method(sequelize,'transaction',async fn=>fn(tx));
  const query=t.mock.method(sequelize,'query',async(sql,options)=>{
    if(sql.startsWith('SELECT o.*')) return foreign?[]:[order];
    if(sql.startsWith('SELECT * FROM dbo.OrderLineItems')) return lines;
    if(sql.startsWith('SELECT i.ItemId')) return lines.filter(line=>!sql.includes('AND i.VendorId=:owner')||line.VendorId===options.replacements.owner).map(line=>({id:line.ItemId,vendorId:line.VendorId,vendor:'Scoped vendor',name:'Own item',price:line.UnitPrice,quantity:line.Quantity,total:line.LineTotal,status:line.FulfillmentStatus,tax:0,shipping:0}));
    if(sql.startsWith('SELECT COUNT_BIG')) return [{total:1}];
    return [];
  });
  return {query,callbacks,order,lines};
}
const writes=query=>query.mock.calls.filter(call=>/^(UPDATE|INSERT|DELETE)/.test(call.arguments[0]));

test('order numbers are allocated in the insertion transaction and fail closed without it',async t=>{
  const query=t.mock.method(sequelize,'query',async()=>[{number:'MNOR2600004'}]);
  await assert.rejects(()=>allocateOrderNumber(),/active transaction/);
  await assert.rejects(()=>allocateOrderNumber({finished:'commit'}),/active transaction/);
  const tx={}; assert.equal(await allocateOrderNumber(tx),'MNOR2600004');
  assert.equal(query.mock.calls[0].arguments[0],'EXEC dbo.AllocateOrderNumber');
  assert.equal(query.mock.calls[0].arguments[1].transaction,tx);
});
test('fulfillment transitions enforce payment, terminal states and explicit admin overrides',()=>{
  for(const [from,to] of [['Pending','Processing'],['Processing','Shipped'],['Shipped','OutForDelivery'],['OutForDelivery','Delivered']])
    assert.doesNotThrow(()=>assertOrderTransition(from,to,{role:'Vendor',paid:true}));
  for(const from of orderStatuses) {
    if(!['Pending','Cancelled'].includes(from)) assert.throws(()=>assertOrderTransition('Pending',from,{role:'Vendor',paid:false}));
  }
  for(const from of ['Delivered','Cancelled']) assert.throws(()=>assertOrderTransition(from,'Processing',{role:'Vendor',paid:true}),/override/);
  assert.throws(()=>assertOrderTransition('Pending','Delivered',{role:'Vendor',paid:true}),/directly/);
  assert.throws(()=>assertOrderTransition('Shipped','Delivered',{role:'Vendor',paid:true}),/directly/);
  assert.doesNotThrow(()=>assertOrderTransition('OutForDelivery','Cancelled',{role:'Vendor',paid:true}));
  assert.throws(()=>assertOrderTransition('Delivered','Processing',{role:'Vendor',paid:true,override:true,note:'Override'}),/administrators/);
  assert.throws(()=>assertOrderTransition('Delivered','Processing',{role:'Admin',paid:true,override:true}),/Explain/);
  assert.doesNotThrow(()=>assertOrderTransition('Delivered','Processing',{role:'Admin',paid:true,override:true,note:'Correct delivery mistake'}));
  assert.doesNotThrow(()=>assertOrderTransition('Cancelled','Pending',{role:'Admin',paid:false,override:true,note:'Reopen after inventory check'}));
});
test('mixed-vendor order progress represents the earliest unfinished fulfillment',()=>{
  assert.equal(aggregateOrderStatus(['Pending','Shipped']),'Pending');
  assert.equal(aggregateOrderStatus(['Processing','Delivered']),'Processing');
  assert.equal(aggregateOrderStatus(['Shipped','OutForDelivery']),'Shipped');
  assert.equal(aggregateOrderStatus(['OutForDelivery','Delivered']),'OutForDelivery');
  assert.equal(aggregateOrderStatus(['Cancelled','Delivered']),'Delivered');
  assert.equal(aggregateOrderStatus(['Cancelled','Cancelled']),'Cancelled');
});
test('order APIs reject wrong roles and malformed updates before querying',async t=>{
  const query=t.mock.method(sequelize,'query',async()=>[]);
  await assert.rejects(()=>listOrders({},context('Customer'),'Vendor'));
  await assert.rejects(()=>updateOrderStatus(id,{status:'Processing',expectedVersion:0},context('Customer'),'Customer'));
  await assert.rejects(()=>updateOrderStatus(id,{status:'Processing',expectedVersion:0,override:true,note:'test'},context('Vendor'),'Vendor'),e=>e.status===403);
  await assert.rejects(()=>orderDetails('invalid',context('Vendor'),'Vendor'));
  assert.equal(query.mock.callCount(),0);
  for(const input of [{status:'Complete',expectedVersion:0},{status:'Processing'},{status:'Shipped',expectedVersion:0,price:1}]) assert.equal(statusInput.safeParse(input).success,false);
  assert.equal(orderQuery.safeParse({from:'2026-11-20',to:'2026-11-01'}).success,false);
});
test('vendors cannot read an order without their own items',async t=>{
  const {query}=fixture(t,{foreign:true});
  await assert.rejects(()=>orderDetails(id,context('Vendor'),'Vendor'),e=>e.status===404);
  assert.equal(query.mock.callCount(),1);
  assert.match(query.mock.calls[0].arguments[0],/own.VendorId=:owner/);
  assert.equal(query.mock.calls[0].arguments[1].replacements.owner,vendorId);
});
test('vendor detail totals, lines and history are scoped to their fulfillment',async t=>{
  const {query}=fixture(t);
  const result=await orderDetails(id,context('Vendor'),'Vendor');
  assert.equal(result.total,100); assert.equal(result.lines.length,1);
  assert.equal(result.vendorScoped,true);
  assert.ok(!JSON.stringify(result).includes(otherVendor));
  const history=query.mock.calls.find(call=>call.arguments[0].includes('FROM dbo.ProductOrderHistory'));
  assert.match(history.arguments[0],/h.VendorId=:owner OR h.VendorId IS NULL/);
});
test('vendor updates change only their own items and publish only after commit',async t=>{
  const {query,callbacks}=fixture(t);
  const emitted=[]; setRealtimeServer({to:room=>({emit:(event,data)=>emitted.push({room,event,data})})});
  t.after(()=>setRealtimeServer(undefined));
  const result=await updateOrderStatus(id,{status:'Processing',expectedVersion:0},context('Vendor'),'Vendor');
  const lineUpdate=query.mock.calls.find(call=>call.arguments[0].startsWith('UPDATE dbo.OrderLineItems'));
  assert.equal(lineUpdate.arguments[1].replacements.vendor,vendorId);
  assert.match(lineUpdate.arguments[0],/VendorId=:vendor/);
  assert.equal(result.status,'Processing'); assert.equal(result.version,1);
  const parentUpdate=query.mock.calls.find(call=>call.arguments[0].startsWith('UPDATE dbo.[Orders]'));
  assert.ok(Object.values(parentUpdate.arguments[1].replacements).includes('Pending'));
  assert.equal(emitted.length,0); callbacks.forEach(fn=>fn());
  assert.ok(emitted.some(event=>event.event==='order_updated'&&event.data.number==='MNOR2600001'));
});
test('stale writes and unpaid partial cancellations make no changes',async t=>{
  const {query}=fixture(t,{paid:false});
  await assert.rejects(()=>updateOrderStatus(id,{status:'Processing',expectedVersion:4},context('Vendor'),'Vendor'),e=>e.status===409);
  await assert.rejects(()=>updateOrderStatus(id,{status:'Cancelled',expectedVersion:0},context('Vendor'),'Vendor'),/complete order/);
  assert.equal(writes(query).length,0);
});

// Customer invoice behavior is part of the existing order test suite.
{
  const id = randomUUID(), customerId = randomUUID(), vendorId = randomUUID();
  const user = { id: customerId, active: true, emailVerified: true, roles: [{ code: "CUSTOMER", active: true }] };
  const ctx = { auth: { user } };
  const order = {
    id, number: "MNOR2600003", invoiceNumber: "NESTIN2600001", status: "Delivered", paymentStatus: "Paid", paymentMethod: "upi",
    customer: { name: "Aarav Sharma", email: "aarav@example.test", phone: "+919999999999" },
    address: { fullName: "Aarav Sharma", line1: "123 Celebration Road", line2: "Gomti Nagar", city: "Lucknow", state: "Uttar Pradesh", postalCode: "226010", country: "India" },
    createdAt: "2026-11-20T10:00:00Z", statusUpdatedAt: "2026-11-21T20:00:00Z",
    subtotal: 1000, shipping: 80, tax: 180, discount: 100, total: 1160,
    lines: [{ id: "line", name: "Wedding gift box", vendor: "Celebration Studio", quantity: 2, price: 500, total: 1260, status: "Delivered" }],
    history: [{ status: "Delivered", createdAt: "2026-11-21T20:00:00Z" }],
  };

  const sender = { vendorId, name: "Celebration Studio", email: "shipping@celebration.example.test", phone: "+919876543210",
    line1: "45 Vendor Shipping Road", line2: "Warehouse 2", city: "Kanpur", state: "Uttar Pradesh", postalCode: "208001", country: "India" };

  // PDFKit's standard fonts encode visible text as hex strings in Flate streams.
  function pdfText(buffer) {
    const texts = [];
    for (const match of buffer.toString("latin1").matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      const content = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      for (const text of content.matchAll(/\[([^\]]*)\] TJ/g))
        texts.push([...text[1].matchAll(/<([0-9a-f]*)>/gi)].map(hex => Buffer.from(hex[1], "hex").toString("latin1")).join(""));
    }
    return texts.join("\n");
  }

  const managerId = randomUUID();
  const roleContext = role => ({ auth: { user: { ...user, id: role === "Customer" ? customerId : managerId,
    roles: [{ code: role.toUpperCase(), active: true }], vendor: { id: vendorId, active: true, verificationStatus: "Approved" } } } });

  function fixture(t, { status = "Delivered", payment = "Paid", foreign = false, statuses = [status], vendors = [sender], role = "Customer", items } = {}) {
    t.mock.method(sequelize, "transaction", async callback => callback({}));
    return t.mock.method(sequelize, "query", async (sql, options) => {
      if (sql.startsWith("SELECT o.*")) {
        if (role === "Customer") { assert.match(sql, /o.CustomerId=:owner/); assert.equal(options.replacements.owner, customerId); }
        else if (role === "Vendor") { assert.match(sql, /own.VendorId=:owner/); assert.equal(options.replacements.owner, vendorId); }
        else assert.equal(options.replacements.owner, managerId);
        return foreign ? [] : [{ OrderId: id, OrderNumber: order.number, CustomerId: customerId, OrderStatus: status, PaymentStatus: payment,
          PaymentMethod: "upi", CreatedAt: order.createdAt, StatusUpdatedAt: order.statusUpdatedAt,
          Subtotal: 1000, ShippingAmount: 80, TaxAmount: 180, DiscountAmount: 100, TotalAmount: 1160,
          AddressSnapshot: JSON.stringify(order.address), CustomerName: "Aarav Sharma", CustomerEmail: "aarav@example.test" }];
      }
      if (sql.startsWith("SELECT i.ItemId")) {
        const lines = items || statuses.map((value, index) => ({ ...order.lines[0], id: `line-${index}`, status: value, vendorId }));
        return lines.filter(line => !sql.includes("AND i.VendorId=:owner") || line.vendorId === options.replacements.owner);
      }
      if (sql.includes("FROM dbo.ProductOrderHistory")) return order.history;
      if (sql.startsWith("EXEC dbo.IssueOrderInvoice")) {
        assert.ok(options.transaction);
        assert.equal(options.replacements.id, id);
        assert.equal(options.replacements.customer, customerId);
        return [{ number: "NESTIN2600001", issuedAt: "2026-11-22T06:00:00Z" }];
      }
      if (sql.startsWith("SELECT v.VendorId AS vendorId")) {
        assert.equal(options.replacements.id, id);
        assert.equal(options.replacements.customer, customerId);
        assert.match(sql, /o.CustomerId=:customer/);
        assert.match(sql, /i.VendorId=v.VendorId/);
        assert.match(sql, /vl.IsActive=1/);
        assert.match(sql, /ORDER BY vl.IsPrimary DESC,vl.CreatedAt,vl.VendorLocationId/);
        if (role === "Vendor") { assert.match(sql, /AND v.VendorId=:vendor/); assert.equal(options.replacements.vendor, vendorId); }
        return vendors.filter(vendor => role !== "Vendor" || vendor.vendorId === options.replacements.vendor);
      }
      throw new Error(`Unexpected invoice query: ${sql}`);
    });
  }

  test("invoice access enforces ownership, verified payment and complete multi-vendor delivery", async t => {
    for (const settings of [
      { foreign: true }, { payment: "Pending" }, { status: "Pending" }, { status: "Processing" },
      { status: "Shipped" }, { status: "OutForDelivery" }, { status: "Cancelled" },
      { statuses: ["Delivered", "Shipped"] }, { statuses: ["Delivered", "OutForDelivery"] },
    ]) await t.test(JSON.stringify(settings), async child => {
      fixture(child, settings);
      await assert.rejects(() => orderInvoice(id, ctx), error => error.status === (settings.foreign ? 404 : 409));
    });
  });

  test("wrong roles and malformed IDs cannot read invoice data", async t => {
    const query = fixture(t);
    await assert.rejects(() => orderInvoice(id, { auth: { user: { ...user, roles: [{ code: "VENDOR", active: true }] } } }));
    await assert.rejects(() => orderInvoice("invalid-id", ctx));
    assert.equal(query.mock.callCount(), 0);
  });

  test("invoice numbers come only from the saved invoice and are independent of the order sequence", () => {
    assert.equal(invoiceNumber({ number: "MNOR2600003", invoiceNumber: "NESTIN2600001" }), "NESTIN2600001");
    assert.equal(invoiceNumber({ number: "MNOR2600099", invoiceNumber: "NESTIN2600002" }), "NESTIN2600002");
    assert.equal(invoiceNumber({ number: "MNOR2600003", invoiceNumber: "NESTIN2700001" }), "NESTIN2700001");
    for (const number of ["", "NESTIN2600000", "MNOR2600003", undefined])
      assert.throws(() => invoiceNumber({ number: "MNOR2600003", invoiceNumber: number }), /valid invoice reference/);
  });

  test("order three gets invoice one, and repeated downloads reuse that saved invoice", async t => {
    const query = fixture(t);
    assert.equal(invoiceNumber(order), "NESTIN2600001");
    for (let attempt = 0; attempt < 2; attempt++) {
      const file = await orderInvoice(id, ctx);
      assert.equal(file.name, "NESTIN2600001.pdf");
      const text = pdfText(file.buffer);
      assert.ok(text.includes("NO: NESTIN2600001"));
      assert.ok(text.includes("MarryNest  |  NESTIN2600001"));
      assert.ok(!text.includes("INV-MNOR"));
      assert.equal(file.buffer.subarray(0, 5).toString(), "%PDF-");
      assert.match(file.buffer.toString("latin1"), /%%EOF/);
      assert.equal((file.buffer.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
    }
    assert.equal(query.mock.calls.filter(call => call.arguments[0].startsWith("EXEC dbo.IssueOrderInvoice")).length, 2);
    assert.ok(query.mock.calls.every(call => /^(SELECT|EXEC dbo.IssueOrderInvoice)/.test(call.arguments[0])));
  });

  test("allocation requires a transaction and translates missing/undelivered/conflicting orders", async t => {
    const query = t.mock.method(sequelize, "query", async () => []);
    await assert.rejects(() => allocateInvoice(id, customerId), /active transaction/);
    await assert.rejects(() => allocateInvoice(id, customerId, { finished: "commit" }), /active transaction/);
    assert.equal(query.mock.callCount(), 0);
    for (const [number, status] of [[51001, 404], [51002, 409], [51003, 409]]) {
      query.mock.mockImplementation(async () => { throw { original: { number, message: "Allocation blocked" } }; });
      await assert.rejects(() => allocateInvoice(id, customerId, {}), error => error.status === status);
    }
  });

  test("large orders paginate instead of dropping items or creating empty footer pages", async () => {
    const shortOrder = await renderOrderInvoice({ ...order, lines: Array.from({ length: 3 }, () => order.lines[0]) });
    assert.equal((shortOrder.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
    const file = await renderOrderInvoice({ ...order, lines: Array.from({ length: 75 }, (_, index) => ({
      ...order.lines[0], name: `Gift selection ${index + 1} with a long description to verify wrapping across table lines`,
    })) });
    const pages = (file.toString("latin1").match(/\/Type \/Page\b/g) || []).length;
    assert.ok(pages >= 5 && pages < 15, `Unexpected page count: ${pages}`);
  });

  test("invoice From uses the order vendor's business address and contacts", async t => {
    fixture(t);
    const file = await orderInvoice(id, ctx), text = pdfText(file.buffer);
    for (const value of [sender.name, sender.email, sender.phone, sender.line1, sender.line2, "Kanpur, Uttar Pradesh, 208001"])
      assert.ok(text.includes(value), value);
    assert.ok(!text.includes("Your Business Address"));
    assert.ok(!text.includes("support@yourdomain.com"));
    assert.ok(text.includes(order.address.line1), "The customer's bill-to address is retained");
  });

  test("multi-vendor invoices show each sender once, with its own address", async t => {
    const other = { ...sender, vendorId: randomUUID(), name: "The Wedding Edit", line1: "99 Second Vendor Lane",
      phone: "+919988776655", email: "orders@wedding-edit.example.test", city: "Jaipur", state: "Rajasthan", postalCode: "302001" };
    fixture(t, { vendors: [sender, other], statuses: ["Delivered", "Delivered"] });
    const text = pdfText((await orderInvoice(id, ctx)).buffer);
    for (const vendor of [sender, other]) {
      assert.equal(text.split(vendor.line1).length - 1, 1);
      assert.ok(text.includes(vendor.email));
    }
  });

  test("missing vendor locations never substitute the customer's or platform's address", async t => {
    fixture(t, { vendors: [{ vendorId, name: sender.name, email: sender.email }] });
    const text = pdfText((await orderInvoice(id, ctx)).buffer);
    assert.ok(text.includes("Shipping address not available"));
    assert.equal(text.split(order.address.line1).length - 1, 1);
    assert.ok(!text.includes("Your Business Address"));
  });

  test("many vendor addresses paginate with continued From headings and retain every address", async () => {
    const senders = Array.from({ length: 15 }, (_, index) => ({ name: `Vendor ${index + 1}`, email: `vendor${index + 1}@example.test`,
      address: [`${index + 1} Dispatch Road`, "Business Park", "Lucknow, Uttar Pradesh, 226010", "India"] }));
    const file = await renderOrderInvoice(order, senders), text = pdfText(file);
    assert.ok(text.includes("From (continued):"));
    for (const vendor of senders) assert.ok(text.includes(vendor.address[0]));
    assert.ok((file.toString("latin1").match(/\/Type \/Page\b/g) || []).length > 1);
  });

  test("customer invoice endpoint sends a private PDF attachment and rejects anonymous access", async t => {
    const query = fixture(t);
    const app = express();
    app.use("/api/customer", createCustomerRouter({ authenticateRequest: async req => ({ user: req.get("x-test-auth") ? user : null }) }));
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const url = `http://127.0.0.1:${server.address().port}/api/customer/orders/${id}/invoice`;
    const anonymous = await fetch(url);
    assert.equal(anonymous.status, 401);
    assert.equal(query.mock.callCount(), 0);
    const response = await fetch(url, { headers: { "x-test-auth": "1" } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^application\/pdf/);
    assert.equal(response.headers.get("content-disposition"), 'attachment; filename="NESTIN2600001.pdf"');
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  });

  test("invoice HTTP errors stay JSON and never return a PDF attachment", async t => {
    for (const settings of [{ foreign: true }, { statuses: ["Delivered", "Shipped"] }]) {
      await t.test(JSON.stringify(settings), async child => {
        fixture(child, settings);
        const app = express();
        app.use("/api/customer", createCustomerRouter({ authenticateRequest: async () => ({ user }) }));
        const server = app.listen(0, "127.0.0.1");
        await new Promise(resolve => server.once("listening", resolve));
        child.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/customer/orders/${id}/invoice`);
        assert.equal(response.status, settings.foreign ? 404 : 409);
        assert.match(response.headers.get("content-type"), /^application\/json/);
        assert.equal(response.headers.get("content-disposition"), null);
        assert.equal((await response.json()).success, false);
      });
    }
  });

  test("admin and customer get the full invoice while a vendor gets only its own copy under the same number", async t => {
    const otherId = randomUUID();
    const vendors = [sender, { ...sender, vendorId: otherId, name: "Private other seller", line1: "Private other seller address" }];
    const items = [
      { ...order.lines[0], id: "own", vendorId, quantity: 1, price: 100, tax: 10, shipping: 5, total: 115 },
      { ...order.lines[0], id: "other", vendorId: otherId, vendor: "Private other seller", name: "PRIVATE OTHER VENDOR ITEM", quantity: 1, price: 900, tax: 170, shipping: 75, total: 1145 },
    ];
    for (const role of ["Customer", "Admin", "Vendor"]) await t.test(role, async child => {
      fixture(child, { role, items, vendors });
      const file = await orderInvoice(id, roleContext(role), role), text = pdfText(file.buffer);
      assert.equal(file.name, "NESTIN2600001.pdf");
      assert.ok(text.includes("NO: NESTIN2600001"));
      if (role === "Vendor") {
        assert.ok(!text.includes("PRIVATE OTHER VENDOR ITEM"));
        assert.ok(!text.includes("Private other seller"));
        assert.ok(text.includes("INR 105.00"));
        assert.ok(!text.includes("INR 1,160.00"));
        assert.ok(text.includes("Vendor copy:"));
      } else {
        assert.ok(text.includes("PRIVATE OTHER VENDOR ITEM"));
        assert.ok(text.includes("Private other seller address"));
        assert.ok(text.includes("INR 1,160.00"));
      }
    });
  });

  test("vendors cannot download foreign orders or invoice an incomplete parent order", async t => {
    for (const settings of [{ foreign: true }, { status: "Processing", statuses: ["Delivered"] }]) await t.test(JSON.stringify(settings), async child => {
      const query = fixture(child, { ...settings, role: "Vendor" });
      await assert.rejects(() => orderInvoice(id, roleContext("Vendor"), "Vendor"), error => error.status === (settings.foreign ? 404 : 409));
      assert.ok(!query.mock.calls.some(call => call.arguments[0].startsWith("EXEC dbo.IssueOrderInvoice")));
    });
  });

  test("admin and vendor invoice endpoints enforce their workspace role and return private PDFs", async t => {
    for (const [role, router] of [["Admin", createAdminRouter], ["Vendor", createVendorRouter]]) await t.test(role, async child => {
      const query = fixture(child, { role });
      const app = express();
      app.use("/api", router({ authenticateRequest: async req => req.get("x-test-role") === "authorized" ? roleContext(role).auth : req.get("x-test-role") === "customer" ? ctx.auth : { user: null } }));
      const server = app.listen(0, "127.0.0.1");
      await new Promise(resolve => server.once("listening", resolve));
      child.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
      const url = `http://127.0.0.1:${server.address().port}/api/orders/${id}/invoice`;
      assert.equal((await fetch(url)).status, 401);
      assert.equal((await fetch(url, { headers: { "x-test-role": "customer" } })).status, 403);
      assert.equal(query.mock.callCount(), 0);
      const response = await fetch(url, { headers: { "x-test-role": "authorized" } });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.match(response.headers.get("content-type"), /^application\/pdf/);
      assert.equal(response.headers.get("content-disposition"), 'attachment; filename="NESTIN2600001.pdf"');
      assert.equal(response.headers.get("access-control-expose-headers"), "Content-Disposition");
      assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
    });
  });
}
