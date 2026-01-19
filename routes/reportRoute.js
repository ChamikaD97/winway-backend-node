// routes/salesReportImage.js (ESM)
import express from "express";
import puppeteer from "puppeteer";

const router = express.Router();

const lotteryKeys = [
  ["HADA", "Handahana"],
  ["ADA", "Ada Sampatha"],
  ["DANA", "Dhana Nidhanaya"],
  ["DRAW", "Govisetha"],
  ["MAHA", "Mahajana Sampatha"],
  ["mgap", "Mega Power"],
  ["Dinu", "Jaya"],
  ["SUBA", "Suba Dawasak"],
];

// ---------- shared helpers ----------
const nf = (n) => (n == null ? "0" : Number(n).toLocaleString("en-LK"));

const resolveFullName = (shortName = "") => {
  const prefix = String(shortName)
    .replace(/\d{4}$/, "")
    .toUpperCase();
  const match = lotteryKeys.find(([key]) =>
    prefix.startsWith(key.toUpperCase())
  );
  return match ? match[1] : shortName;
};

const parseDT = (r) => {
  const d = r["Last Sale Date"] || "1970-01-01";
  const t = r["Last Sale Time"] || "00:00";
  const iso = `${d}T${t}:00`;
  const x = new Date(iso);
  return isNaN(x.getTime()) ? new Date("1970-01-01T00:00:00") : x;
};

const formatLastSaleTime = (dateStr, timeStr) => {
  if (!timeStr && !dateStr) return "-";
  const d = new Date(`${dateStr || "1970-01-01"}T${timeStr || "00:00"}:00`);
  if (isNaN(d.getTime())) return timeStr || "-";
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const svgLogo = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='40'>
     <text x='0' y='28' font-family='Segoe UI, Arial' font-size='24' fill='#1976D2'>WinWay</text>
   </svg>`
);

// ---------- CLASSIC template ----------
function buildHTMLClassic({ results, summary }) {
  const totalFiles = summary.total_files ?? results.length;
  const totalSales =
    summary.total_sales ??
    results.reduce((s, r) => s + (Number(r["Sales Count"]) || 0), 0);
  const latestRow = [...results].sort((a, b) => parseDT(b) - parseDT(a))[0];
  const latestDate = latestRow?.["Last Sale Date"] || "-";

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>WinWay Last Sale Report</title>
      <style>
        body { font-family:'Segoe UI',sans-serif; background:#f8f9fa; padding:40px; color:#222; }
        h1{ text-align:center; color:#1976D2; margin-bottom:8px; }
        h3{ text-align:center; color:#555; font-weight:normal; margin:0 0 25px; }
        .summary{ display:flex; justify-content:space-between; margin-bottom:20px; background:#fff; border:1px solid #ddd; border-radius:8px; padding:10px 20px; font-size:17px; color:#333; }
        table{ width:100%; border-collapse:collapse; font-size:16px; margin-top:10px; background:#fff; }
        th,td{ padding:10px 14px; border:1px solid #ddd; text-align:center; }
        th{ background:#1976D2; color:#fff; }
        tr:nth-child(even){ background:#f2f2f2; }
        footer{ text-align:right; margin-top:25px; color:#777; font-size:14px; }
      </style>
    </head>
    <body>
      <h1>WinWay Sales Summary Report</h1>
      <h3>${latestDate}</h3>

      <div class="summary">
        <div><strong>Total Lotteries:</strong> ${nf(totalFiles)}</div>
        <div><strong>Total Sales:</strong> ${nf(totalSales)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Draw No</th>
            <th>Lottery Name</th>
            <th>Last Sale Time</th>
            <th>Sales Count</th>
          </tr>
        </thead>
        <tbody>
          ${results
            .map((d) => {
              const raw = d["Lottery Name"] || "-";
              const drawNo = (String(raw).match(/(\d{4})$/) || [, "-"])[1];
              const fullName = resolveFullName(raw);
              const niceTime = formatLastSaleTime(
                d["Last Sale Date"],
                d["Last Sale Time"]
              );
              return `
                <tr>
                  <td>${drawNo}</td>
                  <td>${fullName}</td>
                  <td>${niceTime}</td>
                  <td>${nf(d["Sales Count"] ?? 0)}</td>
                </tr>`;
            })
            .join("")}
        </tbody>
      </table>

      <footer>
        Generated on ${new Date().toLocaleString(
          "en-GB"
        )} by <strong>WinWay</strong>
      </footer>
    </body>
  </html>`;
}

