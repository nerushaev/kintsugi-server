const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrevoMarketing } = require("../services/brevoMarketing");
test("missing key fails before network use", () => assert.throws(() => createBrevoMarketing(), /BREVO_API_KEY/));
test("account check uses only read requests and returns no secrets or personal account details", async () => {
  const calls=[];
  const http={request:async c=>{calls.push(c);return {data:c.url.endsWith("account") ? {email:"private@example.test",marketingAutomation:{key:"SECRET"},plan:[{type:"free",credits:300,creditsType:"sendLimit"}]} : {senders:[{id:3,active:true,email:"sender@example.test"}]}};}};
  const result=await createBrevoMarketing({apiKey:"TEST_KEY",senderId:3,http}).checkAccount();
  assert.equal(result.senderActive,true);assert.equal(result.senderDomain,"example.test");
  assert.ok(calls.every(c=>c.method==="GET" && c.url.startsWith("https://api.brevo.com/v3/") && c.maxRedirects===0));
  assert.doesNotMatch(JSON.stringify(result),/private@|SECRET|TEST_KEY|sender@/);
});
test("missing sender does not claim readiness; unknown credits remain null",async()=>{
  const http={request:async c=>({data:c.url.endsWith("account")?{plan:[{type:"free"}]}:{senders:[]}})};
  const result=await createBrevoMarketing({apiKey:"key",senderId:1,http}).checkAccount();
  assert.equal(result.senderActive,false);assert.equal(result.plans[0].credits,null);
});
test("HTTP errors cannot expose API credentials",async()=>{
  const http={request:async()=>{throw {message:"SECRET",config:{headers:{"api-key":"SECRET"}},response:{status:401,data:"SECRET"}};}};
  await assert.rejects(createBrevoMarketing({apiKey:"SECRET",http}).checkAccount(),e=>e.status===401&&!JSON.stringify(e).includes("SECRET")&&!e.message.includes("SECRET"));
});
