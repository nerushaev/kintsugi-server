const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { SaxesParser } = require("saxes");
const {
  mapProductToMerchantItems,
  serializeGoogleMerchantFeed,
} = require("../services/googleMerchantFeed");

const baseProduct = {
  product_id: "100",
  product_name: 'Костюм & плащ <героя> "Лис"',
  category_name: "Косплей",
  description: "<p>Легкий &amp; зручний</p>",
  photo_origin: "/upload/product.jpg",
  photo_extra: [],
  price: 129900,
  amount: 0,
  modifications: [],
};

test("serializes parseable RSS XML with escaped special characters", () => {
  const items = mapProductToMerchantItems(baseProduct);
  const xml = serializeGoogleMerchantFeed(items);

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:g="http:\/\/base\.google\.com\/ns\/1\.0"/);
  assert.match(xml, /Костюм &amp; плащ &lt;героя&gt; &quot;Лис&quot;/);
  assert.match(xml, /<g:description>Легкий &amp; зручний<\/g:description>/);
  assert.match(xml, /<g:custom_label_0>Kintsugi Select<\/g:custom_label_0>/);
  assert.doesNotMatch(xml, /<p>/);
  const parser = new SaxesParser({ xmlns: true });
  let parseError;
  parser.onerror = (error) => { parseError = error; };
  parser.write(xml).close();
  assert.equal(parseError, undefined);
});

test("maps out of stock and formats UAH price", () => {
  const [item] = mapProductToMerchantItems(baseProduct);
  assert.equal(item.availability, "out_of_stock");
  assert.equal(item.price, "1299.00 UAH");
});

test("omits absent optional tags without empty XML elements", () => {
  const xml = serializeGoogleMerchantFeed(mapProductToMerchantItems(baseProduct));
  assert.doesNotMatch(xml, /<g:(brand|gtin|mpn|color|size|item_group_id)>/);
  assert.doesNotMatch(xml, /<g:[^>]+><\/g:/);
  assert.match(xml, /<g:identifier_exists>no<\/g:identifier_exists>/);
});

test("maps real size modifications as stable variants", () => {
  const items = mapProductToMerchantItems({
    ...baseProduct,
    modifications: [
      { ingredient_id: "501", modificator_name: "S", size_left: 2 },
      { ingredient_id: "502", modificator_name: "M", size_left: 0 },
    ],
  });
  assert.deepEqual(items.map(({ id }) => id), ["100-501", "100-502"]);
  assert.deepEqual(items.map(({ size }) => size), ["S", "M"]);
  assert.deepEqual(items.map(({ availability }) => availability), ["in_stock", "out_of_stock"]);
  assert.ok(items.every(({ itemGroupId }) => itemGroupId === "100"));
});

test("feed controller returns status 200 and XML content type", async () => {
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === "../../models/product") {
      return { find: () => ({ lean: async () => [baseProduct] }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const controllerPath = require.resolve("../controllers/products/getGoogleMerchantFeed");
  delete require.cache[controllerPath];
  const controller = require(controllerPath);
  Module._load = originalLoad;

  const response = {
    headers: {},
    statusCode: null,
    body: null,
    set(headers) { this.headers = headers; return this; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  await controller({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Content-Type"], "application/xml; charset=utf-8");
  assert.match(response.body, /<rss version="2\.0"/);
});

test("feed controller does not publish out-of-stock items", async () => {
  const originalLoad = Module._load;
  Module._load = function mockLoad(request, parent, isMain) {
    if (request === "../../models/product") {
      return { find: () => ({ lean: async () => [baseProduct] }) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  const controllerPath = require.resolve("../controllers/products/getGoogleMerchantFeed");
  delete require.cache[controllerPath];
  const controller = require(controllerPath);
  Module._load = originalLoad;

  const response = {
    headers: {},
    statusCode: null,
    body: null,
    set(headers) { this.headers = headers; return this; },
    status(code) { this.statusCode = code; return this; },
    send(body) { this.body = body; return this; },
  };
  await controller({}, response);

  assert.doesNotMatch(response.body, /<item>/);
  assert.doesNotMatch(response.body, /<g:availability>out_of_stock<\/g:availability>/);
});
