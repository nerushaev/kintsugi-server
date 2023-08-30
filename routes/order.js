const express = require("express");
const router = express.Router();
const { ctrlWrapper, validation, upload, authenticate } = require("../middleware");

const orderCtrl = require("../controllers/orders/index");

router.get("/", authenticate, ctrlWrapper(orderCtrl.getAllOrders));
router.get("/:orderId", authenticate, ctrlWrapper(orderCtrl.getOrder));
router.post("/", authenticate, ctrlWrapper(orderCtrl.addOrder));
router.post("/createWaybill", authenticate, ctrlWrapper(orderCtrl.createWaybill));

module.exports = router;
