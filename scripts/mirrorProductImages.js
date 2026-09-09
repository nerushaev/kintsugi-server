const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const Product = require("../models/product");
const { WEBSITE_PRODUCT_FILTER } = require("../helpers/productVisibility");
const { planImageMirror, mirrorProductImage } = require("../services/mirrorProductImage");

const parseArguments = (args) => {
  const options = { apply: false, limit: 5, productId: undefined };
  for (const arg of args) {
    if (arg === "--apply") options.apply = true;
    else if (/^--limit=[1-9]\d*$/.test(arg)) options.limit = Number(arg.slice(8));
    else if (/^--product-id=[A-Za-z0-9_-]+$/.test(arg)) options.productId = arg.slice(13);
    else throw new Error(`Unknown or invalid argument: ${arg}`);
  }
  if (!Number.isSafeInteger(options.limit) || options.limit > 1000) throw new Error("Limit must be 1..1000");
  return options;
};

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (!process.env.DB_HOST) throw new Error("DB_HOST is required");
  // No Cloudinary calls/configuration are needed for the default read-only plan.
  const cloudinary = options.apply ? require("cloudinary").v2 : null;
  if (cloudinary) {
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new Error("Configure CLOUDINARY_URL before applying changes");
    }
  }
  await mongoose.connect(process.env.DB_HOST, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
  const filter = { ...WEBSITE_PRODUCT_FILTER, ...(options.productId && { product_id: options.productId }) };
  const cursor = Product.find(filter)
    .select("product_id photo photo_origin photo_public photo_public_source")
    .sort({ product_id: 1 }).lean().cursor();
  let attempted = 0;
  let failed = 0;
  const statuses = {};
  try {
    for await (const product of cursor) {
      if (!planImageMirror(product)) continue;
      attempted++;
      try {
        const result = await mirrorProductImage(product, {
          apply: options.apply,
          ...require("../services/productImageStorage"),
        });
        statuses[result.status] = (statuses[result.status] || 0) + 1;
        if (result.status === "changed_during_upload") failed++;
        console.log(JSON.stringify({ product_id: product.product_id, ...result }));
      } catch {
        // SDK errors can contain authenticated request URLs: do not log them.
        failed++;
        console.error(JSON.stringify({ product_id: product.product_id, status: "failed_upload_verify_or_save" }));
      }
      if (attempted >= options.limit) break;
    }
  } finally { await cursor.close(); }
  console.log(JSON.stringify({ mode: options.apply ? "apply" : "dry-run", attempted, failed, statuses }));
  if (failed) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(() => { console.error("Image migration failed; check arguments, DB_HOST and Cloudinary configuration."); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}
module.exports = { parseArguments };
