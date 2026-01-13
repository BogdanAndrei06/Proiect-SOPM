import { create } from "zustand";
import { persist } from "zustand/middleware";

const WEEKDAY_IDS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function createEmptyPerDaySchedule() {
  const base = {};
  WEEKDAY_IDS.forEach((id) => {
    base[id] = {
      enabled: false,       // dacă ziua are sau nu program
      start: "08:00",       // ore default, le poți schimba din UI
      end: "16:00",
    };
  });
  return base;
}

const useSettingsStore = create(
  persist(
    (set) => ({
      // numele programului (Muncă / Facultate / etc.)
      workLabel: "Muncă",

      // MOD SIMPLU (același interval pentru zilele selectate)
      workDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      workStart: "08:00",
      workEnd: "16:00",

      // MOD: "simple" | "custom"
      scheduleMode: "simple",

      // MOD PERSONALIZAT PE ZILE
      perDaySchedule: createEmptyPerDaySchedule(),

      // rutină zilnică
      wakeTime: "07:00",
      sleepTime: "23:30",

      customOverrides: {},

      // ===== SETTERS =====
      setWorkLabel: (workLabel) => set({ workLabel }),

      setWorkDays: (workDays) => set({ workDays }),
      setWorkHours: (start, end) => set({ workStart: start, workEnd: end }),

      setScheduleMode: (mode) => set({ scheduleMode: mode }),

      setPerDaySchedule: (dayId, partial) =>
        set((state) => {
          const current = (state.perDaySchedule && state.perDaySchedule[dayId]) || {};
          return {
            perDaySchedule: {
              ...state.perDaySchedule,
              [dayId]: {
                ...current,
                ...partial,
              },
            },
          };
        }),

      resetPerDaySchedule: () =>
        set(() => ({
          perDaySchedule: createEmptyPerDaySchedule(),
        })),

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
    }
  )
);

export default useSettingsStore;
