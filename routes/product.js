const express = require("express");
const router = express.Router();
const {
  ctrlWrapper,
  upload,
  authenticate,
  authorizeAdmin,
} = require("../middleware");
const productCtrl = require("../controllers/products");

const useAdminProductScope = (req, _res, next) => {
  req.adminScope = true;
  next();
};

router.get("/favorite", ctrlWrapper(productCtrl.getFavoriteProduct));

router.get("/wish", authenticate, ctrlWrapper(productCtrl.getWishListProduct));

router.get("/", ctrlWrapper(productCtrl.getProducts));
router.get("/all", ctrlWrapper(productCtrl.getAllProducts));
router.get(
  "/feeds/google.xml",
  ctrlWrapper(productCtrl.getGoogleMerchantFeed)
);
router.get("/feeds/prom-stock.xlsx", ctrlWrapper(productCtrl.getPromStockFeed));
router.get(
  "/feeds/prom-stock-by-barcode.xlsx",
  ctrlWrapper(productCtrl.getPromBarcodeStockFeed)
);
router.get(
  "/admin",
  authenticate,
  authorizeAdmin,
  useAdminProductScope,
  ctrlWrapper(productCtrl.getProducts)
);
router.get("/getNames", ctrlWrapper(productCtrl.getAllProductsName));
router.get("/comingSoon", ctrlWrapper(productCtrl.getComingSoonProducts));
router.post("/availability", ctrlWrapper(productCtrl.checkAvailability));
router.get("/id/:_id", ctrlWrapper(productCtrl.getProductById));

router.delete(
  "/:productId",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.removeProductById)
);

router.patch(
  "/update/:product_id",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.updateDescription)
);

router.patch(
  "/admin/:product_id/visibility",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.updateWebsiteVisibility)
);

router.patch(
  "/admin/:product_id/popular",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.updatePopularStatus)
);

router.patch(
  "/admin/:product_id/characteristics",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.updateCharacteristics)
);

router.patch(
  "/admin/:product_id/characteristics/verify",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.verifyCharacteristics)
);

router.put(
  "/photos/:product_id",
  authenticate,
  authorizeAdmin,
  upload.array("photo_extra"),
  ctrlWrapper(productCtrl.updatePhotoProductById)
);

router.patch(
  "/photos/:product_id/order",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.reorderProductPhotos)
);

router.patch(
  "/banners",
  authenticate,
  authorizeAdmin,
  ctrlWrapper(productCtrl.changeBanners)
);

router.post("/monobankWebhook", ctrlWrapper(productCtrl.monobankWebhook));

router.patch("/favoriteUpdate", authenticate, ctrlWrapper(productCtrl.toggleProductToFavorite));

router.get("/:category", ctrlWrapper(productCtrl.getProducts));

module.exports = router;
