const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const original = Module._load;
let saved, invoices, mails, failInvoice, promo;
const product = { product_id:"TEST",product_name:"Test",price:40000,amount:10 };
const Order = {
  findOne: async () => saved,
  create: async data => { saved = {...data, save: async () => {}}; return saved; },
};
Module._load = function(name, parent, ...rest) {
  if (name === "../../models/order") return Order;
  if (name === "../../models/user") return {User:{updateOne:async()=>{}}};
  if (name === "../models/product") return {find:()=>({lean:async()=>[product],select:()=>({lean:async()=>[product]})})};
  if (name === "../models/bundle") return {find:()=>({populate:()=>({lean:async()=>[]})})};
  if (name === "../models/promoCode") return {findOne:({code})=>({lean:async()=>code === "KINTSUGI5" ? promo : null})};
  if (name === "../../middleware") return {transport:{sendMail:async mail=>mails.push(mail)}};
  if (name === "../../helpers") return {monoPay:async request=>{invoices.push(request);if(failInvoice)throw new Error("Mock failure");return {invoiceId:"MOCK",pageUrl:"https://example.test/pay"};}};
  return original.call(this,name,parent,...rest);
};
const addOrder = require("../controllers/orders/addOrder");
const retryPayment = require("../controllers/orders/retryPayment");
const body = () => ({clientRequestId:"test-request",firstName:"Тест",lastName:"Тестовий",email:"buyer@example.test",phone:"+380991234567",payments:"card",deliveryMethod:"self",products:[{product_id:"TEST",price:1,amount:1}],bundles:[],promoCode:"kintsugi5",expectedTotal:380,totalPrice:1,discountAmount:399});
const response = () => ({code:200,body:null,status(n){this.code=n;return this;},json(v){this.body=v;return this;}});
const reset = () => {saved=null;invoices=[];mails=[];failInvoice=false;promo={code:"KINTSUGI5",percent:5,active:true,startsAt:new Date(Date.now()-1000),expiresAt:new Date(Date.now()+60000)};};
test.after(()=>{Module._load=original;});
test("card order persists authoritative discount and passes 38000 kopecks to invoice; both emails show discount",async()=>{
  reset();const res=response();await addOrder({body:body()},res);
  assert.equal(res.code,201);assert.equal(saved.totalPrice,380);assert.equal(saved.subtotalPrice,400);assert.equal(saved.discountAmount,20);
  assert.equal(invoices[0].amount,38000);assert.equal(mails.length,2);
  for(const mail of mails){assert.match(mail.html,/KINTSUGI5/);assert.match(mail.html,/380,00/);assert.match(mail.html,/20,00/);}
  assert.equal(res.body.totalPrice,380);
});
test("cash and no-code orders keep correct totals",async()=>{
  reset();const request=body();request.payments="cash";const res=response();await addOrder({body:request},res);
  assert.equal(saved.totalPrice,380);assert.equal(invoices.length,0);
  reset();delete request.promoCode;await addOrder({body:request},response());assert.equal(saved.totalPrice,400);assert.equal(saved.discountAmount,0);
});
test("expired, disabled, nonexistent, injected code and changed quote create no order or invoice",async()=>{
  for(const kind of ["expired","disabled","unknown","injection","price"]){
    reset();const request=body();
    if(kind==="expired")promo.expiresAt=new Date(Date.now()-1);
    if(kind==="disabled")promo.active=false;
    if(kind==="unknown")request.promoCode="UNKNOWN";
    if(kind==="injection")request.promoCode={$ne:null};
    if(kind==="price")request.expectedTotal=379;
    const res=response();await addOrder({body:request},res);assert.ok([400,409].includes(res.code));assert.equal(saved,null);assert.equal(invoices.length,0);assert.equal(mails.length,0);
  }
});
test("repeated request after expiration reuses saved invoice and does not duplicate order emails",async()=>{
  reset();await addOrder({body:body()},response());const id=saved.orderId;promo.expiresAt=new Date(0);
  const res=response();await addOrder({body:body()},res);assert.equal(res.code,200);assert.equal(saved.orderId,id);assert.equal(invoices.length,1);assert.equal(mails.length,2);assert.equal(res.body.totalPrice,380);
});
test("failed invoice can be retried after promo expiry using saved discounted amount",async()=>{
  reset();failInvoice=true;const res=response();await addOrder({body:body()},res);assert.equal(res.code,502);assert.equal(saved.totalPrice,380);
  failInvoice=false;promo.expiresAt=new Date(0);
  const retry=response();await retryPayment({params:{orderId:saved.orderId},user:{role:"admin"}},retry);
  assert.equal(retry.code,200);assert.deepEqual(invoices.map(i=>i.amount),[38000,38000]);
});
