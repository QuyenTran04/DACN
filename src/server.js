require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./configs/database");
const cors = require("cors");


const authRoutes = require("./routes/auth.routes");
connectDB();
const app = express();
app.use(express.json());
app.use(cookieParser());

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
app.use(
  cors({
    origin: FRONTEND_ORIGIN, // phải khớp domain FE
    credentials: true, // bắt buộc nếu dùng cookie httpOnly
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// test nhanh
app.get("/api/ping", (req, res) => res.json({ ok: true }));
// Routes
app.use("/api/auth", authRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server chạy trên cổng ${PORT}`));

