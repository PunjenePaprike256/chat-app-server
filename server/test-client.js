const { io } = require("socket.io-client");

const socket = io("http://localhost:3001", {
  reconnectionAttempts: 3,
  timeout: 5000,
});

socket.on("connect", () => {
  console.log("Povezan sa serverom, ID:", socket.id);
  socket.emit("join_room", "testroom");
  socket.emit("send_message", { room: "testroom", author: "test", message: "Test poruka", time: new Date().toLocaleTimeString() });
});

socket.on("connect_error", (err) => {
  console.error("Greška pri konekciji:", err.message);
});

socket.on("disconnect", () => {
  console.log("Diskonektovan");
});
