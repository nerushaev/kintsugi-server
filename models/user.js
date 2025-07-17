const { Schema, model } = require("mongoose");
const Joi = require("joi");

const addressSchema = new Schema({
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
});

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: [true, "Set name!"],
    },
    lastName: {
      type: String,
      required: [true, "Set name!"],
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Set email!"],
    },
    phone: {
      type: String,
      unique: true,
      required: [true, "Set phone!"],
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    verificationToken: {
      type: String,
    },
    role: {
      type: String,
      default: "user",
    },
    orders: [
      {
        type: Schema.Types.Mixed,
        ref: "order",
      },
    ],
    addresses: {
      type: [addressSchema],
      default: [],
    },
    wishes: {
      type: Array,
    },
  },
  { versionKey: false, timestampts: true }
);

const registerSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().min(6).required(),
});

const schemas = {
  registerSchema,
  loginSchema,
};

const User = model("user", userSchema);

module.exports = {
  User,
  schemas,
};
