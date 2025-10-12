import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

const router = express.Router();

// 🛡️ Fix for “self-signed certificate in certificate chain”
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ✅ Ensure uploads folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// 🔧 Create transporter (Gmail)
const createTransporter = () =>
  nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

/* ------------------------------------------------------------------
   🎨 Generate Eye-Catching HTML with Ticket Breakdown
-------------------------------------------------------------------*/
// =========================================================
// ✨ WinWay Personalized Email Template with Super Prizes
// =========================================================
const generateEmailTemplate = (
  name,
  tickets,
  winnings,
  tblData = [],
  superPrizes = {}
) => {
  const ticketRows = tblData.length
    ? tblData
        .map(
          (t, i) => `
        <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fcf8ff"};">
          <td style="border:1px solid #e0e0e0;padding:10px 14px;text-align:left;font-weight:500;color:#4a148c;">
            ${t.name}
          </td>
          <td style="border:1px solid #e0e0e0;padding:10px 14px;text-align:center;color:#111;">
            ${t.count}
          </td>
        </tr>`
        )
        .join("")
    : `<tr><td colspan="2" style="padding:12px;text-align:center;color:#777;">No ticket data available</td></tr>`;

  const prizeRows =
    superPrizes && Object.keys(superPrizes).length
      ? Object.entries(superPrizes)
          .map(
            ([name, value], index) => `
        <td align="center" valign="top"
          style="background:rgba(255,255,255,0.15);
                 border:1px solid rgba(255,255,255,0.25);
                 border-radius:10px;
                 color:#fff;
                 width:45%;
                 padding:14px;
                 margin:8px;">
          <div style="font-size:15px;font-weight:600;margin-bottom:4px;">${name}</div>
          <div style="font-size:16px;font-weight:700;color:#FFD700;">Rs. ${Number(
            value
          ).toLocaleString()}</div>
        </td>
        ${(index + 1) % 2 === 0 ? "</tr><tr>" : ""}`
          )
          .join("")
      : `<p style="color:#fff;font-size:14px;">No super prizes available this week.</p>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>WinWay Weekly Update</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body {
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background-color: #f4f3f9;
    margin: 0;
    padding: 0;
  }
.container {
  max-width: 680px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 6px 25px rgba(123,47,247,0.15),
              0 0 12px rgba(212,175,55,0.25); /* gold glow */
  border: 3px solid transparent;
  background-image: linear-gradient(#fff, #fff),
                    linear-gradient(135deg, #7b2ff7, #d4af37);
  background-origin: border-box;
  background-clip: content-box, border-box;
}

  /* ===== Header (Classic) ===== */
  .header {
    background: linear-gradient(135deg, #7b2ff7 0%, #f107a3 100%);
    color: #fff;
    text-align: center;
    padding: 45px 20px 35px;
  }
  .header h1 {
    font-size: 30px;
    margin: 0;
    text-transform: uppercase;
    font-weight: 800;
    letter-spacing: 1px;
  }

  /* ===== Intro / Highlight Section ===== */
  .content {
    padding: 35px 40px;
    color: #333;
    line-height: 1.7;
    text-align: center;
  }
  .tagline {
    background: #fff4cc;
    color: #7b2ff7;
    padding: 6px 14px;
    border-radius: 20px;
    font-weight: 600;
    display: inline-block;
    margin-bottom: 10px;
    font-size: 14px;
  }
  .highlight-box {
    background: linear-gradient(90deg, #7b2ff7 0%, #d4af37 100%);
    color: white;
    font-size: 18px;
    font-weight: 600;
    padding: 14px 24px;
    border-radius: 40px;
    display: inline-block;
    box-shadow: 0 3px 12px rgba(123,47,247,0.25);
    margin-bottom: 10px;
  }

  /* ===== Lottery Table ===== */
  .table-wrapper {
    display: flex;
    justify-content: center;
    margin: 15px 0 35px;
  }
  .ticket-table {
    width: 75%;
    border-collapse: collapse;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 3px 12px rgba(123,47,247,0.1);
  }
  .ticket-table th {
    background: linear-gradient(90deg, #7b2ff7 0%, #f107a3 100%);
    color: #fff;
    text-align: center;
    padding: 10px 14px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.3px;
  }
  .ticket-table td {
    border: 1px solid #e0e0e0;
    padding: 10px 14px;
    font-size: 14px;
  }

  /* ===== Winnings Section ===== */
  .stats-box {
    background: linear-gradient(145deg, #ffeb99, #d4af37);
    color: #3d0066;
    border-radius: 20px;
    padding: 25px;
    margin: 25px auto 30px;
    width: 85%;
    font-weight: 700;
    font-size: 20px;
    box-shadow: 0 3px 15px rgba(212,175,55,0.3);
    line-height: 1.6;
  }
  .stats-box strong {
    color: #000;
    font-size: 22px;
  }

  /* ===== Super Prizes ===== */
  .super-prize-section {
    background: linear-gradient(90deg, #7b2ff7 0%, #f107a3 100%);
    color: #fff;
    border-radius: 14px;
    text-align: center;
    margin-top: 40px;
    padding: 25px 20px;
    box-shadow: 0 3px 12px rgba(123,47,247,0.3);
  }
  .super-prize-title {
    color: #FFD700;
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 0.8px;
    margin-bottom: 16px;
  }

  /* ===== Footer ===== */
  .footer {
    background: #fafafa;
    text-align: center;
    padding: 22px;
    font-size: 13px;
    color: #777;
    border-top: 1px solid #eee;
  }
  .social-icons img {
    width: 22px;
    margin: 0 6px;
    opacity: 0.7;
  }
  .social-icons img:hover {
    opacity: 1;
  }

  @media only screen and (max-width: 600px) {
    .content { padding: 25px 20px; }
    .ticket-table { width: 100%; }
    .stats-box { width: 100%; font-size: 18px; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations 🎉</h1>
    </div>

    <div class="content">
      <div class="tagline">⭐ Customer of the Week</div>
      <h2>Dear ${name || "Valued Customer"},</h2>
      <p>We are delighted to recognize you as one of our most valued customer this week!</p>

      <div class="highlight-box">
        You’ve purchased <strong>${
          tickets || 0
        }</strong> total tickets this week
      </div>

      <p style="margin-bottom:20px;">Here’s your detailed ticket summary:</p>

      <div class="table-wrapper">
        <table class="ticket-table" align="center">
          <thead>
            <tr>
              <th>Lottery Type</th>
              <th>Tickets</th>
            </tr>
          </thead>
          <tbody>
            ${ticketRows}
          </tbody>
        </table>
      </div>

      <div class="stats-box">
        This week alone, you have won <strong>Rs. ${Number(
          winnings || 0
        ).toLocaleString()}/=</strong>
      </div>

      <p>
        Keep your luck rolling — every ticket gives you another chance at amazing rewards!  
        Don’t miss our <strong>Next Super Prizes</strong> below 🏆.
      </p>

      <div class="super-prize-section">
        <div class="super-prize-title">🏆 NEXT SUPER PRIZES 🏆</div>
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
          <tr>${prizeRows}</tr>
        </table>
      </div>

      <p style="margin-top:30px;">
        Warm regards,<br/>
        <strong>The WinWay Loyalty Team</strong><br/>
        <span style="font-size:13px;color:#777;">📞 0707884884 | 0722884884</span>
      </p>
    </div>

    <div class="footer">
      <div class="social-icons">
        <img src="https://cdn-icons-png.flaticon.com/512/733/733547.png" alt="Facebook" />
        <img src="https://cdn-icons-png.flaticon.com/512/2111/2111463.png" alt="Instagram" />
        <img src="https://cdn-icons-png.flaticon.com/512/733/733579.png" alt="Twitter" />
      </div>
      <p>© ${new Date().getFullYear()} WinWay (Pvt) Ltd. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
};

async function sendEmail(req, res, useTemplate = false) {
  try {
    const {
      to,
      subject,
      text,
      html,
      name,
      tickets,
      winnings,
      tblData,
      superPrizes, // ✅ new field
    } = req.body;

    if (!to)
      return res
        .status(400)
        .json({ success: false, error: "Recipient email (to) required." });

    // ✅ Parse JSON data
    const parsedTblData =
      typeof tblData === "string" ? JSON.parse(tblData) : tblData || [];
    const parsedSuperPrizes =
      typeof superPrizes === "string"
        ? JSON.parse(superPrizes)
        : superPrizes || {};

    const attachments =
      req.files?.map((f) => ({
        filename: path.basename(f.path),
        path: f.path,
      })) || [];

    const mailOptions = {
      from: `"WinWay " <${process.env.EMAIL_USER}>`,
      to,
      subject: subject || "WinWay Update",
      text: text || "",
      html: useTemplate
        ? generateEmailTemplate(
            name,
            tickets,
            winnings,
            parsedTblData,
            parsedSuperPrizes // ✅ pass to template
          )
        : html || undefined,
      attachments,
    };

    const transporter = createTransporter();
    const info = await transporter.sendMail(mailOptions);

    res.json({ success: true, message: "✅ Email sent successfully!" });
  } catch (err) {
    console.error("❌ Email send error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
}

/* ------------------------------------------------------------------
   🚀 Routes
-------------------------------------------------------------------*/
// ✅ Generic / Admin emails
router.post("/send", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, false)
);

// ✅ Customer emails (HTML template with table)
router.post("/sendToCustomer", upload.array("attachments"), (req, res) => {
  sendEmail(req, res, true);
});

export default router;
