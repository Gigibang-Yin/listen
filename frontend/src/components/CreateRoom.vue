<template>
  <div class="create-room-container">
    <h2>哎哎我听说</h2>
    <div v-if="store.error" class="error-message">{{ store.error }}</div>
    <form @submit.prevent="handleJoinRoom">
      <div>
        <label for="name">你的名字:</label>
        <input id="name" v-model="playerName" type="text" required />
      </div>
      <div>
        <label for="room">房间号:</label>
        <input id="room" v-model="roomId" type="text" required />
      </div>
      <div class="button-group">
        <button type="button" @click="handleCreateRoom">创建房间</button>
        <button type="submit">加入房间</button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { socket } from "../socket";
import { store } from "../store";

const playerName = ref("");
const roomId = ref("");

const handleCreateRoom = () => {
  if (!playerName.value || !roomId.value) {
    store.error = "请输入你的名字和房间号";
    return;
  }
  store.player.name = playerName.value;
  sessionStorage.setItem("playerName", playerName.value);
  sessionStorage.setItem("roomId", roomId.value);
  socket.connect();
  socket.emit(
    "createRoom",
    { roomId: roomId.value, playerName: playerName.value },
    (response) => {
      if (response.success) {
        store.room = { id: response.roomId };
      } else {
        store.error = response.message;
      }
    }
  );
};

const handleJoinRoom = () => {
  if (!playerName.value || !roomId.value) {
    store.error = "请输入你的名字和房间号";
    return;
  }
  store.player.name = playerName.value;
  sessionStorage.setItem("playerName", playerName.value);
  sessionStorage.setItem("roomId", roomId.value);
  socket.connect();
  socket.emit(
    "joinRoom",
    { roomId: roomId.value, playerName: playerName.value },
    (response) => {
      if (response.success) {
        store.room = response.room;
      } else {
        store.error = response.message;
      }
    }
  );
};
</script>

<style scoped>
.create-room-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
}
.error-message {
  color: red;
  margin-bottom: 15px;
}
form div {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
}
input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
.button-group {
  display: flex;
  justify-content: space-around;
}
button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button[type="submit"] {
  background-color: #4caf50;
  color: white;
}
button[type="button"] {
  background-color: #008cba;
  color: white;
}
</style>
