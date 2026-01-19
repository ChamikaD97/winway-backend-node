// routes/purchaseRoutes.js
import express from "express";
import { db } from "../config/sqlite.js";

const router = express.Router();

// 🟢 Add new purchase
router.post("/", (req, res) => {
  const { customer_id, ticket_id, lottery_name, quantity, amount } = req.body;

  if (!customer_id || !quantity)
    return res.status(400).json({ message: "Missing fields" });

  db.prepare(
    "INSERT INTO ticket_purchases (customer_id, ticket_id, lottery_name, quantity, amount) VALUES (?, ?, ?, ?, ?)"
  ).run(customer_id, ticket_id, lottery_name, quantity, amount);

  // Update totals
  db.prepare(
    "UPDATE customers SET total_tickets = total_tickets + ?, monthly_tickets = monthly_tickets + ? WHERE id = ?"
  ).run(quantity, quantity, customer_id);

  res.json({ message: "Purchase recorded successfully" });
});

// 🟣 Fetch all purchases
router.get("/", (req, res) => {
  const rows = db.prepare(`
    SELECT tp.*, c.name as customer_name
    FROM ticket_purchases tp
    LEFT JOIN customers c ON tp.customer_id = c.id
    ORDER BY tp.created_at DESC
  `).all();
  res.json(rows);
});

export default router;
