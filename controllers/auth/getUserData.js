const getUserData = async (req, res) => {
  const { user } = req;
  console.log(user);
  res.json(user);
};

module.exports = getUserData;
