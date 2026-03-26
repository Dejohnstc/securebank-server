const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/*
REGISTER USER
*/
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, transactionPin } = req.body;

    // ✅ VALIDATION
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });

    // 🔁 RESTORE DELETED USER
    if (existingUser) {

      if (existingUser.status === "deleted") {

        const user = new User({
  name,
  email,
  password,           // ✅ plain
  transactionPin: "0000" // ✅ plain
});

        existingUser.name = name;
       existingUser.password = password 
existingUser.transactionPin = "0000"     //  FIXED
        existingUser.transactionPin = hashedPin;     // ✅ FIXED
        existingUser.status = "active";

        await existingUser.save();

        return res.json({
          message: "Account restored successfully",
          accountNumber: existingUser.accountNumber
        });
      }

      return res.status(400).json({ message: "User already exists" });
    }

    // 🔐 HASH PASSWORD + PIN
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(transactionPin || "0000", 10);

    // ✅ CREATE USER
    const user = new User({
      name,
      email,
      password: hashedPassword,        // ✅ FIXED
      transactionPin: hashedPin        // ✅ FIXED
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
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 🚫 BLOCK SUSPENDED
    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account suspended" });
    }

    // 🚫 BLOCK DELETED
    if (user.status === "deleted") {
      return res.status(403).json({ message: "Account does not exist" });
    }

    // ✅ SAFE COMPARE
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
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
        status: user.status
      }
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;