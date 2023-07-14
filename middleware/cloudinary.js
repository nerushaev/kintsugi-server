const cloudinary = require("cloudinary").v2;

cloudinary.config = {
  secure: true,
};

const options = {
  use_filename: true,
  unique_filename: false,
  overwrite: true,
  height: 1200,
  width: 1200,
};

exports.uploads = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, options);
    return result.url;
  } catch (error) {
    console.log(error);
  }
  // return new Promise(resolve => {
  //   cloudinary.uploader.upload(file, (result) => {
  //     resolve({
  //       url: result.url,
  //       id: result._id
  //     })
  //   })
  // }, {
  //   resource_type: "auto",
  //   folder: folder,
  // })
};
