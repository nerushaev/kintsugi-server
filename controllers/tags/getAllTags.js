const { failure, success } = require("../../helpers/response");
const Tag = require("../../models/tags");

const getAllTags = async (req, res) => {
    try {
      const tagDoc = await Tag.findOne(); // Получаем один документ с тегами
      if (!tagDoc) {
        return failure(res, 'Теги не найдены', 404);
      }
      return success(res, tagDoc); // Отправляем все теги
    } catch (error) {
      return failure(res, 'Ошибка получения тегов', 500, error.message);
    }
  };

  module.exports = getAllTags;