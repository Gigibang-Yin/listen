<template>
    <div class="log-container">
        <h4>游戏日志</h4>
        <ul class="log-list" ref="logList">
            <transition-group name="log-item">
                <li v-for="(entry, index) in log" :key="index">{{ entry }}</li>
            </transition-group>
        </ul>
    </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    log: {
        type: Array,
        required: true
    }
});

const logList = ref(null);

watch(() => props.log, () => {
    nextTick(() => {
        const list = logList.value;
        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    });
}, { deep: true });

</script>

<style scoped>
.log-container {
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 8px;
    padding: 15px;
    height: 100%;
    display: flex;
    flex-direction: column;
}
.log-container h4 {
    margin-top: 0;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 10px;
}
.log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex-grow: 1;
}
.log-list li {
    padding: 5px 2px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    font-size: 14px;
}
/* Custom scrollbar for better look */
.log-list::-webkit-scrollbar {
  width: 6px;
}
.log-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}
.log-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}
.log-item-enter-active {
  transition: opacity 0.5s ease;
}
.log-item-enter-from {
  opacity: 0;
}
</style> 