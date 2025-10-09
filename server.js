import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import generateRoute from "./routes/generateRoute.js";
import emailRoute from "./routes/emailRoute.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// existing
app.use("/check", generateRoute);

// new email route
app.use("/email", emailRoute);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`✅ WinWay backend running on port ${PORT}`);
});
