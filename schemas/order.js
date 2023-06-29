const Joi = require('joi');

const orderSchema = Joi.object({
  orderId: Joi.string().required(),
  client: Joi.string().required(),
  adress: Joi.string().required(),
  phone: Joi.string().required(),
  city: Joi.string().required(),
  products: Joi.array().items(Joi.object({
    _id: Joi.string().required(),
    name: Joi.string().required(),
    categoty: Joi.string().required(),
    amount: Joi.string().required(),
    image: Joi.string().required(),
    description: Joi.string().required(),
    price: Joi.string().required(),
  })),
  date: Joi.date().required(),
});

module.exports = orderSchema;