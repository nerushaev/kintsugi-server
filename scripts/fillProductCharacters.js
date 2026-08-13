const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const Product = require("../models/product");

const APPLY = process.argv.includes("--apply");
const normalize = (value) => String(value || "").toLocaleLowerCase("uk-UA");
const has = (text, terms) => terms.some((term) => text.includes(term));

const fandomRules = [
  ["Honkai: Star Rail", ["honkai: star rail", "honkai star rail", "хср", "hsr", "косплей кафка", "перука кафка", "перука март"]],
  ["Genshin Impact", ["genshin impact", "геншин", "фуріна", "невіллет", "венті", "гань юй", "кокомі", "тігнарі", "сяо", "лінетт", "сітлалі", "ксілонен", "сянь юнь", "арлекіно"]],
  ["Jujutsu Kaisen", ["jujutsu kaisen", "jjk", "магічна битва", "годжо", "нобара кугісакі", "кента нанамі", "kento nanami", "ітадорі"]],
  ["Demon Slayer", ["demon slayer", "kimetsu no yaiba", "клинок", "незуко", "nezuko", "танжіро", "іноске", "inosuke", "рангоку", "тенген", "шинобу"]],
  ["Naruto", ["наруто", "naruto", "саске", "гаара"]],
  ["One Piece", ["one piece", "ван піс", "перука намі", "купальник намі", "journey- nami"]],
  ["Chainsaw Man", ["chainsaw man", "макіма", "figuarts mini - power", "кишибе"]],
  ["SPY×FAMILY", ["spy×family", "spy x family", "spy family", "форджер", "форжер", "forger"]],
  ["Re:Zero", ["re:zero", "qposket - rem", "qposket - ram", "перука рам"]],
  ["Sailor Moon", ["sailor moon", "сейлор мун", "sailor pluto"]],
  ["Hatsune Miku / Vocaloid", ["hatsune miku", "хатсуне міку", "міку хатсуне", "перука міку", "фігурка міку", "vocaloid", "вокалоїд"]],
  ["Tokyo Revengers", ["tokyo revengers", "токійські месники", "майкі", "manjiro sano", "haruki hayashida"]],
  ["Attack on Titan", ["attack on titan", "атака титанів", "стенд 13см ерен", "стенд 9см леві"]],
  ["Bungou Stray Dogs", ["bungou stray dogs", "бродячі пси", "акутагав", "ацуши", "чуя"]],
  ["Love and Deepspace", ["love and deepspace", "l&ds", "l&d space", "love & deepspace", "ксавʼєр", "ксав'єр", "рафаель", "раваель", "rafael", "зейн", "калеб"]],
  ["My Little Pony", ["my little pony"]],
  ["Kakegurui", ["kakegurui", "шалений азарт"]],
  ["Haikyuu!!", ["haikyuu", "волейбол"]],
  ["Arcane", ["arcane", "аркейн", "джінкс"]],
  ["Frieren", ["frieren", "фрірен", "юбель"]],
  ["Evangelion", ["evangelion", "євангеліон", "евангеліон", "аянамі", "перука аска", "рюкзак аска", "спис аска"]],
  ["Cardcaptor Sakura", ["cardcaptor sakura", "sakura kinomoto", "сакура — ловець карт"]],
  ["Sword Art Online", ["sword art online", "alicization leafa"]],
  ["League of Legends", ["league of legends", "teemo", "перука акалі"]],
  ["No Game No Life", ["no game no life", "no game - no life"]],
  ["Bocchi the Rock!", ["bocchi the rock"]],
  ["Heaven Official’s Blessing", ["heaven official", "се лянь", "hua cheng", "xie lian"]],
  ["Madoka Magica", ["madoka", "мадока"]],
  ["Panty & Stocking with Garterbelt", ["panty & stocking", "чулка"]],
  ["Love Live!", ["lovelive", "love live"]],
  ["Detective Conan", ["детектив конан", "косплей конан", "перука конан"]],
];

