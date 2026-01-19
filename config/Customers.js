// models/Customer.js
import { db } from "../config/sqlite.js";

// Create the customers table
db.prepare(`
  CREATE TABLE IF NOT EXISTS customers (
    MobileNumber TEXT PRIMARY KEY,
    FirstName TEXT,
    LastName TEXT,
    Email TEXT,
    Ticket_Count INTEGER DEFAULT 0,
    Loyalty_Tier TEXT DEFAULT 'Blue',
    Last_Purchase_Time TEXT,
    Gender TEXT,
    RegisteredDate TEXT,
    DateOfBirth TEXT,
    Status TEXT DEFAULT 'active',
    Country TEXT,
    WalletBalance TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log("✅ customers table ready (MobileNumber is primary key)");

export { db };
