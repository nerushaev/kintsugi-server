const { failure, success } = require("../../helpers/response");
const Tag = require("../../models/tags");

const updateTag = async (req, res) => {
    const { category, oldValue, newValue } = req.body;
  
    try {
      const tagDoc = await Tag.findOne();
      if (!tagDoc) {
        return failure(res, 'Теги не найдены', 404);
      }
  
      if (tagDoc[category]) {
        const index = tagDoc[category].indexOf(oldValue);
        if (index !== -1) {
          tagDoc[category][index] = newValue; // Обновляем тег
          await tagDoc.save(); // Сохраняем изменения
          return success(res, tagDoc, 'Тег обновлен успешно');
        } else {
          return failure(res, 'Тег не найден в категории', 400);
        }
      } else {
        return failure(res, 'Некорректная категория', 400);
      }
    } catch (error) {
      return failure(res, 'Ошибка обновления тега', 500, error.message);
    }
  };

  module.exports = updateTag;