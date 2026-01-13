// src/store/focusStore.js
import { create } from "zustand";

const useFocusStore = create((set) => ({
  isOpen: false,
  task: null,

  enterFocus: (task) => set({ isOpen: true, task }),
  exitFocus: () => set({ isOpen: false, task: null }),
}));

export default useFocusStore;
