require("dotenv").config();
const mongoose = require("mongoose");
require("./guard")();
const KbDoc = require("../models/KbDoc");
const articles = require("./kbData");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await KbDoc.deleteMany({});
    const rows = articles.flatMap((a) => ["en", "hi", "ta"].map((lang) => {
      const [title, tags, text, sourceLabel] = a[lang];
      return { key: a.key, lang, title, tags, text, sourceLabel };
    }));
    await KbDoc.insertMany(rows);
    console.log(`${rows.length} knowledge-base articles inserted`);
    process.exit();
  } catch (e) { console.error(e); process.exit(1); }
})();
