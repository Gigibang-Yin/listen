<template>
    <div class="modal-overlay" v-if="isOpen">
        <div class="modal-content">
            <h3>猜底牌</h3>
            <p>请从以下卡牌中选择你认为是底牌的一张。</p>
            <div class="tabs">
                <button @click="activeTab = 'person'" :class="{ active: activeTab === 'person' }">人物</button>
                <button @click="activeTab = 'place'" :class="{ active: activeTab === 'place' }">地点</button>
                <button @click="activeTab = 'event'" :class="{ active: activeTab === 'event' }">事件</button>
            </div>
            <div class="card-list">
                <div 
                    v-for="card in cardTypes[activeTab]" 
                    :key="card.id" 
                    class="guess-card"
                    :class="{ selected: selectedCard?.id === card.id }"
                    @click="selectedCard = card"
                >
                    {{ card.content }}
                </div>
            </div>
            <div class="actions">
                <button @click="$emit('close')">取消</button>
                <button @click="submitGuess" :disabled="!selectedCard">确认猜测</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { socket } from '../socket';
import { store } from '../store';
import { CARDS } from '../game/cards.js';

defineProps({
    isOpen: Boolean,
});
const emit = defineEmits(['close']);

const activeTab = ref('person');
const cardTypes = ref(CARDS);
const selectedCard = ref(null);

const submitGuess = () => {
    if (!selectedCard.value) return;
    socket.emit('guessBottomCard', { roomId: store.room.id, guessedCard: selectedCard.value }, (response) => {
        if (response.success === false) {
            if (response.message) {
                 alert(`错误: ${response.message}`);
            } else {
                 alert(`猜错了！你猜的【${response.guessedCard.content}】不是底牌。`);
            }
        }
        // On success, the gameOver event will be handled globally.
        // On failure, the modal just closes.
        emit('close');
    });
};
</script>

<style scoped>
/* Scoped styles similar to Notebook.vue but adapted for guessing */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 300;
}
.modal-content {
    background-color: #333;
    padding: 20px;
    border-radius: 12px;
    width: 90%;
    max-width: 700px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}
.tabs {
    display: flex;
    background-color: #222;
    border-radius: 8px;
    margin: 10px 0;
}
.tabs button {
    flex: 1;
    padding: 10px;
    border: none;
    background-color: transparent;
    cursor: pointer;
    font-size: 16px;
    color: #aaa;
}
.tabs button.active {
    font-weight: bold;
    color: #fff;
    background-color: #444;
}
.card-list {
    flex-grow: 1;
    padding: 15px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
    overflow-y: auto;
    background-color: #2a2a2a;
    border-radius: 8px;
}
.guess-card {
    background-color: #444;
    border-radius: 8px;
    padding: 20px 10px;
    text-align: center;
    border: 2px solid #555;
    cursor: pointer;
    transition: all 0.2s ease;
}
.guess-card.selected {
    border-color: #4CAF50;
    box-shadow: 0 0 10px #4CAF50;
}
.actions {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    gap: 15px;
}
.actions button {
    padding: 10px 20px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
}
</style> 