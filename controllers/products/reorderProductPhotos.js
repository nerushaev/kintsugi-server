const Product = require("../../models/product");

const reorderProductPhotos = async (req, res) => {
  const { product_id } = req.params;
  const { photos } = req.body;

  if (!Array.isArray(photos) || photos.some((photo) => typeof photo !== "string")) {
    return res.status(400).json({ message: "Некоректний список фотографій" });
  }

  const product = await Product.findOne({ product_id });
  if (!product) {
    return res.status(404).json({ message: "Товар не знайдено" });
  }

  const currentPhotos = Array.isArray(product.photo_extra)
    ? product.photo_extra
    : [];
  const currentSorted = [...currentPhotos].sort();
  const requestedSorted = [...photos].sort();

  if (
    currentSorted.length !== requestedSorted.length ||
    currentSorted.some((photo, index) => photo !== requestedSorted[index])
  ) {
    return res.status(400).json({
      message: "Порядок можна змінювати лише для наявних фотографій",
    });
  }

  product.photo_extra = photos;
  await product.save();

  res.json({
    product: product.toObject(),
    message: "Порядок фотографій збережено",
  });
};

module.exports = reorderProductPhotos;
