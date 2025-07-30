<template>
    <div class="modal-overlay" v-if="store.isResponding">
        <div class="modal-content">
            <h3>响应环节</h3>
            <p><strong>{{ sentenceMakerName }}</strong> 造句了:</p>
            <div class="sentence-display">
                <span>{{ store.sentenceToRespond.person.content }}</span>
                <span>{{ store.sentenceToRespond.place.content }}</span>
                <span>{{ store.sentenceToRespond.event.content }}</span>
            </div>

            <h4>请选择一张牌打出：</h4>
            <div class="card-selection">
                <div 
                    v-for="card in availableCards" 
                    :key="card.id" 
                    class="card response-card"
                    :class="{ selected: selectedCard?.id === card.id }"
                    @click="selectCard(card)"
                >
                    {{ card.content }}
                </div>
                 <div 
                    v-if="availableCards.length === 0" 
                    class="no-cards-message"
                >
                    你没有可出的牌。
                </div>
            </div>

            <div class="actions">
                <button @click="submitResponse" :disabled="!selectedCard">确认出牌</button>
                <button @click="passResponse" v-if="!mustRespond">不出</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { socket } from '../socket';
import { store } from '../store';

const selectedCard = ref(null);

const sentenceMakerName = computed(() => {
    const maker = store.room?.players.find(p => p.id === store.room.currentTurn);
    return maker ? maker.name : '一位玩家';
});

const myPlayer = computed(() => store.room?.players.find(p => p.id === socket.id));

const availableCards = computed(() => {
    if (!myPlayer.value || !store.sentenceToRespond) return [];
    const sentence = store.sentenceToRespond;
    const hand = myPlayer.value.hand;

    return hand.filter(card => 
        card.type === 'water' ||
        (card.type === 'person' && card.content === sentence.person.content) ||
        (card.type === 'place' && card.content === sentence.place.content) ||
        (card.type === 'event' && card.content === sentence.event.content)
    );
});

const mustRespond = computed(() => availableCards.value.some(c => c.type !== 'water'));

const selectCard = (card) => {
    selectedCard.value = card;
};

const submitResponse = () => {
    if (!selectedCard.value) return;
    socket.emit('respondToSentence', { roomId: store.room.id, card: selectedCard.value });
    resetModal();
};

const passResponse = () => {
    // A special "pass" card could be sent, or just an empty response.
    // Let's send a null card.
    socket.emit('respondToSentence', { roomId: store.room.id, card: null });
    resetModal();
};

const resetModal = () => {
    store.isResponding = false;
    store.sentenceToRespond = null;
    selectedCard.value = null;
};

</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 200;
}
.modal-content {
    background-color: #444;
    padding: 25px;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    text-align: center;
    color: #fff;
}
.sentence-display {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin: 15px 0;
    font-size: 18px;
}
.sentence-display span {
    background-color: #555;
    padding: 8px 15px;
    border-radius: 4px;
}
.card-selection {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin: 20px 0;
    min-height: 80px;
}
.response-card {
    width: 100px;
    height: 140px;
    background-color: #333;
    border: 1px solid #666;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: all 0.2s ease;
}
.response-card.selected {
    border-color: #4CAF50;
    box-shadow: 0 0 10px #4CAF50;
    transform: scale(1.05);
}
.no-cards-message {
    align-self: center;
    color: #aaa;
}
.actions {
    display: flex;
    justify-content: center;
    gap: 20px;
}
.actions button {
    padding: 10px 25px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
}
.actions button:disabled {
    background-color: #666;
    cursor: not-allowed;
}
</style> 