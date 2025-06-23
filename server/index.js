const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./db"); // SQLite baza

const app = express();
app.use(cors({ origin: ["http://localhost:3000"], credentials: true }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: ["http://localhost:3000"], methods: ["GET", "POST"], credentials: true },
});

const usersInRooms = {}; // { roomName: [username] }

// --- Auth API ---

app.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Unesi username i password" });

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(query, [username, password], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Korisnik već postoji" });
      }
      return res.status(500).json({ error: "Greška pri registraciji" });
    }
    res.json({ success: true, message: "Uspešno registrovan" });
  });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Unesi username i password" });

  const query = `SELECT * FROM users WHERE username = ? AND password = ?`;
  db.get(query, [username, password], (err, row) => {
    if (err) return res.status(500).json({ error: "Greška pri loginu" });
    if (!row) return res.status(400).json({ error: "Pogrešan username ili lozinka" });

    res.json({ success: true, message: "Uspešan login" });
  });
});

// --- Socket.io ---

io.on("connection", (socket) => {
  console.log(`🔌 Korisnik povezan: ${socket.id}`);

  socket.on("join_room", ({ room, username }) => {
    socket.join(room);
    socket.username = username;
    socket.room = room;

    if (!usersInRooms[room]) usersInRooms[room] = [];
    if (!usersInRooms[room].includes(username)) usersInRooms[room].push(username);

    io.to(room).emit("room_users", usersInRooms[room]);
    console.log(`📥 ${username} (${socket.id}) je ušao u sobu "${room}"`);
  });

  socket.on("send_message", (data) => {
    console.log(`✉️ Poruka u sobu "${data.room}" od ${data.author}: ${data.message}`);
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("send_private_message", (data) => {
    // Emituj samo korisniku kome je namenjena poruka
    const sockets = Array.from(io.sockets.sockets.values());
    const targetSocket = sockets.find((s) => s.username === data.toUsername);
    if (targetSocket) {
      targetSocket.emit("receive_private_message", {
        author: data.fromUsername,
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    }
  });

  socket.on("disconnect", () => {
    const { room, username } = socket;
    if (room && username && usersInRooms[room]) {
      usersInRooms[room] = usersInRooms[room].filter((user) => user !== username);
      io.to(room).emit("room_users", usersInRooms[room]);
    }
    console.log(`❌ ${username} (${socket.id}) je napustio sobu "${room}"`);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server je pokrenut na portu ${PORT}`);
});


