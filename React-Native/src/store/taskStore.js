// src/store/taskStore.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { db } from "../firebase";

const useTaskStore = create(
  persist(
    (set, get) => ({
      tasks: [],
      userId: null,

      subscribeToTasks: (userId) => {
        set({ userId, tasks: [] });
        if (!userId) return () => {};
//citire;
        const tasksRef = collection(db, "users", userId, "tasks");
        const q = query(tasksRef);

        const unsub = onSnapshot(q, (snap) => {
          const next = snap.docs.map((d) => {
            const data = d.data();
            const completedAt =
              data.completedAt && typeof data.completedAt.toDate === "function"
                ? data.completedAt.toDate().toISOString()
                : data.completedAt || null;

            return { ...data, id: d.id, completedAt };
          });
          set({ tasks: next });
        });

        return () => unsub();
      },

      addTask: async (task) => {
        const { userId } = get();
        const baseTask = {
          completedAt: null,
          ...task,
        };

        if (!userId) {
          const localTask = {
            id:
              task.id ||
              `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            ...baseTask,
          };
          set((state) => ({ tasks: [...state.tasks, localTask] }));
          return;
        }
//scriere
        const ref = await addDoc(collection(db, "users", userId, "tasks"), {
          ...baseTask,
          createdAt: serverTimestamp(),
        });
        return ref.id;
      },

      updateTask: async (id, data) => {
        const { userId } = get();
        const patch = { ...data };

        if ("status" in data) {
          if (data.status === "Completed") {
            patch.completedAt = new Date().toISOString();
          } else {
            patch.completedAt = null;
          }
        }

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== id) return t;

            const next = { ...t, ...patch };
            return next;
          }),
        }));
//update
        if (!userId) return;
        await updateDoc(doc(db, "users", userId, "tasks", id), patch);
      },

      deleteTask: async (id) => {
        set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
        const { userId } = get();
//stergere        
        if (!userId) return;
        await deleteDoc(doc(db, "users", userId, "tasks", id));
      },

      deleteAllWorkTasks: async () => {
        set((state) => ({
          tasks: state.tasks.filter(
            (t) => !(t.status === "Work" || t.type === "work")
          ),
        }));

        const { userId } = get();
        if (!userId) return;

        const tasksRef = collection(db, "users", userId, "tasks");
        const [byStatus, byType] = await Promise.all([
          getDocs(query(tasksRef, where("status", "==", "Work"))),
          getDocs(query(tasksRef, where("type", "==", "work"))),
        ]);

        const batch = writeBatch(db);
        const seen = new Set();

        byStatus.forEach((snap) => {
          if (seen.has(snap.id)) return;
          seen.add(snap.id);
          batch.delete(snap.ref);
        });

        byType.forEach((snap) => {
          if (seen.has(snap.id)) return;
          seen.add(snap.id);
          batch.delete(snap.ref);
        });

        if (seen.size > 0) await batch.commit();
      },

      clearTasks: () => set({ tasks: [] }),
    }),
    {
      name: "task-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useTaskStore;
