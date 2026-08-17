const axios = require("axios");
const Order = require("../../models/order");

const NOVA_TRACKING_URL = "https://api.novaposhta.ua/v2.0/json/";

const toNovaPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return `38${digits}`;
  return digits;
};

const getTrackingStatus = async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

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

  const { NOVA_API_KEY } = process.env;
  if (!NOVA_API_KEY) {
    return res.status(503).json({ message: "Сервіс відстеження тимчасово недоступний" });
  }

  let data;
  try {
    const response = await axios.post(
      NOVA_TRACKING_URL,
      {
        apiKey: NOVA_API_KEY,
        modelName: "TrackingDocument",
        calledMethod: "getStatusDocuments",
        methodProperties: {
          Language: "UA",
          Documents: [
            {
              DocumentNumber: String(order.TTN),
              Phone: toNovaPhone(order.phone),
            },
          ],
        },
      },
      { timeout: 15000 }
    );
    data = response.data;
  } catch (error) {
    const upstreamStatus = error.response?.status;
    console.error("Nova Poshta tracking request failed", {
      code: error.code,
      upstreamStatus,
    });

    return res.status(502).json({
      message: upstreamStatus
        ? `Нова пошта відповіла з помилкою (${upstreamStatus})`
        : "Сервер не зміг з'єднатися з Новою поштою",
    });
  }

  const tracking = data?.data?.[0];
  const hasTrackingData = Boolean(tracking?.Status || tracking?.StatusCode);
  if (!hasTrackingData) {
    const novaMessage = [...(data?.errors || []), ...(data?.warnings || [])]
      .filter(Boolean)
      .join("; ");

    return res.status(502).json({
      message: novaMessage || "Нова пошта не повернула дані для цієї ТТН",
    });
  }

  return res.json({
    status: tracking?.Status || "",
    statusCode: tracking?.StatusCode || "",
  });
};

module.exports = getTrackingStatus;
