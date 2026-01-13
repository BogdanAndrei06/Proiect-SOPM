// src/store/taskStore.js
import { create } from "zustand";
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  updateDoc,
} from "firebase/firestore";

const useTaskStore = create((set, get) => ({
  tasks: [],

  subscribeToTasks: (userId) => {
    if (!userId) {
      set({ tasks: [] });
      return () => {};
    }
//Citire
    const tasksQuery = query(
      collection(db, "users", userId, "tasks")
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      set({ tasks: items });
    });

    return () => unsubscribe();
  },

  addTask: async (task) => {
    const user = auth.currentUser;
    if (!user) return;

    const payload = {
      completedAt: null,
      ...task,
    };

    if (payload.status === "Completed") {
      payload.completedAt = new Date().toISOString();
    }
//Scriere
    const docRef = await addDoc(
      collection(db, "users", user.uid, "tasks"),
      payload
    );
    return docRef.id;
  },

  updateTask: async (id, data) => {
    const user = auth.currentUser;

    const nextData = { ...data };
    if ("status" in data) {
      if (data.status === "Completed") {
        nextData.completedAt = new Date().toISOString();
      } else {
        nextData.completedAt = null;
      }
    }

    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, ...nextData } : t
      ),
    }));
//Update
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "tasks", id), nextData);
  },

  deleteTask: async (id) => {
    const user = auth.currentUser;

    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
//Stergere
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  },

  deleteAllWorkTasks: async () => {
    const { tasks, deleteTask } = get();
    const workTasks = tasks.filter(
      (t) => t.status === "Work" || t.type === "work"
    );

    await Promise.all(workTasks.map((t) => deleteTask(t.id)));
  },

  clearTasks: () => set({ tasks: [] }),
}));

export default useTaskStore;
