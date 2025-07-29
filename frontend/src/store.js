import { reactive } from "vue";

export const store = reactive({
  room: null,
  player: {
    id: null,
    name: "",
  },
  error: null,
});
