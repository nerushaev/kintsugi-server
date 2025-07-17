const { User } = require("../models/user");
const createHttpError = require("http-errors");
const jwt = require("jsonwebtoken");
const { ACCESS_SECRET_KEY } = process.env;

const authenticate = async (req, res, next) => {
  const token = req.cookies.token;
  console.log("Token from cookie:", token);
  if (!token) {
    return next(createHttpError(401, "No token provided"));
  }
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET_KEY);
    const decodedAccess = jwt.decode(token, { complete: true });
    console.log("Decoded JWT header:", decodedAccess?.header);
    console.log("Decoded JWT payload:", decodedAccess?.payload);

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(createHttpError(401, "User not found"));
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    next(createHttpError(401, "Token verification failed"));
  }
};

module.exports = authenticate;

module.exports = authenticate;
