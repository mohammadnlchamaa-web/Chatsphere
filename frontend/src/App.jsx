import { useEffect, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

export default function App() {
  const [user, setUser] = useState(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState(null);

  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typing, setTyping] = useState(false);

  const [search, setSearch] = useState("");

  /* LOGIN */
  const login = async () => {
    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      setUser(res.data.user);
      socket.emit("online", res.data.user.id);

      loadFriends();
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  const loadFriends = async () => {
    const res = await axios.get(
      "http://localhost:5000/api/friends/search?query="
    );
    setFriends(res.data);
  };

  const openChat = async (f) => {
    setSelected(f);

    const res = await axios.get(
      `http://localhost:5000/api/messages/${user.id}/${f._id}`
    );

    setChat(res.data);
  };

  const sendMessage = () => {
    if (!message.trim() || !selected) return;

    socket.emit("send_message", {
      senderId: user.id,
      receiverId: selected._id,
      message,
    });

    setChat((prev) => [...prev, { senderId: user.id, message }]);
    setMessage("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("typing", (data) => {
      if (data.senderId === selected?._id) {
        setTyping(true);
        setTimeout(() => setTyping(false), 1000);
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("online_users");
      socket.off("typing");
    };
  }, [selected]);

  if (!user) {
    return (
      <div style={styles.login}>
        <div style={styles.card}>
          <h2>ChatSphere</h2>

          <input
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />

          <button onClick={login} style={styles.button}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* SIDEBAR */}
      <div style={styles.sidebar}>
        <h3>Friends</h3>

        {/* 🔥 FIXED SMALL SEARCH INPUT */}
        <input
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />

        {friends
          .filter((f) =>
            f.username.toLowerCase().includes(search.toLowerCase())
          )
          .map((f) => (
            <div
              key={f._id}
              onClick={() => openChat(f)}
              style={styles.friend}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: onlineUsers.includes(f._id)
                    ? "limegreen"
                    : "gray",
                  display: "inline-block",
                  marginRight: 8,
                }}
              />
              {f.username}
            </div>
          ))}
      </div>

      {/* CHAT */}
      <div style={styles.chat}>
        {selected ? (
          <>
            <h3>Chat with {selected.username}</h3>

            <div style={styles.messages}>
              {chat.map((m, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.msg,
                    alignSelf:
                      m.senderId === user.id ? "flex-end" : "flex-start",
                    backgroundColor:
                      m.senderId === user.id ? "#4cafef" : "#e0e0e0",
                    color:
                      m.senderId === user.id ? "white" : "black",
                  }}
                >
                  {m.message}
                </div>
              ))}

              {typing && <div style={styles.typing}>typing...</div>}
            </div>

            <div style={styles.inputArea}>
              <input
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);

                  socket.emit("typing", {
                    senderId: user.id,
                    receiverId: selected._id,
                  });
                }}
                onKeyDown={handleKey}
                style={styles.msgInput}
                placeholder="Type message..."
              />

              <button onClick={sendMessage} style={styles.sendBtn}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div style={styles.empty}>
            Select a friend to start chatting
          </div>
        )}
      </div>
    </div>
  );
}

/* STYLES */
const styles = {
  container: {
    display: "flex",
    height: "100vh",
    fontFamily: "Arial",
  },

  sidebar: {
    width: "25%",
    borderRight: "1px solid #ddd",
    padding: 10,
  },

  /* ✅ FIXED SMALL SEARCH BAR */
  search: {
  width: "92%",
  padding: "5px 8px",
  marginBottom: 6,
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 12,
},

  friend: {
    padding: 10,
    margin: 5,
    cursor: "pointer",
    borderRadius: 8,
  },

  chat: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: 10,
  },

  messages: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
  },

  msg: {
    padding: 10,
    margin: 5,
    borderRadius: 12,
    maxWidth: "60%",
  },

  inputArea: {
    display: "flex",
    gap: 10,
    paddingTop: 10,
  },

  msgInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #ccc",
  },

  sendBtn: {
    padding: "10px 18px",
    backgroundColor: "#4cafef",
    color: "white",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
  },

  login: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },

  card: {
    padding: 30,
    border: "1px solid #ddd",
    borderRadius: 12,
    textAlign: "center",
  },

  input: {
    display: "block",
    margin: 10,
    padding: 10,
    width: 220,
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  button: {
    padding: 10,
    backgroundColor: "#4cafef",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },

  typing: {
    fontStyle: "italic",
    color: "gray",
    marginLeft: 10,
  },

  empty: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#888",
    fontSize: 18,
  },
};