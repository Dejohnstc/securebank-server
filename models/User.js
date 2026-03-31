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
  },

  /* 🔥 PROFILE FIELDS */
  phone: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    trim: true
  },

  city: {
    type: String,
    trim: true
  },

  state: {
    type: String,
    trim: true
  },

  country: {
    type: String,
    trim: true
  },

  zip: {
    type: String,
    trim: true
  }

},
{ timestamps: true }
);


/* =========================
   🔐 SAFE HASHING HOOK
========================= */
userSchema.pre("save", async function () {

  // HASH PASSWORD ONLY IF CHANGED
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // HASH PIN ONLY IF CHANGED
  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }

});


module.exports = mongoose.model("User", userSchema);