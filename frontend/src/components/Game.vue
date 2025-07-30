<template>
  <div class="game-page-container">
    <TurnTimer />
    <div class="top-bar">
      <div class="logo-container">
        <img src="/assets/listen-logo.png" alt="Logo" />
      </div>
      <div class="room-info">房间: {{ store.room.id }}</div>
      <div class="back-card-display">
        <span>底牌 (3)</span>
        <div class="cards">
            <div class="back-card"></div>
            <div class="back-card"></div>
            <div class="back-card"></div>
        </div>
      </div>
    </div>

    <div class="main-layout">
      <div class="left-sidebar">
        <transition-group name="player-fade" tag="div" class="players-list">
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
            <img :src="player.avatar || '/assets/default-avator.png'" alt="avatar" />
            <div class="player-details">
              <span class="player-name">{{ player.name }}</span>
              <span class="card-count">{{ player.hand.length }} 张牌</span>
            </div>
            <div class="response-indicator" v-if="store.room.playersWhoResponded.includes(player.id)">✔</div>
          </div>
        </transition-group>
      </div>

      <div class="center-area">
        <div class="center-content-wrapper">
            <div class="sentence-builder-area" v-if="isMyTurn && store.room.gameState === 'playing'">
                <h3>轮到你造句了！请从右侧牌库选择卡牌组成句子。</h3>
                <div class="sentence-slots">
                    <div class="slot" :class="{ filled: !!sentenceBuilder.person }">{{ sentenceBuilder.person?.content || '人物' }}</div>
                    <div class="slot" :class="{ filled: !!sentenceBuilder.place }">{{ sentenceBuilder.place?.content || '地点' }}</div>
                    <div class="slot" :class="{ filled: !!sentenceBuilder.event }">{{ sentenceBuilder.event?.content || '事件' }}</div>
                </div>
                <button 
                    class="confirm-sentence-btn" 
                    @click="confirmSentence" 
                    :disabled="!isSentenceComplete"
                >
                    确认造句
                </button>
            </div>
            <GameLog :log="store.room.log" />
        </div>
      </div>

      <aside class="notebook-sidebar" :class="{ 'is-open': isNotebookOpen }">
        <button class="notebook-toggle-btn" @click="isNotebookOpen = !isNotebookOpen">
            <span>记<br>事<br>本<br>|<br>牌<br>库</span>
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
    </div>

    <div class="bottom-bar">
      <div class="my-info">
        <div class="my-avatar"></div>
        <span>{{ myPlayer.name }}</span>
      </div>
      <div class="my-cards-hand">
        <transition-group name="card-hand">
          <div v-for="card in myPlayer.hand" :key="card.id" class="card my-hand-card">
            <span>{{ card.content }}</span>
          </div>
        </transition-group>
      </div>
      <div class="actions">
        <button @click="isGuessModalOpen = true" v-if="isMyTurn && store.room.gameState === 'playing'">猜底牌</button>
        <button @click="startGame" v-if="isHost && store.room.gameState === 'waiting'">开始游戏</button>
      </div>
    </div>
    
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
    <div class="turn-indicator-overlay" v-if="showTurnIndicator">
        <div class="turn-indicator-box">
            轮到 <span class="turn-player-name">{{ currentTurnPlayerName }}</span> 行动了！
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

const isSentenceComplete = computed(() => {
    return !!(sentenceBuilder.value.person && sentenceBuilder.value.place && sentenceBuilder.value.event);
});

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
/* Main container */
.game-page-container {
  width: 100vw;
  height: 100vh;
  background-image: url('/assets/game-bg.png');
  background-size: cover;
  background-position: center;
  display: flex;
  flex-direction: column;
  color: #fff;
  overflow: hidden;
}

/* Top Bar */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
}
.logo-container img { height: 40px; }
.room-info { font-size: 18px; }
.back-card-display { text-align: right; }
.back-card-display .cards { display: flex; margin-top: 5px; }
.back-card {
    width: 40px;
    height: 60px;
    background-image: url('/assets/back-card.png');
    background-size: contain;
    background-repeat: no-repeat;
    margin-left: -15px;
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 4px;
}

