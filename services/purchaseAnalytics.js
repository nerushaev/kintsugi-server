const sanitizeAnalytics = (input) => {
  if (!input || !/^\d{1,20}\.\d{1,20}$/.test(String(input.clientId || ""))) return undefined;
  return {
    clientId: String(input.clientId),
    ...(/^\d{1,20}$/.test(String(input.sessionId || "")) && { sessionId: String(input.sessionId) }),
  };
};

const isConfirmedPurchase = (order) => order.status !== "canceled" && (
  (order.payments === "card" && order.paymentStatus === "success") ||
  (order.payments === "cash" && order.status === "completed")
);

const isConfirmedOrder = (order) => order.status !== "canceled" && (
  (order.payments === "card" && order.paymentStatus === "success") ||
  (order.payments === "cash" && ["processing", "sent", "shipped", "completed"].includes(order.status))
);

const buildPurchaseEvent = (order) => {
  const context = sanitizeAnalytics(order.analytics);
  if (!context || !isConfirmedPurchase(order) || !order.orderId) return null;
  const items = [
    ...(order.products || []).map((item) => ({
      item_id: String(item.product_id), item_name: item.product_name,
      item_variant: item.size || undefined, price: Number(item.price) / 100, quantity: Number(item.amount),
    })),
    ...(order.bundles || []).map((item) => ({
      item_id: `bundle_${item.bundle_id}`, item_name: item.title,
      price: Number(item.newPrice ?? item.price) / 100, quantity: Number(item.amount),
    })),
  ];
  const value = Number(order.totalPrice);
  if (!Number.isFinite(value) || value <= 0 || !items.length || items.length > 200 || items.some((item) =>
    !item.item_id || item.item_id === "undefined" || !Number.isFinite(item.price) || item.price < 0 ||
    !Number.isInteger(item.quantity) || item.quantity <= 0)) return null;
  if (order.discountAmount > 0) {
    const gross = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
    const discount = Math.round(order.discountAmount * 100);
    if (!Number.isSafeInteger(discount) || discount >= gross || Math.abs(gross - discount - Math.round(value * 100)) > 0) return null;
    let cumulative = 0;
    let allocated = 0;
    for (const item of items) {
      const line = Math.round(item.price * 100) * item.quantity;
      cumulative += line;
      const next = Math.round(discount * cumulative / gross);
      const lineDiscount = next - allocated;
      allocated = next;
      item.discount = lineDiscount / item.quantity / 100;
      item.price = (line - lineDiscount) / item.quantity / 100;
      item.coupon = order.promoCode;
    }
  }
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (Math.abs(itemTotal - value) > 0.01) return null;
  const occurredAt = new Date(order.analyticsConfirmedAt);
  if (!Number.isFinite(occurredAt.getTime())) return null;
  return {
    client_id: context.clientId,
    timestamp_micros: occurredAt.getTime() * 1000,
    events: [{ name: "purchase", params: {
      transaction_id: order.orderId, ...(order.promoCode && { coupon: order.promoCode }), currency: "UAH", value, items,
      payment_method: order.payments, engagement_time_msec: 1,
      ...(context.sessionId && { session_id: Number(context.sessionId) }),
    } }],
  };
};

// Persist the first confirmation time; repeated callbacks never move it.
const recordPurchaseConfirmation = async (order) => {
  if (!sanitizeAnalytics(order.analytics)) return;
  const Order = require("../models/order");
  if (isConfirmedPurchase(order)) {
    await Order.updateOne({ _id: order._id, analyticsConfirmedAt: { $exists: false } },
      { $set: { analyticsConfirmedAt: new Date() } });
  }
  // Each milestone has its own durable outbox. Existing purchases are never reset.
  if (order.orderConfirmationEnabled && isConfirmedOrder(order)) {
    await Order.updateOne({ _id: order._id, orderConfirmedAt: { $exists: false } },
      { $set: { orderConfirmedAt: new Date() } });
  }
};

const buildConfirmedOrderEvent = (order) => {
  if (!isConfirmedOrder(order)) return null;
  // Reuse validated server totals/items without treating unpaid COD as revenue.
  const payload = buildPurchaseEvent({ ...order, payments: "card", paymentStatus: "success",
    analyticsConfirmedAt: order.orderConfirmedAt });
  if (!payload) return null;
  payload.events[0].name = "order_confirmed";
  payload.events[0].params.payment_method = order.payments;
  payload.events[0].params.event_id = `order_confirmed_${order.orderId}`;
  return payload;
};

module.exports = { sanitizeAnalytics, isConfirmedPurchase, isConfirmedOrder, buildPurchaseEvent,
  buildConfirmedOrderEvent, recordPurchaseConfirmation };
