const Product = require('../../models/product');
const fs = require('fs/promises');
const cloudinary = require('cloudinary').v2;
const { uploads } = require('../../middleware/cloudinary');

cloudinary.config = ({
  secure: true,
});

const addProduct = async (req, res) => {
  const uploader = async (path) => await uploads(path, 'Images');
  
  const urls = [];
  const files = req.files;

  for (const file of files) {
    const { path } = file;
    const newPath = await uploader(path);
    urls.push(newPath);
    fs.unlink(path);
  }
  
  try {
    const product = await Product.create({ ...req.body, image: urls });
    res.json(product)
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = addProduct;
