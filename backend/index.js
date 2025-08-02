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
  removeRoom,
  handleChatMessage,
} = require("./game/gameManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, you should restrict this to your frontend's URL
    methods: ["GET", "POST"],
  },
});
global.io = io; // Make io instance globally available

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

  socket.on("respondToSentence", (data) => {
    try {
      respondToSentence(data.roomId, socket.id, data.card);
      // DO NOT broadcast from here. The gameManager now handles emitting updates.
    } catch (error) {
      console.error("Respond to sentence error:", error.message);
      // Optionally emit an error to the specific user
      socket.emit("gameError", { message: error.message });
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
      // THE FIX: Check if the game ended after moving to the next turn
      if (room.gameState === "finished") {
        io.to(roomId).emit("gameOver", { room });
        setTimeout(() => {
          removeRoom(roomId);
        }, 10000);
      } else {
        io.to(roomId).emit("roomUpdate", room);
        io.to(roomId).emit("nextTurn", { currentTurn: room.currentTurn });
      }
    } catch (error) {
      console.error("Move to next turn error:", error.message);
    }
  });

  socket.on("sendChatMessage", ({ roomId, message }) => {
    try {
      const result = handleChatMessage(roomId, socket.id, message);
      if (result.room) {
        io.to(roomId).emit("roomUpdate", result.room);
        io.to(roomId).emit("playerChatted", { playerId: socket.id });
      } else if (result.error) {
        socket.emit("error", { message: result.error });
      }
    } catch (error) {
      console.error(`Chat message error in room ${roomId}: ${error.message}`);
      socket.emit("error", { message: "Failed to send message." });
    }
  });

  socket.on("updateNotebook", ({ roomId, notebookData }) => {
    try {
      const room = require("./game/gameManager").updateNotebook(
        roomId,
        socket.id,
        notebookData
      );
      // We don't need to broadcast the whole room state back,
      // as the change only affects the one player who made it,
      // and their local state is already updated.
      // If we wanted other players to see notebook changes (e.g. for spectating),
      // we would emit a roomUpdate here.
    } catch (error) {
      console.error(
        `Notebook update error in room ${roomId}: ${error.message}`
      );
      socket.emit("error", { message: "Failed to update notebook." });
    }
  });

  socket.on("guessBottomCard", ({ roomId, guessedCards }, callback) => {
    try {
      const { correct, isGameOver, winner, room } = guessBottomCard(
        roomId,
        socket.id,
        guessedCards
      );
      if (correct) {
        // Announce winner to everyone
        console.log(
          `Game over in room ${roomId}. Winner: ${winner.name}. Emitting gameOver.`
        );
        io.to(roomId).emit("gameOver", { room: room });

        // Schedule room cleanup right after announcing the winner
        setTimeout(() => {
          removeRoom(roomId);
        }, 10000); // 10 seconds delay
      } else {
        // Announce the player is out and move to next turn
        io.to(roomId).emit("roomUpdate", room);

        // THE FIX: Also check if the game ended right after this player got out
        if (room.gameState === "finished") {
          io.to(roomId).emit("gameOver", { room: room });
          setTimeout(() => {
            removeRoom(roomId);
          }, 10000);
        }

        // Tell the player what they guessed wrong privately
        callback({ success: false, guessedCards: guessedCards });
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
