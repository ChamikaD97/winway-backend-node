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
  db.run(`
  CREATE TABLE IF NOT EXISTS Customer_Profile_Image (
    MobileNumber TEXT PRIMARY KEY,
    ImagePath TEXT NOT NULL,
    UploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MobileNumber)
      REFERENCES Current_Customer_Details(MobileNumber)
      ON DELETE CASCADE
      ON UPDATE CASCADE
  );
`);

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

// Loyalty Promotions Table
db.run(`
  CREATE TABLE IF NOT EXISTS loyality_promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    promotion_code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    start_date TEXT NOT NULL,   -- YYYY-MM-DD
    end_date TEXT NOT NULL,     -- YYYY-MM-DD

    image TEXT,                -- image path or URL
    terms_conditions TEXT,

    eligible_tiers TEXT NOT NULL,  -- JSON array: ["Blue","Silver","Gold"]

    status TEXT CHECK (status IN ('ACTIVE', 'INACTIVE')) DEFAULT 'INACTIVE',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// -------------------------------------------------------------
// ⭐ IMPORTANT FIX ⭐
// Prevent SQLite from closing and shutting down the Node server
// -------------------------------------------------------------
setInterval(() => {
  db.get("SELECT 1", () => {});
}, 30000); // executes every 30 seconds

export default db;
