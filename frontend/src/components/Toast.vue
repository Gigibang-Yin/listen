<template>
  <transition name="toast-fade">
    <div v-if="toastState.isVisible" :class="['toast-container', toastState.type]">
      {{ toastState.message }}
    </div>
  </transition>
</template>

<script setup>
import { useToast } from '../composables/useToast';

const { toastState } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 25px;
  border-radius: 25px;
  color: #fff;
  font-weight: bold;
  z-index: 1000;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}
.toast-container.info {
  background-color: #2c3e50; /* Dark Blue */
}
.toast-container.success {
  background-color: #28a745; /* Green */
}
.toast-container.error {
  background-color: #dc3545; /* Red */
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.4s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style> 