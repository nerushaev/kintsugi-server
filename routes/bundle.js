const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const bundleCtrl = require("../controllers/bundle");
const { authenticate } = require("../middleware");

router.post("/createBundle", authenticate, bundleCtrl.createBundle);
router.get("/", bundleCtrl.getBundles);
router.delete("/remove/:bundle_id", authenticate, bundleCtrl.deleteBundle);
module.exports = router;