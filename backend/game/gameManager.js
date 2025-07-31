const { CARDS } = require("./cards");
const { GAME_CONFIG } = require("./gameConfig");

const rooms = {};
const timers = {}; // To manage timers for each room

// Helper function to shuffle an array
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const createRoom = (roomId) => {
  rooms[roomId] = {
    id: roomId,
    players: [],
    deck: [],
    bottomCards: { person: null, place: null, event: null }, // Changed from bottomCard
    publicCards: [],
    gameState: "waiting", // waiting, playing, responding, finished
    currentTurn: null,
    turnEndsAt: null, // Add this
    respondingEndsAt: null,
    viewingEndsAt: null,
    currentSentence: null,
    responses: [],
    playersWhoResponded: [],
    log: [],
  };
  return rooms[roomId];
};

const disconnectPlayer = (playerId) => {
  const room = Object.values(rooms).find((r) =>
    r.players.some((p) => p.id === playerId)
  );
  if (!room) return null;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    player.disconnected = true;
    room.log.push(`${player.name} 断线了。`);

    // If it was the disconnected player's turn, move to the next player
    if (room.currentTurn === playerId) {
      moveToNextTurn(room.id);
    }
  }
  return room;
};

const joinRoom = (roomId, playerId, playerName) => {
  if (!rooms[roomId]) {
    createRoom(roomId);
  }
  const room = rooms[roomId];

  // Handle reconnection
  const reconnectingPlayer = room.players.find(
    (p) => p.name === playerName && p.disconnected
  );
  if (reconnectingPlayer) {
    reconnectingPlayer.disconnected = false;
    reconnectingPlayer.id = playerId; // Update with new socket ID
    room.log.push(`${playerName} 重新连接了！`);
    return room;
  }

  if (room.players.find((p) => p.id === playerId)) {
    return room; // Player already in room
  }
  if (room.gameState !== "waiting") {
    throw new Error("Game has already started.");
  }
  if (room.players.length >= 8) {
    throw new Error("Room is full.");
  }

  const player = {
    id: playerId,
    name: playerName,
    hand: [],
    isAlive: true,
    notebook: { person: [], place: [], event: [] },
    disconnected: false,
  };
  room.players.push(player);
  room.log.push(`${playerName} 加入了房间。`);
  return room;
};

const leaveRoom = (roomId, playerId) => {
  const room = rooms[roomId];
  if (!room) return;

  const player = room.players.find((p) => p.id === playerId);
  if (player) {
    room.log.push(`${player.name} 离开了房间。`);
  }

  room.players = room.players.filter((p) => p.id !== playerId);
  if (room.players.length === 0) {
    delete rooms[roomId];
  }
  return room;
};

const getRoom = (roomId) => rooms[roomId];

