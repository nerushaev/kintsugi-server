const { User } = require("../models/user");
const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const { ACCESS_SECRET_KEY } = process.env;

const authError = (req, message) =>
  createHttpError(401, message, {
    canRefresh: Boolean(req.cookies.refreshToken),
  });

const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return next(authError(req, "No token provided"));
  }
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET_KEY);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(authError(req, "User not found"));
    }
    req.user = user;
    next();
  } catch (error) {
    if (
      error?.name !== "JsonWebTokenError" &&
      error?.name !== "TokenExpiredError" &&
      error?.name !== "NotBeforeError"
    ) {
      console.error("Auth lookup failed:", error);
    }
    next(authError(req, "Token verification failed"));
  }
};

module.exports = authenticate;
