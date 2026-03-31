const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: true
  },

  accountNumber: {
    type: String,
    unique: true
  },

  routingNumber: {
    type: String,
    default: "021000021"
  },

  transactionPin: {
    type: String,
    required: true
  },

  balance: {
    type: Number,
    default: 0
  },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user"
  },

  status: {
    type: String,
    enum: ["active", "suspended", "deleted"],
    default: "active"
  },

  /* 🔥 NEW BANK PROFILE FIELDS */
  phone: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    trim: true
  },

  city: {
    type: String,
    trim: true
  },

  state: {
    type: String,
    trim: true
  },

  country: {
    type: String,
    trim: true
  },

  zip: {
    type: String,
    trim: true
  }

},
{ timestamps: true }
);


// ✅ SAFE HOOK
userSchema.pre("save", async function () {

  // 🔐 HASH PASSWORD
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }

  // 🔐 HASH PIN
  if (this.isModified("transactionPin")) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 10);
  }

  // ❌ REMOVED RANDOM ACCOUNT GENERATION
  // 🔥 NOW CONTROLLED IN authRoutes (1011 format)

});

/* =================================
   UPDATE USER PROFILE
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

    user.phone = phone ?? user.phone;
    user.address = address ?? user.address;
    user.city = city ?? user.city;
    user.state = state ?? user.state;
    user.country = country ?? user.country;
    user.zip = zip ?? user.zip;

    await user.save();

    res.json({
      message: "Profile updated successfully"
    });

  } catch {
    res.status(500).json({
      message: "Failed to update profile"
    });
  }
});


module.exports = mongoose.model("User", userSchema);