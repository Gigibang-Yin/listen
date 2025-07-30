<template>
  <div class="game-container">
    <TurnTimer />
    <div class="turn-indicator-overlay" v-if="showTurnIndicator">
        <div class="turn-indicator-box">
            轮到 <span class="turn-player-name">{{ currentTurnPlayerName }}</span> 行动了！
        </div>
    </div>
    <header class="game-header">
      <div class="logo">
        <img src="/assets/listen-logo.png" alt="哎哎我听说 Logo" />
      </div>
      <div class="room-info">房间：{{ store.room.id }}</div>
      <div class="back-card-container">
        <div class="back-card"></div>
        <div class="back-card"></div>
        <div class="back-card"></div>
        <span>底牌 (3)</span>
      </div>
    </header>

    <main class="game-board">
      <div class="game-area">
        <div class="sentence-builder-area" v-if="isMyTurn">
          <h3>轮到你造句了！</h3>
          <div class="sentence-slots">
            <div class="slot">{{ sentenceBuilder.person?.content || '人物' }}</div>
            <div class="slot">{{ sentenceBuilder.place?.content || '地点' }}</div>
            <div class="slot">{{ sentenceBuilder.event?.content || '事件' }}</div>
          </div>
          <button class="confirm-sentence-btn" @click="confirmSentence">确认造句</button>
        </div>
        <div class="players-area">
          <transition-group name="player-fade">
            <div
              v-for="player in store.room.players"
              :key="player.id"
              class="player-slot"
              :class="{ 
                  'current-turn': player.id === store.room.currentTurn, 
                  'is-out': !player.isAlive,
                  'is-disconnected': player.disconnected 
              }"
            >
              <div class="player-card">
                  <div class="response-indicator" v-if="store.room.playersWhoResponded.includes(player.id)">✔</div>
                  <img
                  :src="player.avatar || '/assets/default-avator.png'"
                  alt="avatar"
                  />
                  <span class="player-name">{{ player.name }}</span>
                  <span class="card-count">{{ player.hand.length }}张牌</span>
              </div>
            </div>
          </transition-group>
        </div>
        <div class="game-log-area">
          <GameLog :log="store.room.log" />
        </div>
      </div>
      <aside class="notebook-sidebar" :class="{ 'is-open': isNotebookOpen }">
        <button class="notebook-toggle-btn" @click="isNotebookOpen = !isNotebookOpen">
          <span class="notebook-toggle-btn-text">记事本 | 牌库</span>
        </button>
        <div class="notebook-content">
          <Notebook
            :notebook-data="myPlayer.notebook"
            :sentence-builder="sentenceBuilder"
            @update:notebookData="updateNotebook"
            @make-sentence="handleMakeSentence"
          />
        </div>
      </aside>
    </main>

    <footer class="bottom-bar">
      <div class="my-info">
        <div class="my-avatar"></div>
        <span>{{ myPlayer.name }}</span>
      </div>
      <div class="my-cards-hand">
        <transition-group name="card-hand">
          <div
            v-for="card in myPlayer.hand"
            :key="card.id"
            class="card my-hand-card"
          >
            <span>{{ card.content }}</span>
          </div>
        </transition-group>
      </div>
      <div class="actions">
        <button 
            @click="isGuessModalOpen = true" 
            v-if="isMyTurn && store.room.gameState === 'playing'"
        >
            猜底牌
        </button>
        <button
          @click="startGame"
          v-if="isHost && store.room.gameState === 'waiting'"
        >
          开始游戏
        </button>
      </div>
    </footer>
    <GuessModal :is-open="isGuessModalOpen" @close="isGuessModalOpen = false" />
    <div class="game-over-overlay" v-if="store.isGameOver">
        <div class="game-over-box">
            <h2>游戏结束</h2>
            <div class="winner-announcement">
                <strong v-if="store.room.winner">{{ store.room.winner?.name }} 获胜!</strong>
                <strong v-else>所有玩家都已出局，无人获胜！</strong>
            </div>
            <div class="bottom-cards-reveal">
                <h4>底牌是:</h4>
                <div class="card-row">
                    <div class="card revealed">{{ store.room.bottomCards.person.content }}</div>
                    <div class="card revealed">{{ store.room.bottomCards.place.content }}</div>
                    <div class="card revealed">{{ store.room.bottomCards.event.content }}</div>
                </div>
            </div>
            <button class="return-btn" @click="returnToLobby">返回大厅</button>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { socket } from '../socket';
