const express = require("express");
const router = express.Router();
const posterCtrl = require("../controllers/poster");
const { ctrlWrapper } = require("../middleware");

router.post("/webhook", ctrlWrapper(posterCtrl.webHookPoster));

module.exports = router;