const startGame = (roomId) => {
  const room = rooms[roomId];
  if (!room || room.players.length < 3) {
    throw new Error("Not enough players to start the game (min 3).");
  }

  // 1. Prepare cards
  const personCards = [...CARDS.person];
  const placeCards = [...CARDS.place];
  const eventCards = [...CARDS.event];

  // 2. Select bottom cards
  const bottomPerson = personCards.splice(
    Math.floor(Math.random() * personCards.length),
    1
  )[0];
  const bottomPlace = placeCards.splice(
    Math.floor(Math.random() * placeCards.length),
    1
  )[0];
  const bottomEvent = eventCards.splice(
    Math.floor(Math.random() * eventCards.length),
    1
  )[0];
  room.bottomCards = {
    person: bottomPerson,
    place: bottomPlace,
    event: bottomEvent,
  };

  const allFunctionCards = [...personCards, ...placeCards, ...eventCards];

  // 3. Prepare the main deck
  const waterCards = Array.from({ length: room.players.length }, (_, i) => ({
    id: `w${i + 1}`,
    type: "water",
    content: "水牌",
  }));

  room.deck = shuffle([...allFunctionCards, ...waterCards]);

  // 4. Deal cards
  const numPlayers = room.players.length;
  let cardIndex = 0;
  while (cardIndex < room.deck.length) {
    const playerIndex = cardIndex % numPlayers;
    const card = room.deck[cardIndex];
    if (room.players[playerIndex]) {
      room.players[playerIndex].hand.push(card);
    }
    cardIndex++;
  }

  // After dealing, the remaining cards in deck are public. Let's adjust this logic.
  const cardsToDeal = Math.floor(room.deck.length / numPlayers) * numPlayers;
  const cardsToKeepInDeck = room.deck.splice(cardsToDeal);

  room.publicCards = cardsToKeepInDeck;

  // Distribute the rest of the cards
  room.players.forEach((player) => (player.hand = []));
  let dealingIndex = 0;
  while (room.deck.length > 0) {
    const player = room.players[dealingIndex % numPlayers];
    player.hand.push(room.deck.pop());
    dealingIndex++;
  }

  // 5. Set game state
  room.gameState = "playing";
  room.currentTurn = room.players[Math.floor(Math.random() * numPlayers)].id;
  room.turnEndsAt = Date.now() + GAME_CONFIG.TURN_TIMER; // FIX: Add timestamp for the first turn
  room.log.push("游戏开始！");
  room.log.push(
    `轮到 ${room.players.find((p) => p.id === room.currentTurn).name}。`
  );

  clearTimer(roomId);
  timers[roomId] = setTimeout(() => {
    const timedOutPlayer = room.players.find((p) => p.id === room.currentTurn);
    if (timedOutPlayer) {
      room.log.push(`${timedOutPlayer.name} 操作超时，自动跳过。`);
    }
    const updatedRoom = moveToNextTurn(roomId);
    if (updatedRoom && global.io) {
      if (updatedRoom.gameState === "finished") {
        global.io.to(roomId).emit("gameOver", { room: updatedRoom });
        setTimeout(() => removeRoom(roomId), 10000);
      } else {
        global.io.to(roomId).emit("roomUpdate", updatedRoom);
      }
    }
  }, GAME_CONFIG.TURN_TIMER);

  return room;
};

const checkIfAllResponded = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return false;

  const respondingPlayers = room.players.filter(
    (p) => p.id !== room.currentTurn && p.isAlive
  );
  if (room.playersWhoResponded.length >= respondingPlayers.length) {
    room.gameState = "viewing";
    room.log.push("所有玩家已响应，请造句者选择一张牌查看。");
    room.respondingEndsAt = null;
    room.viewingEndsAt = Date.now() + GAME_CONFIG.VIEW_CARD_TIMER;

    // --- FIX: Emit room update when phase changes ---
    if (global.io) {
      global.io.to(roomId).emit("roomUpdate", room);
    }
    // ---------------------------------------------

    clearTimer(roomId);
    timers[roomId] = setTimeout(() => {
      const currentRoom = getRoom(roomId);
      if (currentRoom && currentRoom.gameState === "viewing") {
        const player = currentRoom.players.find(
          (p) => p.id === currentRoom.currentTurn
        );
        if (player) {
          currentRoom.log.push(`${player.name} 超时未查看，自动进入下一回合。`);
        }
        const updatedRoom = moveToNextTurn(roomId);
        if (global.io) {
          global.io.to(roomId).emit("roomUpdate", updatedRoom);
        }
      }
    }, GAME_CONFIG.VIEW_CARD_TIMER);
    return true; // State changed
  }
  return false; // State did not change
};

const makeSentence = (roomId, playerId, sentence) => {
  const room = getRoom(roomId);
  if (!room) throw new Error("Room not found.");
  if (room.currentTurn !== playerId)
    throw new Error("Not your turn to make a sentence.");
  if (room.gameState !== "playing")
    throw new Error("Cannot make a sentence right now.");

  const player = room.players.find((p) => p.id === playerId);
  if (!player) throw new Error("Player not found.");

  room.currentSentence = sentence;
  room.gameState = "responding"; // State changes to waiting for card responses
  room.turnEndsAt = null;
  room.respondingEndsAt = Date.now() + GAME_CONFIG.RESPONSE_TIMER;
  room.responses = []; // Clear previous responses
  room.playersWhoResponded = []; // Clear previous responders

  room.log.push(
    `${player.name} 造句: ${sentence.person.content}, ${sentence.place.content}, ${sentence.event.content}`
  );

  clearTimer(roomId);
  timers[roomId] = setTimeout(() => {
    const room = getRoom(roomId);
    if (!room || room.gameState !== "responding") return;

    const playersToAutoPass = room.players.filter(
      (p) =>
        p.id !== room.currentTurn &&
        p.isAlive &&
        !room.playersWhoResponded.includes(p.id)
    );

    if (playersToAutoPass.length > 0) {
      room.log.push(`响应时间到, 未出牌的玩家自动跳过。`);
      playersToAutoPass.forEach((p) => {
        room.playersWhoResponded.push(p.id);
      });
      checkIfAllResponded(roomId);
      if (global.io) {
        global.io.to(roomId).emit("roomUpdate", room);
      }
    }
  }, GAME_CONFIG.RESPONSE_TIMER);

  return room;
};

