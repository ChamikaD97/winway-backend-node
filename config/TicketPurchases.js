// models/TicketPurchases.js
import { db } from "../config/sqlite.js";

// Create ticket_purchases table
db.prepare(`
  CREATE TABLE IF NOT EXISTS ticket_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    ticket_id TEXT,
    lottery_name TEXT,
    quantity INTEGER DEFAULT 0,
    amount REAL DEFAULT 0,
    purchase_date DATE DEFAULT CURRENT_DATE,
    month TEXT GENERATED ALWAYS AS (strftime('%Y-%m', purchase_date)) VIRTUAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  )
`).run();

console.log("✅ ticket_purchases table ready");

export { db };

