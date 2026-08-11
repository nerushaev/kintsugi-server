const express = require("express");
const router = express.Router();
const { ctrlWrapper, validation, upload, authenticate } = require("../middleware");
const feedbackCtrl = require("../controllers/feedback/index");

router.post("/add", authenticate, ctrlWrapper(feedbackCtrl.addFeedback));
router.get("/:product_id", ctrlWrapper(feedbackCtrl.getFeedback));
router.delete("/remove/:_id", authenticate, ctrlWrapper(feedbackCtrl.removeFeedback))
// router.post("/", ctrlWrapper(orderCtrl.addOrder));
// router.post("/createWaybill", authenticate, ctrlWrapper(orderCtrl.createWaybill));

module.exports = router;
