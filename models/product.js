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
}, { versionKey: false, timestampts: true }
);

productSchema.index({product_name: 'text'});

const Product = model("product", productSchema);

module.exports = Product;
