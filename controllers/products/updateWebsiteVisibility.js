const Product = require("../../models/product");

const updateWebsiteVisibility = async (req, res) => {
  const { product_id } = req.params;
  const { websiteHidden } = req.body;

  if (typeof websiteHidden !== "boolean") {
    return res.status(400).json({
      message: "Поле websiteHidden має бути логічним значенням",
    });
  }

  const product = await Product.findOneAndUpdate(
    { product_id },
    { $set: { websiteHidden } },
    { new: true, runValidators: true }
  ).lean();

  if (!product) {
    return res.status(404).json({ message: "Товар не знайдено" });
  }

  res.json({
    product,
    message: websiteHidden
      ? "Товар приховано з сайту"
      : "Товар повернуто на сайт",
  });
};

module.exports = updateWebsiteVisibility;
