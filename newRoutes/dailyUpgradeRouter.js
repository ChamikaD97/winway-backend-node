import express from "express";
import db from "../models/winwayNew.js";

const router = express.Router();


//  db.prepare("DROP TABLE IF EXISTS Monthly_Upgrade_Details").run();
//  db.prepare("DROP TABLE IF EXISTS Current_Customer_Details").run();


router.get("/all-customers", (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT MobileNumber
      FROM (
        SELECT MobileNumber FROM Daily_Upgrade_Details
        UNION
        SELECT MobileNumber FROM Monthly_Upgrade_Details
      )
      ORDER BY MobileNumber ASC
    `;

    db.all(sql, [], async (err, customerRows) => {
      if (err) {
        console.error("❌ Error fetching customers:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to load upgrade customers",
          error: err.message,
        });
      }

      const results = [];

      for (const c of customerRows) {
        const mobile = c.MobileNumber;

        // Fetch daily data
        const daily = await new Promise((resolve) => {
          db.all(
            `
              SELECT *
              FROM Daily_Upgrade_Details
              WHERE MobileNumber = ?
              ORDER BY From_Date ASC
            `,
            [mobile],
            (err, rows) => resolve(rows || [])
          );
        });

        // Fetch monthly data
        const monthly = await new Promise((resolve) => {
          db.all(
            `
              SELECT *
              FROM Monthly_Upgrade_Details
              WHERE MobileNumber = ?
              ORDER BY Last_Update ASC
            `,
            [mobile],
            (err, rows) => resolve(rows || [])
          );
        });

        // Combine totals
        let totalTickets = 0;
        let firstDate = null;
        let lastDate = null;

        if (daily.length > 0) {
          firstDate = daily[0].From_Date;
          lastDate = daily[daily.length - 1].To_Date;

          totalTickets = daily.reduce((sum, row) => sum + (row.Ticket_Count || 0), 0);
        }

        if (monthly.length > 0) {
          totalTickets += monthly.reduce(
            (sum, row) => sum + (row.Monthly_Ticket_Count || 0),
            0
          );
        }

        results.push({
          MobileNumber: mobile,
          Daily: daily,
          Monthly: monthly,
          Summary: {
            totalTickets,
            totalDailyDays: daily.length,
            totalMonthlySummaries: monthly.length,
            firstDate,
            lastDate,
          },
        });
      }

      return res.json({
        success: true,
        count: results.length,
        data: results,
      });
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});


router.get("/all-ssscustomers", (req, res) => {
  try {
    const sql = `
      SELECT DISTINCT MobileNumber
      FROM (
        SELECT MobileNumber FROM Daily_Upgrade_Details
        UNION
        SELECT MobileNumber FROM Monthly_Upgrade_Details
      )
      ORDER BY MobileNumber ASC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error("❌ Error fetching upgrade customers:", err);
        return res.status(500).json({
          success: false,
          message: "Failed to fetch upgrade customer list",
          error: err.message,
        });
      }

      return res.json({
        success: true,
        data: rows,
      });
    });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
});

/* --------------------------------------
   Helper: Convert YYYY-MM-DD → Date
---------------------------------------*/
function toDate(d) {
  return new Date(d + "T00:00:00");
}