import { store } from '../store';
import Notebook from './Notebook.vue';
import GuessModal from './GuessModal.vue';
import GameLog from './GameLog.vue';
import TurnTimer from './TurnTimer.vue';
import { useToast } from '../composables/useToast';
const { showToast } = useToast();

const showTurnIndicator = ref(false);

const currentTurnPlayerName = computed(() => {
    return store.room?.players.find(p => p.id === store.room.currentTurn)?.name || '';
});

let turnIndicatorTimeout = null;

watch(() => store.room?.currentTurn, (newTurn, oldTurn) => {
    if (newTurn && newTurn !== oldTurn) {
        showTurnIndicator.value = true;
        
        if (turnIndicatorTimeout) {
            clearTimeout(turnIndicatorTimeout);
        }

        turnIndicatorTimeout = setTimeout(() => {
            showTurnIndicator.value = false;
        }, 2500); // Show for 2.5 seconds
    }
}, { immediate: true }); // Use immediate to catch the initial turn

const isNotebookOpen = ref(true);
const sentenceBuilder = ref({ person: null, place: null, event: null });
const isGuessModalOpen = ref(false);

const isHost = computed(
  () =>
    store.room &&
    store.room.players.length > 0 &&
    store.room.players[0].id === socket.id
);
const isMyTurn = computed(() => store.room?.currentTurn === socket.id);
const myPlayer = computed(
  () =>
    store.room?.players.find((p) => p.id === socket.id) || {
      name: store.player.name, // Use stored name as a fallback
      hand: [],
      notebook: {},
    }
);

const startGame = () => {
  socket.emit("startGame", { roomId: store.room.id }, (response) => {
    if (!response.success) {
      store.error = response.message;
    }
  });
};

const updateNotebook = (newNotebookData) => {
  // Here you would emit an event to the server to save the notebook state
  // For now, we just update it locally
  const player = store.room.players.find((p) => p.id === socket.id);
  if (player) {
    player.notebook = newNotebookData;
  }
};

const handleMakeSentence = (card) => {
    if (!isMyTurn.value) {
        showToast("还没轮到你呢！", 'error');
        return;
    }
    sentenceBuilder.value[card.type] = card;
};

const confirmSentence = () => {
    const { person, place, event } = sentenceBuilder.value;
    if (!person || !place || !event) {
        showToast("请选择 人物、地点、事件 来完成造句！", 'error');
        return;
    }
    
    socket.emit('makeSentence', { roomId: store.room.id, sentence: sentenceBuilder.value }, (response) => {
        if (response.success) {
            sentenceBuilder.value = { person: null, place: null, event: null };
        } else {
            showToast(`错误: ${response.message}`, 'error');
        }
    });
};

const returnToLobby = () => {
    console.log("Returning to lobby...");
    store.room = null;
    store.isGameOver = false;
    // No need to disconnect, socket is still alive for the next game
};
</script>

<style scoped>
.turn-indicator-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 500;
    animation: fadeIn 0.3s ease;
}

.turn-indicator-box {
    background-color: #2c3e50;
    color: #fff;
    padding: 30px 60px;
    border-radius: 15px;
    font-size: 2.5em;
    font-weight: bold;
    border: 3px solid #ffeb3b;
    box-shadow: 0 0 20px #ffeb3b;
    animation: popIn 0.4s ease-out;
}

.turn-player-name {
    color: #ffeb3b;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes popIn {
    0% { transform: scale(0.5); opacity: 0; }
    80% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(1); }
}

.game-container {
  background-size: cover;
  background-position: center;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
  background: url("/assets/game-bg.png") no-repeat center center;
  background-size: contain;
}
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 30px;
  background-color: rgba(0, 0, 0, 0.2);
}
.logo img {
  height: 50px;
}
.back-card-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.back-card-container span {
    margin-top: 5px;
}
.back-card {
    display: inline-block;
    margin: 0 -15px; /* Overlap cards slightly */
}
.back-card:nth-child(1) { transform: rotate(-5deg); }
.back-card:nth-child(2) { z-index: 1; transform: scale(1.05); }
.back-card:nth-child(3) { transform: rotate(5deg); }
.game-board {
  display: flex;
  flex-grow: 1;
  padding: 20px;
  gap: 20px;
  position: relative;
  overflow: hidden; /* Important for the sidebar transition */
}
.game-area {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: margin-right 0.4s ease-in-out;
}
.notebook-sidebar.is-open + .game-area {
    /* This might not be needed if sidebar is fixed, but can be useful */
    /* margin-right: 400px; */
}
.players-area {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}
.player-slot {
  padding: 5px;
  border-radius: 12px;
}
.player-slot.current-turn {
  background-color: rgba(255, 255, 0, 0.3);
  box-shadow: 0 0 10px #ffeb3b;
}
.player-slot.is-out .player-card,
.player-slot.is-disconnected .player-card {
    background-color: #555;
    opacity: 0.6;
    filter: grayscale(80%);
}

