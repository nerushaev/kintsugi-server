const messages = {
  400: "Перевірьте правильність данних...",
  401: "Такого користувача не існує...",
  403: "Forbbiden",
  404: "Not found",
  409: "Conflict",
};

const RequestError = (status, message = messages[status]) => {
  const error = new Error(message);
  error.status = status;
  console.log(error);
  return error;
};

module.exports = RequestError;
