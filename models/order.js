const { Schema, model } = require("mongoose");

const orderSchema = new Schema({
  orderRef: {
    type: String,
    required: [false, "Need order ID"],
  },
  name: {
    type: String,
    required: [true, "Set name"],
  },
  phone: {
    type: String,
    required: [true, "Set phone!"],
  },
  city: {
    type: String,
    required: [true, "Set city name"],
  },
  cityRef: {
    type: String,
    required: [true, "Set cityRef!"],
  },
  warehouse: {
    type: String,
    required: [true, "Set warehouse name"],
  },
  recipientWarehouseIndex: {
    type: String,
    required: [true, "Set RecipientWarehouseIndex!"],
  },
  products: {
    type: Array,
    required: [true, "Set products"],
  },
  nova: {
    type: Boolean,
    required: [true, "Set options!"],
  },
  afina: {
    type: Boolean,
    required: [true, "Set options!"],
  },
  cash: {
    type: Boolean,
    required: [true, "Set options!"],
  },
  liqpay: {
    type: Boolean,
    required: [true, "Set options!"],
  },
  password: {
    type: String,
    required: [false],
  },
  date: {
    type: String,
    required: [false],
  },
  totalPrice: {
    type: Number,
  },
  payment: {
    type: String,
    default: "unpaid",
  },
  orderId: {
    type: String,
  },
  status: {
    type: String,
  }
});

const Order = model("order", orderSchema);

module.exports = Order;