.player-slot.is-disconnected .player-card::after {
    content: '离线';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #ffc107;
    font-size: 20px;
    font-weight: bold;
    background-color: rgba(0,0,0,0.5);
    padding: 5px 10px;
    border-radius: 4px;
}

.player-card {
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  width: 120px;
  transition: all 0.3s ease;
  position: relative; /* Needed for absolute positioning of the indicator */
}
.player-card img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-bottom: 5px;
}
.player-name {
  display: block;
  font-weight: bold;
}
.public-cards-area { /* This is the old class name */
    display: none; 
}

.game-log-area {
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    padding: 15px;
    flex-grow: 1;
    min-height: 0; /* Allow flex-grow to work correctly */
}
.notebook-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100%;
  transform: translateX(400px);
  transition: transform 0.4s ease-in-out;
  display: flex;
  align-items: center;
  z-index: 100;
}
.notebook-sidebar.is-open {
  transform: translateX(0);
}
.notebook-toggle-btn {
  position: absolute;
  left: -30px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: auto;
  background-color: #333;
  border: none;
  border-radius: 8px 0 0 8px;
  color: white;
  cursor: pointer;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  padding: 10px 5px;
  font-size: 16px;
}
.notebook-toggle-btn-text {
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  writing-mode: vertical-lr;
  text-orientation: mixed;
}
.notebook-content {
  width: 100%;
  height: 90%; /* Adjust height as needed */
  max-height: 800px;
}
.bottom-bar {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.6);
}
.my-info {
  text-align: center;
  margin-right: 20px;
}
.my-avatar {
  width: 50px;
  height: 50px;
  background-image: url("/assets/default-avator.png");
  background-size: contain;
}
.my-cards-hand {
  flex-grow: 1;
  display: flex;
  gap: 10px;
  justify-content: center;
}
.card {
  width: 90px;
  height: 130px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 16px;
  font-weight: bold;
  border-radius: 8px;
  color: #fff;
}
.my-hand-card {
  background-color: #333;
  border: 1px solid #555;
}
.public-card {
  background-color: #6c757d;
}
.actions {
  margin-left: 20px;
}
.sentence-builder-area {
    background-color: rgba(0, 0, 0, 0.5);
    border: 1px solid #ffeb3b;
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    margin-bottom: 20px;
}
.sentence-slots {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin: 10px 0;
}
.slot {
    background-color: #555;
    padding: 10px 20px;
    border-radius: 4px;
    min-width: 80px;
}
.confirm-sentence-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    cursor: pointer;
}
.response-indicator {
    position: absolute;
    top: -5px;
    right: -5px;
    background-color: #28a745;
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    font-weight: bold;
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
}
.player-fade-enter-active,
.player-fade-leave-active {
  transition: all 0.5s ease;
}
.player-fade-enter-from,
.player-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
.player-fade-move {
  transition: transform 0.5s ease;
}
.card-hand-enter-active,
.card-hand-leave-active {
  transition: all 0.5s ease;
}
.card-hand-enter-from,
.card-hand-leave-to {
  opacity: 0;
  transform: translateY(30px) scale(0.9);
}
.card-hand-move {
    transition: transform 0.5s ease;
}
.game-over-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 400;
    animation: fadeIn 0.5s;
}
.game-over-box {
    background-color: #2c3e50;
    padding: 30px;
    border-radius: 15px;
    text-align: center;
    border: 2px solid #ffeb3b;
}
.winner-announcement {
    font-size: 24px;
    margin: 15px 0;
}
.bottom-cards-reveal h4 {
    margin-bottom: 10px;
}
.card-row {
    display: flex;
    gap: 15px;
}
.card.revealed {
    background-color: #eee;
    color: #333;
    width: 100px;
    height: 140px;
}
.return-btn {
    margin-top: 25px;
    padding: 12px 30px;
    font-size: 18px;
    cursor: pointer;
}
</style>
