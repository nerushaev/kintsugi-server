const express = require("express");
const router = express.Router();
const { ctrlWrapper, authenticate, authorizeAdmin } = require("../middleware");
const metaCtrl = require("../controllers/meta/");

router.use(authenticate, authorizeAdmin);

router.post("/run", ctrlWrapper(metaCtrl.run));
router.get("/getMetaStatus", ctrlWrapper(metaCtrl.getMetaStatus));
router.delete("/cleanOrphan", ctrlWrapper(metaCtrl.cleanOrphanMetaProducts));
router.patch("/changeMeta", ctrlWrapper(metaCtrl.changeMeta));
router.post("/getAdminProducts", ctrlWrapper(metaCtrl.getAdminProducts));
router.get("/:product_id", ctrlWrapper(metaCtrl.getMeta));

module.exports = router;
