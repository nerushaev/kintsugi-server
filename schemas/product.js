const Joi = require('joi');

const productSchema = Joi.object({
  name: Joi.string().required(),
  category: Joi.string().required(),
  amount: Joi.string().required(),
  description: Joi.string().required().max(96),
  price: Joi.string().required(),
  id: Joi.string(),
  comingSoon: Joi.string(),
})

module.exports = productSchema;