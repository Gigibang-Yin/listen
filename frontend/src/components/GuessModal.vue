<template>
    <div class="modal-overlay" v-if="isOpen">
        <div class="modal-content">
            <h3>猜底牌</h3>
            <p>请从每个类别中各选择一张牌，组成你认为的底牌。</p>
            <div class="guess-area">
                <div class="card-column" v-for="type in cardTypes" :key="type.key">
                    <h4>{{ type.name }}</h4>
                    <div class="card-list">
                        <div 
                            v-for="card in type.cards" 
                            :key="card.id" 
                            class="guess-card"
                            :class="{ selected: selectedCards[type.key]?.id === card.id }"
                            @click="selectCard(type.key, card)"
                        >
                            {{ card.content }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="actions">
                <button @click="$emit('close')">取消</button>
                <button @click="submitGuess" :disabled="!isGuessComplete">确认猜测</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { socket } from '../socket';
import { store } from '../store';
import { CARDS } from '../game/cards.js';

defineProps({
    isOpen: Boolean,
});
const emit = defineEmits(['close']);

const cardTypes = ref([
    { key: 'person', name: '人物', cards: CARDS.person },
    { key: 'place', name: '地点', cards: CARDS.place },
    { key: 'event', name: '事件', cards: CARDS.event },
]);
const selectedCards = ref({ person: null, place: null, event: null });

const isGuessComplete = computed(() => {
    return selectedCards.value.person && selectedCards.value.place && selectedCards.value.event;
});

const selectCard = (type, card) => {
    selectedCards.value[type] = card;
};

const submitGuess = () => {
    if (!isGuessComplete.value) return;
    socket.emit('guessBottomCard', { roomId: store.room.id, guessedCards: selectedCards.value }, (response) => {
        if (response.success === false) {
            if (response.message) {
                 alert(`错误: ${response.message}`);
            } else {
                 alert(`猜错了！`);
            }
        }
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
.guess-area {
    display: flex;
    gap: 15px;
    flex-grow: 1;
    min-height: 0;
}
.card-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #2a2a2a;
    border-radius: 8px;
    padding: 10px;
}
.card-column h4 {
    text-align: center;
    margin-top: 0;
    margin-bottom: 10px;
}
.card-list {
    flex-grow: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.guess-card {
    background-color: #444;
    border-radius: 8px;
    padding: 15px 10px;
    text-align: center;
    border: 2px solid #555;
    cursor: pointer;
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