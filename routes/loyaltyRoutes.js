// routes/settingsRoutes.js
import express from "express";
import { db } from "../config/LoyaltyHistory.js";

const router = express.Router();

// 🧹 Delete all data
router.delete("/delete-all", (req, res) => {
  try {
    const { confirm } = req.query;
    if (confirm !== "true") {
      return res.status(400).json({
        success: false,
        message: "Confirmation required. Add ?confirm=true to proceed.",
      });
    }

    // Only clear data — do not remove tables
    const tables = [
      "customers",
      "customers_last_month",
      "lottery_breakdown_overoll",
      "lottery_breakdowns_last_month",
      "customer_tiers",
    ];

    // Wrap in a transaction for consistency
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      tables.forEach((table) => {
        db.run(`DELETE FROM ${table}`, function (err) {
          if (err) {
            console.error(`❌ Error clearing ${table}:`, err.message);
          } else {
            console.log(`🗑 Cleared all rows from table: ${table}`);
          }
        });
      });
      db.run("COMMIT");
    });

    res.status(200).json({
      success: true,
      message: "🧹 All table data deleted successfully (tables remain intact).",
    });

    console.log("⚠️ All table data wiped clean by admin request");
  } catch (err) {
    console.error("❌ Error deleting data:", err);
    res.status(500).json({
      success: false,
      message: "Server error while deleting data",
      error: err.message,
    });
  }
});

