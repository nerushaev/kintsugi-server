const { User } = require("../../models/user");

const logout = async (req, res) => {
  const { _id } = req.user;

  await User.findOneAndUpdate(_id, { token: "", refreshToken: "" });

  res.clearCookie("refreshToken");

  res.status(204).json({
    message: "Logout success!",
  });
};

module.exports = logout;
