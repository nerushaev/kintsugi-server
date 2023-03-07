const { User } = require('../../models/user');

const logout = async (req, res) => {
  const { _id } = req.user;

  const result = await User.findByIdAndUpdate(_id, { token: "" });
  
  res.json({
    message: "Logout success!"
  });
};

module.exports = logout;