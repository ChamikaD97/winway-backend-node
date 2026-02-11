import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env properly
dotenv.config({ override: true });

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

import userRoutes from "./routes/loyalityUserPortalRoutes.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// INIT
const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Debug route loading
console.log("📦 Initializing routes...");

// Existing routes
app.use("/email", emailRoute);

app.use("/email/loyality", emailLoyalityRoute);

app.use("/report", reportRoute);

app.use("/api/users", userRouter);

app.use("/api/settings", settingsRouter);

app.use("/api/loyalCustomer", loyalCustomer);

app.use("/api", dailyUpgradeRoutes);

app.use("/dashboard", dashboardRoutes);

app.use("/sms", smsRouter);

app.use("/api/userPortal", userRoutes);

app.use("/weekly-images", weeklyImagesRoutes);

app.use("/weekly-files", saveFile);

// SERVER START
const PORT = process.env.PORT || 8001;

try {
  app.listen(PORT, () => {
    console.log(`\n✅ WinWay backend running on port ${PORT}`);
    console.log("✅ Server is alive and listening...\n");
  });
} catch (err) {
  console.error("❌ Failed to start server:", err);
}

// SAFETY LOGS
process.on("exit", (code) => {
  console.log("🚨 Process exiting with code:", code);
});
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Unhandled promise rejection:", reason);
});
