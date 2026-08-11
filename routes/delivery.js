const express = require("express");
const { ctrlWrapper } = require("../middleware");
const novaSuggestions = require("../controllers/delivery/novaSuggestions");

const router = express.Router();

router.get("/nova/cities", ctrlWrapper(novaSuggestions.cities));
router.get("/nova/warehouses", ctrlWrapper(novaSuggestions.warehouses));
router.get("/nova/streets", ctrlWrapper(novaSuggestions.streets));

module.exports = router;
