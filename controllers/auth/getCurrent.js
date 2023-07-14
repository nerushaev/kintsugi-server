const { User } = require("../../models/user");

const getCurrent = async (req, res) => {
  const { email, name, phone, role } = req.user;

  res.json({
    name,
    email,
    phone,
    role,
  });
};

module.exports = getCurrent;
