import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import archiver from "archiver";

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
      weekEnd,
    );

    const htmlContentImage = genarateImageTemplate(
      name,
      tickets,
      winnings,
      parsedTblData,
      parsedSuperPrizes,
      weekStart,
      weekEnd,
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
  sendEmail(req, res, false),
);
router.post("/sendToCustomer", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, true),
);
// ---------------- ZIP ALL WEEKLY FILES & EMAIL ----------------
router.post("/all-weekly-files", async (req, res) => {
  try {
    const recipient = "kosala@winway.lk";
    const cc = "dharmapriya@thinkcube.com";

    const zipFileName = `Weekly_Files_${Date.now()}.zip`;
    const zipPath = path.join(__dirname, zipFileName);

    // 1️⃣ Create ZIP file
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    const files = fs.readdirSync(imageDir);

    files.forEach((file) => {
      const fullPath = path.join(imageDir, file);
      if (fs.statSync(fullPath).isFile()) {
        archive.file(fullPath, { name: file });
      }
    });

    await archive.finalize();

    // Wait until ZIP fully written
    await new Promise((resolve) => output.on("close", resolve));

    // 2️⃣ Send Email with ZIP attachment
    const transporter = await createTransporter();

    // await transporter.sendMail({
    //   from: `"WinWay" <${process.env.EMAIL_USER}>`,
    //   to: recipient,
    //   subject: "📦 Weekly Files Backup",
    //   text: "Attached is the complete weekly files backup.",
    //   attachments: [
    //     {
    //       filename: zipFileName,
    //       path: zipPath,
    //     },
    //   ],
    // });

    // 3️⃣ Delete ZIP after sending
    await transporter.sendMail({
      from: `"WinWay Operations" <${process.env.EMAIL_USER}>`,
      to: recipient,
      bcc : "chamika@winway.lk",
      cc: cc,
      subject: "Weekly Customer Files",
      html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>WinWay Weekly Customer Files</h2>
      
      <p>Dear Call Center Team,</p>

      <p>
        Please find attached the <strong>Weekly Customer Files ZIP</strong>.
      </p>

      <p>
        Kindly extract the files and ensure they are sent to the 
        <strong>relevant customers</strong> as per the provided details.
      </p>

      <p>
        Please complete the dispatch process at your earliest convenience
        and confirm once the files have been successfully delivered.
      </p>

      <br/>

      <p style="color:#555;">
        If you encounter any issues, please contact the WinWay Operations team.
      </p>

      <br/>

      <p>
        Best Regards,<br/>
        <strong>WinWay Operations Team</strong>
      </p>
    </div>
  `,
      attachments: [
        {
          filename: zipFileName,
          path: zipPath,
        },
      ],
    });

    fs.unlinkSync(zipPath);

    res.json({
      success: true,
      message: `📧 Weekly files ZIP sent to ${recipient}`,
    });
  } catch (err) {
    console.error("❌ Weekly ZIP email error:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
