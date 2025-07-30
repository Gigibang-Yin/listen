<template>
  <div class="page-container">
    <div class="create-room-container">
        <h1 class="game-title">哎哎我听说</h1>
        <div v-if="store.error" class="error-message">{{ store.error }}</div>
        <form @submit.prevent="handleJoinRoom">
            <div class="input-group">
                <input id="name" v-model="playerName" type="text" required placeholder="你的名字" />
            </div>
            <div class="input-group">
                <input id="room" v-model="roomId" type="text" required placeholder="房间号" />
            </div>
            <div class="button-group">
                <button type="button" class="btn btn-create" @click="handleCreateRoom">创建房间</button>
                <button type="submit" class="btn btn-join">加入房间</button>
            </div>
        </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { socket } from '../socket';
import { store } from '../store';

const playerName = ref('');
const roomId = ref('');

const handleCreateRoom = () => {
    if (!playerName.value || !roomId.value) {
        store.error = '请输入你的名字和房间号';
        return;
    }
    store.player.name = playerName.value;
    sessionStorage.setItem('playerName', playerName.value);
    sessionStorage.setItem('roomId', roomId.value);
    socket.connect();
    socket.emit('createRoom', { roomId: roomId.value, playerName: playerName.value }, (response) => {
        if (response.success) {
            store.room = { id: response.roomId };
        } else {
            store.error = response.message;
        }
    });
};

const handleJoinRoom = () => {
    if (!playerName.value || !roomId.value) {
        store.error = '请输入你的名字和房间号';
        return;
    }
    store.player.name = playerName.value;
    sessionStorage.setItem('playerName', playerName.value);
    sessionStorage.setItem('roomId', roomId.value);
    socket.connect();
    socket.emit('joinRoom', { roomId: roomId.value, playerName: playerName.value }, (response) => {
        if (response.success) {
            store.room = response.room;
        } else {
            store.error = response.message;
        }
    });
};
</script>

<style scoped>
.page-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    background-image: url('/assets/game-bg.png');
    background-size: cover;
    background-position: center;
}

.create-room-container {
    width: 100%;
    max-width: 400px;
    padding: 40px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 16px;
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
}
.game-title {
    color: #fff;
    font-size: 36px;
    margin-bottom: 20px;
    text-shadow: 0 0 10px #fff, 0 0 20px #007bff;
}
.error-message {
    color: #ff4d4d;
    margin-bottom: 15px;
    background-color: rgba(255, 0, 0, 0.1);
    padding: 10px;
    border-radius: 8px;
}
.input-group {
    margin-bottom: 20px;
}
input {
    width: 100%;
    padding: 15px;
    box-sizing: border-box;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #fff;
    font-size: 16px;
    transition: all 0.3s ease;
}
input::placeholder {
    color: #ccc;
}
input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 15px rgba(0, 123, 255, 0.5);
}
.button-group {
    display: flex;
    justify-content: space-between;
    gap: 15px;
}
.btn {
    flex: 1;
    padding: 15px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: bold;
    color: white;
    transition: all 0.3s ease;
    text-transform: uppercase;
}
.btn-create {
    background: #007bff;
    box-shadow: 0 0 10px #007bff;
}
.btn-join {
    background: #28a745;
    box-shadow: 0 0 10px #28a745;
}
.btn:hover {
    transform: translateY(-3px);
    filter: brightness(1.2);
}
</style>
