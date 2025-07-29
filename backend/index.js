const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  startGame,
} = require("./game/gameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, you should restrict this to your frontend's URL
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send('<h1>"Listen To Me" Game Server</h1>');
});

io.on("connection", (socket) => {
  console.log("a user connected:", socket.id);

  socket.on("createRoom", ({ roomId, playerName }, callback) => {
    try {
      joinRoom(roomId, socket.id, playerName);
      socket.join(roomId);
      io.to(roomId).emit("roomUpdate", getRoom(roomId));
      callback({ success: true, roomId });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  socket.on("joinRoom", ({ roomId, playerName }, callback) => {
    try {
      const room = getRoom(roomId);
      if (!room) {
        return callback({ success: false, message: "Room not found." });
      }
      joinRoom(roomId, socket.id, playerName);
      socket.join(roomId);
      io.to(roomId).emit("roomUpdate", getRoom(roomId));
      callback({ success: true, room: getRoom(roomId) });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });

  socket.on("startGame", ({ roomId }, callback) => {
    try {
      const room = startGame(roomId);
      io.to(roomId).emit("gameStarted", room);
      io.to(roomId).emit("roomUpdate", room);
      callback({ success: true });
    } catch (error) {
      console.error("Start game error:", error.message);
      callback({ success: false, message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    const gameManager = require("./game/gameManager");
    // Find which room the player was in and notify others
    const roomId = Object.keys(gameManager.rooms).find((roomId) =>
      gameManager.getRoom(roomId).players.some((p) => p.id === socket.id)
    );
    if (roomId) {
      const room = gameManager.leaveRoom(roomId, socket.id);
      if (room) {
        io.to(roomId).emit("roomUpdate", room);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
