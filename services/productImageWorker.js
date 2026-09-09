const { planImageMirror, mirrorProductImage } = require("./mirrorProductImage");

// Scan persisted products, so restarts and missed webhooks do not lose work.
// One failed photo must not delay stock updates or starve later products.
const createProductImageWorker = ({ products, storage, log = console.log }) => {
  let running = false;
  return async () => {
    if (running) return;
    running = true;
    let cursor;
    const summary = { attempted: 0, saved: 0, failed: 0 };
    try {
      cursor = products();
      for await (const product of cursor) {
        if (!planImageMirror(product)) continue;
        summary.attempted++;
        try {
          const result = await mirrorProductImage(product, { ...storage, apply: true });
          if (result.status === "saved") summary.saved++;
          else summary.failed++;
        } catch {
          summary.failed++;
          // SDK errors may contain authenticated URLs. Never log their contents.
          log(JSON.stringify({ worker: "product-images", product_id: product.product_id, status: "retry_next_scan" }));
        }
      }
    } catch {
      summary.failed++;
    } finally {
      try { if (cursor) await cursor.close(); } catch { summary.failed++; }
      running = false;
    }
    if (summary.attempted || summary.failed) log(JSON.stringify({ worker: "product-images", ...summary }));
    return summary;
  };
};

let timer;
const startProductImageWorker = () => {
  if (timer) return;
  const Product = require("../models/product");
  const { WEBSITE_PRODUCT_FILTER } = require("../helpers/productVisibility");
  const storage = require("./productImageStorage");
  const scan = createProductImageWorker({
    products: () => Product.find(WEBSITE_PRODUCT_FILTER)
      .select("product_id photo photo_origin photo_public photo_public_source")
      .sort({ product_id: 1 }).lean().cursor(),
    storage,
  });
  timer = setInterval(scan, 5 * 60 * 1000);
  timer.unref();
  void scan();
};

module.exports = { createProductImageWorker, startProductImageWorker };
