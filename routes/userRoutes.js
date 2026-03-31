const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


/* =================================
   GET USER PROFILE
================================= */

router.get("/profile", authMiddleware, async (req, res) => {
  try {

    const user = await User.findById(req.user).select("-password");

    res.json(user);

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
});


/* =================================
   UPDATE USER PROFILE 🔥 NEW
================================= */

router.put("/update-profile", authMiddleware, async (req, res) => {
  try {

    const user = await User.findById(req.user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔥 ONLY ALLOW SAFE FIELDS
    const {
      phone,
      address,
      city,
      state,
      country,
      zip
    } = req.body;

    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (country !== undefined) user.country = country;
    if (zip !== undefined) user.zip = zip;

    await user.save();

    res.json({
      message: "Profile updated successfully"
    });

  } catch (error) {

    console.error("UPDATE PROFILE ERROR:", error);

    res.status(500).json({
      message: "Failed to update profile"
    });

  }
});


/* =================================
   CHANGE TRANSACTION PIN
================================= */

router.post("/change-pin", authMiddleware, async (req,res)=>{

try{

const user = await User.findById(req.user);

const { pin } = req.body;

if(!pin || pin.length !== 6){
return res.status(400).json({message:"PIN must be 6 digits"});
}

user.transactionPin = pin;

await user.save();

res.json({message:"Transaction PIN updated"});

}catch(err){

res.status(500).json({message:"Failed to update PIN"});

}

});


/* =================================
   LOOKUP ACCOUNT HOLDER
================================= */

router.get("/account/:accountNumber", async (req, res) => {
  try {

    const { accountNumber } = req.params;

    const user = await User.findOne({ accountNumber });

    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    res.json({
      name: user.name,
      accountNumber: user.accountNumber,
      bank: "Chase Bank"
    });

  } catch (error) {

    res.status(500).json({ error: error.message });

  }
});


/* =================================
   ZELLE EMAIL LOOKUP (FIXED)
================================= */

router.get("/by-email/:email", authMiddleware, async (req, res) => {
  try {

    const email = req.params.email.toLowerCase().trim();

    // 🔥 FAST QUERY (NO REGEX)
    const user = await User.findOne({ email }).select("name email");

    if (!user) {
      return res.status(404).json({ message: "Zelle user not found" });
    }

    res.json({
      name: user.name,
      email: user.email
    });

  } catch (error) {

    console.error("ZELLE LOOKUP ERROR:", error);

    res.status(500).json({ message: "Server error" });

  }
});


module.exports = router;