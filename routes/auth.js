const express = require("express");

const authCtrl = require("../controllers/auth");
const { restorePass } = require("../controllers/auth");

const { ctrlWrapper, validation, authenticate } = require("../middleware");

const { schemas } = require("../models/user");

const router = express.Router();

router.post(
  "/register",
  validation(schemas.registerSchema),
  ctrlWrapper(authCtrl.register)
);

router.post(
  "/login",
  validation(schemas.loginSchema),
  ctrlWrapper(authCtrl.login)
);

router.get("/current", authenticate, ctrlWrapper(authCtrl.getCurrent));

router.post("/logout", authenticate, ctrlWrapper(authCtrl.logout));

router.get("/refresh", ctrlWrapper(authCtrl.refresh));

router.patch(
  "/updateUserDelivery",
  authenticate,
  ctrlWrapper(authCtrl.updateUserDelivery)
);

router.patch("/updateUser", authenticate, ctrlWrapper(authCtrl.updateUser));

router.patch("/restore", ctrlWrapper(authCtrl.restorePass));

router.patch(
  "/changePassword",
  authenticate,
  ctrlWrapper(authCtrl.changePassword)
);

router.get("/verify/:verificationToken", ctrlWrapper(authCtrl.verify));

router.post(
  "/verify",
  // validator(emailSchema),
  ctrlWrapper(authCtrl.resendVerifyEmail)
);

module.exports = router;
