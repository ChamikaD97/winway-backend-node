import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import emailRoute from "./routes/emailRoute.js";
import reportRoute from "./routes/reportRoute.js"; // ✅ NEW
import prizeImage from "./routes/prizeSummaryImage.js";
import userRouter from "./routes/userRoutes.js";
import settingsRouter from "./routes/settingsRoutes.js";
import customerRouter from "./routes/customerRoutes.js";
import purchaseRouter from "./routes/purchaseRoutes.js";
import loyaltyRouter from "./routes/loyaltyRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Existing routes
app.use("/email", emailRoute);

// New Puppeteer route
app.use("/report", reportRoute);

app.use("/prizeReport", prizeImage);

app.use("/api/users", userRouter);

app.use("/api/settings", settingsRouter);
app.use("/api/customers", customerRouter);
app.use("/api/purchases", purchaseRouter);
app.use("/api/loyalty", loyaltyRouter);
app.use("/api/settings", settingsRouter);
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ WinWay backend running on port ${PORT}`);
});
