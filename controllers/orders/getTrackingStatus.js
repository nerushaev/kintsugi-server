const axios = require("axios");
const Order = require("../../models/order");

const getTrackingStatus = async (req, res) => {
  const { orderId } = req.params;
  const ownsOrder = (req.user.orders || []).some(
    (userOrderId) => String(userOrderId) === String(orderId)
  );

  if (req.user.role !== "admin" && !ownsOrder) {
    return res.status(403).json({ message: "Недостатньо прав для перегляду замовлення" });
  }

  const order = await Order.findOne({ orderId }).select("TTN phone");
  if (!order) {
    return res.status(404).json({ message: "Замовлення не знайдено" });
  }
  if (!order.TTN) {
    return res.json({ status: "" });
  }

  const { NOVA_API_KEY, NOVA_BASE_URL } = process.env;
  if (!NOVA_API_KEY) {
    return res.status(503).json({ message: "Сервіс відстеження тимчасово недоступний" });
  }

  const { data } = await axios.post(
    NOVA_BASE_URL || "https://api.novaposhta.ua/v2.0/json/",
    {
      apiKey: NOVA_API_KEY,
      modelName: "TrackingDocumentGeneral",
      calledMethod: "getStatusDocuments",
      methodProperties: {
        Documents: [
          {
            DocumentNumber: String(order.TTN),
            Phone: String(order.phone),
          },
        ],
      },
    }
  );

  const tracking = data?.data?.[0];
  return res.json({
    status: tracking?.Status || "",
    statusCode: tracking?.StatusCode || "",
  });
};

module.exports = getTrackingStatus;
