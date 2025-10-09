import express from "express";

const router = express.Router();

// ✅ simple health-check endpoint
router.get("/", (req, res) => {
  res.json({ message: "✅ WinWay Python Integration is alive!" });
});

export default router;
