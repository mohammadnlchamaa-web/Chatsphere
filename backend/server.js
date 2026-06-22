require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

/* ================= CORS ================= */
app.use(
  cors({
    origin: "https://chatsphere-mu.vercel.app",
    credentials: true,
  })
);

app.use(express.json());

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const friendRoutes = require("./routes/friendRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/messages", messageRoutes);

/* ================= SOCKET ================= */
const io = new Server(server, {
  cors: {
    origin: "https://chatsphere-mu.vercel.app",
    methods: ["GET", "POST"],
  },
});

const Message = require("./models/Message");
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("online", (userId) => {
    if (!userId) return;
    onlineUsers.set(userId, socket.id);
    io.emit("online_users", Array.from(onlineUsers.keys()));
  });

  socket.on("send_message", async ({ senderId, receiverId, message }) => {
    try {
      if (!senderId || !receiverId || !message) return;

      const msg = await Message.create({
        senderId,
        receiverId,
        message,
      });

      const receiverSocket = onlineUsers.get(receiverId);

      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", msg);
      }
    } catch (err) {
      console.log("Message error:", err.message);
    }
  });

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

/* ================= LOGIN + REGISTER ================= */
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/* REGISTER */
app.post("/api/auth/register", async (req, res) => {
  try {
    console.log("REGISTER HIT:", req.body);

    const { username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User exists" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    res.json({ message: "Registered", user });
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* LOGIN */
app.post("/api/auth/login", async (req, res) => {
  try {
    console.log("LOGIN HIT:", req.body);

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET missing" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");

    server.listen(PORT, () => {
      console.log("Server running on", PORT);
    });
  })
  .catch((err) => {
    console.log("MongoDB ERROR:", err.message);
  });