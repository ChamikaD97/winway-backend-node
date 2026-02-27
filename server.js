import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config({ override: true });

// Resolve __dirname in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ROUTES
import emailRoute from "./routes/emailRoute.js";
import emailLoyalityRoute from "./routes/emailLoyalityRoute.js";
import reportRoute from "./routes/reportRoute.js";
import userRouter from "./routes/userRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import loyalCustomer from "./newRoutes/loyalCustomer.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import dailyUpgradeRoutes from "./newRoutes/dailyUpgradeRouter.js";
import smsRouter from "./newRoutes/smsRouter.js";
import weeklyImagesRoutes from "./routes/weeklyImages.js";
import saveFile from "./routes/saveFile.js";
import userPortalRoutes from "./routes/loyalityUserPortalRoutes.js";

const app = express();

/* ======================================================
   MIDDLEWARE
====================================================== */

app.use(
  cors({
    origin: [
      "https://loyalty.thinkcube.lk",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ======================================================
   ROUTES
   IMPORTANT: NO /api PREFIX HERE
   Apache already forwards /api → Node
====================================================== */

console.log("📦 Initializing routes...");

app.use("/email", emailRoute);
app.use("/email/loyality", emailLoyalityRoute);
app.use("/report", reportRoute);

// 🔥 REMOVE /api prefix here
app.use("/users", userRouter);
app.use("/settings", settingsRouter);
app.use("/loyalCustomer", loyalCustomer);
app.use("/daily-upgrades", dailyUpgradeRoutes);
app.use("/userPortal", userPortalRoutes);
app.use("/sms", smsRouter);
app.use("/dashboard", dashboardRoutes);
app.use("/weekly-images", weeklyImagesRoutes);
app.use("/weekly-files", saveFile);

/* ======================================================
   HEALTH CHECK
====================================================== */

app.get("/test", (req, res) => {
  res.json({ success: true, message: "Server working" });
});

/* ======================================================
   GLOBAL ERROR HANDLER (MUST BE LAST)
====================================================== */

app.use((err, req, res, next) => {
  console.error("❌ Error occurred:");
  console.error("Route:", req.method, req.originalUrl);
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

/* ======================================================
   SERVER START
====================================================== */

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log("\n✅ WinWay backend running on port", PORT);
});
