import { create } from "zustand";
import dayjs from "dayjs";

const useDayStore = create((set) => ({
  selectedDay: dayjs(),

  setSelectedDay: (day) => set({ selectedDay: day }),
}));

export default useDayStore;
