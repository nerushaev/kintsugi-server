const createHttpError = require("http-errors");

const authorizeAdmin = (req, _res, next) => {
  if (req.user?.role !== "admin") {
    return next(createHttpError(403, "Administrator access required"));
  }

  next();
};

module.exports = authorizeAdmin;
