const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().required(),
  amount: Joi.number().required(),
  description: Joi.string().required().max(96),
  price: Joi.number().required(),
  _id: Joi.string(),
  comingSoon: Joi.string(),
  image: Joi.array() || Joi.string(),
})

module.exports = productSchema;