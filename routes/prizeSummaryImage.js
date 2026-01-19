import express from "express";
import puppeteer from "puppeteer";

const router = express.Router();

// Currency formatter (LKR, no decimals)
const fmtLKR = (n) =>
  new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

/** Normalize payload to { rows, meta } supporting:
 *  NEW shape: { results: [{ lottery, draw_date, draw_no, sold, unsold }...], summary: {...} }
 *  OLD shape: { details: { "Lottery Name": { "Draw Date":.., "Draw No":.., ... } }, ... }
 */
function normalizePrizePayload(payload = {}) {
  // NEW shape
  if (Array.isArray(payload?.results)) {
    const { results = [], summary = {} } = payload;
    const rows = results.map((r) => ({
      lotteryName: r.lottery,
      drawDate: r.draw_date,
      drawNo: r.draw_no,
      sold: r.sold,
      unsold: r.unsold,
    }));
    const meta = {
      total_lotteries: summary.total_lotteries ?? rows.length,
      unique_draw_dates:
        summary.unique_draw_dates ?? [...new Set(rows.map((x) => x.drawDate))],
      unique_draw_numbers:
        summary.unique_draw_numbers ?? rows.map((x) => x.drawNo),
      total_sold_prizes:
        summary.total_sold_prizes ??
        rows.reduce((s, x) => s + (Number(x.sold) || 0), 0),
      total_unsold_prizes:
        summary.total_unsold_prizes ??
        rows.reduce((s, x) => s + (Number(x.unsold) || 0), 0),
    };
    return { rows, meta };
  }

  // OLD shape
  if (payload?.details && typeof payload.details === "object") {
    const {
      total_lotteries = 0,
      unique_draw_dates = [],
      unique_draw_numbers = [],
      total_sold_prizes = 0,
      total_unsold_prizes = 0,
      details = {},
    } = payload;

    const rows = Object.entries(details).map(([lotteryName, info]) => ({
      lotteryName,
      drawDate: info["Draw Date"] || "-",
      drawNo: info["Draw No"] || "-",
      sold: info["Prizes for Sold Tickets (Rs.)"] || 0,
      unsold: info["Prizes for Unsold Tickets (Thinkcube) (Rs.)"] || 0,
    }));

    const meta = {
      total_lotteries,
      unique_draw_dates,
      unique_draw_numbers,
      total_sold_prizes,
      total_unsold_prizes,
    };
    return { rows, meta };
  }

  throw new Error("Invalid payload. Provide either {results, summary} or {details,...}");
}

