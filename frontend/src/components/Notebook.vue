<template>
    <div class="notebook-container">
        <div class="tabs">
            <button @click="activeTab = 'person'" :class="{ active: activeTab === 'person' }">人物</button>
            <button @click="activeTab = 'place'" :class="{ active: activeTab === 'place' }">地点</button>
            <button @click="activeTab = 'event'" :class="{ active: activeTab === 'event' }">事件</button>
        </div>
        <div class="card-list">
            <div 
                v-for="card in cardTypes[activeTab]" 
                :key="card.id" 
                class="notebook-card"
                :class="{ 'is-selected-for-sentence': isSelectedForSentence(card) }"
            >
                <div class="card-inner">
                    <div class="card-type-label">{{ getCardTypeName(card.type) }}</div>
                    <div class="card-content">{{ card.content }}</div>
                    <div v-if="getMark(card.id)" :class="['mark', getMark(card.id)]"></div>
                </div>
                <div class="card-hover-actions">
                    <button class="action-btn mark-btn" @click="cycleMark(card.id)">标记</button>
                    <button class="action-btn sentence-btn" @click="makeSentence(card)">造句</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { CARDS } from '../game/cards.js';

const props = defineProps({
    notebookData: {
        type: Object,
        required: true
    },
    sentenceBuilder: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:notebookData', 'make-sentence']);

const activeTab = ref('person');
const cardTypes = ref(CARDS);
const marks = ref(props.notebookData);

watch(() => props.notebookData, (newData) => {
    marks.value = newData;
});

const getCardTypeName = (type) => {
    if (type === 'person') return '人物';
    if (type === 'place') return '地点';
    if (type === 'event') return '事件';
    return '';
}

const getMark = (cardId) => {
    return marks.value[cardId];
};

const cycleMark = (cardId) => {
    const currentMark = marks.value[cardId];
    const newMarks = { ...marks.value };
    if (!currentMark) newMarks[cardId] = 'have';
    else if (currentMark === 'have') newMarks[cardId] = 'not_have';
    else if (currentMark === 'not_have') newMarks[cardId] = 'maybe';
    else if (currentMark === 'maybe') delete newMarks[cardId];
    emit('update:notebookData', newMarks);
};

const makeSentence = (card) => {
    emit('make-sentence', card);
    // Logic for making a sentence will be handled in the parent component
}

const isSelectedForSentence = (card) => {
    return props.sentenceBuilder[card.type]?.id === card.id;
};
</script>

<style scoped>
.notebook-container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: #333;
    border-radius: 8px;
    overflow: hidden;
    color: #fff;
}
.tabs {
    display: flex;
    background-color: #222;
}
.tabs button {
    flex: 1;
    padding: 12px;
    border: none;
    background-color: transparent;
    cursor: pointer;
    font-size: 16px;
    color: #aaa;
    border-bottom: 3px solid transparent;
}
.tabs button.active {
    border-bottom-color: #4a90e2;
    font-weight: bold;
    color: #fff;
}
.card-list {
    flex-grow: 1;
    padding: 15px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
    overflow-y: auto;
}
.notebook-card {
    background-color: #444;
    background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 0);
    background-size: 10px 10px;
    border-radius: 8px;
    text-align: center;
    position: relative;
    border: 1px solid #555;
    overflow: hidden;
}
.notebook-card.is-selected-for-sentence {
    outline: 3px solid #4CAF50;
    box-shadow: 0 0 15px #4CAF50;
}
.card-inner {
    padding: 20px 10px;
    transition: transform 0.3s ease;
}
.notebook-card:hover .card-inner {
    transform: translateY(-20px);
}
.card-type-label {
    font-size: 12px;
    color: #aaa;
    margin-bottom: 5px;
}
.card-content {
    font-size: 24px;
    font-weight: bold;
}
.mark {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
}
.mark.have { background-color: #28a745; } /* green */
.mark.not_have { background-color: #dc3545; } /* red */
.mark.maybe { background-color: #ffc107; } /* yellow */

.card-hover-actions {
    position: absolute;
    bottom: -100%;
    left: 0;
    right: 0;
    height: 40px;
    background: rgba(0, 0, 0, 0.7);
    transition: bottom 0.3s ease;
    display: flex;
}
.notebook-card:hover .card-hover-actions {
    bottom: 0;
}
.action-btn {
    flex: 1;
    border: none;
    color: #fff;
    cursor: pointer;
    background: transparent;
    font-size: 14px;
}
.action-btn.mark-btn {
    border-right: 1px solid #555;
}
.action-btn:hover {
    background: rgba(255, 255, 255, 0.1);
}
</style>
