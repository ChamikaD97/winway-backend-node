// routes/dashboardRoutes.js
import express from "express";
import db from "../models/winwayNew.js";

const router = express.Router();

// ==========================================================
// Ensure tables exist (DO NOT DROP — real data will stay)
// ==========================================================

// ==========================================================
// 1️⃣ SUMMARY KPIs
// ==========================================================
router.get("/summary", (req, res) => {
  try {
    const totalCustomers = db
      .prepare("SELECT COUNT(*) AS count FROM Current_Customer_Details")
      .get();
    const activeToday = db
      .prepare(
        `
      SELECT COUNT(*) AS count 
      FROM Current_Customer_Details 
      WHERE DATE(Last_Purchase_Time) = DATE('now')
    `
      )
      .get();

    const totalTickets = db
      .prepare(
        "SELECT SUM(Current_Ticket_Count) AS count FROM Current_Customer_Details"
      )
      .get();
    const totalWallet = db
      .prepare(
        "SELECT SUM(WalletBalance) AS total FROM Current_Customer_Details"
      )
      .get();

    return res.json({
      success: true,
      message: "Dashboard summary fetched",
      data: {
        totalCustomers: totalCustomers?.count || 0,
        activeToday: activeToday?.count || 0,
        totalTickets: totalTickets?.count || 0,
        totalWallet: totalWallet?.total || 0,
      },
    });
  } catch (error) {
    console.error("❌ Summary error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});



// ==========================================================
// 3️⃣ TICKET POPULARITY
// ==========================================================
router.get("/ticket-popularity", (req, res) => {
  try {
    return res.json({
      success: true,
      message: "Ticket popularity fetched",
      data: row,
    });
  } catch (error) {
    console.error("❌ Ticket popularity error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 4️⃣ MONTHLY REGISTRATIONS
// ==========================================================
router.get("/registrations/monthly", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT 
        strftime('%Y-%m', RegisteredDate) AS month,
        COUNT(*) AS registrations
      FROM Current_Customer_Details
      GROUP BY month
      ORDER BY month
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Monthly registrations fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Monthly registrations error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 5️⃣ DAILY PURCHASE TREND
// ==========================================================
router.get("/purchases/daily", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT 
        DATE(Last_Purchase_Time) AS day,
        COUNT(*) AS total
      FROM Current_Customer_Details
      GROUP BY DATE(Last_Purchase_Time)
      ORDER BY day
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Daily purchases fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Daily purchase error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 6️⃣ TOP CUSTOMERS
// ==========================================================
router.get("/customers/top", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT 
        MobileNumber,
        FirstName,
        LastName,
        Current_Ticket_Count,
        Current_Loyalty_Tier,
        WalletBalance
      FROM Current_Customer_Details
      ORDER BY Current_Ticket_Count DESC
      LIMIT 20
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Top customers fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Top customers error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 7️⃣ TIER UPGRADE CANDIDATES
// ==========================================================
router.get("/customers/upgrade-candidates", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT 
        MobileNumber,
        FirstName,
        LastName,
        Current_Ticket_Count,
        Current_Loyalty_Tier
      FROM Current_Customer_Details
      WHERE Current_Ticket_Count BETWEEN 15 AND 99
      ORDER BY Current_Ticket_Count DESC
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Tier upgrade candidates fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Upgrade candidate error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 8️⃣ MISSING EMAIL CUSTOMERS
// ==========================================================
router.get("/customers/missing-email", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT MobileNumber, FirstName, LastName
      FROM Current_Customer_Details
      WHERE Email IS NULL OR Email = ''
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Missing email customers fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Missing email error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

// ==========================================================
// 9️⃣ INACTIVE CUSTOMERS (>30 DAYS)
// ==========================================================
router.get("/customers/inactive", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
      SELECT MobileNumber, FirstName, LastName, Last_Purchase_Time
      FROM Current_Customer_Details
      WHERE DATE(Last_Purchase_Time) < DATE('now', '-30 days')
    `
      )
      .all();

    return res.json({
      success: true,
      message: "Inactive customers fetched",
      data: rows,
    });
  } catch (error) {
    console.error("❌ Inactive error:", error);
    return res.status(500).json({ success: false, message: "Internal error" });
  }
});

export default router;
