exports.success = (res, data = null, message = "") => {
    return res.status(200).json({
      success: true,
      message,
      data,
    });
  };
  
  exports.failure = (res, message = "Ошибка запроса", status = 400, error = null) => {
    return res.status(status).json({
      success: false,
      message,
      error,
    });
  };
  