import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/promotions";

// Ensure folder exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const { promotion_code } = req.body;

    if (!promotion_code) {
      return cb(new Error("promotion_code is required"), null);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${promotion_code}${ext}`;

    // 🔁 delete old image if exists
    fs.readdirSync(uploadDir).forEach((f) => {
      if (f.startsWith(promotion_code + ".")) {
        fs.unlinkSync(path.join(uploadDir, f));
      }
    });

    cb(null, filename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files allowed"), false);
};

const promotionUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter,
});

export default promotionUpload;
