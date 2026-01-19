// routes/userRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../config/sqlite.js";

const router = express.Router();
const JWT_SECRET = "winway_secret"; // move to .env later

// Register
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  const existing = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (existing) return res.status(400).json({ message: "Email already exists" });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)").run(
    name,
    email,
    hash
  );
  res.json({ message: "User registered successfully" });
});

// Login
router.post("/login", (req, res) => {
    console.log('hiii');
    
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);

  if (!user) return res.status(404).json({ message: "User not found" });
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, name: user.name });
});

export default router;
