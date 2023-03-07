const { User } = require('../../models/user');
const createHttpError = require('http-errors');
const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');
const { SECRET_KEY } = process.env;

const login = async (req, res) => {
  const { email, password } = req.body;

  const userData = await User.findOne({ email });

  if (!email) {
    throw createHttpError(401, 'Email invalid...')
  };

  const passwordCompare = bcrypt.compare(password, userData.password);

  if (!passwordCompare) {
    throw createHttpError(401, "Password invalid...");
  };

  const payload = {
    id: userData._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(userData._id, { token });

  const { name } = userData;

  res.json({
    token,
    user: {
      email,
      name
    }
  })
};

module.exports = login;