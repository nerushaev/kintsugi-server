const express = require("express");
const router = express.Router();
const { ctrlWrapper } = require("../middleware");
const metaCtrl = require("../controllers/meta/");

router.get("/run", ctrlWrapper(metaCtrl.run));
router.get("/getMetaStatus", ctrlWrapper(metaCtrl.getMetaStatus));
router.get("/:product_id", ctrlWrapper(metaCtrl.getMeta));
router.delete("/cleanOrphan", ctrlWrapper(metaCtrl.cleanOrphanMetaProducts));
router.patch("/changeMeta", ctrlWrapper(metaCtrl.changeMeta));
router.post("./getAdminProducts", ctrlWrapper(metaCtrl.getAdminProducts));

module.exports = router;
