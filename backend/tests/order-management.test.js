import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sequelize } from "../src/config/database.js";
import { allocateOrderNumber } from "../src/modules/shopping/order-numbers.js";
import { orderStatuses, aggregateOrderStatus, assertOrderTransition } from "../src/modules/shopping/order-policy.js";
import { listOrders, orderDetails, updateOrderStatus, orderQuery, statusInput } from "../src/modules/shopping/order-management.js";
import { setRealtimeServer } from "../src/modules/messaging/realtime-bus.js";

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
