const { User } = require("../../models/user");

const updateUser = async (req, res) => {
  const { _id } = req.user;
  const { name, email, phone } = req.body;
  const duplicateEmail = await User.findOne({ email });
  const duplicatePhone = await User.findOne({ phone });

  if (duplicateEmail) {
    res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою вже існує!",
    });
  }

  if (duplicatePhone) {
    res.status(409).json({
      status: 409,
      message: "Користувач із таким номером вже існує!",
    });
  }
  console.log("here");
  const data = await User.findOneAndUpdate(
    _id,
    {
      name,
      email,
      phone,
    },
    {
      new: true,
    }
  );

  res.json({
    user: data,
  });
};

module.exports = updateUser;
