import express from "express";
import axios from "axios";

const router = express.Router();

// -------------------------
// Hutch API Base URL
// -------------------------
const BASE_URL = "https://bsms.hutch.lk/api";

// -------------------------
// In-memory token store
// -------------------------
let accessToken = null;
let refreshToken = null;

// -------------------------
// Helper: Build headers
// -------------------------
const getHeaders = (auth = false) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "X-API-VERSION": "v1",
  };

  if (auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  return headers;
};

// ======================================================================
// 1️⃣ LOGIN — Get Access Token + Refresh Token
// ======================================================================
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing username or password",
      });
    }

    console.log("🔑 Attempting Hutch Login...");

    axios
      .post(
        `${BASE_URL}/login`,
        { username, password },
        { headers: getHeaders() }
      )
      .then((response) => {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;

        console.log("✅ Hutch Login Success", accessToken);
        console.log("⚡ Access Token:", accessToken ? "Available" : "Missing");

        return res.status(200).json({
          success: true,
          message: "Login successful",
          accessToken,
          refreshToken,
        });
      })
      .catch((err) => {
        console.error("❌ Hutch Login Failed:", err?.response?.data || err);

        return res.status(500).json({
          success: false,
          message: "Login failed",
          error: err?.response?.data || err.message,
        });
      });
  } catch (error) {
    console.error("❌ Server Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// ======================================================================
// 2️⃣ SEND SMS — Requires Access Token
// ======================================================================
router.post("/send", (req, res) => {
  try {
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please login first.",
      });
    }

    let { campaignName, mask, numbers, content } = req.body;

    // ---------------------------------------------------------
    // 🔍 1. Validate required fields
    // ---------------------------------------------------------
    if (!campaignName || !mask || !numbers || !content) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // ---------------------------------------------------------
    // 🔍 2. Normalize phone number(s)
    // Hutch ONLY accepts: 947XXXXXXXX
    // ---------------------------------------------------------
    let formattedNumbers = numbers
      .split(",")
      .map((num) => num.trim())
      .map((num) => {
        // remove leading +
        if (num.startsWith("+")) num = num.substring(1);

        // if starts with 0 → convert to 94XXXXXXXXX
        if (num.startsWith("0")) num = "94" + num.substring(1);

        // if starts with 7XXXXXXXX → convert to 947XXXXXXXX
        if (/^[7]\d{8}$/.test(num)) num = "94" + num;

        return num;
      })
      .join(",");

    // ---------------------------------------------------------
    // 🔍 3. Final server-side validation before calling Hutch
    // ---------------------------------------------------------
    const invalid = formattedNumbers.split(",").some((n) => {
      return !/^94\d{9}$/.test(n);
    });

    if (invalid) {
      return res.status(400).json({
        success: false,
        message:
          "One or more phone numbers are invalid. Use format: 947XXXXXXXX",
        numbers: formattedNumbers,
      });
    }

    // ---------------------------------------------------------
    // 🔍 4. Log the corrected number format
    // ---------------------------------------------------------
    console.log("📨 Sending SMS to:", formattedNumbers);

    // ---------------------------------------------------------
    // 🔍 5. SEND SMS TO HUTCH
    // ---------------------------------------------------------
    axios
      .post(
        `${BASE_URL}/sendsms`,
        {
          campaignName,
          mask,
          numbers: formattedNumbers,
          content,
        },
        { headers: getHeaders(true) }
      )
      .then((response) => {
        console.log("✅ SMS Sent Successfully");

        return res.status(200).json({
          success: true,
          message: "SMS sent successfully",
          data: response.data,
        });
      })
      .catch((err) => {
        console.error(err);

        return res.status(500).json({
          success: false,
          message: "Failed to send SMS",
          error: err?.response?.data || err.message,
        });
      });
  } catch (error) {
    console.log("❌ Server Error:");

    return res.status(500).json({
      success: false,

      error: error,
    });
  }
});

// ======================================================================
// 3️⃣ OPTIONAL — REFRESH TOKEN
// ======================================================================
router.post("/refresh", (req, res) => {
  try {
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "No refresh token available",
      });
    }

    axios
      .post(
        `${BASE_URL}/refresh`,
        { refreshToken },
        { headers: getHeaders(false) }
      )
      .then((response) => {
        accessToken = response.data?.access_token;
        refreshToken = response.data?.refresh_token;

        console.log("🔄 Token Refreshed Successfully");

        return res.status(200).json({
          success: true,
          message: "Token refreshed successfully",
          accessToken,
          refreshToken,
        });
      })
      .catch((err) => {
        console.error("❌ Token Refresh Failed:", err?.response?.data || err);

        return res.status(500).json({
          success: false,
          message: "Failed to refresh token",
          error: err?.response?.data || err.message,
        });
      });
  } catch (error) {
    console.error("❌ Server Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

export default router;
