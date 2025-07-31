<template>
    <div class="modal-overlay" v-if="isVisible">
        <div class="modal-content">
            <div v-if="!viewedCard">
                <h3>选择一张牌查看</h3>
                <p>以下是其他玩家打出的牌，请选择一张查看。</p>
                <div class="responded-cards-grid">
                    <div 
                        v-for="response in store.room?.responses" 
                        :key="response.playerId"
                        class="card-to-view"
                        @click="handleViewCard(response.playerId)"
                    >
                        <div class="player-name-tag">{{ getPlayerName(response.playerId) }}</div>
                    </div>
                </div>
            </div>
            <div v-else class="card-reveal-section">
                <h3>你查看的牌是:</h3>
                <div class="revealed-card">
                    {{ viewedCard.content }}
                </div>
                <button @click="finishViewing">结束回合</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { socket } from '../socket';
import { store } from '../store';

const viewedCard = ref(null);

const isVisible = computed(() => {
    return store.room?.gameState === 'viewing' && store.room?.currentTurn === socket.id;
});

const getPlayerName = (playerId) => {
    return store.room?.players?.find(p => p.id === playerId)?.name || '';
};

const handleViewCard = (targetPlayerId) => {
    socket.emit('viewCard', { roomId: store.room.id, targetPlayerId }, (response) => {
        if (response.success) {
            viewedCard.value = response.card;
        } else {
            alert(`Error: ${response.message}`);
        }
    });
};

const finishViewing = () => {
    socket.emit('finishedViewing', { roomId: store.room.id });
    viewedCard.value = null; // Reset for next turn
};

</script>

<style scoped>
.modal-overlay {
    /* ... same as ResponseModal ... */
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
    /* ... same as ResponseModal ... */
    background-color: #444;
    padding: 25px;
    border-radius: 12px;
    width: 90%;
    max-width: 600px;
    text-align: center;
    color: #fff;
}
.responded-cards-grid {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 20px;
}
.card-to-view {
    width: 100px;
    height: 140px;
    background-image: url('/assets/back-card.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    transition: all 0.2s ease;
}
.card-to-view:hover {
    border-color: #ffeb3b;
    transform: scale(1.05);
}
.player-name-tag {
    position: absolute;
    bottom: -25px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 14px;
}
.card-reveal-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}
.revealed-card {
    width: 150px;
    height: 210px;
    background-color: #333;
    border: 1px solid #666;
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    font-weight: bold;
}
.card-reveal-section button {
    padding: 10px 25px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    background-color: #4CAF50;
    color: white;
}
</style> 