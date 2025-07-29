<template>
  <div
    class="game-container"
    :style="{ backgroundImage: `url('/assets/game-bg.png')` }"
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
      <div class="notebook-area">
        <Notebook
          :notebook-data="myPlayer.notebook"
          @update:notebookData="updateNotebook"
        />
      </div>
    </main>

    <footer class="bottom-bar">
      <div class="my-info">
        <div class="my-avatar"></div>
        <span>我</span>
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
import { computed } from "vue";
import { socket } from "../socket";
import { store } from "../store";
import Notebook from "./Notebook.vue";

const isHost = computed(
  () =>
    store.room &&
    store.room.players.length > 0 &&
    store.room.players[0].id === socket.id
);
const myPlayer = computed(
  () =>
    store.room?.players.find((p) => p.id === socket.id) || {
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
}
.game-area {
  flex: 3;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
.notebook-area {
  flex: 2;
  min-width: 350px;
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
