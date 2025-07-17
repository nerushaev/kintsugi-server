const Bundle = require("../../models/bundle");
const ProductMeta = require("../../models/productsMeta");
const { uploads } = require("../../middleware/cloudinary");
const fs = require("fs");
const RandExp = require("randexp");

const createBundle = async (req, res) => {
  console.log("here");

  const bundleId = new RandExp(/^[A-Z]{2}\d{10}$/).gen();
  try {
    const { title, description, discount, price, products, newPrice } =
      req.body;
    const isActive = true;
    const bundle = new Bundle({
      bundle_id: bundleId,
      title,
      description,
      discount,
      price,
      products,
      isActive,
      newPrice,
    });

    await bundle.save();

    await ProductMeta.updateMany(
      { product_id: { $in: bundle.products } },
      { $addToSet: { inBundles: bundle.bundle_id } }
    );

    res.status(201).json(bundle);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = createBundle;
