const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  accountNumber: {
    type: String,
    unique: true
  },

  routingNumber: {
    type: String,
    default: "021000021"
  },

  transactionPin: {
    type: String,
    required: true
  },

  balance: {
    type: Number,
    default: 0
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  status: {
    type: String,
    enum: ["active", "suspended", "deleted"], // ✅ include deleted
    default: "active"
  }

},
{ timestamps: true }
);


// 🔐 SINGLE CLEAN HASH HOOK (ONLY ONE!)
userSchema.pre("save", async function (next) {
  try {
    const salt = await bcrypt.genSalt(10);

    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, salt);
    }

    if (this.isModified("transactionPin")) {
      this.transactionPin = await bcrypt.hash(this.transactionPin, salt);
    }

    next();
  } catch (err) {
    next(err);
  }
});


// 🏦 AUTO GENERATE ACCOUNT NUMBER (OPTIONAL SAFE VERSION)
userSchema.pre("save", function (next) {
  if (!this.accountNumber) {
    this.accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }
  next();
});


module.exports = mongoose.model("User", userSchema);