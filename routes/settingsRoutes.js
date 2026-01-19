import express from "express";
import db from "../models/winwayNew.js"; // path to your SQLite db.js

const router = express.Router();

// ✅ Get all settings
router.get("/", (req, res) => {
  try {
    const sql = `
      SELECT id, key, value, type, updatedAt
      FROM settings
      ORDER BY id ASC
    `;

    // Use callback-based query (like your example)
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching settings:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch settings",
          error: err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Settings fetched successfully",
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

// ✅ Get single setting by key
router.get("/:key", (req, res) => {
  try {
    const key = req.params.key;
    const setting = db.prepare("SELECT * FROM settings WHERE key = ?").get(key);

    if (!setting)
      return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: setting });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch setting" });
  }
});

// ✅ Update setting value
router.post("/", (req, res) => {
  try {
    const { key, value, type } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing key or value in request body",
      });
    }

    console.log(`💾 Saving setting: ${key} = ${value} (${type})`);

    const sql = `
      INSERT INTO settings (key, value, type, updatedAt)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        type = excluded.type,
        updatedAt = CURRENT_TIMESTAMP
    `;

    db.run(sql, [key, value, type], function (err) {
      if (err) {
        console.error("❌ Error saving setting:", err.message);
        return res.status(500).json({
          success: false,
          message: "Failed to save setting",
          error: err.message,
        });
      }

      console.log("✅ Setting saved successfully:", key);

      return res.status(200).json({
        success: true,
        message: "Setting saved successfully",
        key,
        value,
        type,
      });
    });
  } catch (error) {
    console.error("❌ Server error:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;