/* --------------------------------------
   Helper: Last Day of Month
---------------------------------------*/
function getLastDayOfMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/* --------------------------------------
   Get last daily record for customer
---------------------------------------*/
function getLastDailyRow(mobile) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT *
      FROM Daily_Upgrade_Details
      WHERE MobileNumber = ?
      ORDER BY To_Date DESC
      LIMIT 1
      `,
      [mobile],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/* --------------------------------------
   Insert a new daily record
---------------------------------------*/
function insertNewDailyRecord(data) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO Daily_Upgrade_Details (
        MobileNumber, From_Date, To_Date,
        Month_Tier,
        Ada_Sampatha, Dhana_Nidhanaya, Govisetha, Handahana,
        Jaya, Mahajana_Sampatha, Mega_Power, Suba_Dawasak,
        Ticket_Count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        data.MobileNumber,
        data.From_Date,
        data.To_Date,
        data.Month_Tier ?? null,

        data.Ada_Sampatha ?? 0,
        data.Dhana_Nidhanaya ?? 0,
        data.Govisetha ?? 0,
        data.Handahana ?? 0,
        data.Jaya ?? 0,
        data.Mahajana_Sampatha ?? 0,
        data.Mega_Power ?? 0,
        data.Suba_Dawasak ?? 0,

        data.Ticket_Count ?? 0,
      ],
      (err) => {
        if (err) reject(err);
        else resolve("Daily record inserted");
      }
    );
  });
}

/* --------------------------------------
   Update + merge daily record
---------------------------------------*/
function updateMergedDailyRecord(lastRow, data, merged) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      UPDATE Daily_Upgrade_Details
      SET 
        To_Date = ?,
        Ada_Sampatha        = ?,
        Dhana_Nidhanaya     = ?,
        Govisetha           = ?,
        Handahana           = ?,
        Jaya                = ?,
        Mahajana_Sampatha   = ?,
        Mega_Power          = ?,
        Suba_Dawasak        = ?,
        Ticket_Count        = ?,
        Month_Tier          = ?
      WHERE MobileNumber = ? AND From_Date = ?
      `,
      [
        data.To_Date,

        merged.Ada_Sampatha,
        merged.Dhana_Nidhanaya,
        merged.Govisetha,
        merged.Handahana,
        merged.Jaya,
        merged.Mahajana_Sampatha,
        merged.Mega_Power,
        merged.Suba_Dawasak,

        merged.Ticket_Count,
        merged.Month_Tier,

        data.MobileNumber,
        lastRow.From_Date,
      ],
      (err) => {
        if (err) reject(err);
        else resolve("Daily record merged & updated");
      }
    );
  });
}

/* --------------------------------------
   Insert into Monthly Summary Table
---------------------------------------*/
function insertMonthlyRecord(mobile, month, data) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO Monthly_Upgrade_Details (
        MobileNumber, Last_Update, Month_Tier,
        Ada_Sampatha, Dhana_Nidhanaya, Govisetha, Handahana,
        Jaya, Mahajana_Sampatha, Mega_Power, Suba_Dawasak,
        Monthly_Ticket_Count
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        mobile,
        month, // "YYYY-MM"
        data.Month_Tier,

        data.Ada_Sampatha,
        data.Dhana_Nidhanaya,
        data.Govisetha,
        data.Handahana,
        data.Jaya,
        data.Mahajana_Sampatha,
        data.Mega_Power,
        data.Suba_Dawasak,

        data.Ticket_Count,
      ],
      (err) => {
        if (err) reject(err);
        else resolve("Monthly summary saved");
      }
    );
  });
}

