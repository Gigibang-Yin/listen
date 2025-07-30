import { reactive, readonly } from "vue";

const state = reactive({
  isVisible: false,
  message: "",
  type: "info", // 'info', 'success', 'error'
});

let timeout = null;

const show = (message, type = "info", duration = 3000) => {
  state.message = message;
  state.type = type;
  state.isVisible = true;

  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(() => {
    hide();
  }, duration);
};

const hide = () => {
  state.isVisible = false;
  state.message = "";
  state.type = "info";
};

export const useToast = () => {
  return {
    toastState: readonly(state),
    showToast: show,
  };
};
