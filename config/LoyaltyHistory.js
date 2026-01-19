// models/LoyaltyHistory.js
import { db } from "../config/sqlite.js";

// Create loyalty_history table

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS loyalty_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_mobile TEXT,
    old_tier TEXT,
    new_tier TEXT,
    lastMonthTickets INTEGER DEFAULT 0,
    reason TEXT,
    effective_month TEXT DEFAULT (strftime('%Y-%m', 'now')),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_mobile) REFERENCES customers(MobileNumber)
  )
`
).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS lottery_breakdown (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    MobileNumber TEXT NOT NULL,
    Last_Purchase_Time TEXT NOT NULL,
    Lottery_Name TEXT NOT NULL,
    Ticket_Count INTEGER DEFAULT 0,
    FOREIGN KEY(MobileNumber) REFERENCES customers(MobileNumber)
  )
`).run();

console.log(
  "✅ loyalty_history table ready (linked to customers via MobileNumber)"
);

export { db };
