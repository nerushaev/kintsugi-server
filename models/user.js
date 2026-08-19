const { Schema, model } = require("mongoose");
const Joi = require("joi");
const {
  PERSON_NAME_PATTERN,
  normalizeUkrainianPhone,
  isUkrainianPhone,
} = require("../helpers/customerValidation");

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
  cityRef: { type: String },
  settlementRef: { type: String },
  warehouseRef: { type: String },
  warehouseIndex: { type: String },
  streetRef: { type: String },
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
      select: false,
    },
    verificationToken: {
      type: String,
    },
    verify: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      default: "",
      select: false,
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

const nameSchema = Joi.string().trim().min(2).max(80).pattern(PERSON_NAME_PATTERN).required();
const phoneSchema = Joi.string().trim().custom((value, helpers) => {
  const normalized = normalizeUkrainianPhone(value);
  return isUkrainianPhone(normalized) ? normalized : helpers.error("string.pattern.base");
}, "Ukrainian phone normalization");

const registerSchema = Joi.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().min(7).max(72).required(),
  phone: phoneSchema.required(),
  checkoutOrderId: Joi.string().trim().max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(150).required(),
  password: Joi.string().max(72).required(),
});

const updateUserSchema = Joi.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: Joi.string().trim().lowercase().email().max(150).required(),
  phone: phoneSchema.required(),
});

const emailSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().max(150).required(),
});

const changePasswordSchema = Joi.object({
  oldPass: Joi.string().max(72).required(),
  newPass: Joi.string().min(7).max(72).required(),
});

const schemas = {
  registerSchema,
  loginSchema,
  updateUserSchema,
  emailSchema,
  changePasswordSchema,
};

const User = model("user", userSchema);

module.exports = {
  User,
  schemas,
};