function respondToSentence(roomId, playerId, card) {
  const room = getRoom(roomId);
  if (!room || !room.players || room.gameState !== "responding") {
    // Added !room.players check
    return { success: false, message: "Not in a valid responding state." };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (
    !player ||
    !player.isAlive ||
    room.playersWhoResponded.includes(playerId)
  ) {
    return { success: false, message: "Player cannot respond." };
  }

  // --- Start of new validation logic ---
  const hand = player.hand;
  const sentence = room.currentSentence;
  const matchingCards = hand.filter(
    (c) =>
      c.type !== "water" &&
      (c.content === sentence.person?.content ||
        c.content === sentence.place?.content ||
        c.content === sentence.event?.content)
  );
  const waterCards = hand.filter((c) => c.type === "water");

  if (card) {
    // Player chose to play a card
    const isCardInHand = hand.some((c) => c.id === card.id);
    if (!isCardInHand) {
      return { success: false, message: "Invalid card played." };
    }

    if (matchingCards.length > 0) {
      const isCardMatching = matchingCards.some((c) => c.id === card.id);
      if (!isCardMatching) {
        return {
          success: false,
          message: "You must play a matching card if you have one.",
        };
      }
    } else if (waterCards.length > 0) {
      if (card.type !== "water") {
        return {
          success: false,
          message: "You must play a water card as you have no matching cards.",
        };
      }
    } else {
      // This case should not happen if player has cards, because it means they have non-matching, non-water cards.
      // But the only valid play would be to pass (card: null).
      return {
        success: false,
        message: "You have no valid cards to play, you should have passed.",
      };
    }
  } else {
    // Player chose to pass (card is null)
    if (matchingCards.length > 0 || waterCards.length > 0) {
      return {
        success: false,
        message: "You cannot pass, you have playable cards.",
      };
    }
  }
  // --- End of new validation logic ---

  if (card) {
    room.responses.push({ playerId, card });
    player.hand = player.hand.filter((c) => c.id !== card.id);
    room.log.push({ type: "respond", message: `${player.name} 已出牌。` });
  } else {
    // Player passes, no card added to responses
    room.log.push({ type: "pass", message: `${player.name} 选择“过”。` });
  }

  room.playersWhoResponded.push(playerId);

  // --- FIX: Check if state changed, and if not, send a normal update ---
  const stateChangedToViewing = checkIfAllResponded(roomId);
  if (!stateChangedToViewing && global.io) {
    global.io.to(roomId).emit("roomUpdate", room);
  }
  // --------------------------------------------------------------------

  return { success: true };
}

const viewCard = (roomId, viewerId, targetPlayerId) => {
  const room = getRoom(roomId);
  if (!room) throw new Error("Room not found.");
  if (room.currentTurn !== viewerId)
    throw new Error("Not your turn to view a card.");
  if (room.gameState !== "viewing")
    throw new Error("Not the time to view cards.");

  clearTimer(roomId); // Clear the view timer as soon as the player acts
  room.viewingEndsAt = null;
  const response = room.responses.find((r) => r.playerId === targetPlayerId); // FIX: was r.player.id
  if (!response)
    throw new Error("This player did not respond or response not found.");

  const viewer = room.players.find((p) => p.id === viewerId);
  const targetPlayer = room.players.find((p) => p.id === targetPlayerId); // FIX: find player for log

  if (viewer && targetPlayer) {
    // FIX: Check if players exist before logging
    room.log.push(`${viewer.name} 查看了 ${targetPlayer.name} 的牌。`);
  }

  // Return the card to be viewed privately
  return response.card;
};

const moveToNextTurn = (roomId) => {
  const room = getRoom(roomId);
  if (!room) return;

  // Clear the timer for the previous turn
  clearTimer(roomId);

  // --- FIX: Return responded cards to their owners before changing turn ---
  if (room.responses && room.responses.length > 0) {
    room.responses.forEach((response) => {
      const owner = room.players.find((p) => p.id === response.playerId);
      if (owner) {
        owner.hand.push(response.card);
        // Optional: Add a log entry for transparency, though it might be noisy.
        // room.log.push({ type: 'return', message: `一张牌被归还给了 ${owner.name}。`});
      }
    });
    room.log.push({ type: "info", message: "所有响应的牌已归还。" });
  }
  // -------------------------------------------------------------------

  // Determine the next player
  const alivePlayers = room.players.filter((p) => p.isAlive);
  if (alivePlayers.length <= 1) {
    room.gameState = "finished";
    room.winner = null; // Explicitly set no winner
    room.log.push("所有玩家都已出局，游戏结束。");
    return room;
  }

  const currentPlayerIndex = room.players.findIndex(
    (p) => p.id === room.currentTurn
  );
  // Find the next alive player
  let nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
  while (!room.players[nextPlayerIndex].isAlive) {
    nextPlayerIndex = (nextPlayerIndex + 1) % room.players.length;
    // Failsafe to prevent infinite loops if all players are out
    if (nextPlayerIndex === currentPlayerIndex) {
      room.gameState = "finished";
      room.winner = null; // Explicitly set no winner
      room.log.push("所有玩家都已出局，游戏结束。");
      return room;
    }
  }

  // Reset for the new turn
  room.gameState = "playing";
  room.currentTurn = room.players[nextPlayerIndex].id;
  room.turnEndsAt = Date.now() + GAME_CONFIG.TURN_TIMER; // Set the end timestamp
  room.currentSentence = null;
  room.responses = [];
  room.playersWhoResponded = [];
  room.log.push(`轮到 ${room.players[nextPlayerIndex].name}。`);

  clearTimer(roomId);
  timers[roomId] = setTimeout(() => {
    const timedOutPlayer = room.players.find((p) => p.id === room.currentTurn);
    if (timedOutPlayer) {
      room.log.push(`${timedOutPlayer.name} 操作超时，自动跳过。`);
    }
    const updatedRoom = moveToNextTurn(roomId); // The key change: just move to the next turn
    if (updatedRoom && global.io) {
      if (updatedRoom.gameState === "finished") {
        global.io.to(roomId).emit("gameOver", { room: updatedRoom });
        setTimeout(() => removeRoom(roomId), 10000);
      } else {
        global.io.to(roomId).emit("roomUpdate", updatedRoom);
      }
    }
  }, GAME_CONFIG.TURN_TIMER);

  room.viewingEndsAt = null;
  room.respondingEndsAt = null;

  return room;
};

const guessBottomCard = (roomId, playerId, guessedCards) => {
  const room = getRoom(roomId);
  if (!room) throw new Error("Room not found.");
  if (room.currentTurn !== playerId)
    throw new Error("现在没轮到你，不能猜底牌。");
  if (room.gameState !== "playing") throw new Error("当前阶段不能猜底牌。");

  const player = room.players.find((p) => p.id === playerId);
  if (!player || !player.isAlive) throw new Error("你已经出局了，不能再猜了。");

  const { person, place, event } = room.bottomCards;
  const {
    person: guessedPerson,
    place: guessedPlace,
    event: guessedEvent,
  } = guessedCards;

  if (
    person.id === guessedPerson.id &&
    place.id === guessedPlace.id &&
    event.id === guessedEvent.id
  ) {
    // Correct guess!
    room.gameState = "finished";
    room.winner = player;
    room.log.push(`${player.name} 猜对了全部三张底牌！游戏结束！`);
    return { correct: true, room };
  } else {
    // Incorrect guess
    player.isAlive = false;
    room.log.push(`${player.name} 猜错了，出局了！`);
    const nextTurnRoom = moveToNextTurn(roomId);
    return { correct: false, room: nextTurnRoom, guessedCards };
  }
};

const clearTimer = (roomId) => {
  if (timers[roomId]) {
    clearTimeout(timers[roomId]);
    delete timers[roomId];
  }
};

const removeRoom = (roomId) => {
  clearTimer(roomId);
  if (rooms[roomId]) {
    delete rooms[roomId];
    console.log(`Room ${roomId} has been removed.`);
  }
};

module.exports = {
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
  removeRoom, // Export the new function
  rooms,
  disconnectPlayer,
};
