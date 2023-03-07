const { User } = require('../models/user');
const createHttpError = require('http-errors');
const jwt = require('jsonwebtoken');
const { SECRET_KEY } = process.env;

const authenticate = async (req, res, next) => {
  const { authorization } = req.headers;
  if (authorization === undefined) {
    next(createHttpError(401));
    return
  }
  const [bearer, token] = authorization ? authorization.split(" ") : null;

  if (bearer !== "Bearer") {
    next(createHttpError(401));
  }

  try {
    const { id } = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(id);
    if (!user || !user.token) {
      next(createHttpError(401));
    }
    req.user = user; 
    next();
  } catch {
    next(createHttpError(401));
  }
};


module.exports = authenticate;