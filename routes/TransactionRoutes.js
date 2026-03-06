const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const authMiddleware = require("../middleware/authMiddleware");


/* =========================
   TRANSFER MONEY
========================= */

router.post("/transfer", authMiddleware, async (req, res) => {

try {

const sender = await User.findById(req.user);

const { receiverEmail, accountNumber, amount } = req.body;

const numericAmount = Number(amount);


/* VALIDATE AMOUNT */

if (!numericAmount || numericAmount <= 0) {
return res.status(400).json({ message: "Invalid transfer amount" });
}


/* FIND RECEIVER */

let receiver;

if (receiverEmail) {
receiver = await User.findOne({ email: receiverEmail });
}

if (accountNumber) {
receiver = await User.findOne({ accountNumber });
}

if (!receiver) {
return res.status(404).json({ message: "Receiver not found" });
}


/* PREVENT SELF TRANSFER */

if (receiver._id.toString() === sender._id.toString()) {
return res.status(400).json({ message: "Cannot transfer to yourself" });
}


/* CHECK BALANCE */
/* DAILY TRANSFER LIMIT */

const DAILY_LIMIT = 100000;

const todayStart = new Date();
todayStart.setHours(0,0,0,0);

const todayTransfers = await Transaction.find({
sender: sender._id,
createdAt: { $gte: todayStart }
});

const todayTotal = todayTransfers.reduce(
(sum,tx)=> sum + tx.amount,
0
);

if(todayTotal + numericAmount > DAILY_LIMIT){
return res.status(400).json({
message: `Daily transfer limit of $${DAILY_LIMIT.toLocaleString()} exceeded`
});
}


/* PROCESS TRANSFER */

sender.balance -= numericAmount;
receiver.balance += numericAmount;

await sender.save();
await receiver.save();


/* GENERATE BANK REFERENCE */

const reference =
"SBK-" +
new Date().getFullYear() +
"-" +
Math.random().toString(36).substring(2,10).toUpperCase();


/* SAVE TRANSACTION */

const transaction = new Transaction({
sender: sender._id,
receiver: receiver._id,
amount: numericAmount,
reference,
status: "completed"
});

await transaction.save();


/* RESPONSE */

res.json({
message: "Transfer successful",
reference,
transaction
});

} catch (error) {

res.status(500).json({
message: "Transfer failed",
error: error.message
});

}

});


/* =========================
   TRANSACTION HISTORY
========================= */

router.get("/history", authMiddleware, async (req, res) => {

try {

const transactions = await Transaction.find({
$or: [
{ sender: req.user },
{ receiver: req.user }
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