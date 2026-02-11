import express from "express";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { fileURLToPath } from "url";

const router = express.Router();

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WEEKLY_IMAGES_FOLDER = path.join(__dirname, "..", "Weekly_Images");

// Ensure folder exists
if (!fs.existsSync(WEEKLY_IMAGES_FOLDER)) {
  fs.mkdirSync(WEEKLY_IMAGES_FOLDER, { recursive: true });
}

// ---------------- LIST IMAGES ----------------
// ---------------- LIST ALL FILES ----------------
router.get("/", async (req, res) => {
  try {
    const entries = await fs.promises.readdir(WEEKLY_IMAGES_FOLDER);

    const files = await Promise.all(
      entries.map(async (file) => {
        const fullPath = path.join(WEEKLY_IMAGES_FOLDER, file);
        const stats = await fs.promises.stat(fullPath);

        if (!stats.isFile()) return null; // skip folders

        return {
          name: file,
          size_bytes: stats.size,
          modified: stats.mtime,
          extension: path.extname(file).toLowerCase(),
        };
      })
    );

    const filteredFiles = files.filter(Boolean); // remove nulls

    res.json({
      total_files: filteredFiles.length,
      files: filteredFiles,
    });
  } catch (err) {
    console.error("Error listing files:", err);
    res.status(500).json({ message: "Failed to list files" });
  }
});


// ---------------- VIEW IMAGE ----------------
router.get("/view/:filename", (req, res) => {
  const filename = path.basename(req.params.filename); // 🔐 security
  const filePath = path.join(WEEKLY_IMAGES_FOLDER, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Image not found" });
  }

  res.sendFile(filePath);
});

// ---------------- DOWNLOAD IMAGE ----------------
router.get("/download/:filename", (req, res) => {
  const filename = path.basename(req.params.filename); // 🔐 security
  const filePath = path.join(WEEKLY_IMAGES_FOLDER, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Image not found" });
  }

  res.download(filePath);
});

// ---------------- DELETE IMAGE ----------------
router.delete("/:filename", (req, res) => {
  const filename = path.basename(req.params.filename); // 🔐 security
  const filePath = path.join(WEEKLY_IMAGES_FOLDER, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "Image not found" });
  }

  fs.unlinkSync(filePath);

  res.json({ success: true, message: "Image deleted" });
});

// ---------------- DOWNLOAD ZIP ----------------
router.post("/download-zip", (req, res) => {
  const { files } = req.body;

  if (!files || !files.length) {
    return res.status(400).json({ message: "No files selected" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=weekly_images_${Date.now()}.zip`
  );

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.pipe(res);

  files.forEach((file) => {
    const safeName = path.basename(file); // 🔐 security
    const filePath = path.join(WEEKLY_IMAGES_FOLDER, safeName);

    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: safeName });
    }
  });

  archive.finalize();
});




export default router;
