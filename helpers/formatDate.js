const formatDate = (date, format) => {
  const map = {
    mm: date.getMonth() + 1,
    dd: date.getDate(),
    yy: date.getFullYear().toString().slice(-2),
    yyyy: date.getFullYear(),
    hh: date.getHours(),
    min: date.getMinutes(),
  };

  return format.replace(/mm|dd|yy|yyy|hh|min/gi, (matched) => map[matched]);
};

module.exports = formatDate;
