import express from "express";
import axios from "axios";
import crypto from "node:crypto";
import https from "https";

const router = express.Router();

/* ======================================================
   CONFIG
====================================================== */

const BASE_URL = "https://bsms.hutch.lk/api";

// 🔥 FORCE OTP TO THIS NUMBER ALWAYS
const FIXED_PHONE = "94718553224"; // 0718553224 → 94718553224

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 5,
  timeout: 15000,
});

let accessToken = null;
let refreshToken = null;

const otpStore = new Map();

/* ======================================================
   HELPERS
====================================================== */

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const hashOTP = (otp) =>
  crypto.createHash("sha256").update(otp).digest("hex");

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

/* ======================================================
   HUTCH LOGIN
====================================================== */

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Missing credentials",
    });
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/login`,
      { username, password },
      {
        headers: getHeaders(),
        httpsAgent,
        timeout: 10000,
      }
    );

    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;

    res.json({
      success: true,
      message: "Hutch login successful",
    });
  } catch (err) {
    console.error("❌ Hutch Login Failed:", err?.response?.data || err.message);

    res.status(500).json({
      success: false,
      message: "Hutch login failed",
    });
  }
});

/* ======================================================
   AUTO LOGIN IF NEEDED
====================================================== */

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
    }
  );

  accessToken = response.data.accessToken;
  refreshToken = response.data.refreshToken;

  await new Promise((r) => setTimeout(r, 300));
};

/* ======================================================
   SEND SMS (WITH RETRY)
====================================================== */

const sendSmsWithRetry = async (payload) => {
  try {
    return await axios.post(`${BASE_URL}/sendsms`, payload, {
      headers: getHeaders(true),
      httpsAgent,
      timeout: 10000,
    });
  } catch (err) {
    if (err.code === "ECONNRESET") {
      console.warn("🔁 ECONNRESET – retrying once...");
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

/* ======================================================
   SEND OTP (ALWAYS TO 0718553224)
====================================================== */

router.post("/otp/send", async (req, res) => {
  const normalizedPhone = FIXED_PHONE;

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
    await ensureHutchLogin();

    await sendSmsWithRetry({
      campaignName: "OTP_LOGIN",
      mask: "WIN WAY",
      numbers: normalizedPhone,
      content,
    });

    otpStore.set(normalizedPhone, {
      otpHash,
      expiresAt: Date.now() + 2 * 60 * 1000,
      attempts: 0,
    });

    console.log("🔐 OTP:", otp); // visible in server log

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (err) {
    console.error("❌ OTP SMS Failed:", err?.message);

    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
});

/* ======================================================
   VERIFY OTP
====================================================== */

router.post("/otp/verify", (req, res) => {
  const { otp } = req.body;
  const normalizedPhone = FIXED_PHONE;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "OTP required",
    });
  }

  const record = otpStore.get(normalizedPhone);

  if (!record) {
    return res.status(400).json({
      success: false,
      message: "OTP expired or not found",
    });
  }

  if (record.expiresAt < Date.now()) {
    otpStore.delete(normalizedPhone);
    return res.status(400).json({
      success: false,
      message: "OTP expired",
    });
  }

  if (record.otpHash !== hashOTP(otp)) {
    record.attempts += 1;

    if (record.attempts >= 5) {
      otpStore.delete(normalizedPhone);
    }

    return res.status(400).json({
      success: false,
      message: "Invalid OTP",
    });
  }

  otpStore.delete(normalizedPhone);

  res.json({
    success: true,
    message: "OTP verified successfully",
  });
});

export default router;
