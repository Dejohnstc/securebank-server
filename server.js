const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/db");
const adminRoutes = require("./routes/admin");

const app = express();

// ✅ Connect DB
connectDB();

// ✅ CORS CONFIG (FIXED & CLEAN)
const allowedOrigins = [
  "http://localhost:5173",
  "https://securebank-client.vercel.app",
  "https://securebank.obiresoffice.com"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow Postman / mobile apps
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed: " + origin));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};

// ✅ APPLY CORS
app.use(cors(corsOptions));

// ✅ HANDLE PREFLIGHT (FIXED)
app.options("*", cors(corsOptions));

// ✅ BODY PARSER
app.use(express.json());

// ✅ ROUTES
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", require("./routes/userRoutes"));
app.use("/api/transactions", require("./routes/transactionRoutes"));
app.use("/api/admin", adminRoutes);

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("SecureBank API Running");
});

// ✅ START SERVER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});