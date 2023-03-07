const Product = require('../../models/product');
const fs = require('fs/promises');
const cloudinary = require('cloudinary').v2;

cloudinary.config = ({
  secure: true,
});

const addProduct = async (req, res) => {
  const { path: tempUpload, originalname } = req.file;
  const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      height: 300,
      width: 300,
    };
  
  try {
    const result = await cloudinary.uploader.upload(tempUpload, options);
    const product = await Product.create({ ...req.body, image: result.url });
    res.json(product)
    fs.unlink(tempUpload);
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = addProduct;
