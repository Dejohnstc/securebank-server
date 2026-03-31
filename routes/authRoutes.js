const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/* =========================
   🔥 GENERATE ACCOUNT NUMBER
========================= */
const generateAccountNumber = async () => {
  let accountNumber;
  let exists = true;

  while (exists) {
    const random = Math.floor(100000 + Math.random() * 900000);
    accountNumber = `1011${random}`;

    const user = await User.findOne({ accountNumber });
    if (!user) exists = false;
  }

  return accountNumber;
};


/* =========================
   🔥 FIX OLD USERS
========================= */
const fixOldUsers = async () => {
  const users = await User.find();

  for (let user of users) {
    if (!user.accountNumber || !user.accountNumber.startsWith("1011")) {
      user.accountNumber = await generateAccountNumber();
      await user.save();
    }
  }
};


/*
REGISTER USER
*/
router.post("/register", async (req, res) => {
  try {

    const {
      name,
      email,
      password,
      transactionPin,

      // 🔥 NEW FIELDS
      phone,
      address,
      city,
      state,
      country,
      zip

    } = req.body;

    // 🔥 FIX OLD USERS FIRST
    await fixOldUsers();

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required"
      });
    }

    const existingUser = await User.findOne({ email });

    /* 🔁 RESTORE DELETED USER */
    if (existingUser) {

      if (existingUser.status === "deleted") {

        existingUser.name = name;
        existingUser.password = password;
        existingUser.transactionPin = transactionPin || "0000";
        existingUser.status = "active";

        // 🔥 SAVE NEW PROFILE DATA
        existingUser.phone = phone;
        existingUser.address = address;
        existingUser.city = city;
        existingUser.state = state;
        existingUser.country = country;
        existingUser.zip = zip;

        // 🔥 ENSURE VALID ACCOUNT NUMBER
        if (!existingUser.accountNumber?.startsWith("1011")) {
          existingUser.accountNumber = await generateAccountNumber();
        }

        await existingUser.save();

        return res.json({
          message: "Account restored successfully",
          accountNumber: existingUser.accountNumber
        });
      }

      return res.status(400).json({ message: "User already exists" });
    }

    /* 🔥 CREATE NEW USER */
    const accountNumber = await generateAccountNumber();

    const user = new User({
      name,
      email,
      password,
      accountNumber,
      transactionPin: transactionPin || "0000",

      // 🔥 SAVE FULL PROFILE
      phone,
      address,
      city,
      state,
      country,
      zip
    });

    await user.save();

    res.json({
      message: "User registered successfully",
      accountNumber: user.accountNumber
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


/*
LOGIN USER
*/
router.post("/login", async (req, res) => {
  try {

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password required"
      });
    }

    const user = await User.findOne({
      email: { $regex: `^${email}$`, $options: "i" }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    if (user.status === "deleted") {
      return res.status(403).json({ message: "Account does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        tokenVersion: user.tokenVersion || 0
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber,
        balance: user.balance,
        role: user.role,
        status: user.status,

        // 🔥 INCLUDE PROFILE DATA
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        country: user.country,
        zip: user.zip
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;