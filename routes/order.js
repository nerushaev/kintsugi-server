const express = require("express");
const router = express.Router();
const { ctrlWrapper, validation, upload, authenticate } = require("../middleware");
const orderCtrl = require("../controllers/orders/index");

router.get("/", authenticate, ctrlWrapper(orderCtrl.getAllOrders));
router.post("/getOrders", authenticate, ctrlWrapper(orderCtrl.getOrdersByIds));
router.post("/get", authenticate, ctrlWrapper(orderCtrl.getOrder));
router.post("/", ctrlWrapper(orderCtrl.addOrder));
router.post("/createWaybill", authenticate, ctrlWrapper(orderCtrl.createWaybill));
router.post("/createSignature", ctrlWrapper(orderCtrl.createSignature));
router.post("/liqpay", ctrlWrapper(orderCtrl.liqpay));
router.patch('/:orderId/update', ctrlWrapper(orderCtrl.updateOrderField));
router.delete("/:orderId", ctrlWrapper(orderCtrl.deleteOrderByOrderId));

module.exports = router;
