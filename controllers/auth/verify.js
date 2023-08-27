const { RequestError } = require("../../helpers");
const { User } = require("../../models/user");
// const { BASE_URL } = process.env;

const verify = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  console.log(user);

  if (!user) {
    throw RequestError(404, "User not found");
  }

  await User.findOneAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });

  res.redirect("https://kintsugi.org.ua/");
};

module.exports = verify;
