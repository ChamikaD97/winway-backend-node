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

const createTransporter = async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "mail.kapital.lk",
    port: 587, // try STARTTLS first
    secure: false, // STARTTLS (not implicit SSL)
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  transporter.on("error", (err) => {
    console.error("❌ SMTP Transporter Error:", err);
  });

  return transporter;
};

const generateEmailTemplate = (
  name,
  tickets,
  winnings,
  tblData = [],
  superPrizes = {}
) => {
  // ✅ Sort ticket data (largest → smallest)
  const sortedTbl = [...tblData].sort((a, b) => b.count - a.count);
  const labels = sortedTbl.map((t) => t.name);
  const values = sortedTbl.map((t) => Number(t.count) || 0);

  // ✅ Color palette (shared between chart and legend)
  const colors = [
    "#7b2ff7",
    "#d4af37",
    "#f107a3",
    "#ffcc00",
    "#00bcd4",
    "#8bc34a",
    "#ff5722",
    "#9c27b0",
    "#03a9f4",
    "#cddc39",
  ];

  // ✅ Chart config (no legend, clean layout)
  const chartConfig = {
    type: "pie",
    data: {
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: "#fff",
          borderWidth: 2,
          offset: 4,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: { display: false },
        datalabels: { display: false },
      },
      layout: { padding: 15 },
      animation: { animateRotate: true, animateScale: true },
    },
  };

  // ✅ Chart image URL (smaller)
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&backgroundColor=white&width=250&height=250&format=png`;

  // ✅ Right-side legend (color left border)
  const rightLegend = labels
    .map(
      (label, i) => `
      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        background:${i % 2 === 0 ? "#fdfaff" : "#ffffff"};
        border-left:8px solid ${colors[i % colors.length]};
        border-radius:8px;
        margin-bottom:8px;
        padding:10px 16px;
        box-shadow:0 2px 6px rgba(0,0,0,0.06);
        font-weight:600;
        color:#222;
      ">
        <div style="
          flex:1;
          text-align:left;
          font-size:14px;
          letter-spacing:0.2px;
        ">
          ${label}
        </div>
        <div style="
          text-align:right;
          font-size:14px;
          font-weight:700;
          color:#444;
          min-width:40px;
        ">
          ${values[i]}
        </div>
      </div>
    `
    )
    .join("");

  // ✅ Super prize rows
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
          <div style="font-size:15px;font-weight:200;margin-bottom:4px;">${name}</div>
          <div style="font-size:16px;font-weight:200;color:#FFD700;">Rs. ${Number(
            value
          ).toLocaleString()}</div>
        </td>
        ${(index + 1) % 2 === 0 ? "</tr><tr>" : ""}`
          )
          .join("")
      : `<p style="color:#fff;font-size:14px;">No super prizes available this week.</p>`;

  // ✅ Full Email Template
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>WinWay Weekly Update</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body {
    font-family:'Segoe UI',Roboto,Arial,sans-serif;
    background-color:#f4f3f9;
    margin:0;padding:0;
  }
  .container {
    max-width:700px;margin:40px auto;
    background:#fff;border-radius:18px;overflow:hidden;
    box-shadow:0 6px 25px rgba(123,47,247,0.15),0 0 12px rgba(212,175,55,0.25);
    border:3px solid transparent;
    background-image:linear-gradient(#fff,#fff),linear-gradient(135deg,#7b2ff7,#d4af37);
    background-origin:border-box;background-clip:content-box,border-box;
  }
  .header {
    background:linear-gradient(135deg,#7b2ff7 0%,#f107a3 100%);
    color:#fff;text-align:center;padding:45px 20px 35px;
  }
  .header h1 {font-size:30px;margin:0;text-transform:uppercase;font-weight:800;}
  .content {padding:35px 40px;color:#333;line-height:1.7;text-align:center;}
  .highlight-box {
    background:linear-gradient(90deg,#7b2ff7 0%,#d4af37 100%);
    color:white;font-size:18px;font-weight:600;
    padding:14px 24px;border-radius:40px;display:inline-block;
    box-shadow:0 3px 12px rgba(123,47,247,0.25);margin-bottom:20px;
  }
  .chart-wrapper {
    display:flex;justify-content:center;align-items:center;
    flex-wrap:wrap;gap:20px;margin:20px 0;
  }
  .chart-section img {
    max-width:100%;border-radius:16px;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);
  }
  .legend-section {flex:1;min-width:220px;text-align:left;}
  .stats-box {
    background:linear-gradient(145deg,#ffeb99,#d4af37);
    color:#3d0066;border-radius:20px;padding:25px;
    margin:25px auto 30px;width:85%;font-weight:700;font-size:20px;
    box-shadow:0 3px 15px rgba(212,175,55,0.3);
  }
  .super-prize-section {
    background:linear-gradient(90deg,#7b2ff7 0%,#f107a3 100%);
    color:#fff;border-radius:14px;text-align:center;
    margin-top:40px;padding:25px 20px;
    box-shadow:0 3px 12px rgba(123,47,247,0.3);
  }
  .super-prize-title {color:#FFD700;font-size:20px;font-weight:700;margin-bottom:16px;}
  .footer {background:#fafafa;text-align:center;padding:22px;font-size:13px;color:#777;border-top:1px solid #eee;}
</style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎉 Congratulations 🎉</h1></div>
    <div class="content">
      <h2>Dear ${name || "Valued Customer"},</h2>
      <p>We are delighted to recognize you as one of our most valued customers this week!</p>

      <div class="highlight-box">
        You’ve purchased <strong>${
          tickets || 0
        }</strong> total tickets this week
      </div>

      <p style="margin-bottom:10px;">Here’s your weekly ticket breakdown:</p>

      <div class="chart-wrapper">
        <div class="chart-section">
          <img src="${chartUrl}" alt="Ticket Summary Chart" />
        </div>
        <div class="legend-section">
          ${rightLegend}
        </div>
      </div>

      <div class="stats-box">
        This week alone, you have won <strong>Rs. ${Number(
          winnings || 0
        ).toLocaleString()}/=</strong>
      </div>

      <!-- ✨ Motivational message -->
      <div style="
        border-radius:10px;
        padding:18px 25px;
        margin:25px auto;
        width:85%;
        color:#3d0066;
        font-size:15px;
        font-weight:500;
        line-height:1.7;
        box-shadow:0 2px 8px rgba(0,0,0,0.05);
      ">
        <p style="margin:0 0 10px 0;">
          We are truly grateful for your continued trust and support.<br/>
          We are honored to have you as part of the <strong>WIN WAY</strong> family.
        </p>
        <p style="margin:0;font-weight:600;color:#7b2ff7;">
          Don’t stop now
        </p>
        <p style="margin:0;font-weight:600;color:#7b2ff7;">
          Keep the momentum going and claim your next big win..!
         
        </p>
      </div>

      <!-- 🏆 Super Prize Section -->
      <div class="super-prize-section">
        <div class="super-prize-title">🏆 NEXT SUPER PRIZES 🏆</div>
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
          <tr>${prizeRows}</tr>
        </table>

        <!-- 🔘 Buy Now Button -->
       <!-- 🔘 Buy Now Button -->
<a href="https://www.winway.lk/"
   target="_blank"
   style="
     display: inline-flex;
     align-items: center;
     justify-content: center;
     background: linear-gradient(90deg, #7b2ff7 0%, #d4af37 100%);
     color: #fff;
     text-decoration: none;
     font-weight: 700;
     font-size: 14px;
     padding: 12px 32px;
     border-radius: 30px;
     box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
     transition: all 0.3s ease;
     white-space: nowrap;
     cursor: pointer;
     margin-top: 25px;
     letter-spacing: 0.3px;
   "
   onmouseover="this.style.opacity='0.9'; this.style.transform='scale(1.05)';"
   onmouseout="this.style.opacity='1'; this.style.transform='scale(1)';">
   Buy&nbsp;Now
</a>

<!-- ✅ Responsive scaling for mobile -->
<style>
@media only screen and (max-width: 480px) {
  a[href="https://www.winway.lk/"] {
    font-size: 13px !important;
    padding: 10px 26px !important;
    border-radius: 25px !important;
  }
}
</style>

      </div>

      <p style="margin-top:30px;">
        Warm regards,<br/>
        <strong>The WinWay Team</strong><br/>
        <span style="font-size:13px;color:#777;">📞 0707884884 | 0722884884</span>
      </p>
    </div>
    <div class="footer">
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

    const transporter = await createTransporter(); // ✅ must await here
await transporter.sendMail(mailOptions);


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
