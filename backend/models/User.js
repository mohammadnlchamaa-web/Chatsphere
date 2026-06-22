const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
});

// IMPORTANT FIX 👇 prevents overwrite error
module.exports = mongoose.models.User || mongoose.model("User", userSchema);