// routes/settingsRoutes.js
import express from "express";
import { db } from "../config/settings.js";

const router = express.Router();

/**
 * @route GET /api/settings
 * @desc Get all settings
 */
router.get("/", (req, res) => {
  try {
    const settings = db.prepare("SELECT * FROM settings ORDER BY key ASC").all();
    res.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

/**
 * @route POST /api/settings
 * @desc Create or update a setting
 */
router.post("/", (req, res) => {
  try {
    const { key, value, type = "number" } = req.body;
    if (!key || value === undefined) {
      return res.status(400).json({ message: "Key and value are required" });
    }

    const exists = db.prepare("SELECT * FROM settings WHERE key = ?").get(key);

    if (exists) {
      db.prepare(
        "UPDATE settings SET value = ?, type = ?, updatedAt = CURRENT_TIMESTAMP WHERE key = ?"
      ).run(value, type, key);
      console.log(`📝 Updated setting: ${key}`);
    } else {
      db.prepare("INSERT INTO settings (key, value, type) VALUES (?, ?, ?)").run(
        key,
        value,
        type
      );
      console.log(`➕ Added new setting: ${key}`);
    }

    res.json({ message: "Setting saved successfully" });
  } catch (err) {
    console.error("Error saving setting:", err);
    res.status(500).json({ message: "Failed to save setting" });
  }
});

export default router;