// ---------- PRO template ----------
function buildHTMLPro({ results, summary }) {
  const sorted = [...results].sort((a, b) => parseDT(b) - parseDT(a));
  const latestRow = sorted[0];
  const latestDate = latestRow?.["Last Sale Date"] || "-";
  const latestTime12h = latestRow
    ? formatLastSaleTime(
        latestRow["Last Sale Date"],
        latestRow["Last Sale Time"]
      )
    : "-";

  const totalFiles = summary.total_files ?? sorted.length;
  const totalSales =
    summary.total_sales ??
    sorted.reduce((s, r) => s + (Number(r["Sales Count"]) || 0), 0);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>WinWay Sales Summary Report</title>
      <style>
        :root{
          --brand:#1976D2; --brand-600:#1565C0; --ink:#1F2937; --muted:#6B7280;
          --bg:#F8FAFC; --card:#FFFFFF; --border:#E5E7EB; --info:#0EA5E9;
        }
        body{margin:0;padding:0;background:var(--bg);
             font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;color:var(--ink);}
        .wrap{width:1100px;margin:24px auto;padding:20px 22px;background:var(--card);
              border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.04);}
        .head{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;
              background:linear-gradient(180deg,#fff,#F3F6FB);border-bottom:1px solid var(--border);
              padding:16px;border-radius:10px 10px 0 0;}
        .brand{display:flex;gap:12px;align-items:center;}
        .logo{width:110px;height:auto;}
        h1{margin:0;font-size:22px;color:var(--brand);}
        .sub{color:var(--muted);font-size:13px;margin-top:4px;}
        .pill{display:inline-block;padding:3px 8px;font-size:12px;border-radius:999px;border:1px solid var(--border);background:#fff;color:var(--ink);}
        .pill.time{font-variant-numeric:tabular-nums;font-family:ui-monospace,Menlo,Consolas,monospace;}
        .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0 6px 0;}
        .stat{background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;}
        .label{font-size:12px;color:var(--muted);margin-bottom:6px;}
        .value{font-size:20px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:14px;}
        thead th{position:sticky;top:0;background:var(--brand);color:#fff;text-align:center;padding:10px;letter-spacing:.2px;}
        tbody td{padding:10px;border-top:1px solid var(--border);vertical-align:middle;background:#fff;}
        tbody tr:nth-child(even) td{background:#FAFAFA;}
        tbody tr:hover td{background:#F2F8FF;}
        .text-center{text-align:center;} .text-right{text-align:right;}
        .draw{color:var(--info);font-weight:700;letter-spacing:.3px;}
        .lottery{color:var(--brand-600);font-weight:600;}
        tr.is-latest{box-shadow:inset 2px 0 0 0 var(--brand);background:#EEF7FF;}
        .money{font-variant-numeric:tabular-nums;}
        footer{margin-top:10px;text-align:right;color:var(--muted);font-size:12px;}
        tr,td,th{page-break-inside:avoid;break-inside:avoid;}
      </style>
    </head>
    <body>
      <div class="wrap" id="capture">
        <div class="head">
          <div class="brand">
            <img class="logo" src="data:image/svg+xml;utf8,${svgLogo}" alt="WinWay" />
            <div>
              <h1>Sales Summary Report</h1>
              <div class="sub">Latest sale snapshot for <strong>${latestDate}</strong> • Generated: ${new Date().toLocaleString(
    "en-GB"
  )}</div>
            </div>
          </div>
          <div><span class="pill">Environment: Production</span></div>
        </div>

        <div class="summary">
          <div class="stat"><div class="label">Total Lotteries</div><div class="value">${nf(
            totalFiles
          )}</div></div>
          <div class="stat"><div class="label">Total Sales</div><div class="value money">${nf(
            totalSales
          )}</div></div>
          <div class="stat">
            <div class="label">Latest Sale</div>
            <div class="value"><span class="pill time">${latestTime12h}</span> &nbsp; <span class="pill">${latestDate}</span></div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Draw No</th>
              <th>Lottery Name</th>
              <th>Last Sale Time</th>
              <th>Sales Count</th>
            </tr>
          </thead>
          <tbody>
            ${sorted
              .map((d, i) => {
                const raw = d["Lottery Name"] || "-";
                const drawNo = (String(raw).match(/(\d{4})$/) || [, "-"])[1];
                const fullName = resolveFullName(raw);
                const timePretty = formatLastSaleTime(
                  d["Last Sale Date"],
                  d["Last Sale Time"]
                );
                const isLatest = i === 0;
                return `
                  <tr class="${isLatest ? "is-latest" : ""}">
                    <td class="text-center draw">${drawNo}</td>
                    <td class="lottery">${fullName}</td>
                    <td class="text-center"><span class="pill time">${timePretty}</span></td>
                    <td class="text-right money">${nf(
                      d["Sales Count"] ?? 0
                    )}</td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>

        <footer>Generated by <strong>WinWay</strong>.</footer>
      </div>
    </body>
  </html>`;
}

// ---------- core generate (download, no save) ----------
async function renderAndSend(html, res, filenameBase = "LastSaleReport") {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const el = await page.$("#capture"); // pro template uses #capture; classic is full page
    const buffer = el
      ? await el.screenshot({ type: "png" })
      : await page.screenshot({ type: "png", fullPage: true });

    const fileName = `${filenameBase}_${new Date()
      .toISOString()
      .slice(0, 10)}.png`;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } finally {
    if (browser)
      try {
        await browser.close();
      } catch {}
  }
}

// ---------- routes ----------
// Choose by query: /generate?template=classic|pro
router.post("/generate", async (req, res) => {
  try {
    const { results = [], summary = {} } = req.body || {};
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "No results provided." });
    }
    const template = String(req.query.template || "pro").toLowerCase();
    const html =
      template === "classic"
        ? buildHTMLClassic({ results, summary })
        : buildHTMLPro({ results, summary });
    await renderAndSend(
      html,
      res,
      template === "classic" ? "LastSaleReport_Classic" : "LastSaleReport_Pro"
    );
  } catch (err) {
    console.error("❌ Generate error:", err);
    res.status(500).json({ error: "Report generation failed." });
  }
});

// Convenience explicit endpoints
router.post("/generate/classic", async (req, res) => {
  try {
    const { results = [], summary = {} } = req.body || {};
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "No results provided." });
    }
    const html = buildHTMLClassic({ results, summary });
    await renderAndSend(html, res, "LastSaleReport_Classic");
  } catch (err) {
    console.error("❌ Classic generate error:", err);
    res.status(500).json({ error: "Report generation failed." });
  }
});

router.post("/generate/pro", async (req, res) => {
  try {
    const { results = [], summary = {} } = req.body || {};
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: "No results provided." });
    }
    const html = buildHTMLPro({ results, summary });
    await renderAndSend(html, res, "LastSaleReport_Pro");
  } catch (err) {
    console.error("❌ Pro generate error:", err);
    res.status(500).json({ error: "Report generation failed." });
  }
});

export default router;
