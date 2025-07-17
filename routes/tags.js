const express = require("express");
const router = express.Router();
const { ctrlWrapper, authenticate } = require("../middleware");
const tagsCtrl = require("../controllers/tags/index");

router.get("/", authenticate, ctrlWrapper(tagsCtrl.getAllTags));
router.post("/",  ctrlWrapper(tagsCtrl.addTag));
router.delete("/", authenticate, ctrlWrapper(tagsCtrl.removeTag));
router.put("/", authenticate, ctrlWrapper(tagsCtrl.updateTag));
router.post("/initializeTags", ctrlWrapper(tagsCtrl.initializeTags));

module.exports = router;