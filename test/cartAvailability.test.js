const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const original = Module._load;
const product = { product_id: "2290", product_name: "Косплей Аліса", amount: 2,
  modifications: [{ modificator_name: "XXL \u00a0", size_left: 2 }, { modificator_name: "L", size_left: 0 }] };
Module._load = function(name, ...args) {
  if (["../models/product", "../../models/product.js"].includes(name)) {
    return { find: () => ({ lean: async () => [product], select() { return this; } }) };
  }
  if (name === "../models/bundle") return { find: () => ({ populate() { return this; },
    lean: async () => [{ bundle_id: "bundle", products: [product], price: 100000 }] }) };
  return original.call(this, name, ...args);
};
const checkAvailability = require("../controllers/products/checkAvailability");
const { buildProducts, buildBundles, validateCombinedAvailability } = require("../services/orderCart");
Module._load = original;
const item = (size = "XXL ", amount = 1) => ({ product_id: "2290", size, amount });
test("availability matches stored sizes with trailing whitespace and keeps stock limits", async () => {
  for (const [size, amount, expected] of [["XXL ", 1, true], ["XXL", 2, true], ["XXL", 3, false], ["L", 1, false], ["M", 1, false]]) {
    let body;
    await checkAvailability({ body: { productBusket: [item(size, amount)] } },
      { status() { return this; }, json(value) { body = value; } });
    assert.equal(body.data.availableProducts, expected);
  }
});
test("order products, bundles and combined limits use the same normalized size", async () => {
  const products = await buildProducts([item()]);
  const bundles = await buildBundles([{ bundle_id: "bundle", amount: 1, products: [item()] }]);
  await validateCombinedAvailability(products, bundles);
  await assert.rejects(validateCombinedAvailability([...products, ...products], bundles), /PRODUCT_UNAVAILABLE/);
  await assert.rejects(buildProducts([item("L")]), /PRODUCT_UNAVAILABLE/);
  await assert.rejects(buildProducts([item("M")]), /PRODUCT_UNAVAILABLE/);
});
