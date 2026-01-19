import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import {
  generateEmailTemplate,
  htmlToImage,
} from "../templates/emailTemplate.js";

import { genarateImageTemplate } from "../templates/imageTemplates.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ✅ Ensure uploads + image folders exist
const uploadDir = "uploads";
const imageDir = "Weekly_Images";
[uploadDir, imageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });
const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "mail.kapital.lk",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  transporter.on("error", (err) => console.error("❌ SMTP Error:", err));
  return transporter;
};

async function sendEmail(req, res, useTemplate = false) {
  try {
    const {
      to,
      cc,
      subject,
      text,
      html,
      name,
      tickets,
      winnings,
      tblData,
      superPrizes,
      weekStart,
      weekEnd,
    } = req.body;

    const parsedTblData =
      typeof tblData === "string" ? JSON.parse(tblData) : tblData || [];
    const parsedSuperPrizes =
      typeof superPrizes === "string"
        ? JSON.parse(superPrizes)
        : superPrizes || {};

    // ✅ Local logos
    const winwayLogo = path.join(__dirname, "logo.png");
    const nlbLogo = path.join(__dirname, "nlb_logo.png");

    // ✅ Generate the HTML content
    const htmlContent = generateEmailTemplate(
      name,
      tickets,
      winnings,
      parsedTblData,
      parsedSuperPrizes,
      weekStart,
      weekEnd
    );

    const htmlContentImage = genarateImageTemplate(
      name,
      tickets,
      winnings,
      parsedTblData,
      parsedSuperPrizes,
      weekStart,
      weekEnd
    );

    if (!to || to.trim() === "") {
      const fileName = `${name.replace(/\s+/g, "_")}_${Date.now()}.png`;
      const outputPath = path.join(imageDir, fileName);
      await htmlToImage(htmlContentImage, outputPath);
      return res.json({
        success: true,
        message: "🖼️ No email found. Image generated instead.",
        imagePath: outputPath,
      });
    }

    // ✅ Prepare attachments
    const attachments = [
      ...(fs.existsSync(winwayLogo)
        ? [{ filename: "logo.png", path: winwayLogo, cid: "winwaylogo@cid" }]
        : []),
      ...(fs.existsSync(nlbLogo)
        ? [{ filename: "nlb_logo.png", path: nlbLogo, cid: "nlblogo@cid" }]
        : []),
    ];

    // ✅ Send Email Normally
    const transporter = await createTransporter();
    await transporter.sendMail({
      from: `"WinWay" <${process.env.EMAIL_USER}>`,
      to,
      cc,
      subject: subject || "WinWay Weekly Summary",
      html: htmlContent,
      attachments,
    });

    res.json({ success: true, message: "✅ Email sent successfully!" });
  } catch (err) {
    console.error("❌ Email send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

router.post("/send", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, false)
);
router.post("/sendToCustomer", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, true)
);

export default router;
