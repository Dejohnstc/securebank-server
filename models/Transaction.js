const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
{
sender: {
type: mongoose.Schema.Types.ObjectId,
ref: "User"
},

receiver: {
type: mongoose.Schema.Types.ObjectId,
ref: "User"
},

amount: {
type: Number,
required: true
},

reference: {
type: String,
required: true,
unique: true
},

status: {
type: String,
enum: ["completed","pending","failed"],
default: "completed"
}

},
{ timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);