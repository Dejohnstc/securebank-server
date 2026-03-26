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
    enum: ["active", "suspended", "deleted"],
    default: "active"
  }

},
{ timestamps: true }
);


// ✅ SINGLE SAFE HOOK (NO BUGS)
userSchema.pre("save", async function () {

  // 🔐 HASH PASSWORD
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // 🔐 HASH PIN
  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }

  // 🏦 GENERATE ACCOUNT NUMBER
  if (!this.accountNumber) {
    this.accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

});


module.exports = mongoose.model("User", userSchema);