import express from "express";
import axios from "axios";
import crypto from "node:crypto";
import https from "https";

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  timeout: 15000,
});

const otpStore = new Map();

const router = express.Router();

const BASE_URL = "https://bsms.hutch.lk/api";

let accessToken = null;
let refreshToken = null;

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

router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing username or password",
      });
    }

    axios
      .post(
        `${BASE_URL}/login`,
        { username, password },
        { headers: getHeaders() },
      )
      .then((response) => {
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;

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

    axios
      .post(
        `${BASE_URL}/sendsms`,
        {
          campaignName,
          mask,
          numbers: formattedNumbers,
          content,
        },
        { headers: getHeaders(true) },
      )
      .then((response) => {
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
    return res.status(500).json({
      success: false,

      error: error,
    });
  }
});

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
        { headers: getHeaders(false) },
      )
      .then((response) => {
        accessToken = response.data?.access_token;
        refreshToken = response.data?.refresh_token;

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
const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOTP = (otp) => crypto.createHash("sha256").update(otp).digest("hex");

/* ======================================================
   🔑 HUTCH LOGIN
====================================================== */
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res
      .status(400)
      .json({ success: false, message: "Missing credentials" });

  try {
    const response = await axios.post(
      `${BASE_URL}/login`,
      { username, password },
      { headers: getHeaders() },
    );

    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;

    res.json({
      success: true,
      message: "Login successful",
    });
  } catch (err) {
    console.error("❌ Hutch Login Failed:", err?.response?.data || err.message);
    res.status(500).json({ success: false, message: "Login failed" });
  }
});

const ensureHutchLogin = async () => {
  if (accessToken) return;

  const response = await axios.post(
    `${BASE_URL}/login`,
    {
      username: process.env.HUTCH_USERNAME,
      password: process.env.HUTCH_PASSWORD,
    },
    {
      headers: getHeaders(),
      httpsAgent,
      timeout: 10000,
    },
  );

  accessToken = response.data.accessToken;
  refreshToken = response.data.refreshToken;

  // ⏱ Hutch NEEDS a small delay
  await new Promise((r) => setTimeout(r, 300));
};
const sendSmsWithRetry = async (payload) => {
  try {
    return await axios.post(`${BASE_URL}/sendsms`, payload, {
      headers: getHeaders(true),
      httpsAgent,
      timeout: 10000,
    });
  } catch (err) {
    if (err.code === "ECONNRESET") {
      console.warn("🔁 ECONNRESET – retrying SMS once...");
      await new Promise((r) => setTimeout(r, 500));

      return axios.post(`${BASE_URL}/sendsms`, payload, {
        headers: getHeaders(true),
        httpsAgent,
        timeout: 10000,
      });
    }
    throw err;
  }
};
const normalizePhone = (phone) => {
  if (!phone) return null;

  let p = phone.trim().replace(/\s+/g, "");

  // 07XXXXXXXX → +947XXXXXXXX
  if (/^0\d{9}$/.test(p)) {
    p = "+94" + p.substring(1);
  }

  // 7XXXXXXXX → +947XXXXXXXX
  else if (/^7\d{8}$/.test(p)) {
    p = "+94" + p;
  }

  // 94XXXXXXXXX → +94XXXXXXXXX
  else if (/^94\d{9}$/.test(p)) {
    p = "+" + p;
  }

  // Already normalized
  if (!/^\+94\d{9}$/.test(p)) return null;

  return p;
};

router.post("/otp/send", async (req, res) => {
  const normalizedPhone = "94718553224";

  /* -------- Prevent OTP spam -------- */
  const existing = otpStore.get(normalizedPhone);
  if (existing && existing.expiresAt > Date.now()) {
    return res.status(429).json({
      success: false,
      message: "OTP already sent. Please wait.",
    });
  }

  const otp = generateOTP();
  const otpHash = hashOTP(otp);
  const content = `Your login OTP is ${otp}. Valid for 2 minutes.`;

  try {
    /* -------- Ensure Hutch login -------- */
    await ensureHutchLogin();

    /* -------- Send SMS (with retry + keep-alive) -------- */
    await sendSmsWithRetry({
      campaignName: "OTP_LOGIN",
      mask: "WIN WAY",
      numbers: normalizedPhone,
      content,
    });

    /* -------- Store OTP ONLY after success -------- */
    otpStore.set(normalizedPhone, {
      otpHash,
      expiresAt: Date.now() + 1 * 60 * 1000,
      attempts: 0,
    });

    return res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("❌ OTP SMS Failed:", {
      code: err.code,
      message: err.message,
      response: err.response?.data,
    });

    if (err.code === "ECONNRESET") {
      return res.status(503).json({
        success: false,
        message: "SMS gateway temporarily unavailable. Try again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

/* ======================================================
   ✅ VERIFY OTP
====================================================== */
router.post("/otp/verify", (req, res) => {
  const { otp } = req.body;
  const normalizedPhone = "94718553224";

  if (!normalizedPhone || !otp)
    return res
      .status(400)
      .json({ success: false, message: "Phone & OTP required" });

  const record = otpStore.get(normalizedPhone);

  if (!record)
    return res
      .status(400)
      .json({ success: false, message: "OTP expired or not found" });

  if (record.expiresAt < Date.now()) {
    otpStore.delete(normalizedPhone);
    return res.status(400).json({ success: false, message: "OTP expired" });
  }

  if (record.otpHash !== hashOTP(otp)) {
    record.attempts += 1;

    if (record.attempts >= 5) otpStore.delete(normalizedPhone);

    return res.status(400).json({ success: false, message: "Invalid OTP" });
  }

  otpStore.delete(normalizedPhone);

  /* 🔑 HERE: attach JWT / user logic later */
  res.json({
    success: true,
    message: "OTP verified successfully",
    normalizedPhone,
  });
});
export default router;
