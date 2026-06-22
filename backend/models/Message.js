const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  message: String
}, { timestamps: true });

// IMPORTANT FIX 👇
module.exports = mongoose.models.Message || mongoose.model("Message", messageSchema);