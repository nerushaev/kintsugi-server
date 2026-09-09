const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const Product = require("../models/product");

const imageStorage = {
  upload: (source, options) => cloudinary.uploader.upload(source, options),
  verify: async (url) => {
    const response = await axios.get(url, {
      responseType: "arraybuffer", timeout: 30000, maxRedirects: 0,
      maxContentLength: 20 * 1024 * 1024,
    });
    if (!/^image\//i.test(response.headers["content-type"] || "") || !response.data.length) {
      throw new Error("Uploaded image is not publicly readable");
    }
  },
  save: async (snapshot, fields) => {
    const unchanged = { _id: snapshot._id };
    for (const key of ["photo", "photo_origin", "photo_public", "photo_public_source"]) {
      unchanged[key] = snapshot[key] === undefined ? { $exists: false } : snapshot[key];
    }
    const result = await Product.updateOne(unchanged, { $set: fields });
    return result.matchedCount === 1;
  },
};

module.exports = imageStorage;
