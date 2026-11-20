// Explicit database integration check: all temporary data is rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { User, UserRole } from "../src/models/index.js";
import * as repo from "../src/modules/admin/admin.repository.js";
import * as shopping from "../src/modules/shopping/shopping.service.js";
import * as orders from "../src/modules/shopping/order-management.js";
import { allocateOrderNumber } from "../src/modules/shopping/order-numbers.js";

const originalTransaction=sequelize.transaction, originalQuery=sequelize.query, originalFetch=globalThis.fetch;
const savedGateway={id:process.env.RAZORPAY_KEY_ID,secret:process.env.RAZORPAY_KEY_SECRET};
process.env.RAZORPAY_KEY_ID="rzp_test_order_fixture";process.env.RAZORPAY_KEY_SECRET="order-fixture-secret";
const tx=await sequelize.transaction();
sequelize.transaction=async (options,fn)=>(fn || options)(tx);
sequelize.query=function(sql,options={}) { return originalQuery.call(this,sql,{...options,transaction:tx}); };
const context=(user,role,vendor)=>({auth:{user:{id:user,active:true,emailVerified:true,blocked:false,roles:[{code:role,active:true}],...(vendor?{vendor:{id:vendor,active:true,verificationStatus:"Approved"}}:{})}},req:{ip:"127.0.0.1",get:()=>"order-integration-test"}});
try {
  const products=await repo.select("SELECT TOP(10) p.*,s.DetailsJson FROM dbo.Products p JOIN dbo.Services s ON s.ServiceId=p.ServiceId JOIN dbo.Vendors v ON v.VendorId=p.VendorId JOIN dbo.Categories c ON c.CategoryId=p.CategoryId WHERE p.IsActive=1 AND p.IsPublished=1 AND p.Stock>0 AND c.AllowBuyOnline=1 AND v.IsActive=1 AND v.VerificationStatus='Approved'");
  const product=products.find(p=>JSON.parse(p.DetailsJson || '{}').offer?.sell?.available);
  assert.ok(product,"An existing purchasable product is required for the checkout integration test.");
  const vendors=await repo.select("SELECT VendorId,UserId,BusinessName FROM dbo.Vendors WHERE IsActive=1 AND VerificationStatus='Approved'");
  const owner=vendors.find(v=>v.VendorId===product.VendorId);
  const other=vendors.find(v=>v.VendorId!==product.VendorId);
  assert.ok(other);
  const [admin]=await repo.select("SELECT TOP(1) u.UserId FROM dbo.Users u JOIN dbo.UserRoles ur ON ur.UserId=u.UserId JOIN dbo.Roles r ON r.RoleId=ur.RoleId WHERE r.RoleCode='ADMIN' AND u.IsActive=1");
  const [role]=await repo.select("SELECT RoleId FROM dbo.Roles WHERE RoleCode='CUSTOMER'");
  const userId=randomUUID();
  await User.create({id:userId,firstName:"Order",lastName:"Integration",email:`order-${userId}@example.test`,phone:`+919${Date.now().toString().slice(-9)}`,passwordHash:"integration-test-not-used-for-login",active:true,emailVerified:true,blocked:false,termsAcceptedAt:new Date(),privacyAcceptedAt:new Date()},{transaction:tx});
  await UserRole.create({userId,roleId:role.RoleId},{transaction:tx});
  const customer=context(userId,"CUSTOMER"), vendor=context(owner.UserId,"VENDOR",owner.VendorId), foreign=context(other.UserId,"VENDOR",other.VendorId), administrator=context(admin.UserId,"ADMIN");
  const addressId=randomUUID();
  await repo.insert({table:"Addresses",id:"AddressId"},{AddressId:addressId,UserId:userId,FullName:"Order Integration",Phone:"+919999999999",AddressType:"Home",AddressLine1:"Test address",City:"Lucknow",State:"Uttar Pradesh",Country:"India",PostalCode:"226001",IsDefault:0},tx);
  const qty=JSON.parse(product.DetailsJson).offer.sell.minQuantity || 1;
  await shopping.setCartItem({serviceId:product.ServiceId,quantity:qty},customer);
  const input={addressId,idempotencyKey:randomUUID()};
  const preview=await shopping.purchasePreview(input,customer);
  const purchase=await shopping.purchase({...input,reviewToken:preview.reviewToken,termsAccepted:true},customer);
  assert.match(purchase.number,/^MNOR\d{2}\d{5,}$/);
  const replay=await shopping.purchase({...input,reviewToken:preview.reviewToken,termsAccepted:true},customer);
  assert.equal(replay.id.toLowerCase(),purchase.id.toLowerCase()); assert.equal(replay.number,purchase.number);
  assert.equal((await orders.orderDetails(purchase.id,customer)).status,"Pending");
  await assert.rejects(()=>orders.orderDetails(purchase.id,foreign,"Vendor"),e=>e.status===404);
  await orders.updateOrderStatus(purchase.id,{status:"Cancelled",expectedVersion:0},vendor,"Vendor");
  await orders.updateOrderStatus(purchase.id,{status:"Pending",expectedVersion:1,override:true,note:"Reopen after inventory check"},administrator,"Admin");
  assert.equal((await orders.orderDetails(purchase.id,customer)).status,"Pending");
  let payment;
  globalThis.fetch=async (url,options)=>{
    if(url.endsWith('/orders')) { const body=JSON.parse(options.body); payment={id:"pay_OrderFixture",order_id:"order_OrderFixture",amount:body.amount,currency:"INR",status:"captured",method:"upi"}; return {ok:true,json:async()=>({id:payment.order_id,amount:body.amount,currency:"INR"})}; }
    return {ok:true,json:async()=>payment};
  };
  await shopping.paymentOrder(purchase.id,customer);
  await assert.rejects(()=>orders.updateOrderStatus(purchase.id,{status:"Cancelled",expectedVersion:2},vendor,"Vendor"),/Reconcile the active payment checkout/);
  await shopping.settleProductPayment(payment.id,payment.order_id);
  const [stock]=await repo.select("SELECT Stock FROM dbo.Products WHERE ProductId=:id",{id:product.ProductId});
  await shopping.settleProductPayment(payment.id,payment.order_id);
  assert.equal((await repo.select("SELECT Stock FROM dbo.Products WHERE ProductId=:id",{id:product.ProductId}))[0].Stock,stock.Stock);
  let version=(await orders.orderDetails(purchase.id,customer)).version;
  for (const status of ["Processing","Shipped","OutForDelivery","Delivered"]) {
    await orders.updateOrderStatus(purchase.id,{status,expectedVersion:version++},vendor,"Vendor");
    assert.equal((await orders.orderDetails(purchase.id,customer)).status,status);
    if (status === "OutForDelivery") {
      const list = await orders.listOrders({ q: purchase.number, status }, administrator, "Admin");
      assert.equal(list.total, 1);
      assert.equal(list.rows[0].status, "OutForDelivery");
      assert.ok(list.summary.outfordelivery >= 1);
      assert.ok((await orders.orderDetails(purchase.id,customer)).history.some(entry => entry.status === "OutForDelivery"));
    }
  }
  await assert.rejects(()=>orders.updateOrderStatus(purchase.id,{status:"Processing",expectedVersion:version},vendor,"Vendor"),e=>e.status===409);
  await orders.updateOrderStatus(purchase.id,{status:"Processing",expectedVersion:version++,override:true,note:"Integration override"},administrator,"Admin");
  await orders.updateOrderStatus(purchase.id,{status:"Cancelled",expectedVersion:version++},vendor,"Vendor");
  const final=await orders.orderDetails(purchase.id,customer);
  assert.equal(final.paymentStatus,"Paid"); assert.equal(final.paymentMethod,"upi");
  assert.equal(final.status,"Cancelled"); assert.ok(final.history.some(h=>h.override));
  assert.equal((await orders.listOrders({q:purchase.number},vendor,"Vendor")).rows[0].number,purchase.number);
  assert.equal((await orders.listOrders({q:purchase.number,paymentStatus:"Paid"},administrator,"Admin")).total,1);
  const secondProduct=randomUUID(),multiId=randomUUID(),multiNumber=await allocateOrderNumber(tx);
  await repo.insert({table:"Products",id:"ProductId"},{ProductId:secondProduct,VendorId:other.VendorId,CategoryId:product.CategoryId,ProductName:"Other vendor fixture",SKU:`TEST-${secondProduct}`,UnitPrice:50,Stock:1,TaxRate:0,ShippingAmount:0,IsActive:0,IsPublished:0},tx);
  await repo.insert({table:"Orders",id:"OrderId"},{OrderId:multiId,OrderNumber:multiNumber,CustomerId:userId,CheckoutKey:randomUUID(),RequestHash:"0".repeat(64),AddressSnapshot:JSON.stringify({city:"Test"}),Subtotal:150,ShippingAmount:0,TaxAmount:0,TotalAmount:150,PaymentStatus:"Paid",OrderStatus:"Pending"},tx);
  for(const [p,v,price] of [[product.ProductId,owner.VendorId,100],[secondProduct,other.VendorId,50]])
    await repo.insert({table:"OrderLineItems",id:"ItemId"},{ItemId:randomUUID(),OrderId:multiId,ProductId:p,VendorId:v,ProductNameSnapshot:v===owner.VendorId?"Vendor A fixture":"Vendor B fixture",SKUSnapshot:"FIXTURE",UnitPrice:price,Quantity:1,TaxAmount:0,ShippingAmount:0,LineTotal:price},tx);
  assert.equal((await orders.orderDetails(multiId,vendor,"Vendor")).total,100);
  assert.equal((await orders.orderDetails(multiId,foreign,"Vendor")).total,50);
  await orders.updateOrderStatus(multiId,{status:"Processing",expectedVersion:0},vendor,"Vendor");
  assert.equal((await orders.orderDetails(multiId,vendor,"Vendor")).status,"Processing");
  assert.equal((await orders.orderDetails(multiId,foreign,"Vendor")).status,"Pending");
  assert.equal((await orders.orderDetails(multiId,customer)).status,"Pending");
  await assert.rejects(()=>orders.updateOrderStatus(multiId,{status:"Processing",expectedVersion:0},foreign,"Vendor"),e=>e.status===409);
  assert.match(multiNumber,/^MNOR\d{2}\d{5,}$/); assert.notEqual(multiNumber,purchase.number);
  console.log("PASS: checkout, idempotent order reference, captured payment, payment replay, vendor isolation, fulfillment, customer tracking, admin override, cancellation, filters, mixed-vendor totals and optimistic concurrency.");
} catch(error) { console.error(error.stack);console.error(error.original?.errors?.map(item=>item.message) || error.original?.message || error.message);console.error(error.sql?.match(/.{0,45}:[a-z]\w*.{0,45}/g));process.exitCode=1; }
finally {
  globalThis.fetch=originalFetch;sequelize.query=originalQuery;sequelize.transaction=originalTransaction;
  for(const [key,value] of [["RAZORPAY_KEY_ID",savedGateway.id],["RAZORPAY_KEY_SECRET",savedGateway.secret]]) { if(value===undefined)delete process.env[key];else process.env[key]=value; }
  await tx.rollback();
  if (!process.exitCode) {
    const first = await sequelize.transaction(), second = await sequelize.transaction();
    try {
      const before = await allocateOrderNumber(first);
      let resolved = false;
      const waiting = allocateOrderNumber(second).then(number => { resolved = true; return number; });
      await new Promise(resolve => setTimeout(resolve, 150));
      assert.equal(resolved, false, "A concurrent transaction must wait for the counter lock.");
      await first.rollback();
      const after = await waiting;
      assert.equal(after, before, "A rolled-back allocation must not consume a permanent sequence number.");
      await second.rollback();
      console.log("PASS: concurrent allocation waits for the transaction lock and rollback preserves the persistent counter.");
    } catch (error) {
      console.error(error.message); process.exitCode=1;
    } finally {
      if (!first.finished) await first.rollback();
      if (!second.finished) await second.rollback();
    }
  }
  await sequelize.close();
  console.log("All integration fixtures, notifications, inventory changes and counter allocations rolled back.");
}
