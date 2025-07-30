<template>
  <div
    class="game-container"
  >
    <header class="game-header">
      <div class="logo">
        <img src="/assets/listen-logo.png" alt="哎哎我听说 Logo" />
      </div>
      <div class="room-info">房间：{{ store.room.id }}</div>
      <div class="back-card-container">
        <div class="back-card"></div>
        <span>底牌</span>
      </div>
    </header>

    <main class="game-board">
      <div class="game-area">
        <div class="players-area">
          <div
            v-for="player in store.room.players"
            :key="player.id"
            class="player-slot"
            :class="{ 'current-turn': player.id === store.room.currentTurn }"
          >
            <div class="player-card">
              <img
                :src="player.avatar || '/assets/default-avator.png'"
                alt="avatar"
              />
              <span class="player-name">{{ player.name }}</span>
              <span class="card-count">{{ player.hand.length }}张牌</span>
            </div>
          </div>
        </div>
        <div class="public-cards-area">
          <div class="area-title">公开牌</div>
          <div class="card-grid">
            <div
              v-for="card in store.room.publicCards"
              :key="card.id"
              class="card public-card"
            >
              <span>{{ card.content }}</span>
            </div>
          </div>
        </div>
      </div>
      <aside class="notebook-sidebar" :class="{ 'is-open': isNotebookOpen }">
        <button class="notebook-toggle-btn" @click="isNotebookOpen = !isNotebookOpen">
          <span class="notebook-toggle-btn-text">记事本 | 牌库</span>
        </button>
        <div class="notebook-content">
          <Notebook :notebook-data="myPlayer.notebook" @update:notebookData="updateNotebook" @make-sentence="handleMakeSentence"/>
        </div>
      </aside>
    </main>

    <footer class="bottom-bar">
      <div class="my-info">
        <div class="my-avatar"></div>
        <span>{{ myPlayer.name }}</span>
      </div>
      <div class="my-cards-hand">
        <div
          v-for="card in myPlayer.hand"
          :key="card.id"
          class="card my-hand-card"
        >
          <span>{{ card.content }}</span>
        </div>
      </div>
      <div class="actions">
        <button
          @click="startGame"
          v-if="isHost && store.room.gameState === 'waiting'"
        >
          开始游戏
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { socket } from '../socket';
import { store } from '../store';
import Notebook from './Notebook.vue';

const isNotebookOpen = ref(true);

const isHost = computed(
  () =>
    store.room &&
    store.room.players.length > 0 &&
    store.room.players[0].id === socket.id
);
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
    // Handle the logic for making a sentence with the selected card
    console.log('Making a sentence with:', card);
    alert(`用 ${card.content} 造句！`);
}
</script>

<style scoped>
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
  text-align: center;
}
.back-card {
  width: 60px;
  height: 90px;
  background-image: url("/assets/back-card.png");
  background-size: contain;
  background-repeat: no-repeat;
  margin-bottom: 5px;
}
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
.player-card {
  background-color: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  width: 120px;
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
.public-cards-area {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: 15px;
  flex-grow: 1;
}
.area-title {
  margin-bottom: 10px;
  font-size: 18px;
  text-align: center;
}
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
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
</style>
