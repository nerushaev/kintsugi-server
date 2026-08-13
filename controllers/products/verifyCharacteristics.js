const Product = require("../../models/product");

const verifyCharacteristics = async (req, res) => {
  const product = await Product.findOneAndUpdate(
    {
      product_id: req.params.product_id,
      characteristicsReviewStatus: "auto",
    },
    { $set: { characteristicsReviewStatus: "verified" } },
    { new: true, runValidators: true }
  );

  if (!product) {
    const exists = await Product.exists({ product_id: req.params.product_id });
    return res.status(exists ? 409 : 404).json({
      message: exists
        ? "Підтвердження доступне лише для автоматично заповнених товарів"
        : "Товар не знайдено",
    });
  }

  return res.json({
    message: "Характеристики підтверджено",
    product,
  });
};

module.exports = verifyCharacteristics;
