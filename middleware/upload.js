const multer = require('multer');
const path = require('path');

const len = 15;

const tempDir = path.join(__dirname, "../", "temp");

const multerConfig = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + "-" + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true)
  } else {
    cb({ message: "Unsupported File Format" }, false);
  }
}

const upload = multer({
  storage: multerConfig,
  fileFilter: fileFilter
});

module.exports = upload;