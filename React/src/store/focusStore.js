import { create } from "zustand";

const useFocusStore = create((set) => ({
  isFocusActive: false,
  focusedTask: null,

  enterFocus: (task) => set({ isFocusActive: true, focusedTask: task }),
  exitFocus: () => set({ isFocusActive: false, focusedTask: null }),
}));

export default useFocusStore;
