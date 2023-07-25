const { RequestError } = require("../../helpers");
const bcrypt = require("bcrypt");
const { User } = require("../../models/user");

const changePassword = async (req, res) => {
  const { user } = req;
  const { oldPass, newPass } = req.body;
  const passwordCompare = await bcrypt.compare(oldPass, user.password);

  if (!passwordCompare) {
    throw RequestError(401, "Password invalid...");
  }

  const hashPass = await bcrypt.hash(newPass, 10);
  await User.findByIdAndUpdate(user._id, { password: hashPass });

  res.status(200).json({
    message: "Пароль успішно змінено!",
  });
};

module.exports = changePassword;
