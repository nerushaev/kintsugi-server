const Product = require("../../models/product");
const RequestError = require("../../helpers/requestError");

const updatePopularStatus = async (req, res) => {
  const { product_id } = req.params;
  const { favorite } = req.body;

  if (typeof favorite !== "boolean") {
    throw RequestError(400, "Поле favorite має бути логічним значенням");
  }

  const product = await Product.findOneAndUpdate(
    { product_id },
    { $set: { favorite } },
    { new: true }
  );

  if (!product) {
    throw RequestError(404, "Товар не знайдено");
  }

  res.json({
    message: favorite
      ? "Товар додано до популярних"
      : "Товар прибрано з популярних",
    product,
  });
};

module.exports = updatePopularStatus;
