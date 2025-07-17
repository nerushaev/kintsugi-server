const Tag = require("../../models/tags");

const initializeTags = async (req, res) => {
    try {
      // Проверяем, есть ли уже документ с тегами
      const existingTagDoc = await Tag.findOne();
      if (existingTagDoc) {
        return res.status(200).json({
          success: true,
          message: 'Документ с тегами уже существует',
          data: existingTagDoc,
        });
      }
  
      // Если документа нет, создаем новый
      const newTagDoc = new Tag({
        tags: [],
        types: [],
        materials: [],
        colors: [],
        fandoms: [],
        characters: [],
      });
  
      // Сохраняем новый документ в базе данных
      await newTagDoc.save();
  
      return res.status(201).json({
        success: true,
        message: 'Документ с тегами успешно инициализирован',
        data: newTagDoc,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Ошибка инициализации документа с тегами',
        error: error.message,
      });
    }
  };

  module.exports = initializeTags;