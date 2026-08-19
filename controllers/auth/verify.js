const { RequestError } = require("../../helpers");
const { User } = require("../../models/user");
const Order = require("../../models/order");
// const { BASE_URL } = process.env;

const verify = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });

  if (!user) {
    throw RequestError(404, "User not found");
  }

  const orders = await Order.find({ email: String(user.email).trim().toLowerCase() })
    .select("orderId")
    .lean();

  await User.findOneAndUpdate(
    user._id,
    {
      $set: { verify: true, verificationToken: null },
      ...(orders.length ? { $addToSet: { orders: { $each: orders.map(({ orderId }) => orderId) } } } : {}),
    }
  );

  res.redirect("https://kintsugi.org.ua/user?emailVerified=1");
};

module.exports = verify;
