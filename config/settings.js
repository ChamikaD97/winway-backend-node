// models/Settings.js
import { db } from "./sqlite.js";

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE,
    value TEXT,
    type TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// ✅ Optional: seed default loyalty variables (only if not present)
const defaults = [
  { key: "LOYALTY_ENTRY_PLATINUM_TICKETS", value: "5000", type: "number" },
  { key: "LOYALTY_ENTRY_GOLD_TICKETS", value: "3000", type: "number" },
  { key: "LOYALTY_ENTRY_SILVER_TICKETS", value: "1000", type: "number" },
  { key: "LOYALTY_ENTRY_MIN_CHECK_TICKETS", value: "1000", type: "number" },
  { key: "LOYALTY_MONTHLY_PLATINUM_TICKETS", value: "1000", type: "number" },
  { key: "LOYALTY_MONTHLY_GOLD_TICKETS", value: "500", type: "number" },
  { key: "LOYALTY_MONTHLY_SILVER_TICKETS", value: "300", type: "number" },
  { key: "LOYALTY_DOWNGRADE_THRESHOLD", value: "300", type: "number" },
  { key: "DOWNGRADE_MONTHS", value: "3", type: "number" },
];

for (const s of defaults) {
  const exists = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(s.key);
  if (!exists) {
    db.prepare("INSERT INTO settings (key, value, type) VALUES (?, ?, ?)").run(
      s.key,
      s.value,
      s.type
    );
    console.log(`🌱 Inserted default setting: ${s.key}`);
  }
}

export { db };
