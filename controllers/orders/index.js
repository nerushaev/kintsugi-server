const getAllOrders = require('./getAllOrders');
const addOrder = require('./addOrder');
const getOrder = require('./getOrder');
const createWaybill = require('./createWaybill');
const createSignature = require('./createSignature');
const liqpay = require('./liqpay');

module.exports = {
  getAllOrders,
  addOrder,
  getOrder,
  createWaybill,
  createSignature,
  liqpay
}