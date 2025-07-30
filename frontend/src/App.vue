<script setup>
import { onMounted, onUnmounted } from "vue";
import CreateRoom from "./components/CreateRoom.vue";
import Game from "./components/Game.vue";
import { socket } from "./socket";
import { store } from "./store";
import ResponseModal from './components/ResponseModal.vue';
import ViewCardModal from './components/ViewCardModal.vue';

onMounted(() => {
  const savedPlayerName = sessionStorage.getItem("playerName");
  const savedRoomId = sessionStorage.getItem("roomId");

  if (savedPlayerName && savedRoomId) {
    store.player.name = savedPlayerName;
    socket.connect();
    socket.emit(
      "joinRoom",
      { roomId: savedRoomId, playerName: savedPlayerName },
      (response) => {
        if (response.success) {
          store.room = response.room;
        } else {
          sessionStorage.removeItem("playerName");
          sessionStorage.removeItem("roomId");
          store.error = response.message;
        }
      }
    );
  }

  socket.on("connect", () => {
    store.player.id = socket.id;
  });

  socket.on("disconnect", () => {
    store.room = null;
    store.player.id = null;
    sessionStorage.removeItem("playerName");
    sessionStorage.removeItem("roomId");
  });

  socket.on("roomUpdate", (room) => {
    store.room = room;
  });

  socket.on("gameStarted", (room) => {
    store.room = room;
    // You can add a notification here to let players know the game has started
  });

  socket.on('newSentence', (sentence) => {
      // Don't show modal to the sentence maker
      if (socket.id === store.room.currentTurn) return;

      store.sentenceToRespond = sentence;
      store.isResponding = true;
  });

  socket.on('gameOver', ({ room }) => {
    store.room = room; // Update to the final room state
    const winnerName = room.winner ? room.winner.name : 'Someone';
    const bottomCardContent = room.bottomCard.content;
    alert(`游戏结束！\n胜利者是 ${winnerName}！\n底牌是【${bottomCardContent}】。`);
  });

  socket.on("error", (message) => {
    store.error = message;
  });
});

onUnmounted(() => {
  socket.disconnect();
});
</script>

<template>
  <div id="app">
    <template v-if="store.room">
      <Game />
      <ResponseModal />
      <ViewCardModal />
    </template>
    <template v-else>
      <CreateRoom />
    </template>
  </div>
</template>

<style>
/* Add some global styles */
body {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin: 0;
}

</style>
