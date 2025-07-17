const jwt = require("jsonwebtoken");

const { ACCESS_SECRET_KEY, REFRESH_SECRET_KEY } = process.env;

const generateTokens = async (_id) => {
  const payload = { id: _id };
  const token = jwt.sign(payload, ACCESS_SECRET_KEY, { expiresIn: "12h" });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET_KEY, {
    expiresIn: "30d",
  });

console.log("ACCESS_SECRET_KEY:", ACCESS_SECRET_KEY);
console.log("REFRESH_SECRET_KEY:", REFRESH_SECRET_KEY);


  return { token, refreshToken };
};

module.exports = generateTokens;
