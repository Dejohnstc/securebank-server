const express = require("express");
const router = express.Router();
const mongoose = require("mongoose"); // ✅ IMPORTANT

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");


/* =========================
   TRANSFER MONEY
========================= */

router.post("/transfer", authMiddleware, async (req, res) => {

const session = await mongoose.startSession();

try {

await session.startTransaction();

const sender = await User.findById(req.user.id || req.user).session(session);

if (!sender) {
throw new Error("Sender not found");
}

const { receiverEmail, accountNumber, amount } = req.body;

const numericAmount = Number(amount);


/* VALIDATE AMOUNT */

if (!numericAmount || numericAmount <= 0) {
throw new Error("Invalid transfer amount");
}


/* 🚫 RULE 1: MAX $5000 */

if (numericAmount > 5000) {
throw new Error("Maximum transfer amount is $5000");
}


/* CHECK BALANCE */

if (sender.balance < numericAmount) {
throw new Error("Insufficient funds");
}


/* FIND RECEIVER */

let receiver;

if (receiverEmail) {
receiver = await User.findOne({ email: receiverEmail }).session(session);
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


/* 🚫 RULE 3: DAILY TRANSFER LIMIT */

const DAILY_LIMIT = 10000;

const todayStart = new Date();
todayStart.setHours(0,0,0,0);

const todayTransfers = await Transaction.find({
sender: sender._id,
createdAt: { $gte: todayStart }
}).session(session);

const todayTotal = todayTransfers.reduce(
(sum,tx)=> sum + tx.amount,
0
);

if(todayTotal + numericAmount > DAILY_LIMIT){
throw new Error(`Daily transfer limit of $${DAILY_LIMIT.toLocaleString()} exceeded`);
}


/* 🔥 SAFE PROCESS (ATOMIC) */

sender.balance -= numericAmount;
receiver.balance += numericAmount;

await sender.save({ session });
await receiver.save({ session });


/* GENERATE BANK REFERENCE */

const reference =
"SBK-" +
new Date().getFullYear() +
"-" +
Math.random().toString(36).substring(2,10).toUpperCase();


/* SAVE TRANSACTION */

await Transaction.create([{
sender: sender._id,
receiver: receiver._id,
amount: numericAmount,
reference,
status: "completed"
}], { session });


/* ✅ COMMIT EVERYTHING */

await session.commitTransaction();
session.endSession();


/* RESPONSE */

res.json({
message: "Transfer successful",
reference
});

} catch (error) {

await session.abortTransaction();
session.endSession();

console.error("TRANSFER ERROR:", error);

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