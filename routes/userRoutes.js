// routes/userRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../models/winwayNew.js";

const router = express.Router();
const JWT_SECRET = "winway_secret"; // TODO: move to .env later

router.get("/all", (req, res) => {
  try {
    const sql = `
      SELECT *
      FROM users
     
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching users:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch users",
          error: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "users fetched successfully",
        data: rows,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

router.post("/register", (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields (name, email, password) are required",
      });
    }

    const hashedPassword = password;

    db.prepare(
      "INSERT INTO users (name, email, password) VALUES (?, ?, ?)"
    ).run(name, email, hashedPassword);

    // GENERATE TOKEN
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      message: "User registered successfully",
      token,
      name,
    });
  } catch (error) {
    console.log("❌ Registration error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // Find user
    const user = db
      .prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)")
      .get(email);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password)
      return res.status(500).json({ message: "User has no password hash" });

    // Compare password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token, name: user.name });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ============================================================================
// 🔴 DELETE ALL USERS — for development/testing only
// ============================================================================

router.delete("/clean", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM users").run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name='users'").run();

    return res.json({
      message: "All users deleted successfully",
      deletedCount: result.changes,
    });
  } catch (error) {
    console.error("Error deleting users:", error);
    return res.status(500).json({ message: "Failed to delete users" });
  }
});

export default router;
