const express = require("express");
const router = express.Router();
const { ctrlWrapper, validation, upload, authenticate } = require("../middleware");
const { productSchema } = require("../schemas");

const validateMiddleware = validation(productSchema);

const productCtrl = require("../controllers/products");

router.get("/", productCtrl.getProducts);

router.get("/all", ctrlWrapper(productCtrl.getAllProducts));

router.get("/getNames", ctrlWrapper(productCtrl.getAllProductsName));

router.get("/comingSoon", ctrlWrapper(productCtrl.getComingSoonProducts));

router.get("/:_id", ctrlWrapper(productCtrl.getProductById));

router.get("/wish/:wishes", authenticate, ctrlWrapper(productCtrl.getWishListProduct));

router.delete("/:productId", ctrlWrapper(productCtrl.removeProductById));

router.post(
  "/",
  upload.array("image"),
  // validateMiddleware,
  ctrlWrapper(productCtrl.addProduct)
);

router.put(
  "/:product_id",
  upload.array("photo_extra"),
  ctrlWrapper(productCtrl.updateProductById)
);

router.patch("/banners", ctrlWrapper(productCtrl.changeBanners));

module.exports = router;