/* Main Layout */
.main-layout {
  display: flex;
  flex-grow: 1;
  overflow: hidden; /* Prevent scrollbars */
  position: relative;
}

/* Left Sidebar for Players */
.left-sidebar {
  width: 200px;
  padding: 20px 10px;
  overflow-y: auto;
}
.players-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.player-slot {
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.4);
  padding: 10px;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  position: relative;
}
.player-slot.current-turn {
  border-color: #ffeb3b;
  box-shadow: 0 0 10px #ffeb3b;
}
.player-slot img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
}
.player-details {
  display: flex;
  flex-direction: column;
}
.player-name { font-weight: bold; }
.card-count { font-size: 12px; color: #ccc; }

/* Center Area for Log/Actions */
.center-area {
  flex-grow: 1;
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
}

.center-content-wrapper {
  width: 100%;
  max-width: 700px;
}

.notebook-sidebar {
    position: absolute;
    top: 0;
    right: 0;
    width: 400px;
    height: 100%;
    transform: translateX(calc(100% - 40px)); /* Start with only button visible */
    transition: transform 0.4s ease-in-out;
    z-index: 100;
    display: flex;
    align-items: center;
}

.notebook-sidebar.is-open {
    transform: translateX(0);
}

.notebook-toggle-btn {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: auto;
    background-color: rgba(20, 20, 20, 0.7);
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-right: none;
    border-radius: 8px 0 0 8px;
    color: white;
    cursor: pointer;
    padding: 20px 5px;
    font-size: 16px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    display: flex;
    align-items: center;
    justify-content: center;
}

.notebook-content {
    width: 100%;
    height: 100%;
    background-color: rgba(10, 10, 10, 0.6);
    backdrop-filter: blur(8px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
}

/* Bottom Bar for Player's Hand */
.bottom-bar {
  display: flex;
  align-items: center;
  padding: 10px;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}
.my-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20px;
}
.my-avatar {
  width: 50px;
  height: 50px;
  background-image: url("/assets/default-avator.png");
  background-size: contain;
  border-radius: 50%;
}
.my-cards-hand {
  flex-grow: 1;
  display: flex;
  gap: 10px;
  justify-content: center;
  min-height: 130px; /* Ensure space for cards */
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card {
    width: 100px;
    height: 140px;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    word-break: break-all;
    position: relative;
    transition: transform 0.2s ease-out;
}

.my-hand-card {
    background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
    border: 1px solid #555;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    cursor: default; /* Not interactive */
}

.my-hand-card:hover {
    transform: translateY(-8px);
}

.sentence-builder-area {
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid #ffeb3b;
    padding: 20px;
    border-radius: 12px;
    text-align: center;
    backdrop-filter: blur(4px);
    margin-bottom: 20px; /* Space from log */
}

.sentence-builder-area h3 {
    margin: 0 0 15px 0;
    font-weight: 300;
    font-size: 1.1em;
    color: #eee;
}

.sentence-slots {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-bottom: 20px;
}

.slot {
    background-color: rgba(0, 0, 0, 0.3);
    color: #999;
    padding: 10px 20px;
    border-radius: 6px;
    min-width: 90px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed #777;
    transition: all 0.3s ease;
}

.slot.filled {
    background-color: #3e4f62;
    color: #fff;
    border-color: #6a8bb1;
    border-style: solid;
    font-weight: bold;
}

.confirm-sentence-btn {
    background-color: #4CAF50;
    color: white;
    border: none;
    padding: 12px 25px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1em;
    transition: background-color 0.3s;
}

.confirm-sentence-btn:disabled {
    background-color: #555;
    cursor: not-allowed;
    opacity: 0.6;
}

.confirm-sentence-btn:not(:disabled):hover {
    background-color: #66bb6a;
}

/* Overlays and other specific elements (most styles remain the same) */
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
</style>
