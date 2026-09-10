const { buildProducts, buildBundles, validateCombinedAvailability } = require("../../services/orderCart");
const { priceOrder } = require("../../services/promoPricing");
module.exports = async (req, res) => {
  try {
    const [products, bundles] = await Promise.all([buildProducts(req.body.products), buildBundles(req.body.bundles)]);
    await validateCombinedAvailability(products, bundles);
    return res.json(await priceOrder(products, bundles, req.body.promoCode));
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (["INVALID_CART", "PRODUCT_UNAVAILABLE"].includes(error.message)) return res.status(409).json({ message: "Перевірте склад та наявність товарів у кошику" });
    throw error;
  }
};
