import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// ✅ Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------- SAVE NO EMAIL CSV ----------------
router.post("/save-no-email-csv", async (req, res) => {
  try {
    const { fileName, content } = req.body;

    if (!fileName || !content) {
      return res.status(400).json({ message: "Missing file data" });
    }

    const SAVE_FOLDER = path.join(__dirname, "..", "Weekly_Images");

    // Ensure folder exists
    await fs.promises.mkdir(SAVE_FOLDER, { recursive: true });

    const safeName = path.basename(fileName); // 🔐 Prevent path traversal
    const filePath = path.join(SAVE_FOLDER, safeName);

    await fs.promises.writeFile(filePath, content, "utf8");

    res.json({
      success: true,
      message: "CSV saved successfully",
      file: safeName,
    });
  } catch (err) {
    console.error("CSV Save Error:", err);
    res.status(500).json({ message: "Failed to save CSV" });
  }
});

export default router;
