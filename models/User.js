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
    enum: ["active", "suspended"],
    default: "active"
  }

},
{ timestamps: true }
);


// 🔐 AUTO HASH PASSWORD & PIN
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") && !this.isModified("transactionPin")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, salt);
  }

  next();
});


// 🏦 AUTO GENERATE ACCOUNT NUMBER
userSchema.pre("save", async function (next) {
  try {
    // 🔐 HASH PASSWORD
    if (this.isModified("password")) {
      this.password = await bcrypt.hash(this.password, 10);
    }

    // 🔐 HASH PIN
    if (this.isModified("transactionPin")) {
      this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
    }

    next();
  } catch (err) {
    next(err);
  }
});


// ⚡ INDEX FOR FAST SEARCH

module.exports = mongoose.model("User", userSchema);