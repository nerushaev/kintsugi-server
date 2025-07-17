const cloudinary = require("cloudinary").v2;

cloudinary.config = {
  secure: true,
};

const options = {
  use_filename: true,
  unique_filename: false,
  overwrite: true,
};

exports.uploads = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, options);
    return result.url;
  } catch (error) {
    console.log(error);
  }
};
