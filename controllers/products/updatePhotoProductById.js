const Product = require("../../models/product");
const fs = require("fs/promises");
const cloudinary = require("cloudinary").v2;
const { uploads } = require("../../middleware/cloudinary");

const updatePhotoProductById = async (req, res) => {
  const uploader = async (path) => await uploads(path, "photo_extra");
  const urls = [];
  const { product_id } = req.params;
  const product = await Product.find({ product_id: product_id });


  if (req.files) {
    const files = req.files;

    for (const file of files) {
      const { path } = file;
      const newPath = await uploader(path);
      urls.push(newPath);
      fs.unlink(path);
    }
  }

  const resultPhotos = [...product[0].photo_extra, ...urls];

  const updateQuery = { $set: {} };

  if (urls) {
    updateQuery.$set.photo_extra = resultPhotos;
  } else {
    updateQuery.$set = req.body;
  }


  const result = await Product.findOneAndUpdate({product_id: product_id}, updateQuery, { new: true });

  if (!result) {
    throw NotFound(`Product with id=${product_id} not found...`);
  }
  res.json(result);
};

module.exports = updatePhotoProductById;
