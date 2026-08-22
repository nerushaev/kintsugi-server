const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Module = require("node:module");
const test = require("node:test");

const calls = {
  poster: 0,
  updateOne: [],
  findOneResult: null,
};

const Product = {
  updateOne: async (...args) => {
    calls.updateOne.push(args);
  },
  findOne: async () => calls.findOneResult,
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

const invoke = async (data) => {
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

  await webHookPoster({ body: signedStockEvent(data) }, res);
  return response;
};

test.beforeEach(() => {
  calls.poster = 0;
  calls.updateOne = [];
  calls.findOneResult = null;
});

test("updates type 2 product stock without calling Poster API", async () => {
  const response = await invoke({
    type: 2,
    element_id: 42,
    storage_id: 1,
    value_absolute: 7.9,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(calls.poster, 0);
  assert.deepEqual(calls.updateOne, [
    [{ product_id: "42" }, { $set: { amount: 7 } }],
  ]);
});

test("updates type 3 modification without calling Poster API", async () => {
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

  const response = await invoke({
    type: 3,
    element_id: 10,
    storage_id: 1,
    value_absolute: 6,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(calls.poster, 0);
  assert.equal(calls.findOneResult.modifications[0].size_left, 6);
  assert.equal(calls.findOneResult.amount, 9);
  assert.equal(markedPath, "modifications");
  assert.equal(saved, true);
});

test("ignores unrelated stock types without calling Poster API", async () => {
  const response = await invoke({
    type: 1,
    element_id: 999,
    storage_id: 1,
    value_absolute: 4,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, "Success");
  assert.equal(calls.poster, 0);
});
