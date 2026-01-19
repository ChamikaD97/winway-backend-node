import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const winwayLogo = path.join(__dirname, "logo.png");
const nlbLogo = path.join(__dirname, "nlb_logo.png");
const card = path.join(__dirname, "card.jpg");
const loyality = path.join(__dirname, "loyalty.png");
import {
  generateLoyaltDowngradeEmail,
  generateLoyaltyCustomeEmail,
  generateLoyaltySameEmail,
} from "../templates/emailTemplate.js";
import { generateLoyaltUpgradeEmail } from "../templates/emailTemplate.js";
import {
  generateLoyaltyWelcomeEmail,
  generateCardImage,
} from "../templates/emailTemplate.js";
// Helper: create attachment object only if file exists
const attach = (filepath, cidName) =>
  fs.existsSync(filepath)
    ? [{ filename: path.basename(filepath), path: filepath, cid: cidName }]
    : [];

// Final attachments list
const attachments = [
  ...attach(winwayLogo, "winwaylogo@cid"),
  ...attach(nlbLogo, "nlblogo@cid"),
  ...attach(card, "card@cid"),
  ...attach(loyality, "loyalty@cid"),
];

const router = express.Router();

// Allow TLS issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Ensure folders exist
const uploadDir = "uploads";
const imageDir = "loyality_images";
[uploadDir, imageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

// Multer storage
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

export const sendWelcomeEmail = async (req, res) => {
  try {
    const get = req.body.get ? (k) => req.body.get(k) : (k) => req.body[k];

    // Parse full customer object
    let customerData = {};
    try {
      customerData = JSON.parse(get("customerData"));
    } catch (e) {
      console.log("⚠ No or invalid customerData");
    }
    const getSubject = (subject) => {
      if (subject == "Same") {
        return "Your WIN WAY Current Tier Benefits Continue This Month";
      } else if (subject == "Upgraded") {
        return "Congratulations! Your WIN WAY Loyalty Tier Has Been Upgraded";
      } else if (subject == "Down") {
        return "Update on Your WIN WAY Loyalty Tier";
      } else if (subject == "loyalty_welcome") {
        return "Welcome to WIN WAY Loyalty Rewards Program";
      }
    };
    const to = get("to");
    const cc = get("cc");
    const number = get("Loyalty_Number");
    const name = get("name") || "Valued Customer";
    const type = get("type");
    const subject = getSubject(get("type"));

    if (!to) {
      const tier = customerData?.CustomerInfo?.Current_Loyalty_Tier || "-";

      const imgPath = await generateCardImage(name, customerData, tier, number);

      return res.json({
        success: true,
        message: "🖼️ No email found. Image generated instead.",
        cardImage: imgPath,
      });
    }
    
    let html = "";

    if (type === "loyalty_welcome") {
      html = generateLoyaltyWelcomeEmail(name, customerData, number);
    } else if (type === "Upgraded") {
      html = generateLoyaltUpgradeEmail(name, customerData, number);
    } else if (type === "Same") {
      html = generateLoyaltySameEmail(name, customerData, number);
    } else if (type === "Down") {
      html = generateLoyaltDowngradeEmail(name, customerData, number);
    } else {
      html = "<p>No template selected</p>";
    }

    // Logo paths

    const transporter = await createTransporter();

    await transporter.sendMail({
      from: `"WIN WAY" <${process.env.EMAIL_USER}>`, // Correct sender
      to,
      cc,
      subject,
      html,
      attachments,
    });

    return res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);
    return res.json({
      success: false,
      message: "Email failed",
      error: error.message,
    });
  }
};

const mapTemplate = (template = "", data = {}) => {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return data[key.trim()] ?? "";
  });
};

export const sendCustomeEmail = async (req, res) => {
  try {
    // Support FormData + JSON
    const get = req.body?.get ? (k) => req.body.get(k) : (k) => req.body[k];

    // ----------------------------
    // Parse customerData safely
    // ----------------------------
    let customerData = {};
    try {
      const rawCustomerData = get("customerData");
      if (rawCustomerData) {
        customerData =
          typeof rawCustomerData === "string"
            ? JSON.parse(rawCustomerData)
            : rawCustomerData;
      }
    } catch (e) {
      console.log("⚠ Invalid customerData JSON");
      customerData = {};
    }

    // ----------------------------
    // Required fields
    // ----------------------------
    const to = get("to");
    if (!to) {
      return res.json({
        success: false,
        message: "Recipient email (to) is required",
      });
    }

    const cc = get("cc");
    const number = get("number");
    const name = get("name") || "Valued Customer";
    const type = get("type");
    const subject = get("subject") || "WIN WAY Notification";
    const bodyTemplate = get("body") || "";
    const title = get("title") || "";

    // ----------------------------
    // 🔥 MAP TEMPLATE VARIABLES
    // ----------------------------
    const mappedBody = mapTemplate(bodyTemplate, customerData);

    let html = "";

    switch (type) {
      case "loyalty_welcome":
        html = generateLoyaltyCustomeEmail(
          name,
          mappedBody, // ✅ mapped body
          title,
          customerData, // ✅ object (not string)
          number
        );
        break;

      default:
        html = "<p>No template selected</p>";
        break;
    }

    // ----------------------------
    // Send email
    // ----------------------------
    const transporter = await createTransporter();

    await transporter.sendMail({
      from: `"WIN WAY" <${process.env.EMAIL_USER}>`,
      to,
      cc,
      subject,
      html,
      attachments, // assuming this exists globally
    });

    return res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("❌ EMAIL ERROR:", error);
    return res.json({
      success: false,
      message: "Email failed",
      error: error.message,
    });
  }
};

router.post("/send-loyalty", upload.none(), sendWelcomeEmail);

router.post("/custome-email", upload.none(), sendCustomeEmail);

export default router;
