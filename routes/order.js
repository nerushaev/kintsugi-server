const express = require("express");
const router = express.Router();
const { ctrlWrapper, authenticate, authorizeAdmin } = require("../middleware");
const orderCtrl = require("../controllers/orders/index");

router.get("/", authenticate, authorizeAdmin, ctrlWrapper(orderCtrl.getAllOrders));
router.post("/getOrders", authenticate, ctrlWrapper(orderCtrl.getOrdersByIds));
router.post("/get", authenticate, ctrlWrapper(orderCtrl.getOrder));
router.get("/:orderId/tracking", authenticate, ctrlWrapper(orderCtrl.getTrackingStatus));
router.post("/:orderId/payment", authenticate, ctrlWrapper(orderCtrl.retryPayment));
router.post("/:orderId/payment/status", authenticate, authorizeAdmin, ctrlWrapper(orderCtrl.syncPaymentStatus));
router.post("/", ctrlWrapper(orderCtrl.addOrder));
router.post("/createWaybill", authenticate, authorizeAdmin, ctrlWrapper(orderCtrl.createWaybill));
router.patch('/:orderId/update', authenticate, authorizeAdmin, ctrlWrapper(orderCtrl.updateOrderField));
router.delete("/:orderId", authenticate, ctrlWrapper(orderCtrl.deleteOrderByOrderId));

module.exports = router;
