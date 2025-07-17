const { User } = require("../../models/user");

const logout = async (req, res) => {
  const { _id } = req.user;

  await User.findByIdAndUpdate(_id, {
    token: "",
    refreshToken: "",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
  });

  res.status(200).json({
    message: "Logout success!",
  });
};

module.exports = logout;
