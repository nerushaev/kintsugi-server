const getCurrent = async (req, res) => {
  res.json({
    user: req.user,
  });
};

module.exports = getCurrent;
