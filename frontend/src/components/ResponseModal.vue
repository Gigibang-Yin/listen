<template>
  <div class="modal-overlay" v-if="isOpen">
    <div class="modal-content">
      <h3>轮到你响应了！</h3>
      <p>当前句子: <strong>{{ sentence.person?.content }}</strong> 在 <strong>{{ sentence.place?.content }}</strong> <strong>{{ sentence.event?.content }}</strong></p>
      
      <div v-if="playableCards.length > 0">
        <p>请选择一张牌响应:</p>
        <div class="card-selection">
          <div
            v-for="card in playableCards"
            :key="card.id"
            class="card response-card"
            :class="{ 'selected': selectedResponseCard?.id === card.id }"
            @click="selectCard(card)"
          >
            <span>{{ card.content }}</span>
            <small>{{ card.type === 'water' ? '水牌' : '功能牌' }}</small>
          </div>
        </div>
        <button @click="confirmResponse" :disabled="!selectedResponseCard">确认出牌</button>
      </div>
      <div v-else>
        <p>你没有可响应的牌，将自动“过”。</p>
        <button @click="passResponse">好的</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { store } from '../store';
import { socket } from '../socket';

const props = defineProps({
  isOpen: Boolean,
  sentence: Object,
});

const emit = defineEmits(['close']);

const selectedResponseCard = ref(null);

const myPlayer = computed(() => store.room?.players.find(p => p.id === socket.id));

const playableCards = computed(() => {
    if (!props.isOpen || !myPlayer.value || !props.sentence) {
        return [];
    }

    const hand = myPlayer.value?.hand || []; // Use optional chaining and provide a fallback
    const { person, place, event } = props.sentence;

    const matchingCards = hand.filter(card => 
        card.type !== 'water' &&
        (card.content === person?.content || card.content === place?.content || card.content === event?.content)
    );

    if (matchingCards.length > 0) {
        return matchingCards;
    }

    const waterCards = hand.filter(card => card.type === 'water');
    if (waterCards.length > 0) {
        return waterCards;
    }

    return []; // No playable cards
});

const passResponse = () => {
    socket.emit('respondToSentence', {
        roomId: store.room.id,
        card: null // Passing
    });
    emit('close');
}

const selectCard = (card) => {
  selectedResponseCard.value = card;
};

const confirmResponse = () => {
  if (!selectedResponseCard.value) return;
  socket.emit('respondToSentence', {
    roomId: store.room.id,
    card: selectedResponseCard.value,
  });
  emit('close');
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    selectedResponseCard.value = null; // Reset selection when modal opens
    // If there are no playable cards, automatically pass after a short delay
    if (playableCards.value.length === 0) {
        setTimeout(() => {
            // Check again in case modal was closed during timeout
            if(props.isOpen) {
                passResponse();
            }
        }, 2000);
    }
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background: #2c3e50;
  padding: 25px;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  text-align: center;
}
.card-selection {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin: 15px 0;
}
.card {
    width: 90px;
    height: 130px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-size: 16px;
    font-weight: bold;
    border-radius: 8px;
    color: #fff;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.2s ease;
}
.response-card {
    background-color: #3e4f62;
}
.response-card.selected {
    border-color: #ffeb3b;
    transform: scale(1.05);
}
.card small {
    font-size: 10px;
    margin-top: 5px;
    color: #ccc;
}
button {
    padding: 10px 20px;
    border-radius: 5px;
    border: none;
    background-color: #4CAF50;
    color: white;
    cursor: pointer;
}
button:disabled {
    background-color: #555;
    cursor: not-allowed;
}
</style> 