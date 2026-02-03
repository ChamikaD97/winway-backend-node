import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const winwayLogo = path.join(__dirname, "logo.png");

const nlbLogo = path.join(__dirname, "nlb_logo.png");
const card = path.join(__dirname, "card.jpg");

const loyality = path.join(__dirname, "loyalty.png");

export async function htmlToImage(html, outputPath) {
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

export const generateEmailTemplate = (
  name,
  tickets,
  winnings,
  tblData = [],
  superPrizes = {},
  weekStart = "",
  weekEnd = "",
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
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Tickets Purchased",
          data: values,
          backgroundColor: colors.slice(0, 7),
          borderRadius: 8,
        },
      ],
    },
    options: {
      indexAxis: "y", // ✅ horizontal direction (bars left → right)
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          callbacks: { label: (ctx) => `${ctx.raw} tickets` },
        },
        datalabels: { display: false },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "#eee" },
          ticks: { color: "#333", font: { size: 12 } },
          title: {
            display: true,
            text: "Number of Tickets",
            color: "#555",
            font: { size: 13, weight: "bold" },
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "#222",
            font: { size: 13, weight: "bold" },
          },
        },
      },
    },
  };

  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(
    JSON.stringify(chartConfig),
  )}&backgroundColor=white&width=250&height=250&format=png`;

  // ✅ Prizes sorted by highest value
  const sortedPrizes = Object.entries(superPrizes || {}).sort(
    (a, b) => Number(b[1]) - Number(a[1]),
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
                    value,
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
          }`,
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
           <td align="center" style="padding: 35px 40px 2px 40px ;color:#333;">
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
                  tickets,
                ).toLocaleString()}</strong> Total Tickets This Week
              </div>
              <p style="font-size:15px;color:#000;">Here’s Your Weekly Purchase Summary</p>
            </td>
          </tr>

          <!-- Chart + Legend -->
          <tr>
            <td align="center" style="padding:0 30px 20px;">
    <table role="presentation" width="90%" border="0" cellspacing="0" cellpadding="0"
       style="margin:auto;border:2px solid #e0d7ff;border-radius:14px;background:#fff;
              box-shadow:0 3px 10px rgba(123,47,247,0.08);padding:15px;font-family:Arial,sans-serif;">

  <!-- 🏷️ Table Header Row -->
  <thead>
    <tr>
      <th align="left" width="35%"
          style="font-size:13px; color:#000;font-weight:700;padding:8px 10px;border-bottom:1px solid #ffffffff;">
        Lottery
      </th>
      <th align="center" width="55%"
          style="font-size:13px;color:#000;font-weight:700;padding:8px 10px;border-bottom:1px solid #ffffffff;">
        
      </th>
      <th align="right" width="10%"
          style="font-size:13px;color:#000;font-weight:700;padding:8px 10px;border-bottom:1px solid #ffffffff;">
        Tickets
      </th>
    </tr>
  </thead>

  <tbody>
    <!-- 🔹 Dynamic Rows -->
    ${sortedTbl
      .map((t, i) => {
        const colors = [
          "#7b2ff7",
          "#f107a3",
          "#ff9800",
          "#4caf50",
          "#03a9f4",
          "#e91e63",
          "#9c27b0",
          "#cddc39",
        ];
        const color = colors[i % colors.length];
        const max = Math.max(...tblData.map((x) => Number(x.count) || 0));
        const widthPct = Math.round(((Number(t.count) || 0) / max) * 100);

        return `
        <tr>
          <!-- 🎫 Lottery Name -->
          <td align="left" width="35%"
              style="font-size:15px;color:#333;font-weight:500;padding:6px 10px;">
            ${t.name}
          </td>

          <!-- 📊 Progress Bar -->
          <td width="55%" style="padding:6px 10px;">
            <div style="background:${color};
                        width:${widthPct}%;
                        height:18px;
                        border-radius:10px;
                        transition:width 0.3s;"></div>
          </td>

          <!-- 🔢 Ticket Count -->
          <td align="right" width="10%"
              style="font-size:15px;font-weight:600;color:#111;padding-right:10px;">
            ${Number(t.count).toLocaleString()}
          </td>
        </tr>`;
      })
      .join("")}
  </tbody>
