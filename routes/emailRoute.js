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

  // ✅ Shared colors
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

  // ✅ Chart config (NO labels inside chart)
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
        datalabels: { display: false },
        tooltip: { enabled: false },
      },
      animation: { animateRotate: true, animateScale: true },
      layout: { padding: 15 },
    },
  };

  // ✅ QuickChart image URL
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&backgroundColor=white&width=250&height=250&format=png`;

  // ✅ Legend (values on right only)
  const rightLegend = labels
    .map(
      (label, i) => `
        <tr>
          <td style="border-left:6px solid ${colors[i % colors.length]};
                     padding:6px 10px;
                     font-family:Arial, sans-serif;
                     font-size:14px;
                     color:#333;">
            ${label}
          </td>
          <td align="right"
              style="padding:6px 10px;
                     font-family:Arial, sans-serif;
                     font-size:14px;
                     font-weight:bold;
                     color:#555;">
            ${values[i]}
          </td>
        </tr>`
    )
    .join("");

  // ✅ Super prize section
  const prizeRows =
    superPrizes && Object.keys(superPrizes).length
      ? Object.entries(superPrizes)
          .map(
            ([name, value], i) => `
              <td width="48%" valign="top" align="center"
                  style="background:rgba(255,255,255,0.1);
                         border:1px solid rgba(255,255,255,0.25);
                         border-radius:8px;
                         color:#fff;
                         padding:12px;
                         margin:6px;
                         font-family:Arial, sans-serif;">
                <div style="font-size:15px;">${name}</div>
                <div style="font-size:16px;font-weight:bold;color:#FFD700;">
                  Rs. ${Number(value).toLocaleString()}
                </div>
              </td>${(i + 1) % 2 === 0 ? "</tr><tr>" : ""}`
          )
          .join("")
      : `<p style="color:#fff;font-size:14px;">No super prizes available this week.</p>`;

  const year = new Date().getFullYear();

  // ✅ Final HTML
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width" />
</head>
<body style="margin:0;padding:0;background:#f4f3f9;font-family:Arial, sans-serif;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table role="presentation" width="700" border="0" cellspacing="0" cellpadding="0"
               style="background:#ffffff;border-radius:18px;overflow:hidden;
                      box-shadow:0 6px 25px rgba(123,47,247,0.15);
                      border:3px solid #7b2ff7;">
          
          <!-- ===== Header (Gradient with VML for Outlook) ===== -->
          <tr>
            <td align="center" style="padding:0;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
                      style="width:700px;height:120px;">
                <v:fill type="gradient" color="#7b2ff7" color2="#f107a3" angle="135" />
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <div style="background:linear-gradient(135deg,#7b2ff7,#f107a3);
                          border-radius:18px 18px 0 0;
                          padding:35px 20px 25px;">
                <h1 style="color:#fff;font-size:30px;margin:0;text-transform:uppercase;font-weight:800;">
                  🎉 CONGRATULATIONS 🎉
                </h1>
              </div>
              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- ===== Main Content ===== -->
          <tr>
            <td align="center" style="padding:35px 40px 20px;color:#333;line-height:1.6;">
              <h2 style="margin:0;font-weight:bold;">Dear ${
                name || "Valued Customer"
              },</h2>
              <p style="margin:10px 0 20px;">
                We are delighted to recognize you as one of our most valued customers this week!
              </p>

              <!-- Highlight -->
              <div style="background:linear-gradient(90deg,#7b2ff7 0%,#d4af37 100%);
                          color:#fff;font-size:18px;font-weight:600;
                          padding:14px 24px;border-radius:40px;
                          display:inline-block;margin-bottom:25px;">
                You’ve purchased <strong>${
                  tickets || 0
                }</strong> total tickets this week
              </div>

              <p>Here’s your weekly ticket breakdown:</p>
            </td>
          </tr>

          <!-- ===== Chart + Legend ===== -->
          <tr>
            <td align="center" style="padding:0 30px 20px;">
              <table role="presentation" width="90%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" width="50%">
                    <img src="${chartUrl}" width="250" height="250"
                         style="border-radius:12px;display:block;border:0;"
                         alt="Ticket Chart" />
                  </td>
                  <td width="50%" valign="top">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                      ${rightLegend}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== Winnings Box ===== -->
          <tr>
            <td align="center" style="padding:25px;">
              <div style="background:linear-gradient(145deg,#ffeb99,#d4af37);
                          color:#3d0066;border-radius:20px;
                          padding:25px;width:85%;font-weight:700;font-size:20px;">
                This week alone, you have won <strong>Rs. ${Number(
                  winnings || 0
                ).toLocaleString()}/=</strong>
              </div>
            </td>
          </tr>

          <!-- ===== Motivational Text ===== -->
          <tr>
            <td align="center" style="padding:20px 40px 10px;">
              <div style="border-radius:10px;padding:18px 25px;width:85%;
                          color:#3d0066;font-size:15px;font-weight:500;
                          line-height:1.7;background:#f9f7ff;">
                <p style="margin:0 0 10px;">
                  We are truly grateful for your continued trust and support.<br/>
                  We are honored to have you as part of the <strong>WIN WAY</strong> family.
                </p>
                <p style="margin:0;font-weight:600;color:#7b2ff7;">
                  Don’t stop now – keep the momentum going and claim your next big win..!
                </p>
              </div>
            </td>
          </tr>

          <!-- ===== Super Prize Section ===== -->
          <tr>
            <td align="center" style="padding:30px 20px;">
              <!--[if gte mso 9]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false"
                      style="width:700px;height:auto;">
                <v:fill type="gradient" color="#7b2ff7" color2="#f107a3" angle="90"/>
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <div style="background:linear-gradient(90deg,#7b2ff7,#f107a3);
                          border-radius:14px;text-align:center;color:#fff;padding:25px 20px;">
                <div style="color:#FFD700;font-size:20px;font-weight:700;margin-bottom:16px;">
                  🏆 NEXT SUPER PRIZES 🏆
                </div>
                <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" width="90%">
                  <tr>${prizeRows}</tr>
                </table>

                <a href="https://www.winway.lk/" target="_blank"
                   style="display:inline-block;
                          background:linear-gradient(90deg,#7b2ff7 0%,#d4af37 100%);
                          color:#fff;text-decoration:none;
                          font-weight:700;font-size:14px;
                          padding:12px 32px;border-radius:30px;
                          margin-top:25px;letter-spacing:0.3px;">
                  Buy&nbsp;Now
                </a>
              </div>
              <!--[if gte mso 9]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- ===== Footer ===== -->
          <tr>
            <td align="center"
                style="background:#fafafa;text-align:center;
                       padding:22px;font-size:13px;color:#777;
                       border-top:1px solid #eee;">
              © ${year} WinWay (Pvt) Ltd. All rights reserved.<br/>
              📞 0707884884 | 0722884884
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
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
