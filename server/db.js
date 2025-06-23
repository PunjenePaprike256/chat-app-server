const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(path.resolve(__dirname, "chat.db"), (err) => {
  if (err) return console.error("❌ Greska pri povezivanju sa bazom:", err);
  console.log("✅ Povezan sa SQLite bazom");
});

db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
`);

module.exports = db;
