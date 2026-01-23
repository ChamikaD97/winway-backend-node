import sqlite3 from "sqlite3";
import path from "path";

// Resolve DB file path
const dbPath = path.resolve("winwayNew.db");

// Connect to SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("❌ Failed to connect to DB:", err);
  else console.log("✅ Connected to SQLite database.");
});

// Create required tables
db.serialize(() => {
  // Settings table
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE,
      value TEXT,
      type TEXT,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `,
  ).run();

  // Users table
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT
    )
  `,
  ).run();

  // Current Customer Details
  db.run(`
    CREATE TABLE IF NOT EXISTS Current_Customer_Details (
      MobileNumber TEXT NOT NULL,
      Last_Update TEXT NOT NULL,
      FirstName TEXT,
      LastName TEXT,
      Email TEXT,
      Last_Purchase_Time TEXT,
      Gender TEXT,
      RegisteredDate TEXT,
      DateOfBirth TEXT,
      Status TEXT,
      Country TEXT,
      WalletBalance REAL,
      Current_Ticket_Count INTEGER,
      Current_Loyalty_Tier TEXT,
      Last_Month_Ticket_Count INTEGER,
      Last_Month_Loyalty_Tier TEXT,
      Evaluation_Status TEXT,
      Loyalty_Number TEXT,
      PRIMARY KEY (MobileNumber, Last_Update)
    );
  `);

  // Monthly Upgrade Table

  db.run(`
    CREATE TABLE IF NOT EXISTS Monthly_Upgrade_Details (
      MobileNumber TEXT NOT NULL,
      Last_Update TEXT NOT NULL,
      Month_Tier TEXT,


      Monthly_Ticket_Count INTEGER,
      PRIMARY KEY (MobileNumber, Last_Update),
      FOREIGN KEY (MobileNumber) REFERENCES Current_Customer_Details(MobileNumber)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS Monthly_Upgrades_Summery (
      Downgrades INTEGER,
      New_Customers INTEGER,
      Evaluation TEXT,
      Upgrades INTEGER,
      Same INTEGER,
      PRIMARY KEY (Evaluation)
    );
  `);

  // Monthly Upgrade Table
  db.run(`
    CREATE TABLE IF NOT EXISTS Daily_Upgrade_Details (
      MobileNumber TEXT NOT NULL,From_Date DATE NOT NULL,
      To_Date  DATE NOT NULL,
      Month_Tier TEXT,
      Ada_Sampatha INTEGER,
      Dhana_Nidhanaya INTEGER,
      Govisetha INTEGER,
      Handahana INTEGER,
      Jaya INTEGER,
      Mahajana_Sampatha INTEGER,
      Mega_Power INTEGER,
      Suba_Dawasak INTEGER,
      Ticket_Count INTEGER,
      PRIMARY KEY (MobileNumber),
      FOREIGN KEY (MobileNumber) REFERENCES Current_Customer_Details(MobileNumber)
    );
  `);

  console.log("📦 All new tables created successfully.");
});

// -------------------------------------------------------------
// ⭐ IMPORTANT FIX ⭐
// Prevent SQLite from closing and shutting down the Node server
// -------------------------------------------------------------
setInterval(() => {
  db.get("SELECT 1", () => {});
}, 30000); // executes every 30 seconds

export default db;
