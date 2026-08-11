const express = require("express");
const router = express.Router();
const posterCtrl = require("../controllers/poster");

router.post("/webhook", posterCtrl.webHookPoster);

module.exports = router;
