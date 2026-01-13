import dayjs from "dayjs";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import useTaskStore from "../store/taskStore";
import TaskItem from "./TaskItem";

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getTimeKey(task) {
  const minutes = parseTimeToMinutes(task.startTime);
  if (minutes === null) return 24 * 60 + 1;
  return minutes;
}

function getImportanceRank(task) {
  if (task.type === "work" || task.status === "Work") return 0;
  const importance = task.importance || "low";
  if (importance === "high") return 0;
  if (importance === "medium") return 1;
  return 2;
}

function sortTasks(tasks, mode) {
  if (mode === "importance") {
    return tasks.slice().sort((a, b) => {
      const rankDiff = getImportanceRank(a) - getImportanceRank(b);
      if (rankDiff !== 0) return rankDiff;
      return getTimeKey(a) - getTimeKey(b);
    });
  }

  return tasks.slice().sort((a, b) => {
    const timeDiff = getTimeKey(a) - getTimeKey(b);
    if (timeDiff !== 0) return timeDiff;
    return (a.title || "").localeCompare(b.title || "");
  });
}

export default function TaskList({ selectedDay, sortMode = "time" }) {
  const tasks = useTaskStore((s) => s.tasks);

  const data = useMemo(() => {
    const filtered = tasks.filter(
      (task) => task.dueDate && dayjs(task.dueDate).isSame(selectedDay, "day")
    );
    return sortTasks(filtered, sortMode);
  }, [tasks, selectedDay, sortMode]);

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nu există sarcini pentru această zi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {data.map((item) => (
        <TaskItem key={item.id} task={item} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 18 },
  emptyText: { textAlign: "center", opacity: 0.7, fontWeight: "700" },
  list: { paddingBottom: 24 },
});
