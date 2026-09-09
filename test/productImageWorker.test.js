const assert = require("node:assert/strict");
const test = require("node:test");
const { createProductImageWorker } = require("../services/productImageWorker");
const { mapProductToMerchantItems } = require("../services/googleMerchantFeed");

const product = (id) => ({
  product_id: id, product_name: "Нова перука", category_name: "Перуки",
  photo_origin: `/upload/${id}.jpg`, amount: 2, price: 90000,
});
const cursor = (rows) => ({
  async *[Symbol.asyncIterator]() { for (const row of rows) yield { ...row }; },
  async close() {},
});

test("new and changed photos enter feed after verification; failed photos retry without starving later products", async () => {
  const rows = [product("1"), product("2")];
  let fail = true;
  let uploads = 0;
  const scan = createProductImageWorker({
    products: () => cursor(rows), log: () => {},
    storage: {
      upload: async (source, options) => {
        uploads++;
        if (source.endsWith("/1.jpg") && fail) throw new Error("temporary outage");
        return { secure_url: `https://res.cloudinary.com/demo/image/upload/${options.public_id}.jpg` };
      },
      verify: async () => {},
      save: async (snapshot, fields) => {
        Object.assign(rows.find((row) => row.product_id === snapshot.product_id), fields);
        return true;
      },
    },
  });
  assert.deepEqual(rows.flatMap(mapProductToMerchantItems), []);
  assert.deepEqual(await scan(), { attempted: 2, saved: 1, failed: 1 });
  assert.deepEqual(rows.flatMap(mapProductToMerchantItems).map((item) => item.id), ["2"]);
  fail = false;
  assert.deepEqual(await scan(), { attempted: 1, saved: 1, failed: 0 });
  assert.equal(rows.flatMap(mapProductToMerchantItems).length, 2);
  await scan();
  assert.equal(uploads, 3, "already mirrored images are not uploaded again");
  const oldImage = rows[0].photo_public;
  rows[0].photo_origin = "/upload/replacement.jpg";
  assert.deepEqual(mapProductToMerchantItems(rows[0]), []);
  await scan();
  assert.notEqual(mapProductToMerchantItems(rows[0])[0].imageLink, oldImage);
  assert.equal(rows[0].amount, 2);
});

test("worker cannot overlap scans and recovers after cursor failure", async () => {
  let release;
  const blocked = new Promise((resolve) => { release = resolve; });
  let scans = 0;
  let closed = 0;
  const scan = createProductImageWorker({
    products: () => {
      scans++;
      return {
        async *[Symbol.asyncIterator]() { await blocked; throw new Error("DB failure"); },
        async close() { closed++; },
      };
    }, storage: {}, log: () => {},
  });
  const first = scan();
  await scan();
  assert.equal(scans, 1);
  release();
  assert.equal((await first).failed, 1);
  await scan();
  assert.equal(scans, 2);
  assert.equal(closed, 2);
});

test("feed rejects blocked and credential URLs, but can use an extra public image", () => {
  const row = product("3");
  assert.deepEqual(mapProductToMerchantItems(row), []);
  const extra = "https://res.cloudinary.com/demo/image/upload/extra.jpg";
  assert.equal(mapProductToMerchantItems({ ...row, photo_extra: ["/upload/extra.jpg", extra] })[0].imageLink, extra);
  assert.deepEqual(mapProductToMerchantItems({ ...row, photo_origin: "https://user:pass@example.org/a.jpg" }), []);
});
