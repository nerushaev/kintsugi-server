const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Contact = require("../models/marketingContact");
const Credential = require("../models/marketingWebhookCredential");
const handler = require("../controllers/brevoWebhook");
const { recordRegistration } = require("../services/marketingPreferences");
const { schemas } = require("../models/user");
test("registration defaults to opt-out and rejects string booleans", () => {
  const body = { firstName: "Тест", lastName: "Тест", email: "test@example.com", phone: "+380671234567", password: "test12345" };
  assert.equal(schemas.registerSchema.validate(body).value.marketingOptIn, false);
  assert.ok(schemas.registerSchema.validate({ ...body, marketingOptIn: "true" }).error);
});
test("registration cannot reactivate excluded addresses", async () => {
  const calls = [];
  const original = Contact.updateOne;
  Contact.updateOne = async (...args) => calls.push(args);
  try {
    await recordRegistration(" TEST@example.com ", true);
    assert.equal(calls[0][1].$setOnInsert.marketingEnabled, true);
    assert.equal(calls[1][0].marketingEnabled, true);
    assert.equal(calls[1][0].unsubscribedAt, null);
    assert.equal(calls[1][1].$set.marketingEnabled, undefined);
    calls.length = 0;
    await recordRegistration("test@example.com", false);
    assert.equal(calls[1][1].$set.marketingEnabled, false);
  } finally { Contact.updateOne = original; }
});
test("webhook authenticates, handles unsubscribe and retries, ignores unrelated events", async () => {
  const originalUpdate = Contact.updateOne, originalFind = Credential.findById;
  const calls = [], token = "a".repeat(64);
  Contact.updateOne = async (...args) => calls.push(args);
  Credential.findById = () => ({ lean: async () => ({ tokenHash: crypto.createHash("sha256").update(token).digest("hex") }) });
  const run = async (auth, body) => {
    let status;
    await handler({ get: () => auth, body }, { sendStatus: s => { status = s; } });
    return status;
  };
  try {
    assert.equal(await run("", { event: "unsubscribe", email: "test@example.com" }), 401);
    assert.equal(calls.length, 0);
    assert.equal(await run(`Bearer ${token}`, { event: "opened" }), 204);
    assert.equal(calls.length, 0);
    for (let i = 0; i < 2; i++) assert.equal(await run(`Bearer ${token}`, { event: "unsubscribe", email: " TEST@example.com " }), 204);
    assert.equal(calls[0][0].email, "test@example.com");
    assert.equal(calls[1][1].$set.marketingEnabled, false);
    assert.ok(calls[0][1].$set.unsubscribedAt instanceof Date);
    assert.equal(await run(`Bearer ${token}`, { event: "unsubscribe", email: { $ne: null } }), 400);
    Contact.updateOne = async () => { throw Error("db"); };
    assert.equal(await run(`Bearer ${token}`, { event: "unsubscribe", email: "test@example.com" }), 503);
  } finally { Contact.updateOne = originalUpdate; Credential.findById = originalFind; }
});
