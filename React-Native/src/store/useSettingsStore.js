// src/store/useSettingsStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const WEEKDAY_IDS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function createEmptyPerDaySchedule() {
  const base = {};
  WEEKDAY_IDS.forEach((id) => {
    base[id] = { enabled: false, start: "08:00", end: "16:00" };
  });
  return base;
}

const useSettingsStore = create(
  persist(
    (set) => ({
      workLabel: "Muncă",
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      workStart: "08:00",
      workEnd: "16:00",

      scheduleMode: "simple",
      perDaySchedule: createEmptyPerDaySchedule(),

      wakeTime: "07:00",
      sleepTime: "23:30",

      customOverrides: {},

      setWorkLabel: (workLabel) => set({ workLabel }),
      setWorkDays: (workDays) => set({ workDays }),
      setWorkHours: (start, end) => set({ workStart: start, workEnd: end }),
      setScheduleMode: (mode) => set({ scheduleMode: mode }),

      setPerDaySchedule: (dayId, partial) =>
        set((state) => {
          const current =
            (state.perDaySchedule && state.perDaySchedule[dayId]) || {};
          return {
            perDaySchedule: {
              ...state.perDaySchedule,
              [dayId]: { ...current, ...partial },
            },
          };
        }),

      resetPerDaySchedule: () => set({ perDaySchedule: createEmptyPerDaySchedule() }),

      setWakeTime: (wakeTime) => set({ wakeTime }),
      setSleepTime: (sleepTime) => set({ sleepTime }),

      setOverride: (date, override) =>
        set((state) => ({
          customOverrides: { ...state.customOverrides, [date]: override },
        })),

      removeOverride: (date) =>
        set((state) => {
          const updated = { ...state.customOverrides };
          delete updated[date];
          return { customOverrides: updated };
        }),
    }),
    {
      name: "settings-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
