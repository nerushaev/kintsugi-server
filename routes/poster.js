const express = require("express");
const router = express.Router();
const posterCtrl = require("../controllers/poster");


router.get("/", posterCtrl.getProducts);
router.post("/webhook", posterCtrl.webHookPoster);

module.exports = router;
