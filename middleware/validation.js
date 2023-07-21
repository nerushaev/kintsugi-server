const { RequestError } = require("../helpers");

const validation = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    console.log(error);
    if (error) {
      next(RequestError(400, error));
    }
    next();
  };
};

module.exports = validation;
