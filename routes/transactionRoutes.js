const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Settings = require("../models/Settings"); // 🔥 NEW
const authMiddleware = require("../middleware/authMiddleware");


/* =========================
   TRANSFER MONEY
========================= */

router.post("/transfer", authMiddleware, async (req, res) => {

const session = await mongoose.startSession();

let senderId = req.user.id || req.user;
let numericAmount = Number(req.body.amount);

try {

await session.startTransaction();

const sender = await User.findById(senderId).session(session);

if (!sender) {
throw new Error("Sender not found");
}

const { receiverEmail, accountNumber, amount } = req.body;

numericAmount = Number(amount);


/* VALIDATE AMOUNT */

if (!numericAmount || numericAmount <= 0) {
throw new Error("Invalid transfer amount");
}


/* 🔥 FETCH ADMIN LIMITS */

const settings = await Settings.findOne();

const SINGLE_LIMIT = settings?.singleTransferLimit || 5000;
const DAILY_LIMIT = settings?.dailyLimit || 10000;


/* 🚫 SINGLE LIMIT CHECK */

if (numericAmount > SINGLE_LIMIT) {
throw new Error(`Maximum transfer amount is $${SINGLE_LIMIT}`);
}


/* CHECK BALANCE */

if (sender.balance < numericAmount) {
throw new Error("Insufficient funds");
}


/* FIND RECEIVER */

let receiver;

if (receiverEmail) {
receiver = await User.findOne({ email: receiverEmail.toLowerCase() }).session(session);
}

if (accountNumber) {
receiver = await User.findOne({ accountNumber }).session(session);
}

if (!receiver) {
throw new Error("Receiver not found");
}


/* PREVENT SELF TRANSFER */

if (receiver._id.toString() === sender._id.toString()) {
throw new Error("Cannot transfer to yourself");
}


/* 🚫 DAILY LIMIT */

const todayStart = new Date();
todayStart.setHours(0,0,0,0);

const todayTransfers = await Transaction.find({
sender: sender._id,
createdAt: { $gte: todayStart },
status: "completed"
}).session(session);

const todayTotal = todayTransfers.reduce(
(sum,tx)=> sum + Number(tx.amount || 0),
0
);

if(todayTotal + numericAmount > DAILY_LIMIT){
const remaining = Math.max(0, DAILY_LIMIT - todayTotal);

throw new Error(
`Daily limit exceeded. Remaining: $${remaining}`
);
}


/* 🔥 PROCESS */

sender.balance -= numericAmount;
receiver.balance += numericAmount;

await sender.save({ session });
await receiver.save({ session });


/* GENERATE REFERENCE */

const reference =
"SBK-" +
new Date().getFullYear() +
"-" +
Math.random().toString(36).substring(2,10).toUpperCase();


/* SAVE SUCCESS TX */

await Transaction.create([{
sender: sender._id,
receiver: receiver._id,
amount: numericAmount,
reference,
status: "completed"
}], { session });


await session.commitTransaction();
session.endSession();

res.json({
message: "Transfer successful",
reference
});

} catch (error) {

await session.abortTransaction();
session.endSession();

console.error("TRANSFER ERROR:", error);


/* 🔥 SAVE FAILED TRANSACTION */

try {

await Transaction.create({
sender: senderId,
receiver: null,
amount: numericAmount || 0,
reference: "FAILED-" + Date.now(),
status: "failed",
note: error.message
});

} catch (saveErr) {
console.error("FAILED TX SAVE ERROR:", saveErr);
}


res.status(400).json({
message: error.message || "Transfer failed"
});

}

});


/* =========================
   TRANSACTION HISTORY
========================= */

router.get("/history", authMiddleware, async (req, res) => {

try {

const userId = req.user.id || req.user;

const transactions = await Transaction.find({
$or: [
{ sender: userId },
{ receiver: userId }
]
})
.populate("sender", "name")
.populate("receiver", "name")
.sort({ createdAt: -1 });

res.json(transactions);

} catch (error) {

res.status(500).json({ message: "Error fetching transactions" });

}

});


module.exports = router;