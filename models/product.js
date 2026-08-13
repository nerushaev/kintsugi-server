const { Schema, model } = require("mongoose");

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
    type: Array,
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
  }
}, { versionKey: false, timestamps: true }
);

productSchema.index({product_name: 'text'});
productSchema.index({ category_name: 1, amount: 1, price: 1 });

const Product = model("product", productSchema);

module.exports = Product;
