const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Module = require("node:module");
const test = require("node:test");

const calls = {
  poster: 0,
  productUpdateOne: [],
  queueUpdateOne: [],
  queueError: null,
  findOneResult: null,
};

const Product = {
  updateOne: async (...args) => {
    calls.productUpdateOne.push(args);
  },
  findOne: async () => calls.findOneResult,
};

const PosterWebhookEvent = {
  updateOne: async (...args) => {
    calls.queueUpdateOne.push(args);
    if (calls.queueError) throw calls.queueError;
  },
};

const originalLoad = Module._load;
Module._load = function load(request, parent, isMain) {
  if (request === "axios") {
    return {
      get: async () => {
        calls.poster += 1;
        throw new Error("Stock webhooks must not call Poster API");
      },
    };
  }
  if (request === "../../models/product") return Product;
  if (request === "../../models/posterWebhookEvent") return PosterWebhookEvent;
  return originalLoad.call(this, request, parent, isMain);
};

process.env.POSTER_URL_API = "https://example.invalid";
process.env.POSTER_ACCESS_TOKEN = "test-token";
process.env.POSTER_WEBHOOK_SECRET = "test-secret";

const webHookPoster = require("../controllers/poster/webHookPoster");
Module._load = originalLoad;

const signedStockEvent = (data) => {
  const event = {
    account: "test-account",
    object: "stock",
    object_id: "1",
    action: "changed",
    data: JSON.stringify(data),
    time: "1234567890",
  };
  event.verify = crypto
    .createHash("md5")
    .update(
      [
        event.account,
        event.object,
        event.object_id,
        event.action,
        event.data,
        event.time,
        process.env.POSTER_WEBHOOK_SECRET,
      ].join(";")
    )
    .digest("hex");
  return event;
};

const invoke = async (event) => {
  const response = { statusCode: 200, body: null };
  const res = {
    status(code) {
      response.statusCode = code;
      return this;
    },
    json(body) {
      response.body = body;
      return this;
    },
    send(body) {
      response.body = body;
      return this;
    },
  };

  await webHookPoster({ body: event }, res);
  return response;
};

test.beforeEach(() => {
  calls.poster = 0;
  calls.productUpdateOne = [];
  calls.queueUpdateOne = [];
  calls.queueError = null;
  calls.findOneResult = null;
});

test("queues a valid webhook and returns 200 without processing it inline", async () => {
  const event = signedStockEvent({
    type: 2,
    element_id: 42,
    storage_id: 1,
    value_absolute: 7.9,
  });
  const response = await invoke(event);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "Success");
  assert.equal(calls.queueUpdateOne.length, 1);
  assert.equal(calls.queueUpdateOne[0][1].$setOnInsert.payload, event);
  assert.equal(calls.poster, 0);
  assert.equal(calls.productUpdateOne.length, 0);
});

test("returns 200 even when the webhook cannot be queued", async () => {
  calls.queueError = new Error("Database unavailable");
  const response = await invoke(
    signedStockEvent({ type: 2, element_id: 42, value_absolute: 7 })
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "Success");
});

test("returns 200 and ignores an invalid signature", async () => {
  const event = signedStockEvent({ type: 2, element_id: 42, value_absolute: 7 });
  event.verify = "invalid";

  const response = await invoke(event);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "Ignored");
  assert.equal(calls.queueUpdateOne.length, 0);
});

test("worker updates type 2 product stock without calling Poster API", async () => {
  await webHookPoster.processPosterEvent(
    signedStockEvent({
      type: 2,
      element_id: 42,
      storage_id: 1,
      value_absolute: 7.9,
    })
  );

  assert.equal(calls.poster, 0);
  assert.deepEqual(calls.productUpdateOne, [
    [{ product_id: "42" }, { $set: { amount: 7 } }],
  ]);
});

test("worker updates type 3 modification without calling Poster API", async () => {
  let saved = false;
  let markedPath = null;
  calls.findOneResult = {
    amount: 5,
    modifications: [
      { ingredient_id: "10", size_left: 2 },
      { ingredient_id: "11", size_left: 3 },
    ],
    markModified(path) {
      markedPath = path;
    },
    async save() {
      saved = true;
    },
  };

  await webHookPoster.processPosterEvent(
    signedStockEvent({
      type: 3,
      element_id: 10,
      storage_id: 1,
      value_absolute: 6,
    })
  );

  assert.equal(calls.poster, 0);
  assert.equal(calls.findOneResult.modifications[0].size_left, 6);
  assert.equal(calls.findOneResult.amount, 9);
  assert.equal(markedPath, "modifications");
  assert.equal(saved, true);
});

test("worker ignores unrelated stock types without calling Poster API", async () => {
  await webHookPoster.processPosterEvent(
    signedStockEvent({
      type: 1,
      element_id: 999,
      storage_id: 1,
      value_absolute: 4,
    })
  );

  assert.equal(calls.poster, 0);
  assert.equal(calls.productUpdateOne.length, 0);
});
