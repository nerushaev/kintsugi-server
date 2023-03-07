const { Schema, model } = require('mongoose');
const Joi = require('joi')

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, "Set name for product!"],
  },
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true,
    minLength: 6
  },
  token: {
    type: String,
  },
  role: {
    type: String,
  }
}, { versionKey: false, timestampts: true });

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().required(),
  password: Joi.string().min(6).required()
})

const loginSchema = Joi.object({
  email: Joi.string().required(),
  password: Joi.string().min(6).required()
})

const schemas = {
  registerSchema,
  loginSchema
}

const User = model("user", userSchema);

module.exports = {
  User,
  schemas,
}