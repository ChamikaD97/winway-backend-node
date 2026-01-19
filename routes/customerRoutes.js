import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// routes/settingsRoutes.js
import { db } from "../config/Customers.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "winway_secret_2025";

/**
 * 🟢 Register new customer
 */
router.post("/register", (req, res) => {
  const {
    FirstName,
    LastName,
    Email,
    Password,
    MobileNumber,
    Gender,
    Country = "Sri Lanka",
  } = req.body;

  if (!FirstName || !Email || !Password || !MobileNumber) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const existing = db
    .prepare("SELECT * FROM customers WHERE Email = ? OR MobileNumber = ?")
    .get(Email, MobileNumber);
  if (existing) {
    return res
      .status(400)
      .json({ message: "Email or Mobile number already registered" });
  }

  const hashed = bcrypt.hashSync(Password, 10);
  db.prepare(
    `
    INSERT INTO customers (
      MobileNumber, FirstName, LastName, Email, Gender, Country, Loyalty_Tier
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `
  ).run(MobileNumber, FirstName, LastName, Email, Gender, Country, "Blue");

  // Create login credentials table (if you want to separate auth info)
  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS customer_credentials (
      MobileNumber TEXT PRIMARY KEY,
      PasswordHash TEXT,
      FOREIGN KEY(MobileNumber) REFERENCES customers(MobileNumber)
    )
  `
  ).run();

  db.prepare(
    `INSERT OR REPLACE INTO customer_credentials (MobileNumber, PasswordHash) VALUES (?, ?)`
  ).run(MobileNumber, hashed);

  res.json({ message: "✅ Customer registered successfully" });
});

/**
 * 🟠 Login
 */
router.post("/login", (req, res) => {
  const { MobileNumber, Password } = req.body;

  if (!MobileNumber || !Password)
    return res.status(400).json({ message: "Missing required fields" });

  // Join customer info and credentials
  const user = db
    .prepare(
      `
      SELECT c.FirstName, c.LastName, c.Email, c.MobileNumber, c.Loyalty_Tier, cc.PasswordHash
      FROM customers c
      LEFT JOIN customer_credentials cc ON c.MobileNumber = cc.MobileNumber
      WHERE c.MobileNumber = ?
    `
    )
    .get(MobileNumber);

  if (!user) return res.status(404).json({ message: "Customer not found" });

  const valid = bcrypt.compareSync(Password, user.PasswordHash || "");
  if (!valid) return res.status(401).json({ message: "Invalid password" });

  const token = jwt.sign(
    { MobileNumber: user.MobileNumber, Email: user.Email },
    JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    name: `${user.FirstName} ${user.LastName}`,
    tier: user.Loyalty_Tier,
    message: "✅ Login successful",
  });
});

/**
 * 🟣 Get all customers
 */
router.get("/", (req, res) => {
  const customers = db
    .prepare(
      `SELECT 
*
       FROM customers
       ORDER BY created_at DESC`
    )
    .all();

  res.json(customers);
});

export default router;
