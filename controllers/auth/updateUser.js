const { User } = require("../../models/user");

const updateUser = async (req, res) => {
  const { _id } = req.user;
  const { name, email, phone } = req.body;

  const duplicateEmail = await User.findOne({ email });
  const duplicatePhone = await User.findOne({ phone });

  console.log(JSON.stringify(_id) === JSON.stringify(duplicateEmail._id));

  if (JSON.stringify(duplicateEmail._id) !== JSON.stringify(_id)) {
    res.status(409).json({
      status: 409,
      message: "Користувач із такою поштою вже існує!",
    });
  }

  if (JSON.stringify(duplicatePhone._id) !== JSON.stringify(_id)) {
    res.status(409).json({
      status: 409,
      message: "Користувач із таким номером вже існує!",
    });
  }

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

  res.status(201).json({
    message: "Данні успішно оновлено!",
    user: data,
  });
};

module.exports = updateUser;
