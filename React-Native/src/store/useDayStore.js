// src/store/useDayStore.js
import dayjs from "dayjs";
import { create } from "zustand";

const useDayStore = create((set) => ({
  selectedDay: dayjs(),
  setSelectedDay: (day) => set({ selectedDay: day }),
}));

export default useDayStore;
