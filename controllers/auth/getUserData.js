const getUserData = async (req, res) => {
  const { user } = req;
  res.json(user);
};

module.exports = getUserData;
