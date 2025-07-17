const { Schema, model } = require("mongoose");

const tagSchema = new Schema({
    tags: [{ type: String }],          // Массив для всех тегов
    types: [{ type: String }],         // Массив для типов товаров (например, 'Аксессуары', 'Одежда')
    materials: [{ type: String }],     // Массив для материалов (например, 'Синтетика', 'Хлопок')
    colors: [{ type: String }],        // Массив для цветов (например, 'Красный', 'Чёрный')
    fandoms: [{ type: String }],       // Массив для фандомов (например, 'Marvel', 'Anime')
    characters: [{ type: String }],    // Массив для персонажей (например, 'Iron Man', 'Naruto')
  });
  
  const Tag = model('Tag', tagSchema);
  
  module.exports = Tag;
  
