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
  email: {
    type: String,
    require: [true, "Set email"],
  },
  phone: {
    type: String,
    required: [true, "Set phone!"],
  },
  city: {
    type: String,
  },
  warehouse: {
    type: String,
  },
  postbox: {
    type: String
  },
  address: {
    address: {
      type: String,
    },
    house: {
      type: String,
    },
    appartment: {
      type: String,
    },
  },
  products: {
    type: Array,
    required: [true, "Set products"],
  },
  payments: {
    type: String,
  },
  date: {
    type: String,
    required: [false],
  },
  totalPrice: {
    type: Number,
  },
  orderId: {
    type: String,
  },
  status: {
    type: String,
  },
  delivery: {
    type: String,
  },
  deliveryDetails: {
    type: String
  },
  paymentId: {
    type: String
  },
  paymentStatus: {
    type: String
  },
  orderComments: {
    type: String
  },
  deliveryComments: {
    type: String
  },
  warehouseDelivery: {
    type: Boolean
  },
  postboxDelivery: {
    type: Boolean
  },
  addressDelivery: {
    type: Boolean
  },
  notCall: {
    type: Boolean
  },
});

const Order = model("order", orderSchema);

module.exports = Order;