</table>


            </td>
          </tr>

          <!-- Winnings -->
          <tr>
            <td align="center" style="padding:25px;">
              <div style="background:linear-gradient(145deg,#ffeb99,#d4af37);color:#3d0066;
                          border-radius:20px;padding:20px 25px;width:85%;font-weight:700;font-size:19px;">
                This Week Alone, You Have Won <strong>Rs. ${Number(
                  winnings || 0,
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

const getTierValue = (tier) => {
  console.log(tier);

  if (tier.toUpperCase() == "PLATINUM") {
    return {
      percentage: "5%",
      tickets: "1,000",
    };
  } else if (tier.toUpperCase() == "GOLD") {
    return {
      percentage: "3.5%",
      tickets: 500,
    };
  } else if (tier.toUpperCase() == "SILVER") {
    return {
      percentage: "2.5%",
      tickets: 300,
    };
  } else {
    return {
      percentage: "0",
      tickets: 0,
    };
  }
};

const toBase64 = (filepath) => {
  if (!fs.existsSync(filepath)) return "";
  const fileData = fs.readFileSync(filepath);
  return `data:image/png;base64,${fileData.toString("base64")}`;
};

function toProperCase(name = "") {
  return name
    .replace(/[^a-zA-Z ]/g, "") // remove commas & symbols
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
const getEndOfCurrentMonth = () => {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const dd = String(endOfMonth.getDate()).padStart(2, "0");
  const mm = String(endOfMonth.getMonth() + 1).padStart(2, "0");
  const yyyy = endOfMonth.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
};
const validityDate = getEndOfCurrentMonth();
export const generateCardImage = async (name, customer, tier, number) => {
  const winwayLogoBase64 = toBase64(winwayLogo);
  const loyaltyLogoBase64 = toBase64(loyality);

  const cardHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0; padding:40px; background:#f4f4f7;">

  <div style="
    width:650px;
    margin:auto;
    border-radius:16px;
    background:#000;
    color:#fff;
    padding:25px;
    border:2px solid #000;
    font-family:Arial, sans-serif;
  ">

    <!-- LOGOS -->
    <table width="100%">
      <tr>
        <td align="left">
          <img src="${winwayLogoBase64}" width="55" height="55" />
        </td>
        <td align="right">
          <img src="${loyaltyLogoBase64}" width="70" height="55" />
        </td>
      </tr>
    </table>

    <!-- NAME -->
    <div style="
      text-align:center;
      font-size:13px;
      margin-top:12px;
      letter-spacing:2px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- LOYALTY NUMBER -->
       <div style="text-align:center;font-size:20px;letter-spacing:4px;margin:10px 0;">
                    ${number}
                  </div>

    <!-- TIER + VALIDITY -->
    <table width="100%" style="margin-top:20px;">
      <tr>
        <td align="left">
          <span style="
            padding:8px 16px;
            border-radius:8px;
            font-size:15px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>

        <td align="right">
          <span style="
            padding:8px 16px;
            border-radius:8px;
            font-size:14px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

    
 
    

  </div>

</body>
</html>
  `;
  const imageDir = "loyality_images";
  const outputPath = path.join(imageDir, `${Date.now()}_loyalty_card.png`);
  await htmlToImage(cardHtml, outputPath);

  return outputPath;
};

export const generateLoyaltyWelcomeEmail = (
  name = "Valued Customer",
  customer = {},
  number,
) => {
  const tier = customer?.CustomerInfo?.Current_Loyalty_Tier || "-";
  const gender = customer?.CustomerInfo?.Gender || "-";
  console.log(tier);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>WIN WAY Loyalty Rewards</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f7; font-family:Arial, sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- OUTER WRAPPER -->
        <table width="700" style="
          background:#EBF0F9;
          border-radius:18px;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td style="padding:0;">
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                border-radius:18px 18px 0 0;
                padding:22px 30px;">
                <table width="100%">
                  <tr>
                    <td width="70">
                      <img src="cid:winwaylogo@cid" width="90" height="90" style="border-radius:8px;" />
                    </td>
                    <td align="center">
                      <h1 style="color:#fff;font-size:32px;margin:0;font-family:'Crimson Text';">
                        Loyalty Rewards Program
                      </h1>
                    </td>
                    <td width="70"></td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px; color:#333; line-height:1.6;">

              <p style="font-size:18px;font-family:'Sylfaen';margin:0 0 15px;">
                <strong>
                  Dear ${
                    gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : ""
                  } ${name.toUpperCase()}
                </strong>,
              </p>

              <p style="font-family:'Sylfaen';font-size:15px;margin:0 0 25px;">
                We are delighted to welcome you to the <strong>WIN WAY Loyalty Rewards Program</strong>,
                a dedicated initiative created to recognize and appreciate our most valued customers.
              </p>

              <!-- BLACK CARD -->
              <table width="56%" align="center" style="
                background:#000;
                color:#fff;
                border-radius:16px;
                padding:25px;
                margin:20px auto;
              ">
                <tr><td>

                  <table width="100%">
                    <tr>
                      <td><img src="cid:winwaylogo@cid" width="55" height="55" /></td>
                      <td align="right"><img src="cid:loyalty@cid" width="70" height="55" /></td>
                    </tr>
                  </table>

                  <div style="text-align:center;font-size:13px;letter-spacing:2px;margin-top:12px;color:#e6e6e6;">
                    ${name.toUpperCase()}
                  </div>

                  <div style="text-align:center;font-size:20px;letter-spacing:4px;margin:10px 0;">
                    ${number}
                  </div>

                  <table width="100%" style="margin-top:20px;">
                    <tr>
                      <td>
                        <span style="
                          padding:8px 16px;
                          border-radius:8px;
                          font-size:15px;
                          background:#000;
                          color:${
                            tier.toLowerCase() === "gold"
                              ? "#d4af37"
                              : tier.toLowerCase() === "silver"
                                ? "#c0c0c0"
                                : tier.toLowerCase() === "platinum"
                                  ? "#e5e4e2"
                                  : "#a974ff"
                          };
                          font-weight:600;">
                          ${tier.toUpperCase()}
                        </span>
                      </td>
                      <td align="right">
                        <span style="padding:8px 16px;border-radius:8px;font-size:14px;background:#000;color:#fff;">
                          Valid till ${validityDate}
                        </span>
                      </td>
                    </tr>
                  </table>

                </td></tr>
              </table>

              <!-- BENEFITS -->
              <p style="font-family:'Sylfaen';font-size:15px;margin-top:25px;">
                You have been recognized as a <strong>${tier.toUpperCase()}</strong> tier customer.
              </p>

              <ul style="font-family:'Sylfaen';font-size:15px;margin:15px 0 25px 20px;">
                <li>You will receive <strong>${
                  getTierValue(tier).percentage
                }</strong> cashback.</li>
                <li>Cashback applies when purchasing more than <strong>${
                  getTierValue(tier).tickets
                } tickets</strong>.</li>
                <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong>.</li>
              </ul>

              <!-- MONTHLY RULE -->
              <p style="font-family:'Sylfaen';font-size:15px;margin:0 0 20px;">
                There’s nothing extra you need to do — simply continue purchasing your tickets through
                <strong>WIN WAY</strong>.
                <br/>
                Loyalty status is reviewed monthly and is based on the following criteria.
              </p>

             <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
  <tr>
    <td width="100%" style="padding:4px 6px;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          border-radius:8px;
          overflow:hidden;
          font-size:12px;
          font-weight:600;
          text-align:center;
          border:1px solid #000;
          line-height:1.2;
        "
      >
        <tr>
          <!-- Silver -->
          <td
            width="33.33%"
            style="
              background:#C0C0C0;
              padding:4px 2px;
              color:#333;
              border-right:1px solid #000;
            "
          >
            Silver<br />
            &gt; 300
          </td>

          <!-- Gold -->
          <td
            width="33.33%"
            style="
              background:#E6B800;
              padding:4px 2px;
              color:#fff;
              border-right:1px solid #000;
            "
          >
            Gold<br />
            &gt; 500
          </td>

          <!-- Platinum -->
          <td
            width="33.33%"
            style="
              background:#9B5DE5;
              padding:4px 2px;
              color:#fff;
            "
          >
            Platinum<br />
            &gt; 1000
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>



              <p style="font-family:'Sylfaen';font-size:15px;">
                If you have any questions, contact us at <strong>info@winway.lk</strong> or call
                <strong>0707 884 884 | 0722 884 884</strong>.
              </p>

               <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
               <br/> Best regards,<br/>
                <strong>WIN WAY</strong><br/>
                National Lotteries Board
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5;padding:18px 30px;font-size:14px;color:#777;">
              <table width="100%">
                <tr>
                  <td>
                    <strong>© ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.</strong><br/>
                    📞 0707884884 | 0722884884<br/>
                    <a href="https://www.winway.lk">www.winway.lk</a> |
                    <a href="https://www.884.lk">www.884.lk</a>
                  </td>
                  <td align="right">
                    <img src="cid:nlblogo@cid" width="55" height="55" />
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
</html>
`;
};

export const generateLoyaltUpgradeEmail = (
  name = "Valued Customer",
  customer = {},
  number, // (optional) fallback mobile
) => {
  const info = customer?.CustomerInfo || {};
  const tier = info?.Current_Loyalty_Tier || "-";
  const gender = info?.Gender || "-";
  const prevTier = info?.lastMonthLoyaltyTier || "-";

  const salutation =
    gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : "";

  let content = "";

  if (tier === "Platinum") {
    content = `
  <h2>🎉 Congratulations .... !!!!</h2>

  <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier has been upgraded from
    <strong>${prevTier}</strong> to <strong>Platinum</strong> as part of our monthly
    <strong>WIN WAY Loyalty Rewards Program</strong> review.
  </p>

  <!-- BLACK CARD (COMPACT) -->
<table width="56%" align="center" style="
  background:#000;
  color:#fff;
  border-radius:12px;
  padding:14px;
  margin:14px auto;
">
  <tr><td>

    <!-- Logos -->
    <table width="100%">
      <tr>
        <td>
          <img src="cid:winwaylogo@cid" width="42" height="42" />
        </td>
        <td align="right">
          <img src="cid:loyalty@cid" width="55" height="42" />
        </td>
      </tr>
    </table>

    <!-- Name -->
    <div style="
      text-align:center;
      font-size:12px;
      letter-spacing:1.5px;
      margin-top:8px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- Card Number -->
    <div style="
      text-align:center;
      font-size:16px;
      letter-spacing:3px;
      margin:6px 0;
      font-weight:600;
    ">
      ${number}
    </div>

    <!-- Tier + Validity -->
    <table width="100%" style="margin-top:10px;">
      <tr>
        <td>
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>
        <td align="right">
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

  </td></tr>
</table>

  <p>As a Platinum tier customer, you now enjoy our most exclusive benefits:</p>

  <ul>
    <li><strong>5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>1,000 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    <strong>Platinum</strong> is the highest level of the WIN WAY Loyalty Rewards Program,
    and we’re proud to reward your continued loyalty.
  </p>
  `;
  } else if (tier === "Gold") {
    content = `
  <h2>🎉  Congratulations .... !!!!</h2>

  <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier has been upgraded from
    <strong>${prevTier}</strong>  to <strong>Gold</strong> as part of our monthly
    <strong>WIN WAY Loyalty Rewards Program</strong> review.
  </p>
<!-- BLACK CARD (COMPACT) -->
<table width="56%" align="center" style="
  background:#000;
  color:#fff;
  border-radius:12px;
  padding:14px;
  margin:14px auto;
">
  <tr><td>

    <!-- Logos -->
    <table width="100%">
      <tr>
        <td>
          <img src="cid:winwaylogo@cid" width="42" height="42" />
        </td>
        <td align="right">
          <img src="cid:loyalty@cid" width="55" height="42" />
        </td>
      </tr>
    </table>

    <!-- Name -->
    <div style="
      text-align:center;
      font-size:12px;
      letter-spacing:1.5px;
      margin-top:8px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- Card Number -->
    <div style="
      text-align:center;
      font-size:16px;
      letter-spacing:3px;
      margin:6px 0;
      font-weight:600;
    ">
      ${number}
    </div>

    <!-- Tier + Validity -->
    <table width="100%" style="margin-top:10px;">
      <tr>
        <td>
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>
        <td align="right">
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

  </td></tr>
</table>

  <p>As a Gold tier customer, you can now enjoy the following exclusive benefits:</p>

  <ul>
    <li><strong>3.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>500 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    Our loyalty tiers are reviewed monthly, so continued purchases can help you
    move even closer to our top-tier rewards.
  </p>
  `;
  } else if (tier === "Silver") {
    content = `
  <h2>🎉 Congratulations .... !!!!</h2>

  <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier has been upgraded from
    <strong>${prevTier}</strong>  to <strong>Silver</strong> as part of our monthly
    <strong>WIN WAY Loyalty Rewards Program</strong> review.
  </p>
<!-- BLACK CARD (COMPACT) -->
<table width="56%" align="center" style="
  background:#000;
  color:#fff;
  border-radius:12px;
  padding:14px;
  margin:14px auto;
">
  <tr><td>

    <!-- Logos -->
    <table width="100%">
      <tr>
        <td>
          <img src="cid:winwaylogo@cid" width="42" height="42" />
        </td>
        <td align="right">
          <img src="cid:loyalty@cid" width="55" height="42" />
        </td>
      </tr>
    </table>

    <!-- Name -->
    <div style="
      text-align:center;
      font-size:12px;
      letter-spacing:1.5px;
      margin-top:8px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- Card Number -->
    <div style="
      text-align:center;
      font-size:16px;
      letter-spacing:3px;
      margin:6px 0;
      font-weight:600;
    ">
      ${number}
    </div>

    <!-- Tier + Validity -->
    <table width="100%" style="margin-top:10px;">
      <tr>
        <td>
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>
        <td align="right">
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

  </td></tr>
</table>

  <p>As a Silver tier customer, you are now eligible for the following benefits:</p>

  <ul>
    <li><strong>2.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>300 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>
  `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>WIN WAY Loyalty Summary</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f7; font-family:Arial, sans-serif;">
  <table width="100%" role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- OUTER WRAPPER -->
        <table width="700" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:0;">
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                border-radius:18px 18px 0 0;
                padding:22px 30px;">
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
                      <img src="cid:winwaylogo@cid" width="90" height="90" style="border-radius:8px;" />
                    </td>

                    <td align="center">
                      <h1 style="
                        color:#fff;
                        font-size:32px;
                        margin:0;
                        font-family:'Crimson Text';">
                        Congratulations .... !!!!
                      </h1>
                    </td>

                    <td width="70">&nbsp;</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">

              <p style="font-size:18px; margin:0 0 15px 0; font-family:'Sylfaen'; ">
                <strong>
                  Dear ${salutation} ${String(name).toUpperCase()}
                </strong>,
              </p>

              <div style="font-family:'Sylfaen'; font-size:15px;">
  ${content}
    <p style="font-family:'Sylfaen';font-size:15px;margin:0 0 20px;">
                                             Loyalty status is reviewed monthly and is based on the following criteria

              </p>
</div><!-- SINGLE ROW CRITERIA BAR --><table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
  <tr>
    <td width="100%" style="padding:4px 6px;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          border-radius:8px;
          overflow:hidden;
          font-size:12px;
          font-weight:600;
          text-align:center;
          border:1px solid #000;
          line-height:1.2;
        "
      >
        <tr>
          <!-- Silver -->
          <td
            width="33.33%"
            style="
              background:#C0C0C0;
              padding:4px 2px;
              color:#333;
              border-right:1px solid #000;
            "
          >
            Silver<br />
            &gt; 300
          </td>

          <!-- Gold -->
          <td
            width="33.33%"
            style="
              background:#E6B800;
              padding:4px 2px;
              color:#fff;
              border-right:1px solid #000;
            "
          >
            Gold<br />
            &gt; 500
          </td>

          <!-- Platinum -->
          <td
            width="33.33%"
            style="
              background:#9B5DE5;
              padding:4px 2px;
              color:#fff;
            "
          >
            Platinum<br />
            &gt; 1000
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>




              


                  


              
          
              

              
              
              
              
              <p style="margin-top:25px; font-family:'Sylfaen';  font-size:15px;">
              There’s nothing extra you need to do — just keep purchasing your tickets through <strong>WIN WAY</strong> and enjoy the rewards.
             
              
              </p>

              <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
                If you have any questions, contact <strong>info@winway.lk</strong> or call <strong>0707 884 884 | 0722 884 884</strong>.
              </p>

 <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">               <br/>Best regards,<br/>
                <strong>WIN WAY</strong><br/>
               National Lotteries Board
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5; border-top:1px solid #eee; padding:18px 30px; font-size:14px; color:#777;">
              <table width="100%">
                <tr>
                  <td align="left">
                    <strong>
                      Copyright © ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                      📞 0707884884 | 0722884884
                    </strong>
                    <br/>
                    <a href="https://www.winway.lk" style="color:#0066cc; text-decoration:none;">
                      <strong>🌐︎</strong> www.winway.lk
                    </a>
                    |
                    <a href="https://www.884.lk" style="color:#0066cc; text-decoration:none;">
                      www.884.lk
                    </a>
                  </td>

                  <td align="right" width="60">
                    <img src="cid:nlblogo@cid" width="55" height="55" />
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
</html>
`;
};
function parseYearMonth(text) {
  if (!text) return { formatted: "", nextMonth: "" };

  const [yearStr, monthStr] = text.split("_");
  if (!yearStr || !monthStr) return { formatted: "", nextMonth: "" };

  const year = parseInt(yearStr, 10);

  // Create date from year + month
  const date = new Date(`${monthStr} 1, ${year}`);
  if (isNaN(date.getTime())) {
    return { formatted: "", nextMonth: "" };
  }

  // Move to next month
  date.setMonth(date.getMonth() + 1);

  const nextYear = date.getFullYear();
  const nextMonthName = date.toLocaleString("en-US", { month: "long" });

  date.setMonth(date.getMonth() + 1);

  const nextYear2 = date.getFullYear();
  const nextMonthName2 = date.toLocaleString("en-US", { month: "long" });
  return {
    formatted: `${monthStr} ${year}`,
    nextMonth: `${nextMonthName} ${nextYear}`,
    next2Month: `${nextMonthName2} ${nextYear2}`,
  };
}

export const generateLoyaltDowngradeEmail = (
  name = "Valued Customer",
  customer = {},
  number, // (optional) fallback mobile
) => {
  const info = customer?.CustomerInfo || {};
  const tier = info?.Current_Loyalty_Tier || "-";
  const gender = info?.Gender || "-";

  const prevTier = info?.lastMonthLoyaltyTier || "-";
  const evaluation = parseYearMonth(customer.Last_Update).formatted;
  const nextMonth = parseYearMonth(customer.Last_Update).nextMonth;
  const nextMonth2 = parseYearMonth(customer.Last_Update).next2Month;

  const salutation =
    gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : "";

  let content = "";

  if (tier === "Gold") {
    content = `
  <p>
    As part of our monthly loyalty review, your tier has been
downgraded from <strong> ${prevTier} to    <strong> Gold</strong>, based on your ticket
    purchases during <strong>${evaluation}</strong>.
  </p>
<!-- BLACK CARD (COMPACT) -->
<table width="56%" align="center" style="
  background:#000;
  color:#fff;
  border-radius:12px;
  padding:14px;
  margin:14px auto;
">
  <tr><td>

    <!-- Logos -->
    <table width="100%">
      <tr>
        <td>
          <img src="cid:winwaylogo@cid" width="42" height="42" />
        </td>
        <td align="right">
          <img src="cid:loyalty@cid" width="55" height="42" />
        </td>
      </tr>
    </table>

    <!-- Name -->
    <div style="
      text-align:center;
      font-size:12px;
      letter-spacing:1.5px;
      margin-top:8px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- Card Number -->
    <div style="
      text-align:center;
      font-size:16px;
      letter-spacing:3px;
      margin:6px 0;
      font-weight:600;
    ">
      ${number}
    </div>

    <!-- Tier + Validity -->
    <table width="100%" style="margin-top:10px;">
      <tr>
        <td>
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>
        <td align="right">
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

  </td></tr>
</table>

  <p><strong>As a Gold tier customer, you will continue to enjoy the following benefits:</strong></p>

  <ul>
    <li><strong>3.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>500 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    Please note that loyalty tiers are reviewed monthly.
    If you purchase <strong>1,000 </strong>, or more tickets during <strong>${nextMonth}</strong>.
    your tier will be upgraded back to <strong>Platinum</strong> in the next cycle
    starting <strong>${nextMonth2}</strong>.
  </p>

  <p>
    Additionally, if the required ticket quantity for your current tier is not met,
    your loyalty tier may be downgraded in subsequent monthly reviews.
    Customers who move to the <strong>Blue tier</strong> and do not make qualifying
    purchases for three consecutive months may no longer remain eligible for the
    <strong>WIN WAY Loyalty Rewards Program</strong>.
  </p>
  `;
  } else if (tier === "Silver") {
    content = `
  
  <p>
    Thank you for being a valued customer of <strong>WIN WAY</strong>.
  </p>

  <p>
   As part of our monthly loyalty review, your tier has been
    downgraded from <strong> ${prevTier}</strong> to  <strong>Silver</strong>, based on your ticket
    purchases during <strong>${evaluation}</strong>.

  </p>
<!-- BLACK CARD (COMPACT) -->
<table width="56%" align="center" style="
  background:#000;
  color:#fff;
  border-radius:12px;
  padding:14px;
  margin:14px auto;
">
  <tr><td>

    <!-- Logos -->
    <table width="100%">
      <tr>
        <td>
          <img src="cid:winwaylogo@cid" width="42" height="42" />
        </td>
        <td align="right">
          <img src="cid:loyalty@cid" width="55" height="42" />
        </td>
      </tr>
    </table>

    <!-- Name -->
    <div style="
      text-align:center;
      font-size:12px;
      letter-spacing:1.5px;
      margin-top:8px;
      color:#e6e6e6;
    ">
      ${name.toUpperCase()}
    </div>

    <!-- Card Number -->
    <div style="
      text-align:center;
      font-size:16px;
      letter-spacing:3px;
      margin:6px 0;
      font-weight:600;
    ">
      ${number}
    </div>

    <!-- Tier + Validity -->
    <table width="100%" style="margin-top:10px;">
      <tr>
        <td>
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:${
              tier.toLowerCase() === "gold"
                ? "#d4af37"
                : tier.toLowerCase() === "silver"
                  ? "#c0c0c0"
                  : tier.toLowerCase() === "platinum"
                    ? "#e5e4e2"
                    : "#a974ff"
            };
            font-weight:600;
          ">
            ${tier.toUpperCase()}
          </span>
        </td>
        <td align="right">
          <span style="
            padding:5px 10px;
            border-radius:6px;
            font-size:12px;
            background:#000;
            color:#fff;
          ">
            Valid till ${validityDate}
          </span>
        </td>
      </tr>
    </table>

  </td></tr>
</table>

  <p>As a Silver tier customer, you are entitled to the following benefits:</p>

  <ul>
    <li><strong>2.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>300 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    Loyalty tiers are reviewed monthly.
    If you purchase <strong>300 </strong>, or more tickets during <strong>${nextMonth}</strong>.
    your tier will be upgraded back to <strong>Gold</strong> in the next cycle
    starting <strong>${nextMonth2}</strong>.
  </p>

  <p>
    Simply continue purchasing your tickets through <strong>WIN WAY</strong> —
    no additional steps are required.
  </p>
  `;
  } else if (tier === "Blue") {
    content = `
 
  

  <p>
    As part of our monthly loyalty review, your tier has been downgraded from
    <strong> ${prevTier}  </strong> to <strong>Blue</strong>, based on your ticket purchases
    during the previous month.
  </p>

  <p>
    While the <strong>Blue tier</strong> you may not entitled for loyalty customer benefits,
    upgrading is simple.
  </p>

  <p>
    If you purchase <strong>300</strong>,  or more tickets during <strong>${nextMonth}</strong>.
    your tier will be upgraded in the next cycle
    starting <strong>${nextMonth2}</strong>.
  </p>

  <p>
    Our loyalty tiers are reviewed every month, giving you the opportunity
    to move up and enjoy greater rewards at any time.
  </p>
  `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>WIN WAY Loyalty Summary</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f7; font-family:Arial, sans-serif;">
  <table width="100%" role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- OUTER WRAPPER -->
        <table width="700" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:0;">
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                border-radius:18px 18px 0 0;
                padding:22px 30px;">
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
                      <img src="cid:winwaylogo@cid" width="90" height="90" style="border-radius:8px;" />
                    </td>

                    <td align="center">
                      <h1 style="
                        color:#fff;
                        font-size:32px;
                        margin:0;
                        font-family:'Crimson Text';">
                       Loyalty Tier Update!
                      </h1>
                    </td>

                    <td width="70">&nbsp;</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">

              <p style="font-size:18px; margin:0 0 15px 0; font-family:'Sylfaen'; ">
                <strong>
                  Dear ${salutation} ${String(name).toUpperCase()}
                </strong>,
              </p>

              <div style="font-family:'Sylfaen'; font-size:15px;">
  ${content}
</div>

               <p style="font-family:'Sylfaen';font-size:15px;margin:0 0 20px;">
              
                              Loyalty status is reviewed monthly and is based on the following criteria

              </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
  <tr>
    <td width="100%" style="padding:4px 6px;">
      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          border-radius:8px;
          overflow:hidden;
          font-size:12px;
          font-weight:600;
          text-align:center;
          border:1px solid #000;
          line-height:1.2;
        "
      >
        <tr>
          <!-- Silver -->
          <td
            width="33.33%"
            style="
              background:#C0C0C0;
              padding:4px 2px;
              color:#333;
              border-right:1px solid #000;
            "
          >
            Silver<br />
            &gt; 300
          </td>

          <!-- Gold -->
          <td
            width="33.33%"
            style="
              background:#E6B800;
              padding:4px 2px;
              color:#fff;
              border-right:1px solid #000;
            "
          >
            Gold<br />
            &gt; 500
          </td>

          <!-- Platinum -->
          <td
            width="33.33%"
            style="
              background:#9B5DE5;
              padding:4px 2px;
              color:#fff;
            "
          >
            Platinum<br />
            &gt; 1000
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>



                      

              
              
              
              
              <p style="margin-top:25px; font-family:'Sylfaen';  font-size:15px;">
              There’s nothing extra you need to do — just keep purchasing your tickets through <strong>WIN WAY</strong> and enjoy the rewards.
             
              
              </p>

              <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
                If you have any questions, contact <strong>info@winway.lk</strong> or call <strong>0707 884 884 | 0722 884 884</strong>.
              </p>

              <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
              <br/>
               Best regards,<br/>
                <strong>WIN WAY</strong><br/>
               National Lotteries Board

              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5; border-top:1px solid #eee; padding:18px 30px; font-size:14px; color:#777;">
              <table width="100%">
                <tr>
                  <td align="left">
                    <strong>
                      Copyright © ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                      📞 0707884884 | 0722884884
                    </strong>
                    <br/>
                    <a href="https://www.winway.lk" style="color:#0066cc; text-decoration:none;">
                      <strong>🌐︎</strong> www.winway.lk
                    </a>
                    |
                    <a href="https://www.884.lk" style="color:#0066cc; text-decoration:none;">
                      www.884.lk
                    </a>
                  </td>

                  <td align="right" width="60">
                    <img src="cid:nlblogo@cid" width="55" height="55" />
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
</html>
`;
};

export const generateLoyaltyCustomeEmail = (
  name = "Valued Customer",
  body,
  title,
  customer = {},
) => {
  const gender = customer?.Gender || "-";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>WIN WAY Loyalty Rewards</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f7;  sans-serif;">
  <table width="100%" role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- OUTER WRAPPER -->
        <table width="700" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:0;">
              
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                border-radius:18px 18px 0 0;
                padding:22px 30px;">
                
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
    <img src="cid:winwaylogo@cid" width="90" height="90" style="border-radius:8px;" />                    </td>

                    <td align="center">
                      <h1 style="
                        color:#fff;
                        font-size:32px;
                        margin:0;
                        
                        font-family:'Crimson Text';">
                       ${title}
                      </h1>
                    </td>

                    <td width="70">&nbsp;</td>
                  </tr>
                </table>

              </div>
            </td>
          </tr>


          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">

              <p style="font-size:18px; margin:0 0 15px 0;   font-family:'Sylfaen';  ">
                <strong>
                  Dear ${
                    gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : ""
                  } ${toProperCase(name.toUpperCase())},
                </strong>
              </p>

              
                            <p style="margin:0 0 25px 0; font-family:'Sylfaen';font-size:15px;">
                            

   ${body}
                            </p>
              

   





          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5; border-top:1px solid #eee; padding:18px 30px; font-size:14px; color:#777;">

              <table width="100%">
                <tr>
                  <td align="left">
                <strong>   Copyright   ©  ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                    📞 0707884884 | 0722884884
                     </strong>
<br/>

 <a href="https://www.winway.lk" style="color:#0066cc; text-decoration:none;">    <strong>  🌐︎ </strong>     www.winway.lk</a> |
                <a href="https://www.884.lk" style="color:#0066cc; text-decoration:none;"> www.884.lk</a>


                  </td>

                  <td align="right" width="60">
                    <img src="cid:nlblogo@cid" width="55" height="55" />
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
</html>
`;
};

export const generateLoyaltySameEmail = (
  name = "Valued Customer",
  customer = {},
  number, // (optional) fallback mobile
) => {
  const info = customer?.CustomerInfo || {};
  const history = Array.isArray(customer?.History) ? customer.History : [];

  const tier = info?.Current_Loyalty_Tier || "-";
  const gender = info?.Gender || "-";

  const mobile = customer?.MobileNumber || number || "-";
  const loyaltyNo = info?.Loyalty_Number || "-";
  const email = info?.Email || "-";
  const wallet =
    typeof info?.WalletBalance === "number" ? info.WalletBalance : "-";
  const currentTickets =
    typeof info?.Current_Ticket_Count === "number"
      ? info.Current_Ticket_Count
      : "-";
  const lastPurchase = info?.Last_Purchase_Time || "-";

  const salutation =
    gender === "Male" ? "Mr." : gender === "Female" ? "Ms." : "";

  let content = "";

  // ================= PLATINUM (NO CHANGE) =================
  if (tier === "Platinum") {
    content = `
  <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier remains
    <strong>Platinum</strong>, the highest level of the
    <strong>WIN WAY Loyalty Rewards Program</strong>.
  </p>

  <p>As a Platinum tier customer, you will continue to enjoy our most exclusive benefits:</p>

  <ul>
    <li><strong>5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>1,000 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>


  
  `;
  }

  // ================= GOLD (NO CHANGE) =================
  else if (tier === "Gold") {
    content = `
   <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier remains
    <strong>Gold</strong> as part of our monthly
    <strong>WIN WAY Loyalty Rewards Program</strong> review.
  </p>

  <p>As a Gold tier customer, you will continue to enjoy the following exclusive benefits:</p>

  <ul>
    <li><strong>3.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>500 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    Our loyalty tiers are reviewed monthly, so continued purchases can help you
    move closer to <strong>Platinum</strong> and unlock even greater rewards.
  </p>
  `;
  }

  // ================= SILVER (NO CHANGE) =================
  else if (tier === "Silver") {
    content = `
  <p>
    We are pleased to inform you that based on your ticket purchases during the
    previous month, your loyalty tier remains
    <strong>Silver</strong> as part of our monthly
    <strong>WIN WAY Loyalty Rewards Program</strong> review.
  </p>

  <p>As a Silver tier customer, you will continue to enjoy the following benefits:</p>

  <ul>
    <li><strong>2.5%</strong> cashback on every ticket purchased</li>
    <li>Cashback applies when you purchase more than <strong>300 tickets</strong> within the month</li>
    <li>Cashback will be credited to your <strong>WIN WAY Wallet</strong> in the first week of the following month</li>
  </ul>

  <p>
    Loyalty tiers are reviewed monthly, giving you the opportunity to move up
    and enjoy even greater rewards.
  </p>
  `;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>WIN WAY Loyalty Summary</title>
</head>

<body style="margin:0; padding:0; background:#f4f4f7; font-family:Arial, sans-serif;">
  <table width="100%" role="presentation" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" style="padding:30px 0;">

        <!-- OUTER WRAPPER -->
        <table width="700" style="
          background:#EBF0F9;
          border-radius:18px;
          overflow:hidden;
          border:3px solid #000;
          box-shadow:0 5px 25px rgba(0,0,0,0.1);
        ">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:0;">
              <div style="
                background:linear-gradient(135deg,#7b2ff7,#f107a3);
                border-radius:18px 18px 0 0;
                padding:22px 30px;">
                <table width="100%">
                  <tr>
                    <td align="left" width="70">
                      <img src="cid:winwaylogo@cid" width="90" height="90" style="border-radius:8px;" />
                    </td>

                    <td align="center">
                      <h1 style="
                        color:#fff;
                        font-size:32px;
                        margin:0;
                        font-family:'Crimson Text';">
                       Loyalty Tier Update!
                      </h1>
                    </td>

                    <td width="70">&nbsp;</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding:40px; font-size:16px; color:#333; line-height:1.6;">

              <p style="font-size:18px; margin:0 0 15px 0; font-family:'Sylfaen'; ">
                <strong>
                  Dear ${salutation} ${String(name).toUpperCase()}
                </strong>,
              </p>

              <div style="font-family:'Sylfaen'; font-size:15px;">
  ${content}
</div>

              
  <p style="font-family:'Sylfaen';font-size:15px;margin:0 0 20px;">
              
                               Loyalty status is reviewed monthly and is based on the following criteria

              </p>
                  


                      

              
              
              
              
              <p style="margin-top:25px; font-family:'Sylfaen';  font-size:15px;">
              There’s nothing extra you need to do — just keep purchasing your tickets through <strong>WIN WAY</strong> and enjoy the rewards.
             
              
              </p>

              <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
                If you have any questions, contact <strong>info@winway.lk</strong> or call <strong>0707 884 884 | 0722 884 884</strong>.
              </p>

               <p style="margin:0; font-family:'Sylfaen';  font-size:15px;">
               <br/>
                Best regards,<br/>
                <strong>WIN WAY</strong><br/>
               National Lotteries Board
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#D6DCE5; border-top:1px solid #eee; padding:18px 30px; font-size:14px; color:#777;">
              <table width="100%">
                <tr>
                  <td align="left">
                    <strong>
                      Copyright © ${new Date().getFullYear()} ThinkCube Systems (Pvt) Ltd.<br/>
                      📞 0707884884 | 0722884884
                    </strong>
                    <br/>
                    <a href="https://www.winway.lk" style="color:#0066cc; text-decoration:none;">
                      <strong>🌐︎</strong> www.winway.lk
                    </a>
                    |
                    <a href="https://www.884.lk" style="color:#0066cc; text-decoration:none;">
                      www.884.lk
                    </a>
                  </td>

                  <td align="right" width="60">
                    <img src="cid:nlblogo@cid" width="55" height="55" />
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
</html>
`;
};
