const express = require("express");

const authCtrl = require("../controllers/auth");
const { restorePass } = require("../controllers/auth");

const {
  ctrlWrapper,
  validation,
  authenticate,
  authRateLimit,
  refreshRateLimit,
} = require("../middleware");

const { schemas } = require("../models/user");

const router = express.Router();

router.get("/user", authenticate, ctrlWrapper(authCtrl.getUserData));

router.post(
  "/register",
  authRateLimit,
  validation(schemas.registerSchema),
  ctrlWrapper(authCtrl.register)
);

router.post(
  "/login",
  authRateLimit,
  validation(schemas.loginSchema),
  ctrlWrapper(authCtrl.login)
);

router.get("/current", authenticate, ctrlWrapper(authCtrl.getCurrent));

router.post("/logout", ctrlWrapper(authCtrl.logout));

router.post("/refresh", refreshRateLimit, ctrlWrapper(authCtrl.refresh));

router.post(
  "/addDeliveryAddress",
  authenticate,
  ctrlWrapper(authCtrl.addDeliveryAddress)
);

router.delete(
  "/deleteDeliveryAddress/:addressId",
  authenticate,
  ctrlWrapper(authCtrl.deleteDeliveryAddress)
);

router.patch(
  "/updateUser",
  authenticate,
  validation(schemas.updateUserSchema),
  ctrlWrapper(authCtrl.updateUser)
);

router.patch(
  "/restore",
  authRateLimit,
  validation(schemas.emailSchema),
  ctrlWrapper(authCtrl.restorePass)
);

router.patch("/addToWish", authenticate, ctrlWrapper(authCtrl.addToWishList));
router.patch("/removeFromWish", authenticate, ctrlWrapper(authCtrl.removeFromWish));

router.patch(
  "/changePassword",
  authenticate,
  validation(schemas.changePasswordSchema),
  ctrlWrapper(authCtrl.changePassword)
);

router.get("/verify/:verificationToken", ctrlWrapper(authCtrl.verify));

router.post(
  "/verify",
  validation(schemas.emailSchema),
  ctrlWrapper(authCtrl.resendVerifyEmail)
);

module.exports = router;