const characterRules = [
  ["Кафка", ["кафка"]], ["Фуріна", ["фуріна"]], ["Невіллет", ["невіллет"]],
  ["Венті", ["венті"]], ["Гань Юй", ["гань юй"]], ["Кокомі", ["кокомі"]],
  ["Тігнарі", ["тігнарі"]], ["Сяо", ["сяо"]], ["Лінетт", ["лінетт"]],
  ["Сітлалі", ["сітлалі"]], ["Ксілонен", ["ксілонен"]], ["Арлекіно", ["арлекіно"]],
  ["Сатору Годжо", ["годжо"]], ["Нобара Кугісакі", ["нобара кугісакі"]],
  ["Кенто Нанамі", ["kento nanami", "кента нанамі"]], ["Юдзі Ітадорі", ["ітадорі"]],
  ["Незуко Камадо", ["nezuko", "незуко"]], ["Тандзіро Камадо", ["танжіро"]],
  ["Іноске Хашибіра", ["hashibira inosuke", "inosuke", "іноске"]], ["Кьоджуро Ренґоку", ["рангоку"]],
  ["Тенґен Узуй", ["тенген"]], ["Шінобу Кочо", ["шинобу"]],
  ["Наруто Узумакі", ["наруто"]], ["Саске Учіха", ["саске"]], ["Ґаара", ["гаара"]],
  ["Намі", ["перука намі", "купальник намі", "journey- nami"]], ["Макіма", ["макіма"]], ["Пауер", ["figuarts mini - power"]],
  ["Аня Форджер", ["аня форджер"]], ["Лойд Форджер", ["loid forger"]], ["Йор Форджер", ["йор форжер", "yor forger"]],
  ["Рем", ["qposket - rem", "qposket рем", "перука рем"]], ["Рам", ["qposket - ram", "перука рам"]],
  ["Сейлор Плутон", ["sailor pluto"]], ["Сейлор Мун", ["sailor moon", "сейлор мун"]],
  ["Хацуне Міку", ["hatsune miku", "хатсуне міку", "міку хатсуне", "міку "]],
  ["Манджіро Сано (Майкі)", ["майкі", "manjiro sano"]], ["Харукі Хаяшіда", ["haruki hayashida"]],
  ["Ерен Єгер", ["стенд 13см ерен"]], ["Леві Аккерман", ["стенд 9см леві"]], ["Джінкс", ["джінкс"]],
  ["Фрірен", ["фігурка фрірен", "перука фрірен"]], ["Юбель", ["юбель"]],
  ["Рей Аянамі", ["рей аянамі", "аянамі рей"]], ["Аска Ленґлі", ["перука аска", "рюкзак аска", "спис аска", "ріжки євангеліон аска"]],
  ["Сакура Кіномото", ["sakura kinomoto"]], ["Ліфа", ["alicization leafa"]],
  ["Тімо", ["league of legends - teemo"]], ["Шіро", ["taito - no game - no life"]],
  ["Хіторі Ґото", ["bocchi the rock - hitori"]], ["Хуа Чен, Се Лянь", ["hua cheng x xie lian"]], ["Се Лянь", ["се лянь", "xie lian"]],
  ["Хуа Чен", ["hua cheng"]], ["Мадока Канаме", ["перука мадока"]],
  ["Стокінг Анаркі", ["перука чулка"]], ["Ксав’єр", ["ксавʼєр", "ксав'єр"]],
  ["Рафаель", ["рафаель", "раваель", "rafael"]], ["Зейн", ["зейн"]], ["Калеб", ["калеб"]],
  ["Рюноске Акутаґава", ["акутагав"]], ["Ацуші Накаджіма", ["ацуши"]],
  ["Чуя Накахара", ["перука чуя"]], ["Кішибе", ["кишибе"]],
  ["Ута", ["перука ута"]], ["Каторі Мінамі", ["каторі мінамі"]], ["Конан Едогава", ["косплей конан", "перука конан"]],
  ["Акалі", ["перука акалі"]], ["Березень 7", ["перука март"]],
  ["Стелла", ["косплей стела"]], ["Сянь Юнь", ["перука сянь юнь"]],
];

const infer = (product) => {
  const text = normalize(product.product_name);
  const fandom = fandomRules.find(([, terms]) => has(text, terms))?.[0] || "";
  const character = characterRules.find(([, terms]) => has(text, terms))?.[0] || "";
  return { fandom, character };
};

const run = async () => {
  if (!process.env.DB_HOST) throw new Error("DB_HOST is required");
  await mongoose.connect(process.env.DB_HOST);
  const products = await Product.find({ amount: { $gt: 0 } });
  const summary = { scanned: products.length, candidates: 0, fandom: 0, character: 0, changed: 0 };

  for (const product of products) {
    const inferred = infer(product);
    const updates = {};
    if (!String(product.fandom || "").trim() && inferred.fandom) updates.fandom = inferred.fandom;
    if (!String(product.character || "").trim() && inferred.character) updates.character = inferred.character;
    if (!Object.keys(updates).length) continue;
    summary.candidates += 1;
    if (updates.fandom) summary.fandom += 1;
    if (updates.character) summary.character += 1;
    console.log(`${product.product_id}\t${product.product_name}\t${updates.fandom || "—"}\t${updates.character || "—"}`);
    if (APPLY) {
      await Product.updateOne({ _id: product._id }, { $set: updates });
      summary.changed += 1;
    }
  }
  console.error(JSON.stringify({ mode: APPLY ? "apply" : "dry-run", ...summary }, null, 2));
};

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => mongoose.disconnect());
