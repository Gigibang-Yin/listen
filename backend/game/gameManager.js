const { CARDS } = require("./cards");

const rooms = {};

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
    bottomCard: null,
    publicCards: [],
    gameState: "waiting", // waiting, playing, finished
    currentTurn: null,
    log: [],
  };
  return rooms[roomId];
};

const joinRoom = (roomId, playerId, playerName) => {
  if (!rooms[roomId]) {
    createRoom(roomId);
  }
  const room = rooms[roomId];
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
  };
  room.players.push(player);
  return room;
};

const leaveRoom = (roomId, playerId) => {
  const room = rooms[roomId];
  if (!room) return;
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
  const allFunctionCards = [...CARDS.person, ...CARDS.place, ...CARDS.event];

  // 2. Select a bottom card
  const bottomCardIndex = Math.floor(Math.random() * allFunctionCards.length);
  room.bottomCard = allFunctionCards.splice(bottomCardIndex, 1)[0];

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
  room.log.push("游戏开始！");

  return room;
};

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  startGame,
  rooms,
};
