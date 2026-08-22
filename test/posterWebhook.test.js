const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Module = require("node:module");
const test = require("node:test");

const calls = {
  poster: 0,
  posterResponses: [],
  productUpdateOne: [],
  productFindOneAndUpdate: [],
  queueUpdateOne: [],
  queueError: null,
  findOneResult: null,
};

const Product = {
  updateOne: async (...args) => {
    calls.productUpdateOne.push(args);
  },
  findOne: async () => calls.findOneResult,
  findOneAndUpdate: async (...args) => {
    calls.productFindOneAndUpdate.push(args);
  },
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
        if (calls.posterResponses.length > 0) {
          return { data: { response: calls.posterResponses.shift() } };
        }
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

const workerCalls = {
  oldestEvent: null,
  claimedEvent: null,
  claims: 0,
  processed: 0,
  updates: [],
};
const WorkerPosterWebhookEvent = {
  findOne: () => ({
    sort() {
      return this;
    },
    async select() {
      return workerCalls.oldestEvent;
    },
  }),
  findOneAndUpdate: async () => {
    workerCalls.claims += 1;
    return workerCalls.claimedEvent;
  },
  updateOne: async (...args) => {
    workerCalls.updates.push(args);
  },
};
const workerProcessor = async () => {
  workerCalls.processed += 1;
};
workerProcessor.processPosterEvent = workerProcessor;

Module._load = function loadWorker(request, parent, isMain) {
  if (request === "../models/posterWebhookEvent") {
    return WorkerPosterWebhookEvent;
  }
  if (request === "../controllers/poster/webHookPoster") return workerProcessor;
  return originalLoad.call(this, request, parent, isMain);
};
const { processNextEvent } = require("../services/posterWebhookWorker");
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
  calls.posterResponses = [];
  calls.productUpdateOne = [];
  calls.productFindOneAndUpdate = [];
  calls.queueUpdateOne = [];
  calls.queueError = null;
  calls.findOneResult = null;
  workerCalls.oldestEvent = null;
  workerCalls.claimedEvent = null;
  workerCalls.claims = 0;
  workerCalls.processed = 0;
  workerCalls.updates = [];
});

test("worker does not let newer events overtake an older retry", async () => {
  workerCalls.oldestEvent = {
    _id: "old-event",
    status: "pending",
    nextAttemptAt: new Date(Date.now() + 60_000),
  };

  await processNextEvent();

  assert.equal(workerCalls.claims, 0);
  assert.equal(workerCalls.processed, 0);
});

test("worker claims and completes the oldest ready event", async () => {
  workerCalls.oldestEvent = {
    _id: "old-event",
    status: "pending",
    nextAttemptAt: new Date(Date.now() - 1_000),
  };
  workerCalls.claimedEvent = {
    _id: "old-event",
    eventKey: "event-key",
    payload: { object: "stock" },
    attempts: 1,
  };

  await processNextEvent();

  assert.equal(workerCalls.claims, 1);
  assert.equal(workerCalls.processed, 1);
  assert.equal(workerCalls.updates.length, 1);
  assert.equal(workerCalls.updates[0][1].$set.status, "completed");
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

test("product changed preserves fields owned by the website", async () => {
  calls.posterResponses = [
    {
      product_id: 42,
      product_name: "Poster name",
      category_name: "Poster category",
      menu_category_id: 7,
      price: { 1: 5000 },
      modifications: [],
    },
    [
      {
        ingredient_id: 42,
        ingredient_name: "Poster name",
        ingredient_left: 3,
      },
    ],
  ];

  await webHookPoster.processPosterEvent({
    object: "product",
    object_id: 42,
    action: "changed",
  });

  assert.equal(calls.productFindOneAndUpdate.length, 1);
  const [filter, update, options] = calls.productFindOneAndUpdate[0];
  assert.deepEqual(filter, { product_id: "42" });
  assert.equal(update.$set.amount, 3);
  assert.equal(update.$set.product_name, "Poster name");
  for (const websiteField of [
    "description",
    "photo_extra",
    "material",
    "color",
    "equipment",
    "character",
    "fandom",
    "score",
    "scoreAmount",
    "favorite",
    "websiteHidden",
  ]) {
    assert.equal(Object.hasOwn(update.$set, websiteField), false);
  }
  assert.equal(options.upsert, true);
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
      product_id: 42,
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
