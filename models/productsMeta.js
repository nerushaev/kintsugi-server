const { Schema, model } = require("mongoose");

const ProductMetaSchema = new Schema({
  product_id: { type: String, required: true, unique: true },

  tags: { type: [String], required: true },
  type: { type: [String], required: true },

  material: [String],
  color: { type: [String], required: true },

  fandom: [String],
  character: [String],

  isPopular: Boolean,
  isLimited: Boolean,

  customTitle: String,
  customDescription: String,
  customImage: String,

  gender: [String],

}, { timestamps: true });

const ProductMeta = model("productMeta", ProductMetaSchema);

module.exports = ProductMeta;