// 💾 Save customer, loyalty, and breakdown data
router.post("/save", (req, res) => {
  try {
    const { customers } = req.body;

    if (!customers || !customers.length)
      return res.status(400).json({ message: "No customers to save" });

    let inserted = 0;
    let updatedHistory = 0;
    let breakdownInserted = 0;

    const findCustomer = db.prepare(
      `SELECT * FROM customers WHERE MobileNumber = ?`
    );

    const insertBreakdown = db.prepare(`
      INSERT INTO lottery_breakdown (MobileNumber, Last_Purchase_Time, Lottery_Name, Ticket_Count)
      VALUES (?, ?, ?, ?)
    `);

    const insertCustomer = db.prepare(`
      INSERT OR REPLACE INTO customers (
        MobileNumber, FirstName, LastName, Email, Ticket_Count, Loyalty_Tier,
        Last_Purchase_Time, Gender, RegisteredDate, DateOfBirth, Status, Country, WalletBalance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const c of customers) {
      // 1️⃣ Save or update customer
      const existing = findCustomer.get(c.MobileNumber);
      const oldTier = existing ? existing.Loyalty_Tier : "N/A";
      const oldValue = existing ? existing.Ticket_Count : 0;
      const newValue = c.Ticket_Count || 0;
      const newTier = c.New_Tier;

      insertCustomer.run(
        c.MobileNumber,
        c.FirstName,
        c.LastName,
        c.Email || "",
        newValue + oldValue,
        c.Loyalty_Tier,
        c.Last_Purchase_Time || "",
        c.Gender || "",
        c.RegisteredDate || "",
        c.DateOfBirth || "",
        c.Status || "active",
        c.Country || "Sri Lanka",
        c.WalletBalance
      );

      // 2️⃣ Record loyalty history if tier changed
      if (!existing || oldTier !== newTier) {
        insertHistory.run(
          c.MobileNumber,
          oldTier,
          newTier,
          existing ? "Tier Changed Due to Upgrade" : "New customer",
          newValue
        );
        updatedHistory++;
      }

      // 3️⃣ Record per-lottery breakdown
      if (c.LotteryBreakdown && typeof c.LotteryBreakdown === "object") {
        const breakdown = c.LotteryBreakdown;
        Object.entries(breakdown).forEach(([lottery, count]) => {
          if (lottery !== "TotalTickets" && count > 0) {
            insertBreakdown.run(
              c.MobileNumber,
              c.Last_Purchase_Time || "",
              lottery,
              count
            );
            breakdownInserted++;
          }
        });
      }

      inserted++;
    }

    res.json({
      success: true,
      inserted,
      updatedHistory,
      breakdownInserted,
      message: `${inserted} customers saved, ${updatedHistory} tier updates, ${breakdownInserted} breakdown rows added.`,
    });
  } catch (err) {
    console.error("❌ Error saving loyalty data:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error saving loyalty data" });
  }
});

// 💾 Save loyalty history only
router.post("/loyalty_history_save", (req, res) => {
  try {
    const { customers } = req.body;
    if (!customers || !customers.length)
      return res.status(400).json({ message: "No customers to save" });

    let inserted = 0;
    let updatedHistory = 0;

    const findCustomer = db.prepare(
      `SELECT Loyalty_Tier FROM customers WHERE MobileNumber = ?`
    );

    const insertCustomer = db.prepare(`
      INSERT OR REPLACE INTO customers (
        MobileNumber, FirstName, LastName, Email, Ticket_Count, Loyalty_Tier,
        Last_Purchase_Time, Gender, RegisteredDate, DateOfBirth, Status, Country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertHistory = db.prepare(`
      INSERT INTO loyalty_history (customer_mobile, old_tier, new_tier, reason , lastMonthTickets)
      VALUES (?, ?, ?, ? , ?)
    `);

    for (const c of customers) {
      const existing = findCustomer.get(c.MobileNumber);
      const oldTier = existing ? existing.Loyalty_Tier : "N/A";
      const newTier = c.Loyalty_Tier || "Blue";

      insertCustomer.run(
        c.MobileNumber,
        c.FirstName,
        c.LastName,
        c.Email || "",
        c.Ticket_Count,
        newTier,
        c.Last_Purchase_Time || "",
        c.Gender || "",
        c.RegisteredDate || "",
        c.DateOfBirth || "",
        c.Status || "active",
        c.Country || "Sri Lanka"
      );

      if (!existing || oldTier !== newTier) {
        insertHistory.run(
          c.MobileNumber,
          oldTier,
          newTier,
          existing ? "Tier Changed Due to Upgrade" : "New customer",
          c.Ticket_Count
        );
        updatedHistory++;
      }

      inserted++;
    }

    res.json({
      success: true,
      inserted,
      updatedHistory,
      message: `${inserted} customers saved, ${updatedHistory} tier updates recorded.`,
    });
  } catch (err) {
    console.error("❌ Error saving loyalty data:", err);
    res
      .status(500)
      .json({ success: false, message: "Server error saving loyalty data" });
  }
});

// 📊 Get all customers
router.get("/all", (req, res) => {
  try {
    const customers = db
      .prepare(
        `SELECT 
        *
         FROM customers
         ORDER BY Loyalty_Tier DESC, Ticket_Count DESC`
      )
      .all();

    if (!customers.length)
      return res.status(404).json({ message: "No customers found" });

    res.json({
      success: true,
      total: customers.length,
      customers,
    });
  } catch (err) {
    console.error("❌ Error fetching customers:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load customers" });
  }
});

// 🧾 Get loyalty history
router.get("/loyalty_history", (req, res) => {
  try {
    const history = db
      .prepare(
        `
        SELECT 
       *
        FROM loyalty_history
       
      `
      )
      .all();

    if (!history.length) {
      return res.json({
        success: true,
        total: 0,
        customers: [],
      });
    }

    res.json({
      success: true,
      total: history.length,
      customers: history,
    });
  } catch (err) {
    console.error("❌ Error fetching loyalty history:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load loyalty history",
    });
  }
});

// 🎰 Get lottery breakdown
router.get("/lottery_breakdown", (req, res) => {
  try {
    const data = db
      .prepare(
        `SELECT * FROM lottery_breakdown ORDER BY Last_Purchase_Time DESC`
      )
      .all();

    if (!data.length)
      return res.json({
        success: true,
        total: 0,
        breakdown: [],
      });

    res.json({
      success: true,
      total: data.length,
      breakdown: data,
    });
  } catch (err) {
    console.error("❌ Error fetching lottery breakdown:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to load breakdown" });
  }
});








export default router;
