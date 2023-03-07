const { User } = require('../../models/user');

const getCurrent = async (req, res) => {
  const { email, name } = req.user;

  res.json({
    name,
    email,
  });
};

module.exports = getCurrent;