// ---------- CLASSIC template ----------
function buildHTMLClassic({ rows, meta }) {
  const sorted = [...rows].sort((a, b) => String(a.drawNo).localeCompare(String(b.drawNo)));
  const dateLabel =
    meta.unique_draw_dates?.length === 1
      ? meta.unique_draw_dates[0]
      : (meta.unique_draw_dates || []).join(", ");

  const calcSold = sorted.reduce((s, r) => s + (Number(r.sold) || 0), 0);
  const calcUnsold = sorted.reduce((s, r) => s + (Number(r.unsold) || 0), 0);

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>WinWay Prize Summary</title>
      <style>
        body { font-family:'Segoe UI',sans-serif; background:#f8f9fa; padding:40px; color:#222; }
        h1{ text-align:center; color:#1976D2; margin-bottom:8px; }
        h3{ text-align:center; color:#555; font-weight:normal; margin:0 0 25px; }
        .summary{ display:flex; justify-content:space-between; margin-bottom:20px; background:#fff; border:1px solid #ddd; border-radius:8px; padding:10px 20px; font-size:17px; color:#333; }
        table{ width:100%; border-collapse:collapse; font-size:16px; margin-top:10px; background:#fff; }
        th,td{ padding:10px 14px; border:1px solid #ddd; text-align:center; }
        th{ background:#1976D2; color:#fff; }
        tr:nth-child(even){ background:#f2f2f2; }
        .text-right{ text-align:right; }
        .money{ font-variant-numeric: tabular-nums; }
        footer{ text-align:right; margin-top:25px; color:#777; font-size:14px; }
      </style>
    </head>
    <body>
      <h1>WinWay Prize Summary</h1>
      <h3>${dateLabel || "-"}</h3>

      <div class="summary">
        <div><strong>Total Lotteries:</strong> ${meta.total_lotteries}</div>
        <div><strong>Prizes (Sold):</strong> ${fmtLKR(meta.total_sold_prizes)}</div>
        <div><strong>Prizes (Unsold):</strong> ${fmtLKR(meta.total_unsold_prizes)}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Draw No</th>
            <th>Lottery Name</th>
            <th>Draw Date</th>
            <th>Sold Prizes (Rs.)</th>
            <th>Unsold Prizes (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          ${sorted
            .map(
              (r) => `
            <tr>
              <td>${r.drawNo}</td>
              <td>${r.lotteryName}</td>
              <td>${r.drawDate}</td>
              <td class="text-right money">${fmtLKR(r.sold)}</td>
              <td class="text-right money">${fmtLKR(r.unsold)}</td>
            </tr>`
            )
            .join("")}
          <tr>
            <td colspan="3" style="font-weight:700;">TOTAL</td>
            <td class="text-right money" style="font-weight:700;">${fmtLKR(calcSold)}</td>
            <td class="text-right money" style="font-weight:700;">${fmtLKR(calcUnsold)}</td>
          </tr>
        </tbody>
      </table>

      <footer>Generated on ${new Date().toLocaleString("en-GB")} by <strong>WinWay</strong>.</footer>
    </body>
  </html>`;
}

// ---------- PRO template ----------
function buildHTMLPro({ rows, meta }) {
  const sorted = [...rows].sort((a, b) => String(a.drawNo).localeCompare(String(b.drawNo)));
  const dateLabel =
    meta.unique_draw_dates?.length === 1
      ? meta.unique_draw_dates[0]
      : (meta.unique_draw_dates || []).join(", ");
  const calcSold = sorted.reduce((s, r) => s + (Number(r.sold) || 0), 0);
  const calcUnsold = sorted.reduce((s, r) => s + (Number(r.unsold) || 0), 0);

  const svgLogo = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='40'>
       <text x='0' y='28' font-family='Segoe UI, Arial' font-size='24' fill='#1976D2'>WinWay</text>
     </svg>`
  );

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>WinWay Prize Summary</title>
      <style>
        :root{
          --brand:#1976D2; --brand-600:#1565C0; --ink:#1F2937; --muted:#6B7280;
          --bg:#F8FAFC; --card:#FFFFFF; --border:#E5E7EB; --success:#16A34A; --warning:#F59E0B;
        }
        body{margin:0;padding:0;background:var(--bg);
             font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;color:var(--ink);}
        .wrap{width:1100px;margin:24px auto;padding:20px 22px;background:var(--card);
              border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 20px rgba(0,0,0,0.04);}
        .head{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border);
              padding-bottom:12px;margin-bottom:14px;background:linear-gradient(180deg,#fff,#F3F6FB);border-radius:10px 10px 0 0;}
        .brand{display:flex;gap:12px;align-items:center;padding:12px;}
        .logo{width:110px;height:auto;}
        h1{margin:0;font-size:22px;color:var(--brand);}
        .sub{color:var(--muted);font-size:13px;margin-top:4px;}
        .summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0 6px 0;}
        .stat{background:#fff;border:1px solid var(--border);border-radius:10px;padding:12px;}
        .label{font-size:12px;color:var(--muted);margin-bottom:6px;}
        .value{font-size:20px;font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:10px;border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:14px;}
        thead th{background:var(--brand);color:#fff;padding:10px;}
        tbody td{padding:10px;border-top:1px solid var(--border);background:#fff;}
        tbody tr:nth-child(even) td{background:#FAFAFA;}
        .text-center{text-align:center;}
        .text-right{text-align:right;}
        .draw{color:var(--warning);font-weight:700;letter-spacing:.3px;}
        .lottery{color:var(--brand-600);font-weight:600;}
        .money{font-variant-numeric:tabular-nums;}
        .footnote{margin-top:10px;text-align:right;color:var(--muted);font-size:12px;}
      </style>
    </head>
    <body>
      <div class="wrap" id="capture">
        <div class="head">
          <div class="brand">
            <img class="logo" src="data:image/svg+xml;utf8,${svgLogo}" alt="WinWay" />
            <div>
              <h1>Prize Summary</h1>
              <div class="sub">Draw Date: <strong>${dateLabel || "-"}</strong> • Generated: ${new Date().toLocaleString("en-GB")}</div>
            </div>
          </div>
          <div style="padding-right:12px;">
            <span style="border:1px solid var(--border); padding:6px 10px; border-radius:999px; font-size:12px;">Report</span>
          </div>
        </div>

        <div class="summary">
          <div class="stat"><div class="label">Total Lotteries</div><div class="value">${meta.total_lotteries}</div></div>
          <div class="stat"><div class="label">Unique Draw Numbers</div><div class="value">${meta.unique_draw_numbers?.length || 0}</div></div>
          <div class="stat"><div class="label">Prizes for Sold (Rs.)</div><div class="value money">${fmtLKR(meta.total_sold_prizes)}</div></div>
          <div class="stat"><div class="label">Prizes for Unsold (Rs.)</div><div class="value money">${fmtLKR(meta.total_unsold_prizes)}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center">Draw No</th>
              <th>Lottery Name</th>
              <th class="text-center">Draw Date</th>
              <th class="text-right">Sold Prizes (Rs.)</th>
              <th class="text-right">Unsold Prizes (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            ${sorted
              .map(
                (r) => `
              <tr>
                <td class="text-center draw">${r.drawNo}</td>
                <td class="lottery">${r.lotteryName}</td>
                <td class="text-center">${r.drawDate}</td>
                <td class="text-right money">${fmtLKR(r.sold)}</td>
                <td class="text-right money">${fmtLKR(r.unsold)}</td>
              </tr>`
              )
              .join("")}
            <tr>
              <td class="text-center" style="font-weight:700;" colspan="3">TOTAL</td>
              <td class="text-right money" style="font-weight:700;">${fmtLKR(calcSold)}</td>
              <td class="text-right money" style="font-weight:700;">${fmtLKR(calcUnsold)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footnote">Generated by <strong>WinWay</strong>.</div>
      </div>
    </body>
  </html>`;
}

// ---------- core render (download only) ----------
async function renderAndSend(html, res, filenameBase = "PrizeSummary") {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    const el = await page.$("#capture");
    const buffer = el
      ? await el.screenshot({ type: "png" })
      : await page.screenshot({ type: "png", fullPage: true });

    const fileName = `${filenameBase}_${new Date().toISOString().slice(0, 10)}.png`;
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(buffer);
  } finally {
    if (browser) try { await browser.close(); } catch {}
  }
}

// ---------- routes ----------
router.post("/generate", async (req, res) => {
  try {
    const { rows, meta } = normalizePrizePayload(req.body);
    const template = String(req.query.template || "pro").toLowerCase();
    const html =
      template === "classic"
        ? buildHTMLClassic({ rows, meta })
        : buildHTMLPro({ rows, meta });
    await renderAndSend(html, res, template === "classic" ? "PrizeSummary_Classic" : "PrizeSummary_Pro");
  } catch (e) {
    console.error("Image generation error:", e);
    res.status(400).json({ ok: false, message: e.message || "Failed to generate image" });
  }
});

// Convenience endpoints
router.post("/generate/classic", async (req, res) => {
  try {
    const { rows, meta } = normalizePrizePayload(req.body);
    const html = buildHTMLClassic({ rows, meta });
    await renderAndSend(html, res, "PrizeSummary_Classic");
  } catch (e) {
    console.error("Image generation error:", e);
    res.status(400).json({ ok: false, message: e.message || "Failed to generate image" });
  }
});

router.post("/generate/pro", async (req, res) => {
  try {
    const { rows, meta } = normalizePrizePayload(req.body);
    const html = buildHTMLPro({ rows, meta });
    await renderAndSend(html, res, "PrizeSummary_Pro");
  } catch (e) {
    console.error("Image generation error:", e);
    res.status(400).json({ ok: false, message: e.message || "Failed to generate image" });
  }
});

export default router;
