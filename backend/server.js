require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);

// SERVER
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
  origin: "*",
  methods: ["GET", "POST"]
}
});

// MODELS
const Message = require("./models/Message");

const onlineUsers = new Map();

/* SOCKET */
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ONLINE USERS
  socket.on("online", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // SEND MESSAGE
  socket.on("send_message", async ({ senderId, receiverId, message }) => {

    const msg = await Message.create({
      senderId,
      receiverId,
      message,
      seen: false
    });

    const receiverSocket = onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit("receive_message", msg);
    }
  });

  // TYPING
  socket.on("typing", ({ senderId, receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);

    if (receiverSocket) {
      io.to(receiverSocket).emit("typing", { senderId });
    }
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    for (let [uid, sid] of onlineUsers) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });
});

/* DB */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
 server.listen(PORT, () => {
  console.log("Server running on", PORT);
 });
  })
  .catch(err => console.log(err));
  const PORT = process.env.PORT || 5000;