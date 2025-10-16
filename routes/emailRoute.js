import express from "express";
import multer from "multer";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ✅ Ensure uploads + image folders exist
const uploadDir = "uploads";
const imageDir = "personalized_images";
[uploadDir, imageDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "_" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

// =============================================================
// 📨 Nodemailer Transporter
// =============================================================
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

// =============================================================
// 🖼️ HTML → Image Converter (Puppeteer)
// =============================================================
async function htmlToImage(html, outputPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  await page.setViewport({ width: 900, height: 1200 });
  await page.screenshot({ path: outputPath, type: "png", fullPage: true });
  await browser.close();
}

// =============================================================
// 📩 Email Template Generator
// =============================================================
const generateEmailTemplate = (
  name,
  tickets,
  winnings,
  tblData = [],
  superPrizes = {},
  weekStart = "",
  weekEnd = ""
) => {
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const formattedWeek =
    weekStart && weekEnd
      ? `${formatDate(weekStart)} – ${formatDate(weekEnd)}`
      : "";

  const sortedTbl = [...tblData].sort((a, b) => b.count - a.count);
  const labels = sortedTbl.map((t) => t.name);
  const values = sortedTbl.map((t) => Number(t.count) || 0);

  const colors = [
    "#ff5722",
    "#9c27b0",
    "#00bcd4",
    "#ff9800",
    "#4caf50",
    "#e91e63",
    "#2196f3",
    "#cddc39",
  ];

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

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&backgroundColor=white&width=250&height=250&format=png`;

  const rightLegend = labels
    .map(
      (label, i) => `
      <tr>
        <td colspan="2" style="
          padding:8px 12px;
          margin-bottom:6px;
          background:linear-gradient(90deg, ${colors[i % colors.length]} 0%, ${
        colors[i % colors.length]
      }40 10%, rgba(255,255,255,0) 70%);
          border-radius:8px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#222;font-weight:300;text-align:left;">
                ${label}
              </td>
              <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:500;color:#444;text-align:right;">
                ${values[i]}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  // ✅ Prizes sorted by highest value
  const sortedPrizes = Object.entries(superPrizes || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );
  const prizeRows = sortedPrizes.length
    ? sortedPrizes
        .map(
          ([name, value], i) => `
          <td width="48%" valign="top" align="center"
              style="background:linear-gradient(90deg,#7b2ff7,#f107a3);
                     border:1px solid rgba(255,255,255,0.25);
                     border-radius:10px;
                     color:#fff;padding:14px 18px;
                     font-family:Arial,sans-serif;">
            <table width="100%">
              <tr>
                <td align="center" colspan="2" style="padding-bottom:8px;">
                  <div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${name}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="left" valign="middle" style="padding-right:8px;">
                  <div style="font-size:16px;font-weight:700;color:#FFD700;">Rs. ${Number(
                    value
                  ).toLocaleString()}</div>
                </td>
                <td align="right" valign="middle">
                  <a href="https://www.winway.lk/"
                     style="display:inline-block;background:linear-gradient(135deg,#ffd740 0%,#ff4081 100%);
                            color:#fff;text-decoration:none;font-weight:700;font-size:12px;
                            padding:4px 12px;border-radius:20px;box-shadow:0 3px 8px rgba(255,64,129,0.25);">
                    Buy&nbsp;Now
                  </a>
                </td>
              </tr>
            </table>
          </td>
          ${
            i % 2 === 1
              ? "</tr><tr><td colspan='2' height='12'></td></tr><tr>"
              : "<td width='4%'>&nbsp;</td>"
          }`
        )
        .join("")
    : `<p style="color:#fff;font-size:14px;">No super prizes available this week.</p>`;

  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f3f9;font-family:Arial,sans-serif;">
  <table width="100%" role="presentation">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table width="700" style="background:#fff;border-radius:18px;box-shadow:0 6px 25px rgba(123,47,247,0.15);border:3px solid #7b2ff7;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:0;">
              <div style="background:linear-gradient(135deg,#7b2ff7,#f107a3);border-radius:18px 18px 0 0;padding:22px 30px;">
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
                      <img src="cid:winwaylogo@cid" width="70" height="70" style="border:0;border-radius:8px;">
                    </td>
                    <td align="center">
                      <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800;">Weekly Summary</h1>
                    </td>
                    <td width="70">&nbsp;</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td align="center" style="padding:35px 40px;color:#333;">
              <h2 style="margin:0;font-weight:600;">${
                name || "Valued Customer"
              }</h2>
              <p style="margin:12px 0;font-size:16px;">
                We Are Delighted To Recognize You As One Of Our Most Valued Customers ${
                  formattedWeek
                    ? `For The Week Of <strong>${formattedWeek}</strong>`
                    : "This Week"
                }!
              </p>
              <div style="background:linear-gradient(90deg,#7b2ff7,#d4af37);color:#fff;
                          font-size:17px;font-weight:600;padding:12px 22px;border-radius:40px;margin-bottom:25px;">
                You’ve Purchased <strong>${Number(
                  tickets
                ).toLocaleString()}</strong> Total Tickets This Week
              </div>
              <p style="font-size:15px;color:#000;">Here’s Your Weekly Purchase Summary</p>
            </td>
          </tr>

          <!-- Chart + Legend -->
          <tr>
            <td align="center" style="padding:0 30px 20px;">
              <table width="90%" style="margin:auto;border:2px solid #e0d7ff;border-radius:14px;">
                <tr>
                  <td align="center" width="55%" style="padding:16px;">
                    <img src="${chartUrl}" width="280" height="280" style="border-radius:12px;">
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

          <!-- Winnings -->
          <tr>
            <td align="center" style="padding:25px;">
              <div style="background:linear-gradient(145deg,#ffeb99,#d4af37);color:#3d0066;
                          border-radius:20px;padding:20px 25px;width:85%;font-weight:700;font-size:19px;">
                This Week Alone, You Have Won <strong>Rs. ${Number(
                  winnings || 0
                ).toLocaleString()}/=</strong>
              </div>
            </td>
          </tr>

          <!-- Prizes -->
          <tr>
            <td align="center" style="padding:25px 20px;">
              <div style="background:linear-gradient(90deg,#7b2ff7,#f107a3);border-radius:14px;color:#fff;padding:25px;">
                <div style="color:#FFD700;font-size:20px;font-weight:700;margin-bottom:14px;">🏆 NEXT SUPER PRIZES 🏆</div>
                <table width="95%" align="center"><tr>${prizeRows}</tr></table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0;margin:0;">
              <table width="100%" style="background:#fafafa;border-top:1px solid #eee;">
                <tr>
                  <td align="center" style="padding:18px 30px;">
                    <table width="700" style="max-width:700px;margin:auto;">
                      <tr>
                        <td align="left" style="font-size:13px;color:#777;">
                          © ${year} ThinkCube Systems (Pvt) Ltd. All rights reserved.<br/>
                          📞 0707884884 | 0722884884
                        </td>
                        <td align="right" width="60">
                          <img src="cid:nlblogo@cid" width="55" height="55" style="border-radius:8px;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
const genarateImageTemplate = (
  name,
  tickets,
  winnings,
  tblData = [],
  superPrizes = {},
  weekStart = "",
  weekEnd = ""
) => {
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";
  const formattedWeek =
    weekStart && weekEnd
      ? `${formatDate(weekStart)} – ${formatDate(weekEnd)}`
      : "";

  const sortedTbl = [...tblData].sort((a, b) => b.count - a.count);
  const labels = sortedTbl.map((t) => t.name);
  const values = sortedTbl.map((t) => Number(t.count) || 0);

  const colors = [
    "#ff5722",
    "#9c27b0",
    "#00bcd4",
    "#ff9800",
    "#4caf50",
    "#e91e63",
    "#2196f3",
    "#cddc39",
  ];

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

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}&backgroundColor=white&width=250&height=250&format=png`;

  const rightLegend = labels
    .map(
      (label, i) => `
      <tr>
        <td colspan="2" style="
          padding:8px 12px;
          margin-bottom:6px;
          background:linear-gradient(90deg, ${colors[i % colors.length]} 0%, ${
        colors[i % colors.length]
      }40 10%, rgba(255,255,255,0) 70%);
          border-radius:8px;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-family:Arial,sans-serif;font-size:14px;color:#222;font-weight:300;text-align:left;">
                ${label}
              </td>
              <td style="font-family:Arial,sans-serif;font-size:14px;font-weight:500;color:#444;text-align:right;">
                ${values[i]}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  // ✅ Prizes sorted by highest value
  const sortedPrizes = Object.entries(superPrizes || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );
  const prizeRows = sortedPrizes.length
    ? sortedPrizes
        .map(
          ([name, value], i) => `
          <td width="48%" valign="top" align="center"
              style="background:linear-gradient(90deg,#7b2ff7,#f107a3);
                     border:1px solid rgba(255,255,255,0.25);
                     border-radius:10px;
                     color:#fff;padding:14px 18px;
                     font-family:Arial,sans-serif;">
            <table width="100%">
              <tr>
                <td align="center" colspan="2" style="padding-bottom:8px;">
                  <div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${name}
                  </div>
                </td>
              </tr>
              <tr>
                <td align="left" valign="middle" style="padding-right:8px;">
                  <div style="font-size:16px;font-weight:700;color:#FFD700;">Rs. ${Number(
                    value
                  ).toLocaleString()}</div>
                </td>
                <td align="right" valign="middle">
                  <a href="https://www.winway.lk/"
                     style="display:inline-block;background:linear-gradient(135deg,#ffd740 0%,#ff4081 100%);
                            color:#fff;text-decoration:none;font-weight:700;font-size:12px;
                            padding:4px 12px;border-radius:20px;box-shadow:0 3px 8px rgba(255,64,129,0.25);">
                    Buy&nbsp;Now
                  </a>
                </td>
              </tr>
            </table>
          </td>
          ${
            i % 2 === 1
              ? "</tr><tr><td colspan='2' height='12'></td></tr><tr>"
              : "<td width='4%'>&nbsp;</td>"
          }`
        )
        .join("")
    : `<p style="color:#fff;font-size:14px;">No super prizes available this week.</p>`;

  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f3f9;font-family:Arial,sans-serif;">
  <table width="100%" role="presentation">
    <tr>
      <td align="center" style="padding:30px 0;">
        <table width="700" style="background:#fff;border-radius:18px;box-shadow:0 6px 25px rgba(123,47,247,0.15);border:3px solid #7b2ff7;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding:0;">
              <div style="background:linear-gradient(135deg,#7b2ff7,#f107a3);border-radius:18px 18px 0 0;padding:22px 30px;">
                <table width="100%">
                  <tr>
                    
                    <td align="center">
                      <h1 style="color:#fff;font-size:28px;margin:0;font-weight:800;">Weekly Summary</h1>
                    </td>
                    <td width="70">&nbsp;</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td align="center" style="padding:35px 40px;color:#333;">
              <h2 style="margin:0;font-weight:600;">${
                name || "Valued Customer"
              }</h2>
              <p style="margin:12px 0;font-size:16px;">
                We Are Delighted To Recognize You As One Of Our Most Valued Customers ${
                  formattedWeek
                    ? `For The Week Of <strong>${formattedWeek}</strong>`
                    : "This Week"
                }!
              </p>
              <div style="background:linear-gradient(90deg,#7b2ff7,#d4af37);color:#fff;
                          font-size:17px;font-weight:600;padding:12px 22px;border-radius:40px;margin-bottom:25px;">
                You’ve Purchased <strong>${Number(
                  tickets
                ).toLocaleString()}</strong> Total Tickets This Week
              </div>
              <p style="font-size:15px;color:#000;">Here’s Your Weekly Purchase Summary</p>
            </td>
          </tr>

          <!-- Chart + Legend -->
          <tr>
            <td align="center" style="padding:0 30px 20px;">
              <table width="90%" style="margin:auto;border:2px solid #e0d7ff;border-radius:14px;">
                <tr>
                  <td align="center" width="55%" style="padding:16px;">
                    <img src="${chartUrl}" width="280" height="280" style="border-radius:12px;">
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

          <!-- Winnings -->
          <tr>
            <td align="center" style="padding:25px;">
              <div style="background:linear-gradient(145deg,#ffeb99,#d4af37);color:#3d0066;
                          border-radius:20px;padding:20px 25px;width:85%;font-weight:700;font-size:19px;">
                This Week Alone, You Have Won <strong>Rs. ${Number(
                  winnings || 0
                ).toLocaleString()}/=</strong>
              </div>
            </td>
          </tr>

          <!-- Prizes -->
          <tr>
            <td align="center" style="padding:25px 20px;">
              <div style="background:linear-gradient(90deg,#7b2ff7,#f107a3);border-radius:14px;color:#fff;padding:25px;">
                <div style="color:#FFD700;font-size:20px;font-weight:700;margin-bottom:14px;">🏆 NEXT SUPER PRIZES 🏆</div>
                <table width="95%" align="center"><tr>${prizeRows}</tr></table>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0;margin:0;">
              <table width="100%" style="background:#fafafa;border-top:1px solid #eee;">
                <tr>
                  <td align="center" style="padding:18px 30px;">
                    <table width="700" style="max-width:700px;margin:auto;">
                      <tr>
                        <td align="left" style="font-size:13px;color:#777;">
                          © ${year} ThinkCube Systems (Pvt) Ltd. All rights reserved.<br/>
                          📞 0707884884 | 0722884884
                        </td>
                       
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
// =============================================================
// 📤 Send Email or Generate Image
// =============================================================
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

    // 🧩 If no email, generate an image instead
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

// =============================================================
// 🚀 Routes
// =============================================================
router.post("/send", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, false)
);
router.post("/sendToCustomer", upload.array("attachments"), (req, res) =>
  sendEmail(req, res, true)
);

export default router;
