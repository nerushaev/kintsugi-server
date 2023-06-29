const express = require('express');
const router = express.Router();
const { ctrlWrapper, validation, upload } = require('../middleware');
const { orderSchema } = require('../schemas');

const orderCtrl = require('../controllers/orders/index');

router.get('/', ctrlWrapper(orderCtrl.getAllOrders));
router.get('/:orderId', ctrlWrapper(orderCtrl.getOrder))
router.post('/', ctrlWrapper(orderCtrl.addOrder));

module.exports = router;
