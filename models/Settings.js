const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
{
  dailyLimit: {
    type: Number,
    default: 10000 // 💰 Daily transfer cap
  },

  singleTransferLimit: {
    type: Number,
    default: 5000 // 💸 Per transaction cap
  }
},
{ timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);