/* =======================================================================
   POST /daily-upgrade
   Inserts or merges daily records + detects end of month
=======================================================================*/
router.post("/daily-upgrade", async (req, res) => {
  try {
    const { customers, date_range } = req.body;

    // Build proper dates once
    const From_Date = `${date_range.fromYear}-${date_range.fromMonth}-${date_range.fromDay}`;
    const To_Date   = `${date_range.toYear}-${date_range.toMonth}-${date_range.toDay}`;

    console.log("📅 Incoming Range:", From_Date, "→", To_Date);

    const results = [];

    for (const c of customers) {
      const MobileNumber = c.MobileNumber;

      // Extract Lottery Breakdown safely
      const lb = c.LotteryBreakdown || {};

      // Convert new fields into DB fields
      const data = {
        MobileNumber,
        From_Date,
        To_Date,
        Month_Tier: c.Loyalty_Tier ?? null,

        Ada_Sampatha: lb["Ada Sampatha"] ?? 0,
        Dhana_Nidhanaya: lb["Dhana Nidhanaya"] ?? 0,
        Govisetha: lb["Govisetha"] ?? 0,
        Handahana: lb["Handahana"] ?? 0,
        Jaya: lb["Jaya"] ?? 0,
        Mahajana_Sampatha: lb["Mahajana Sampatha"] ?? 0,
        Mega_Power: lb["Mega Power"] ?? 0,
        Suba_Dawasak: lb["Suba Dawasak"] ?? 0,

        Ticket_Count: c.Ticket_Count ?? 0,
      };

      try {
        const lastRow = await getLastDailyRow(MobileNumber);

        // No previous record → simple insert
        if (!lastRow) {
          await insertNewDailyRecord(data);
          results.push({ MobileNumber, status: "Inserted new record" });
          continue;
        }

        // Validate date continuity
        const lastTo = toDate(lastRow.To_Date);
        const newFrom = toDate(From_Date);
        const expectedNext = new Date(lastTo);
        expectedNext.setDate(expectedNext.getDate() + 1);

        if (newFrom.getTime() !== expectedNext.getTime()) {
          results.push({
            MobileNumber,
            status: "Error",
            message: `Invalid date range: ${From_Date} must be the day after ${lastRow.To_Date}`,
          });
          continue;
        }

        // Merge all numeric values
        const merged = {
          Ada_Sampatha: lastRow.Ada_Sampatha + data.Ada_Sampatha,
          Dhana_Nidhanaya: lastRow.Dhana_Nidhanaya + data.Dhana_Nidhanaya,
          Govisetha: lastRow.Govisetha + data.Govisetha,
          Handahana: lastRow.Handahana + data.Handahana,
          Jaya: lastRow.Jaya + data.Jaya,
          Mahajana_Sampatha: lastRow.Mahajana_Sampatha + data.Mahajana_Sampatha,
          Mega_Power: lastRow.Mega_Power + data.Mega_Power,
          Suba_Dawasak: lastRow.Suba_Dawasak + data.Suba_Dawasak,

          Ticket_Count: lastRow.Ticket_Count + data.Ticket_Count,
          Month_Tier: data.Month_Tier ?? lastRow.Month_Tier,
        };

        // Update merged range
        await updateMergedDailyRecord(lastRow, data, merged);

        // MONTH COMPLETION CHECK
        const monthStart = From_Date.substring(0, 7) + "-01";
        const monthEnd = getLastDayOfMonth(monthStart);

        if (toDate(To_Date).getTime() === monthEnd.getTime()) {
          await insertMonthlyRecord(
            MobileNumber,
            monthStart.substring(0, 7),
            merged
          );
        }

        results.push({ MobileNumber, status: "Merged & updated" });
      } catch (error) {
        console.error(error);
        results.push({ MobileNumber, status: "Error", error: error.message });
      }
    }

    return res.json({ success: true, results });

  } catch (err) {
    console.error("❌ Server Error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
});


/* =======================================================================
   GET ALL DAILY RECORDS
=======================================================================*/
router.get("/daily-upgrade/:mobile", (req, res) => {
  const mobile = req.params.mobile;

  db.all(
    `
    SELECT *
    FROM Daily_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY From_Date ASC
    `,
    [mobile],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      return res.json({ success: true, data: rows });
    }
  );
});

/* =======================================================================
   GET LATEST DAILY RECORD
=======================================================================*/
router.get("/daily-upgrade/:mobile/latest", (req, res) => {
  const mobile = req.params.mobile;

  db.get(
    `
    SELECT *
    FROM Daily_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY To_Date DESC
    LIMIT 1
    `,
    [mobile],
    (err, row) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      return res.json({ success: true, data: row || null });
    }
  );
});

/* =======================================================================
   GET ALL MONTHLY RECORDS
=======================================================================*/
router.get("/monthly-upgrade/:mobile", (req, res) => {
  const mobile = req.params.mobile;

  db.all(
    `
    SELECT *
    FROM Monthly_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update ASC
    `,
    [mobile],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      return res.json({ success: true, data: rows });
    }
  );
});

/* =======================================================================
   GET LATEST MONTHLY RECORD
=======================================================================*/
router.get("/monthly-upgrade/:mobile/latest", (req, res) => {
  const mobile = req.params.mobile;

  db.get(
    `
    SELECT *
    FROM Monthly_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
    `,
    [mobile],
    (err, row) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      return res.json({ success: true, data: row || null });
    }
  );
});

export default router;
