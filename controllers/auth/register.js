const bcrypt = require("bcrypt");
const randomId = require("random-id");
const { User } = require("../../models/user");
const { generateTokens } = require("../../helpers");
const { getAuthCookieOptions } = require("../../helpers/authCookies");
const { normalizeUkrainianPhone } = require("../../helpers/customerValidation");
const sendVerificationEmail = require("../../helpers/sendVerificationEmail");
const Order = require("../../models/order");

const register = async (req, res) => {
  const email = String(req.body.email).trim().toLowerCase();
  const phone = String(req.body.phone).trim();
  const firstName = String(req.body.firstName).trim();
  const lastName = String(req.body.lastName).trim();
  const { password, checkoutOrderId } = req.body;

  const [duplicateEmail, duplicatePhone] = await Promise.all([
    User.exists({ email }),
    User.exists({ phone }),
  ]);
  if (duplicateEmail || duplicatePhone) {
    return res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою або номером уже існує",
    });
  }

  let checkoutOrder = null;
  if (checkoutOrderId) {
    const candidate = await Order.findOne({ orderId: checkoutOrderId })
      .select("orderId email phone")
      .lean();
    const ownsOrder = candidate &&
      String(candidate.email || "").trim().toLowerCase() === email &&
      normalizeUkrainianPhone(String(candidate.phone || "")) === normalizeUkrainianPhone(phone);
    if (ownsOrder) checkoutOrder = candidate;
  }

  const verificationToken = randomId(36, "aA0");
  const newUser = await User.create({
    firstName,
    lastName,
    email,
    phone,
    password: await bcrypt.hash(password, 10),
    verificationToken,
    avatarURL: "https://res.cloudinary.com/dzjmswzgp/image/upload/v1691783112/Group_26_r3qewe.jpg",
    role: "user",
    orders: checkoutOrder ? [checkoutOrder.orderId] : [],
  });

  const { token, refreshToken } = await generateTokens(newUser._id);
  const user = await User.findByIdAndUpdate(newUser._id, { refreshToken }, { new: true });

  res
    .cookie("refreshToken", refreshToken, getAuthCookieOptions(req, 30 * 24 * 60 * 60 * 1000))
    .cookie("token", token, getAuthCookieOptions(req, 12 * 60 * 60 * 1000));

  sendVerificationEmail(email, verificationToken).catch((error) => {
    console.error("Failed to send registration verification email:", error.message);
  });

  return res.status(201).json({ token, user });
};

module.exports = register;
