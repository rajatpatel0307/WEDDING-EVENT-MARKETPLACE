import test from 'node:test';
import assert from 'node:assert/strict';
import {orderStatusOptions,orderStatusLabels} from '../src/modules/commerce/order-status.js';
import {vendorNavigation} from '../src/modules/vendor/navigation.js';
import {adminNavigation} from '../src/modules/admin/navigation.js';
test('order status controls expose only valid paid transitions and lock terminal states',()=>{
  assert.deepEqual(orderStatusOptions(['Pending'],false),['Pending','Cancelled']);
  assert.deepEqual(orderStatusOptions(['Pending'],true),['Pending','Processing','Cancelled']);
  assert.deepEqual(orderStatusOptions(['Delivered'],true),['Delivered']);
  assert.deepEqual(orderStatusOptions(['Cancelled'],true),['Cancelled']);
  assert.ok(orderStatusOptions(['Cancelled'],true,true).includes('Processing'));
  assert.deepEqual(orderStatusOptions(['Cancelled'],false,true),['Pending','Cancelled']);
  assert.deepEqual(orderStatusOptions(['Pending','Shipped'],true),['Cancelled']);
  assert.equal(orderStatusLabels.Shipped,'Shipped');
  assert.equal(orderStatusLabels.OutForDelivery,'Out for delivery');
  assert.deepEqual(orderStatusOptions(['Shipped'],true),['Shipped','OutForDelivery','Cancelled']);
  assert.deepEqual(orderStatusOptions(['OutForDelivery'],true),['OutForDelivery','Delivered','Cancelled']);
});
test('both vendor and admin navigation expose their dedicated orders page',()=>{
  for(const navigation of [vendorNavigation,adminNavigation]) assert.ok(navigation.flatMap(group=>group.items).some(([path])=>path==='orders'));
});
