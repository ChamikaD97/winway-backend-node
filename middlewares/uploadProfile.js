import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "uploads/profiles";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const mobile = req.body.MobileNumber;

    if (!mobile) {
      return cb(new Error("MobileNumber is required"), null);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${mobile}${ext}`;

    // 🔁 Delete old image if exists (any extension)
    fs.readdirSync(uploadDir).forEach((f) => {
      if (f.startsWith(mobile + ".")) {
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

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

export default upload;
