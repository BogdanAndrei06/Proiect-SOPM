import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";

export default function RecycleBin({ onBack }) {
  const tasks = useTaskStore((s) => s.tasks);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [rescheduleDates, setRescheduleDates] = useState({});
  const [picker, setPicker] = useState({ visible: false, taskId: null });

  const recycledTasks = useMemo(() => {
    return tasks.filter((task) => {
      const isWorkTask = task.type === "work" || task.status === "Work";
      if (isWorkTask) return false;

      const uiStatus = getTaskStatus(task);
      return uiStatus === "Overdue" || uiStatus === "Canceled";
    });
  }, [tasks]);

  const handlePickDate = (taskId, event, date) => {
    setPicker({ visible: false, taskId: null });
    if (!date) return;
    setRescheduleDates((prev) => ({
      ...prev,
      [taskId]: dayjs(date).format("YYYY-MM-DD"),
    }));
  };

  const handleReschedule = async (task) => {
    const newDate = rescheduleDates[task.id];
    if (!newDate) {
      Alert.alert("Atenție", "Selectează o dată nouă pentru acest task!");
      return;
    }

    await updateTask(task.id, {
      dueDate: newDate,
      status: "Pending",
      completedAt: null,
    });

    Alert.alert(
      "OK",
      `Task-ul "${task.title}" a fost reprogramat pentru ${dayjs(newDate).format("DD MMM YYYY")}`
    );
  };

  const hasTasks = recycledTasks.length > 0;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Recycle Bin</Text>
      <Text style={styles.sub}>
        {hasTasks
          ? "Taskurile expirate sau anulate pot fi reprogramate."
          : "Nu există taskuri Canceled sau Overdue."}
      </Text>

      {hasTasks &&
        recycledTasks.map((task) => {
          const uiStatus = getTaskStatus(task);
          const formattedDate = task.dueDate ? dayjs(task.dueDate).format("YYYY-MM-DD") : "-";
          const picked = rescheduleDates[task.id] || "";

          return (
            <View key={task.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{task.title}</Text>
                <Text style={styles.small}>Inițial: {formattedDate}</Text>
                <Text style={styles.small}>
                  Status: <Text style={styles.bad}>{uiStatus}</Text>
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  style={styles.dateBtn}
                  onPress={() => setPicker({ visible: true, taskId: task.id })}
                >
                  <Text style={styles.dateBtnText}>{picked || "Alege data"}</Text>
                </Pressable>

                <Pressable style={styles.resBtn} onPress={() => handleReschedule(task)}>
                  <Text style={styles.resBtnText}>Reprogramează</Text>
                </Pressable>
              </View>
            </View>
          );
        })}

      <Pressable style={styles.backBtn} onPress={onBack}>
        <Text style={styles.backText}>← Înapoi</Text>
      </Pressable>

      {picker.visible && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          onChange={(e, d) => handlePickDate(picker.taskId, e, d)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 14 },
  title: { fontSize: 18, fontWeight: "900", textAlign: "center" },
  sub: { textAlign: "center", opacity: 0.7, marginTop: 6, marginBottom: 12 },

  card: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.35)",
    marginBottom: 10,
  },
  cardTitle: { fontWeight: "900", marginBottom: 4 },
  small: { opacity: 0.75 },
  bad: { color: "#dc2626", fontWeight: "900" },

  actions: { alignItems: "flex-end", justifyContent: "center", gap: 8 },
  dateBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)" },
  dateBtnText: { fontWeight: "800" },
  resBtn: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "#3b82f6" },
  resBtnText: { color: "white", fontWeight: "900" },

  backBtn: { marginTop: 8, alignSelf: "center", paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, backgroundColor: "#111827" },
  backText: { color: "white", fontWeight: "900" },
});
