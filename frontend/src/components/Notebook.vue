<template>
  <div class="notebook-container">
    <div class="tabs">
      <button
        @click="activeTab = 'person'"
        :class="{ active: activeTab === 'person' }"
      >
        人物
      </button>
      <button
        @click="activeTab = 'place'"
        :class="{ active: activeTab === 'place' }"
      >
        地点
      </button>
      <button
        @click="activeTab = 'event'"
        :class="{ active: activeTab === 'event' }"
      >
        事件
      </button>
    </div>
    <div class="card-list">
      <div
        v-for="card in cardTypes[activeTab]"
        :key="card.id"
        class="notebook-card"
        @click="cycleMark(card.id)"
      >
        <div class="card-type-label">{{ getCardTypeName(card.type) }}</div>
        <div class="card-content">{{ card.content }}</div>
        <div v-if="getMark(card.id)" :class="['mark', getMark(card.id)]">
          {{ getMarkName(getMark(card.id)) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { CARDS } from "../game/cards.js";

const props = defineProps({
  notebookData: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(["update:notebookData"]);

const activeTab = ref("person");
const cardTypes = ref(CARDS);
const marks = ref(props.notebookData);

watch(
  () => props.notebookData,
  (newData) => {
    marks.value = newData;
  }
);

const getCardTypeName = (type) => {
  if (type === "person") return "人物";
  if (type === "place") return "地点";
  if (type === "event") return "事件";
  return "";
};

const getMark = (cardId) => {
  return marks.value[cardId];
};

const getMarkName = (mark) => {
  if (mark === "have") return "有";
  if (mark === "not_have") return "无";
  if (mark === "maybe") return "疑";
  return "";
};

const cycleMark = (cardId) => {
  const currentMark = marks.value[cardId];
  const newMarks = { ...marks.value };
  if (!currentMark) {
    newMarks[cardId] = "have";
  } else if (currentMark === "have") {
    newMarks[cardId] = "not_have";
  } else if (currentMark === "not_have") {
    newMarks[cardId] = "maybe";
  } else if (currentMark === "maybe") {
    delete newMarks[cardId];
  }
  emit("update:notebookData", newMarks);
};
</script>

<style scoped>
.notebook-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
}
.tabs {
  display: flex;
  justify-content: space-around;
  background-color: #f0f0f0;
}
.tabs button {
  flex: 1;
  padding: 12px;
  border: none;
  background-color: transparent;
  cursor: pointer;
  font-size: 16px;
  color: #555;
  border-bottom: 3px solid transparent;
}
.tabs button.active {
  border-bottom-color: #4a90e2;
  font-weight: bold;
  color: #333;
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
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  position: relative;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  color: #333;
}
.card-type-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 5px;
}
.card-content {
  font-size: 18px;
  font-weight: bold;
}
.mark {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.mark.have {
  background-color: #28a745;
} /* green */
.mark.not_have {
  background-color: #dc3545;
} /* red */
.mark.maybe {
  background-color: #ffc107;
} /* yellow */
</style>
