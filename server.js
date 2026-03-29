const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");

const app = express();

connectDB();

const allowedOrigins = [
  "http://localhost:5173",
  "https://securebank-client.vercel.app",
  "https://securebank.obiresoffice.com",
  "https://securebank.llc"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed: " + origin));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// ✅ SAFE PREFLIGHT HANDLER (FIXED)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("SecureBank API Running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});