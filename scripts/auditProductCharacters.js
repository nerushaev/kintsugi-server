const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Product = require("../models/product");

const run = async () => {
  if (!process.env.DB_HOST) throw new Error("DB_HOST is required");
  await mongoose.connect(process.env.DB_HOST);

  const products = await Product.find({
    amount: { $gt: 0 },
    $or: [
      { fandom: { $exists: false } },
      { fandom: "" },
      { character: { $exists: false } },
      { character: "" },
    ],
  })
    .select("product_id product_name category_name description fandom character")
    .sort({ category_name: 1, product_name: 1 })
    .lean();

  for (const product of products) {
    const description = String(product.description || "").replace(/\s+/g, " ").trim();
    console.log([
      product.product_id,
      product.category_name,
      product.product_name,
      description.slice(0, 160),
    ].join("\t"));
  }
  console.error(`AUDIT_TOTAL=${products.length}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => mongoose.disconnect());
