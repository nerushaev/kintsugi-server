const { Schema, model } = require("mongoose");

const productSchema = new Schema({
  name: {
    type: String,
    // required: [true, "Set name for product!"],
  },
  category: {
    type: String,
    // required: true,
  },
  amount: {
    type: Number,
    // required: true,
  },
  image: {
    type: Array,
  },
  description: {
    type: String,
    // required: true,
  },
  price: {
    type: Number,
    // required: true,
  },
  comingSoon: {
    type: String,
  },
  size: { type: Array, default: ["-"] },
  sizeInformation: {
    type: String,
  },
  tags: {type: Array}
});

const Product = model("product", productSchema);

module.exports = Product;
