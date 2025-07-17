const Order = require("../../models/order");

const getAllOrders = async (req, res) => {
  const { page = 1, limit = 10, search = "" } = req.query;

  const searchRegex = new RegExp(search, "i");

  const filter = search
    ? {
        $or: [
          { orderId: searchRegex },
          { "user.firstName": searchRegex },
          { "user.lastName": searchRegex },
          { "user.email": searchRegex },
          { "delivery.city": searchRegex },
          { "delivery.address": searchRegex },
          { status: searchRegex },
        ],
      }
    : {};

  const skip = (page - 1) * limit;

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Order.countDocuments(filter);

  res.json({
    orders,
    currentPage: Number(page),
    totalPages: Math.ceil(total / limit),
  });
};

module.exports = getAllOrders;