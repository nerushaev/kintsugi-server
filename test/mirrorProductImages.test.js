const assert = require("node:assert/strict");
const test = require("node:test");
const { planImageMirror, mirrorProductImage } = require("../services/mirrorProductImage");
const { getPublicProductImage } = require("../helpers/publicProductImage");
const { parseArguments } = require("../scripts/mirrorProductImages");

const product = { product_id: "2311", photo_origin: "/upload/photo.jpeg" };
const source = "https://kintsugi.joinposter.com/upload/photo.jpeg";
const publicUrl = "https://res.cloudinary.com/demo/image/upload/v1/kintsugi/products/photo.jpg";
const savedProduct = { ...product, photo_public: publicUrl, photo_public_source: source };

test("dry run never uploads, verifies or writes", async () => {
  const unexpected = () => { throw new Error("Unexpected side effect"); };
  const result = await mirrorProductImage(product, { upload: unexpected, verify: unexpected, save: unexpected });
  assert.equal(result.status, "planned");
  assert.equal(result.source, source);
});

test("verified upload is saved only after successful public retrieval", async () => {
  const calls = [];
  const result = await mirrorProductImage(product, {
    apply: true,
    upload: async (url, options) => {
      calls.push("upload"); assert.equal(url, source); assert.equal(options.overwrite, false);
      return { secure_url: publicUrl };
    },
    verify: async (url) => { calls.push("verify"); assert.equal(url, publicUrl); },
    save: async (snapshot, fields) => {
      calls.push("save"); assert.equal(snapshot, product);
      assert.deepEqual(fields, { photo_public: publicUrl, photo_public_source: source }); return true;
    },
  });
  assert.equal(result.status, "saved");
  assert.deepEqual(calls, ["upload", "verify", "save"]);
});

test("unreadable upload never replaces the stored image", async () => {
  let saved = false;
  await assert.rejects(mirrorProductImage(product, {
    apply: true, upload: async () => ({ secure_url: publicUrl }),
    verify: async () => { throw new Error("404"); },
    save: async () => { saved = true; },
  }), /404/);
  assert.equal(saved, false);
});

test("concurrent source changes are reported instead of claimed as saved", async () => {
  const result = await mirrorProductImage(product, {
    apply: true, upload: async () => ({ secure_url: publicUrl }), verify: async () => {}, save: async () => false,
  });
  assert.equal(result.status, "changed_during_upload");
});

test("retries skip completed copies and use stable IDs for unfinished copies", () => {
  assert.equal(planImageMirror(savedProduct), null);
  assert.equal(getPublicProductImage(savedProduct), publicUrl);
  assert.equal(planImageMirror(product).publicId, planImageMirror({ ...product, photo_origin: source }).publicId);
  assert.notEqual(planImageMirror(product).publicId, planImageMirror({ ...product, photo_origin: "/upload/new.jpeg" }).publicId);
  assert.equal(getPublicProductImage({ ...savedProduct, photo_origin: "/upload/new.jpeg" }), null);
});

test("only Poster upload URLs are copied and only public Cloudinary copies used", () => {
  for (const url of ["https://example.org/a.jpg", "https://kintsugi.joinposter.com:444/upload/a.jpg", "https://kintsugi.joinposter.com/admin", "https://user:pass@kintsugi.joinposter.com/upload/a.jpg"]) {
    assert.equal(planImageMirror({ ...product, photo_origin: url }), null);
  }
  assert.equal(getPublicProductImage({ ...savedProduct, photo_public: "https://example.org/photo.jpg" }), null);
  assert.equal(getPublicProductImage({ ...savedProduct, photo_public_source: "" }), null);
});

test("CLI defaults to five planned images; invalid flags cannot trigger migration", () => {
  assert.deepEqual(parseArguments([]), { apply: false, limit: 5, productId: undefined });
  assert.deepEqual(parseArguments(["--apply", "--limit=1", "--product-id=2311"]), { apply: true, limit: 1, productId: "2311" });
  for (const argument of ["--all", "--limit=0", "--limit=-1", "--limit=1001", "--limit=NaN", "--aply"]) {
    assert.throws(() => parseArguments([argument]));
  }
});
