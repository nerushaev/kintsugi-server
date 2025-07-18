const express = require("express");
const router = express.Router();
const { ctrlWrapper, validation, upload, authenticate } = require("../middleware");
const { productSchema } = require("../schemas");

const validateMiddleware = validation(productSchema);

const productCtrl = require("../controllers/products");

router.get("/favorite", ctrlWrapper(productCtrl.getFavoriteProduct));

router.get("/search", ctrlWrapper(productCtrl.getProductsByName));

router.get("/wish", authenticate, ctrlWrapper(productCtrl.getWishListProduct));

router.get("/", productCtrl.getProducts);

router.get("/:category", productCtrl.getProducts);

router.get("/all", ctrlWrapper(productCtrl.getAllProducts));

router.get("/getNames", ctrlWrapper(productCtrl.getAllProductsName));

router.get("/comingSoon", ctrlWrapper(productCtrl.getComingSoonProducts));

router.post("/availability", ctrlWrapper(productCtrl.checkAvailability));

router.get("/id/:_id", ctrlWrapper(productCtrl.getProductById));


router.delete("/:productId", ctrlWrapper(productCtrl.removeProductById));

router.patch(
  "/update/:product_id",
  ctrlWrapper(productCtrl.updateDescription)
);


router.post(
  "/",
  upload.array("image"),
  // validateMiddleware,
  ctrlWrapper(productCtrl.addProduct)
);

router.put(
  "/photos/:product_id",
  upload.array("photo_extra"),
  ctrlWrapper(productCtrl.updatePhotoProductById)
);



router.patch("/banners", ctrlWrapper(productCtrl.changeBanners));

router.post("/monobankWebhook", ctrlWrapper(productCtrl.monobankWebhook));

router.patch("/favoriteUpdate", authenticate, ctrlWrapper(productCtrl.toggleProductToFavorite))

module.exports = router;
