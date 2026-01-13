import dayjs from "dayjs";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";

export default function ProgressBar({ selectedDay }) {
  const tasks = useTaskStore((s) => s.tasks);

  const stats = useMemo(() => {
    const day = selectedDay ? dayjs(selectedDay) : dayjs();

    const dayTasks = tasks.filter((t) => t.dueDate && dayjs(t.dueDate).isSame(day, "day"));

    // Excludem Canceled din total (ca să fie “corect” ca progres)
    const active = dayTasks.filter((t) => getTaskStatus(t) !== "Canceled");
    const total = active.length;

    const completed = active.filter((t) => getTaskStatus(t) === "Completed").length;

    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, pct };
  }, [tasks, selectedDay]);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>Progresul zilei</Text>
        <Text style={styles.right}>{stats.pct}%</Text>
      </View>

      <View style={styles.barWrap}>
        <View style={[styles.barFill, { width: `${stats.pct}%` }]} />
      </View>

      <Text style={styles.sub}>
        {stats.total === 0 ? "Nu ai taskuri pentru ziua asta." : `${stats.completed}/${stats.total} completate`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(219,234,254,0.35)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    marginBottom: 12,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontWeight: "900" },
  right: { fontWeight: "900", opacity: 0.8 },

  barWrap: {
    marginTop: 10,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.18)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
  sub: { marginTop: 8, opacity: 0.7, fontWeight: "700" },
});
