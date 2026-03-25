const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // ✅ IMPORTANT
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const adminMiddleware = require('../middleware/adminMiddleware');


// ✅ GET ALL USERS (WITH REGISTRATION DATE)
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -transactionPin createdAt'); // ✅ include date

    res.json(users);
  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});


// 🔍 SEARCH USERS
router.get('/users/search', adminMiddleware, async (req, res) => {
  try {
    const { query } = req.query;

    const users = await User.find({
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).select('-password -transactionPin createdAt');

    res.json(users);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ message: "Search error" });
  }
});


// ❌ DELETE USER
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed" });
  }
});


// 🚫 SUSPEND USER
router.put('/users/:id/suspend', adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("SUSPEND ERROR:", err);
    res.status(500).json({ message: "Suspend failed" });
  }
});


// 💰 UPDATE USER BALANCE (FULLY FIXED)
router.put('/users/:id/balance', adminMiddleware, async (req, res) => {
  try {
    const { amount, action } = req.body;

    console.log("BODY:", req.body);
    console.log("USER ID:", req.params.id);

    // ✅ VALIDATE ID (CRITICAL FIX)
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // ✅ VALIDATION
    if (amount === undefined || amount === null || isNaN(amount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!["add", "subtract", "set"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ ENSURE BALANCE EXISTS
    if (typeof user.balance !== "number") {
      user.balance = 0;
    }

    const value = Number(amount);

    if (action === "add") {
      user.balance += value;
    } 
    else if (action === "subtract") {
      user.balance -= value;
    } 
    else if (action === "set") {
      user.balance = value;
    }

    // 🚫 Prevent negative
    if (user.balance < 0) {
      user.balance = 0;
    }

    await user.save();

    res.json({
      message: "Balance updated successfully",
      balance: user.balance
    });

  } catch (err) {
    console.error("🔥 BALANCE CRASH:", err); // 👈 REAL ERROR WILL SHOW
    res.status(500).json({ message: "Balance update failed" });
  }
});


// 📊 GET USER TRANSACTIONS
router.get('/users/:id/transactions', adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const transactions = await Transaction.find({
      $or: [
        { sender: req.params.id },
        { receiver: req.params.id }
      ]
    });

    res.json(transactions);
  } catch (err) {
    console.error("TRANSACTION ERROR:", err);
    res.status(500).json({ message: "Transaction fetch failed" });
  }
});

module.exports = router;