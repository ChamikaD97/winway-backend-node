import express from "express";
import db from "../models/winwayNew.js";

const router = express.Router();

/* ======================================================
   🔐 LOGIN
====================================================== */
router.post("/login", (req, res) => {
  const { mobile } = req.body;

  const sql = `
    SELECT MobileNumber, FirstName, LastName, Email, Status, Current_Loyalty_Tier
    FROM Current_Customer_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!row) return res.status(404).json({ message: "User not found" });

    res.json({
      token: "dev-token",
      user: row,
    });
  });
});

/* ======================================================
   👤 PROFILE
====================================================== */
router.get("/profile/:mobile", (req, res) => {
  const { mobile } = req.params;

  const sql = `
    SELECT MobileNumber, FirstName, LastName, Email, Gender,
           RegisteredDate, DateOfBirth, Country, Status, WalletBalance
    FROM Current_Customer_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(row);
  });
});

/* ======================================================
   📊 DASHBOARD
====================================================== */
router.get("/dashboard/:mobile", (req, res) => {
  const { mobile } = req.params;
console.log(mobile);

  const sql = `
    SELECT Current_Loyalty_Tier, Current_Ticket_Count,
           WalletBalance, Last_Purchase_Time
    FROM Current_Customer_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(row);
  });
});

/* ======================================================
   🎟️ INITIAL TICKETS
====================================================== */


/* ======================================================
   📆 MONTHLY TICKETS
====================================================== */
router.get("/tickets/monthly/:mobile", (req, res) => {
  const { mobile } = req.params;
  const { month } = req.query; // YYYY-MM

  const sql = `
    SELECT Last_Update, Month_Tier, Ada_Sampatha, Dhana_Nidhanaya,
           Govisetha, Handahana, Jaya, Mahajana_Sampatha,
           Mega_Power, Suba_Dawasak, Monthly_Ticket_Count
    FROM Monthly_Upgrade_Details
    WHERE MobileNumber = ?
      AND substr(Last_Update, 1, 7) = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile, month], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(row);
  });
});

/* ======================================================
   📅 DAILY TICKETS
====================================================== */
router.get("/tickets/daily/:mobile", (req, res) => {
  const { mobile } = req.params;

  const sql = `
    SELECT From_Date, To_Date, Month_Tier,
           Ada_Sampatha, Dhana_Nidhanaya, Govisetha, Handahana,
           Jaya, Mahajana_Sampatha, Mega_Power, Suba_Dawasak,
           Ticket_Count
    FROM Daily_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY From_Date DESC
  `;

  db.all(sql, [mobile], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

/* ======================================================
   🏆 LOYALTY STATUS
====================================================== */
router.get("/loyalty/:mobile", (req, res) => {
  const { mobile } = req.params;

  const sql = `
    SELECT Current_Loyalty_Tier, Current_Ticket_Count
    FROM Current_Customer_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });

    const tierTargets = {
      Silver: 500,
      Gold: 1500,
      Platinum: 3000,
    };

    const nextTier =
      row.Current_Loyalty_Tier === "Silver"
        ? "Gold"
        : row.Current_Loyalty_Tier === "Gold"
        ? "Platinum"
        : null;

    res.json({
      currentTier: row.Current_Loyalty_Tier,
      ticketCount: row.Current_Ticket_Count,
      nextTier,
      ticketsNeeded: nextTier
        ? tierTargets[nextTier] - row.Current_Ticket_Count
        : 0,
    });
  });
});

/* ======================================================
   📈 LOYALTY HISTORY
====================================================== */
router.get("/loyalty/history/:mobile", (req, res) => {
  const { mobile } = req.params;

  const sql = `
    SELECT substr(Last_Update,1,7) AS Month, Month_Tier
    FROM Monthly_Upgrade_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update ASC
  `;

  db.all(sql, [mobile], (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

/* ======================================================
   💰 WALLET
====================================================== */
router.get("/wallet/:mobile", (req, res) => {
  const { mobile } = req.params;

  const sql = `
    SELECT WalletBalance
    FROM Current_Customer_Details
    WHERE MobileNumber = ?
    ORDER BY Last_Update DESC
    LIMIT 1
  `;

  db.get(sql, [mobile], (err, row) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(row);
  });
});
/* ======================================================
   🎟️ TICKET PURCHASE HISTORY (DAILY)
====================================================== */
router.get("/tickets/history/:mobile", (req, res) => {
  const { mobile } = req.params;
  const { from, to } = req.query;

  let sql = `
    SELECT
      From_Date,
      To_Date,
      Month_Tier,
      Ticket_Count,
      Ada_Sampatha,
      Dhana_Nidhanaya,
      Govisetha,
      Handahana,
      Jaya,
      Mahajana_Sampatha,
      Mega_Power,
      Suba_Dawasak
    FROM Daily_Upgrade_Details
    WHERE MobileNumber = ?
  `;

  const params = [mobile];

  if (from && to) {
    sql += " AND date(From_Date) >= date(?) AND date(To_Date) <= date(?)";
    params.push(from, to);
  }

  sql += " ORDER BY From_Date DESC";

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

export default router;
