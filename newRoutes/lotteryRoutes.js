import express from "express";
import { insertLotteryBreakdown } from "../models/lotteryBreakdownModel.js";
import {
  createCustomer,
  getAllCustomersCombined,
  insertLotteryBreakdownUpgrade,
} from "../models/loyalityUpgrade.js";
import db from "../models/db.js"; // adjust path if needed
import { log } from "console";

const router = express.Router();

/* ---------------------------------------------
   POST /api/loyalty/breakdown/:mobile
   Insert or update a single customer's breakdown
---------------------------------------------- */

/* ---------------------------------------------
   POST /api/loyalty
   Insert or update all customers and their breakdowns
---------------------------------------------- */
router.post("/", async (req, res) => {
  const customers = req.body.customers;
  console.log(
    "*****************************************************************"
  );
  console.log(customers.length);
  console.log(
    "*****************************************************************"
  );

  if (!customers || customers.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No customers provided" });
  }

  try {
    const insertedMobiles = [];
    const breakdownResults = [];

    for (const customer of customers) {
      try {
        const result = await createCustomer(customer);

        insertedMobiles.push(result.MobileNumber);
        const lastMonth = customer.lastMonth.LotteryBreakdown;
        const current = customer.updated.LotteryBreakdown;


        console.log(lastMonth);
        console.log(current);

        const breakdownResult = await insertLotteryBreakdownUpgrade(
          customer.MobileNumber,current,
          lastMonth
        );

        breakdownResults.push({
          MobileNumber: customer.MobileNumber,
          result: breakdownResult,
        });
      } catch (error) {
        console.error(
          `❌ Failed to process ${customer.MobileNumber}: ${error.message}`
        );
        continue;
      }
    }

    res.status(201).json({
      success: true,
      message: `${insertedMobiles.length} customers and their breakdowns processed successfully.`,
      insertedMobiles,
      breakdownResults,
    });
  } catch (error) {
    console.error("❌ Bulk processing error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process customers and breakdowns",
      error: error.message,
    });
  }
});
/* ---------------------------------------------
   GET /api/loyalty/combined
   Get all data from 4 tables, formatted for frontend
---------------------------------------------- */
router.get("/combined", async (req, res) => {
  try {
    const data = await getAllCustomersCombined();
    res.status(200).json({
      success: true,
      message: "Combined customer data fetched successfully.",
      data,
    });
  } catch (error) {
    console.error("❌ Error fetching combined data:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Failed to fetch combined customer data",
    });
  }
});

// 1️⃣ GET - Current Customers
router.get("/customers", (req, res) => {
  const sql = `SELECT * FROM customers`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching customers:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      table: "customers",
      count: rows.length,
      data: rows,
    });
  });
});

// 2️⃣ GET - Current Month Lottery Breakdown
router.get("/breakdowns/current", (req, res) => {
  const sql = `SELECT * FROM lottery_breakdown_overoll`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching current breakdowns:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      table: "lottery_breakdown_overoll",
      count: rows.length,
      data: rows,
    });
  });
});

// 3️⃣ GET - Last Month Customers
router.get("/customers/last-month", (req, res) => {
  const sql = `SELECT * FROM customers_last_month`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching last-month customers:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      table: "customers_last_month",
      count: rows.length,
      data: rows,
    });
  });
});

// 4️⃣ GET - Last Month Lottery Breakdown
router.get("/breakdowns/last-month", (req, res) => {
  const sql = `SELECT * FROM lottery_breakdowns_last_month`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("❌ Error fetching last-month breakdowns:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
    res.json({
      success: true,
      table: "lottery_breakdowns_last_month",
      count: rows.length,
      data: rows,
    });
  });
});

export default router;
