<template>
    <div class="log-container">
        <h4>游戏日志</h4>
        <ul class="log-list" ref="logListEl">
            <transition-group name="log-item">
                <li v-for="(entry, index) in log" :key="index" class="log-entry">
                    <span class="log-message">{{ entry.message }}</span>
                </li>
            </transition-group>
        </ul>
    </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
    log: {
        type: Array,
        required: true,
        default: () => []
    }
});

const logListEl = ref(null);

watch(() => props.log, async (newLog, oldLog) => {
    if (!logListEl.value) return;

    // Check if user is near the bottom before the DOM updates
    const el = logListEl.value;
    const isScrolledToBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50; // 50px buffer

    await nextTick();

    if (isScrolledToBottom) {
        el.scrollTop = el.scrollHeight;
    }
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
    max-height: 60vh; /* Constrain height */
}

.log-container h4 {
    margin-top: 0;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 10px;
    flex-shrink: 0; /* Prevent header from shrinking */
}

.log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex-grow: 1;
    min-height: 0; /* Allow flex container to shrink properly */
}

.log-list li {
    padding: 8px 5px;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
    font-size: 14px;
    color: #e0e0e0;
    line-height: 1.5;
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
  transition: all 0.3s ease;
}
.log-item-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
</style> 