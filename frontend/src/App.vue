<script setup>
import { onMounted, ref } from 'vue';
import { socket } from './socket';
import { store } from './store';
import CreateRoom from './components/CreateRoom.vue';
import Game from './components/Game.vue';
import ViewCardModal from './components/ViewCardModal.vue';
import { useToast } from './composables/useToast';
import TurnTimer from './components/TurnTimer.vue';
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
      store.room.currentSentence = sentence;
      store.room.gameState = 'responding';
      // The UI in Game.vue will now react to the 'responding' state.
      // The modal logic is no longer needed here.
  });

  socket.on('viewCardPhase', ({ responses }) => {
      store.room.gameState = 'viewing';
      store.room.responses = responses; // Store responses for the viewer
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
  <div class="app-container">
    <template v-if="store.room">
      <Game />
      <!-- ResponseModal is no longer needed here -->
      <ViewCardModal />
    </template>
    <CreateRoom v-else />
    <Toast />
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
