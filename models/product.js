const { Schema, model } = require('mongoose');

const productSchema = new Schema({
  name: {
    type: String,
    required: [true, "Set name for product!"],
  },
  category: {
    type: String,
    required: true,
  },
  amount: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: String,
    required: true,
  },
  comingSoon: {
    type: String,
  }
});

const Product = model("product", productSchema);

module.exports = Product;
