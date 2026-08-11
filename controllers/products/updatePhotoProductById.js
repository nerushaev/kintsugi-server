const Product = require("../../models/product");
const fs = require("fs/promises");
const { uploads } = require("../../middleware/cloudinary");

const updatePhotoProductById = async (req, res) => {
  const { product_id } = req.params;
  const files = Array.isArray(req.files) ? req.files : [];

  if (!files.length) {
    return res.status(400).json({ message: "Оберіть хоча б одне фото" });
  }

  const product = await Product.findOne({ product_id });
  if (!product) {
    await Promise.allSettled(files.map(({ path }) => fs.unlink(path)));
    return res.status(404).json({ message: "Товар не знайдено" });
  }

  const uploadedPhotos = [];
  try {
    for (const file of files) {
      uploadedPhotos.push(await uploads(file.path, "photo_extra"));
    }
  } finally {
    await Promise.allSettled(files.map(({ path }) => fs.unlink(path)));
  }

  product.photo_extra = [
    ...(Array.isArray(product.photo_extra) ? product.photo_extra : []),
    ...uploadedPhotos,
  ];
  await product.save();

  res.json({
    product: product.toObject(),
    message: "Фото додано",
  });
};

module.exports = updatePhotoProductById;
