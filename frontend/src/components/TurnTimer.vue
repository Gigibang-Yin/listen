<template>
    <div class="turn-timer-container" v-if="timeLeft > 0">
        <div class="timer-bar" :style="{ width: timerPercentage + '%' }"></div>
        <div class="timer-text">{{ Math.ceil(timeLeft / 1000) }}s</div>
    </div>
</template>

<script setup>
import { ref, watch, onUnmounted, computed } from 'vue';
import { store } from '../store';
import { GAME_CONFIG } from '../game/gameConfig.js';

const timeLeft = ref(0);
const timerPercentage = ref(100);
let interval = null;

const activeTimer = computed(() => {
    if (!store.room) return null;
    const { gameState, turnEndsAt, respondingEndsAt, viewingEndsAt } = store.room;

    if (gameState === 'playing' && turnEndsAt) {
        return { endTime: turnEndsAt, duration: GAME_CONFIG.TURN_TIMER };
    }
    if (gameState === 'responding' && respondingEndsAt) {
        return { endTime: respondingEndsAt, duration: GAME_CONFIG.RESPONSE_TIMER };
    }
    if (gameState === 'viewing' && viewingEndsAt) {
        return { endTime: viewingEndsAt, duration: GAME_CONFIG.VIEW_CARD_TIMER };
    }
    return null;
});

const stopTimer = () => {
    if (interval) clearInterval(interval);
    timeLeft.value = 0;
};

const startTimer = (endTime, totalDuration) => {
    stopTimer();

    const update = () => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
            timeLeft.value = 0;
            stopTimer();
        } else {
            timeLeft.value = remaining;
            timerPercentage.value = (remaining / totalDuration) * 100;
        }
    };

    update();
    interval = setInterval(update, 100);
};

watch(activeTimer, (newTimer) => {
    if (newTimer) {
        startTimer(newTimer.endTime, newTimer.duration);
    } else {
        stopTimer();
    }
}, { immediate: true });

onUnmounted(() => {
    stopTimer();
});
</script>

<style scoped>
.turn-timer-container {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 30px;
    background-color: #333;
    border-radius: 15px;
    border: 1px solid #555;
    overflow: hidden;
    z-index: 100;
}
.timer-bar {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #ffeb3b, #f44336);
    background-size: 300% 100%;
    animation: color-shift 5s infinite linear;
    transition: width 0.1s linear;
}
@keyframes color-shift {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
}
.timer-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
}
</style> 