const { Schema, model } = require("mongoose");

const orderSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "Set name"],
    },
    lastName: {
      type: String,
      required: [true, "Set last name"],
    },
    email: {
      type: String,
      required: [true, "Set email"],
    },

    phone: {
      type: String,
      required: [true, "Set phone!"],
    },
    deliveryMethod: {
      type: String,
    },
    address: {
      deliveryType: {
        type: String,
      },
      city: {
        type: String,
      },
      warehouse: {
        type: String,
      },
      postbox: {
        type: String,
      },
      address: {
        type: String,
      },
      house: {
        type: String,
      },
      apartment: {
        type: String,
      },
      _id: {
        type: String,
      },
    },
    bundles: {
      type: Array,
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
      enum: [
        "new",
        "processing",
        "sent",
        "shipped",
        "completed",
        "canceled",
      ],

      default: "new",
    },

    deliveryDetails: {
      type: String,
    },
    paymentId: {
      type: String,
    },
    paymentStatus: {
      type: String,
    },
    orderComments: {
      type: String,
    },
    deliveryComments: {
      type: String,
    },
    notCall: {
      type: Boolean,
    },
    TTN: {
      type: String,
    },
    deliveryType: {
      type: String,
    },
  },
  { versionKey: false, timestamps: true }
);

const Order = model("order", orderSchema);

module.exports = Order;
