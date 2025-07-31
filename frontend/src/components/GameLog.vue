<template>
  <div class="log-container" ref="logContainerRef">
    <transition-group name="log-entry" tag="div" class="log-list">
      <div v-for="(entry, index) in log" :key="index" class="log-entry" :class="`log-type-${entry.type}`">
        <template v-if="entry.type === 'system'">
          <span class="system-message">{{ entry.message }}</span>
        </template>
        <template v-else-if="entry.type === 'action'">
          <span class="log-author">{{ entry.author }}</span>
          <span class="log-message">&nbsp;{{ entry.message }}</span>
        </template>
        <template v-else-if="entry.type === 'chat'">
          <span class="log-author chat-author">{{ entry.author }}:</span>
          <span class="log-message chat-message">&nbsp;{{ entry.message }}</span>
        </template>
        <template v-else>
          <!-- Fallback for old string-based logs -->
          <span class="log-message">{{ entry }}</span>
        </template>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref, onMounted, onUpdated, nextTick, onBeforeUnmount } from 'vue';

const props = defineProps({
  log: {
    type: Array,
    default: () => [],
  },
});

const logContainerRef = ref(null);
const userHasScrolledUp = ref(false);

const handleScroll = () => {
    const el = logContainerRef.value;
    if (el) {
        // A little buffer to account for precision issues
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
        userHasScrolledUp.value = !isAtBottom;
    }
};

const scrollToBottom = () => {
    nextTick(() => {
        const el = logContainerRef.value;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    });
};

onMounted(() => {
    logContainerRef.value?.addEventListener('scroll', handleScroll);
    scrollToBottom();
});

onBeforeUnmount(() => {
    logContainerRef.value?.removeEventListener('scroll', handleScroll);
});

onUpdated(() => {
    if (!userHasScrolledUp.value) {
        scrollToBottom();
    }
});
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
  overflow-y: auto;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-entry {
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.5;
  font-size: 14px;
}

.log-type-system {
  color: #aaa;
  font-style: italic;
  text-align: center;
}

.log-type-action {
  background-color: rgba(255, 255, 255, 0.05);
}

.log-type-chat {
  background-color: rgba(60, 80, 110, 0.2);
}

.log-author {
  font-weight: bold;
}

.chat-author {
  color: #8ab4f8; /* A nice blue for chat authors */
}

.log-message {
  color: #e0e0e0;
}

.log-entry-enter-active, .log-entry-leave-active {
  transition: all 0.4s ease;
}
.log-entry-enter-from, .log-entry-leave-to {
  opacity: 0;
  transform: translateY(15px);
}
</style> 