const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Settings = require('../models/Settings');
const adminMiddleware = require('../middleware/adminMiddleware');


/* =========================
   👥 USERS
========================= */

// ✅ GET ALL USERS
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({ status: { $ne: "deleted" } })
      .select('-password -transactionPin');

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
      status: { $ne: "deleted" },
      $or: [
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    }).select('-password -transactionPin');

    res.json(users);
  } catch (err) {
    console.error("SEARCH ERROR:", err);
    res.status(500).json({ message: "Search error" });
  }
});


// 🛑 DELETE USER (SOFT)
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete admin account" });
    }

    if (userId === req.user.id) {
      return res.status(403).json({ message: "You cannot delete yourself" });
    }

    user.status = "deleted";
    await user.save();

    res.json({ message: "User deleted safely" });

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

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);

  } catch (err) {
    console.error("SUSPEND ERROR:", err);
    res.status(500).json({ message: "Suspend failed" });
  }
});


// 💰 UPDATE BALANCE
router.put('/users/:id/balance', adminMiddleware, async (req, res) => {
  try {

    const { amount, action } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (isNaN(amount)) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (!["add", "subtract", "set"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const value = Number(amount);

    if (action === "add") user.balance += value;
    if (action === "subtract") user.balance -= value;
    if (action === "set") user.balance = value;

    if (user.balance < 0) user.balance = 0;

    await user.save();

    res.json({
      message: "Balance updated successfully",
      balance: user.balance
    });

  } catch (err) {
    console.error("BALANCE ERROR:", err);
    res.status(500).json({ message: "Balance update failed" });
  }
});


/* =========================
   🔐 FIXED PASSWORD CHANGE
========================= */

router.put('/users/:id/password', adminMiddleware, async (req, res) => {
  try {

    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({
        message: "Cannot change admin password here"
      });
    }

    // ✅ FIX: SAVE PLAIN PASSWORD
    user.password = password;

    await user.save(); // 🔥 model hashes it

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("ADMIN PASSWORD ERROR:", err);
    res.status(500).json({ message: "Password update failed" });
  }
});


/* =========================
   📅 UPDATE REG DATE
========================= */

router.put('/users/:id/createdAt', adminMiddleware, async (req, res) => {
  try {

    const { createdAt } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!createdAt || isNaN(new Date(createdAt))) {
      return res.status(400).json({ message: "Invalid date" });
    }

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot modify admin" });
    }

    user.createdAt = new Date(createdAt);

    await user.save();

    res.json({ message: "Registration date updated" });

  } catch (err) {
    console.error("DATE ERROR:", err);
    res.status(500).json({ message: "Update failed" });
  }
});


/* =========================
   ⚙️ LIMIT SETTINGS
========================= */

router.get('/settings/limits', adminMiddleware, async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) settings = await Settings.create({});

    res.json(settings);

  } catch (err) {
    res.status(500).json({ message: "Failed to fetch limits" });
  }
});

router.put('/settings/limits', adminMiddleware, async (req, res) => {
  try {

    const { dailyLimit, singleTransferLimit } = req.body;

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (dailyLimit !== undefined) settings.dailyLimit = Number(dailyLimit);
    if (singleTransferLimit !== undefined) settings.singleTransferLimit = Number(singleTransferLimit);

    await settings.save();

    res.json({ message: "Limits updated successfully" });

  } catch (err) {
    res.status(500).json({ message: "Failed to update limits" });
  }
});

module.exports = router;