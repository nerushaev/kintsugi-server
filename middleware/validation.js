const { RequestError } = require("../helpers");

const validation = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return next(RequestError(400, error.details?.[0]?.message || "Invalid request"));
    }
    req.body = value;
    return next();
  };
};

module.exports = validation;
