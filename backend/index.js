const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  startGame,
  makeSentence,
  respondToSentence,
  viewCard,
  moveToNextTurn,
  guessBottomCard,
  disconnectPlayer,
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

  socket.on("makeSentence", ({ roomId, sentence }, callback) => {
    try {
      const room = makeSentence(roomId, socket.id, sentence);
      io.to(roomId).emit("roomUpdate", room);
      io.to(roomId).emit("newSentence", room.currentSentence);
      callback({ success: true });
    } catch (error) {
      console.error("Make sentence error:", error.message);
      callback({ success: false, message: error.message });
    }
  });

  socket.on("respondToSentence", ({ roomId, card }) => {
    try {
      const room = respondToSentence(roomId, socket.id, card);
      io.to(roomId).emit("roomUpdate", room);

      // Notify the sentence maker that a player has responded
      const sentenceMakerSocketId = room.currentTurn;
      io.to(sentenceMakerSocketId).emit("playerResponded", {
        playerId: socket.id,
        playerName: room.players.find((p) => p.id === socket.id)?.name,
      });
    } catch (error) {
      console.error("Respond to sentence error:", error.message);
      // Optionally send error back to client
    }
  });

  socket.on("viewCard", ({ roomId, targetPlayerId }, callback) => {
    try {
      const card = viewCard(roomId, socket.id, targetPlayerId);
      // Send the card info only to the person who is viewing
      callback({ success: true, card });
    } catch (error) {
      console.error("View card error:", error.message);
      callback({ success: false, message: error.message });
    }
  });

  socket.on("finishedViewing", ({ roomId }) => {
    try {
      const room = moveToNextTurn(roomId);
      io.to(roomId).emit("roomUpdate", room);
      io.to(roomId).emit("nextTurn", { currentTurn: room.currentTurn });
    } catch (error) {
      console.error("Move to next turn error:", error.message);
    }
  });

  socket.on("guessBottomCard", ({ roomId, guessedCards }, callback) => {
    try {
      const result = guessBottomCard(roomId, socket.id, guessedCards);
      if (result.correct) {
        // Announce winner to everyone
        io.to(roomId).emit("gameOver", { room: result.room });
      } else {
        // Announce the player is out and move to next turn
        io.to(roomId).emit("roomUpdate", result.room);
        // Tell the player what they guessed wrong privately
        callback({ success: false, guessedCards: result.guessedCards });
      }
    } catch (error) {
      console.error("Guess bottom card error:", error.message);
      callback({ success: false, message: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected:", socket.id);
    const room = disconnectPlayer(socket.id);
    if (room) {
      io.to(room.id).emit("roomUpdate", room);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
