const { Schema, model } = require("mongoose");
const Joi = require("joi");

const userSchema = new Schema(
  {
    name: {
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
      unique: [true, "Phone is not unique!"],
      required: [true, "Set phone!"],
    },
    password: {
      type: String,
      required: true,
      minLength: 6,
    },
    verify: {
      type: String,
      default: false,
    },
    token: {
      type: String,
    },
    role: {
      type: String,
    },
    orders: [
      {
        type: Schema.Types.ObjectId,
        ref: "orders",
      },
    ],
  },
  { versionKey: false, timestampts: true }
);

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string()
    .pattern(/^\+380\d{9}$/)
    .required(),
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
