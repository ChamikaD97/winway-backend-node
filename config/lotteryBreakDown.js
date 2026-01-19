import { db } from "../config/sqlite.js";



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

console.log("✅ lottery_breakdown table ready");


export { db };