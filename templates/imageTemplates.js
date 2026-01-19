export const genarateImageTemplate = (
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
                  tickets
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
