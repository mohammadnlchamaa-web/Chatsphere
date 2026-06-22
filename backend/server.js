require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* =======================
   CORS (FIXED PROPERLY)
======================= */
app.use(
  cors({
    origin: "https://chatsphere-mu.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

/* =======================
   ROUTES
======================= */
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);

/* =======================
   SOCKET.IO (FIXED)
======================= */
const io = new Server(server, {
  cors: {
    origin: "https://chatsphere-mu.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const Message = require("./models/Message");

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // USER ONLINE
  socket.on("online", (userId) => {
    if (!userId) return;

    onlineUsers.set(userId, socket.id);

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  // SEND MESSAGE
  socket.on("send_message", async ({ senderId, receiverId, message }) => {
    try {
      const msg = await Message.create({
        senderId,
        receiverId,
        message,
        seen: false,
      });

      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", msg);
      }
    } catch (err) {
      console.log("Send message error:", err.message);
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
    for (let [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }

    io.emit("online_users", Array.from(onlineUsers.keys()));
  });
});

/* =======================
   MONGO + SERVER START
======================= */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    server.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => console.log("Mongo Error:", err));