const { Schema, model } = require("mongoose");

const productModificationSchema = new Schema(
  {
    ingredient_id: String,
    modificator_name: String,
    size_left: Number,
    modificator_price: Number,
    barcode: String,
  },
  { _id: false, strict: false }
);

const productSchema = new Schema({
  product_name: {
    type: String,
    // required: [true, "Set name for product!"],
  },
  category_name: {
    type: String,
    // required: true,
  },
  menu_category_id: {
    type: String,
    // required: true,
  },
  photo: {
    type: String,
    // required: true,
  },
  photo_origin: {
    type: String,
    // required: true,
  },
  product_id: {
    type: String,
    index: true,
  },
  price: { 
    type: Number
  },
  barcode: {
    type: String,
  },
  brand: {
    type: String,
    trim: true,
  },
  mpn: {
    type: String,
    trim: true,
  },
  google_product_category: {
    type: String,
    trim: true,
  },
  product_type: {
    type: String,
    trim: true,
  },
  score: {
    type: Number,
    default: 0,
  },
  scoreAmount: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
  },
  material: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    trim: true,
  },
  equipment: {
    type: String,
    trim: true,
  },
  character: {
    type: String,
    trim: true,
  },
  fandom: {
    type: String,
    trim: true,
  },
  characteristicsReviewStatus: {
    type: String,
    enum: ["auto", "verified"],
  },
  photo_extra: {
    type: Array,
  },
  hidden: {
    type: String,
  },
  modifications: {
    type: [productModificationSchema],
    default: [],
  },
  amount: {
    type: Number,
  },
  favorite: {
    type: Boolean
  },
  websiteHidden: {
    type: Boolean,
    default: false,
  },
  posterArchived: {
    type: Boolean,
    default: false,
  },
  comingSoon: {
    type: String,
  }
}, { versionKey: false, timestamps: true }
);

productSchema.index({product_name: 'text'});
productSchema.index({ category_name: 1, amount: 1, price: 1 });

const Product = model("product", productSchema);

module.exports = Product;
