// config/sqlite.js
import Database from "better-sqlite3";

const db = new Database("./backend/db/database.sqlite");

// Create the table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT
  )
`).run();

console.log("✅ SQLite connected successfully");

export { db };
