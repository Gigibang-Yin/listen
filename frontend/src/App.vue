<script setup>
import { onMounted } from 'vue';
import { socket } from './socket';
import { store } from './store';
import CreateRoom from './components/CreateRoom.vue';
import Game from './components/Game.vue';
import ResponseModal from './components/ResponseModal.vue';
import ViewCardModal from './components/ViewCardModal.vue';
import { useToast } from './composables/useToast';
import Toast from './components/Toast.vue';

const { showToast } = useToast();

onMounted(() => {
  const savedPlayerName = sessionStorage.getItem('playerName');
  const savedRoomId = sessionStorage.getItem('roomId');

  if (savedPlayerName && savedRoomId) {
    store.player.name = savedPlayerName;
    socket.connect();
    // The backend now handles reconnection logic seamlessly.
    socket.emit('joinRoom', { roomId: savedRoomId, playerName: savedPlayerName }, (response) => {
      if (!response.success) {
        // If join fails (e.g., room deleted), clear session and show create/join page.
        sessionStorage.removeItem('playerName');
        sessionStorage.removeItem('roomId');
        store.error = response.message;
      }
      // Success is handled by the 'roomUpdate' event
    });
  }

  socket.on('connect', () => {
    store.player.id = socket.id;
  });

  socket.on('disconnect', () => {
    // We no longer clear session storage here, to allow for reconnection.
    // The UI will show a disconnected state.
    // store.room = null; // We can keep the room data to show a disconnected view
  });

  socket.on('roomUpdate', (room) => {
    store.room = room;
  });

  socket.on('gameStarted', (room) => {
      store.room = room;
  });

  socket.on('newSentence', (sentence) => {
      if (socket.id === store.room.currentTurn) return;
      store.sentenceToRespond = sentence;
      store.isResponding = true;
  });

  socket.on('gameOver', ({ room }) => {
    console.log("Received gameOver event! Winner:", room.winner.name);
    store.room = room;
    store.isGameOver = true; // Force the game over state
    
    sessionStorage.removeItem("playerName");
    sessionStorage.removeItem("roomId");
  });

  socket.on('error', (message) => {
    store.error = message;
  });
});
</script>

<template>
  <div id="app">
    <Toast />
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
