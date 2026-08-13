const getAllOrders = require('./getAllOrders');
const addOrder = require('./addOrder');
const getOrder = require('./getOrder');
const createWaybill = require('./createWaybill');
const getOrdersByIds = require('./getOrdersByIds');
const updateOrderField = require('./updateOrderField');
const deleteOrderByOrderId = require('./deleteOrderByOrderId');
const getTrackingStatus = require('./getTrackingStatus');
const retryPayment = require('./retryPayment');
const syncPaymentStatus = require('./syncPaymentStatus');

module.exports = {
  getAllOrders,
  addOrder,
  getOrder,
  createWaybill,
  getOrdersByIds,
  updateOrderField,
  deleteOrderByOrderId,
  getTrackingStatus,
  retryPayment,
  syncPaymentStatus
}
