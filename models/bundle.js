const { Schema, model } = require("mongoose");

const BundleSchema = new Schema({
    bundle_id: { type: String, unique: true },
    title: String,
    description: String,
    products: [{ type: Schema.Types.ObjectId, ref: 'product' }],
    discount: Number,
    price: Number,
    newPrice: Number,
    isActive: Boolean,
  }, { timestamps: true });
  
  const Bundle = model("bundle", BundleSchema);

  module.exports = Bundle;
  