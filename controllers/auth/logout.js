const { User } = require("../../models/user");

const logout = async (req, res) => {
  const { _id } = req.user;

  const result = await User.findByIdAndUpdate(_id, {
    token: "",
    refreshToken: "",
  });
  console.log("result", result);
  // res.clearCookie("refreshToken");

  res.clearCookie("refreshToken").status(200).json({
    message: "Logout success!",
  });
};

module.exports = logout;
