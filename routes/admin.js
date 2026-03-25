const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const adminMiddleware = require('../middleware/adminMiddleware');


// ✅ GET ALL USERS
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password -transactionPin');
    res.json(users);
  } catch (err) {
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
    }).select('-password -transactionPin');

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Search error" });
  }
});


// ❌ DELETE USER
router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});


// 🚫 SUSPEND USER
router.put('/users/:id/suspend', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Suspend failed" });
  }
});


// 📊 GET USER TRANSACTIONS
router.get('/users/:id/transactions', adminMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      $or: [
        { sender: req.params.id },
        { receiver: req.params.id }
      ]
    });

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: "Transaction fetch failed" });
  }
});

module.exports = router;