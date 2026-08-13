const Order = require("../../models/order");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getAllOrders = async (req, res) => {
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 10;
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";

  const filter = search
    ? {
        $or: [
          { orderId: new RegExp(escapeRegExp(search), "i") },
          { firstName: new RegExp(escapeRegExp(search), "i") },
          { lastName: new RegExp(escapeRegExp(search), "i") },
          { email: new RegExp(escapeRegExp(search), "i") },
          { phone: new RegExp(escapeRegExp(search), "i") },
          { "address.city": new RegExp(escapeRegExp(search), "i") },
          { "address.address": new RegExp(escapeRegExp(search), "i") },
          { status: new RegExp(escapeRegExp(search), "i") },
          { TTN: new RegExp(escapeRegExp(search), "i") },
        ],
      }
    : {};

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);

  return res.json({
    orders,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    totalItems: total,
  });
};

module.exports = getAllOrders;
