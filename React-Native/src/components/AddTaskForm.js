// src/components/AddTaskForm.js
import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { Clock, PlusCircle } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import useTaskStore from "../store/taskStore";

// HH:mm -> minute
function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function makeInterval(dueDate, timeMode, startTime, endTime) {
  if (!dueDate || !timeMode || !startTime) return null;

  const start = timeToMinutes(startTime);
  if (start == null) return null;

  let end;
  if (timeMode === "interval") {
    end = timeToMinutes(endTime);
    if (end == null || end <= start) return null;
  } else {
    end = start + 1; // single => 1 minut
  }

  return { date: dueDate, start, end };
}

function findOverlappingTask(tasks, interval) {
  if (!interval) return null;

  for (const t of tasks) {
    if (t.dueDate !== interval.date) continue;

    // ignorăm doar taskurile închise
    if (t.status === "Completed" || t.status === "Canceled") continue;

    let mode = t.timeMode;
    if (!mode) {
      if (t.startTime && t.endTime) mode = "interval";
      else if (t.startTime) mode = "single";
    }
    if (!mode || !t.startTime) continue;

    const start = timeToMinutes(t.startTime);
    if (start == null) continue;

    let end;
    if (mode === "interval") {
      end = timeToMinutes(t.endTime);
      if (end == null || end <= start) continue;
    } else {
      end = start + 1;
    }

    const overlaps = interval.start < end && start < interval.end;
    if (overlaps) return t;
  }

  return null;
}

export default function AddTaskForm({ selectedDay }) {
  const addTask = useTaskStore((s) => s.addTask);
  const tasks = useTaskStore((s) => s.tasks);

  const [title, setTitle] = useState("");

  // prefill cu ziua selectată (dar doar până userul schimbă manual)
  const [dueDate, setDueDate] = useState("");
  const [dateTouched, setDateTouched] = useState(false);

  useEffect(() => {
    if (dateTouched) return;
    if (selectedDay) setDueDate(dayjs(selectedDay).format("YYYY-MM-DD"));
  }, [selectedDay, dateTouched]);

  // importanță
  const [importance, setImportance] = useState("low"); // low|medium|high
  const [importanceMode, setImportanceMode] = useState("segments"); // segments|solid

  // timp
  const [timeMode, setTimeMode] = useState(null); // single|interval|null
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasSavedTime, setHasSavedTime] = useState(false);

  // pickere
  const [picker, setPicker] = useState({ visible: false, mode: "date", target: "date" });

  const openDatePicker = () => setPicker({ visible: true, mode: "date", target: "date" });
  const openStartPicker = () => setPicker({ visible: true, mode: "time", target: "start" });
  const openEndPicker = () => setPicker({ visible: true, mode: "time", target: "end" });

  const pickerValue = useMemo(() => {
    if (picker.target === "date") {
      return dueDate ? dayjs(dueDate).toDate() : new Date();
    }
    // time pickers
    const base = new Date();
    const t = picker.target === "start" ? startTime : endTime;
    if (t) {
      const [h, m] = t.split(":").map((x) => parseInt(x, 10));
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        base.setHours(h, m, 0, 0);
      }
    }
    return base;
  }, [picker, dueDate, startTime, endTime]);

  const resetForm = () => {
    setTitle("");
    setImportance("low");
    setImportanceMode("segments");
    setTimeMode(null);
    setShowModeMenu(false);
    setStartTime("");
    setEndTime("");
    setHasSavedTime(false);
    // nu resetăm dueDate ca să rămână pe ziua selectată
  };

  const handleSelectMode = (mode) => {
    setTimeMode(mode);
    setShowModeMenu(false);
    setHasSavedTime(true);
    if (mode === "single") setEndTime("");
  };

  const handleImportanceClick = (level, e) => {
    e?.stopPropagation?.();
    setImportance(level);
    setImportanceMode("solid");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Atenție", "Te rog scrie un titlu.");
      return;
    }
    if (!dueDate) {
      Alert.alert("Atenție", "Te rog alege o dată.");
      return;
    }

    const payload = {
      title: title.trim(),
      dueDate,
      status: "Pending",
      importance,
    };

    if (timeMode === "single") {
      if (!startTime) {
        Alert.alert("Atenție", "Alege ora.");
        return;
      }
      payload.timeMode = "single";
      payload.startTime = startTime;
      payload.endTime = null;
    }

    if (timeMode === "interval") {
      if (!startTime || !endTime) {
        Alert.alert("Atenție", "Alege intervalul complet (start + end).");
        return;
      }
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      if (s == null || e == null || e <= s) {
        Alert.alert("Atenție", "Interval invalid (end trebuie să fie după start).");
        return;
      }
      payload.timeMode = "interval";
      payload.startTime = startTime;
      payload.endTime = endTime;
    }

    // overlap check doar dacă are timp setat
    const interval = makeInterval(payload.dueDate, payload.timeMode, payload.startTime, payload.endTime);
    if (interval) {
      const conflict = findOverlappingTask(tasks, interval);
      if (conflict) {
        Alert.alert(
          "Conflict",
          `Ai deja un task ("${conflict.title}") în ziua respectivă care se suprapune cu acest interval.`
        );
        return;
      }
    }

    await addTask(payload);
    resetForm();
  };

  const pillBg =
    importance === "high" ? styles.red :
    importance === "medium" ? styles.yellow :
    styles.green;

  return (
    <View style={styles.card}>
      <TextInput
        style={styles.input}
        placeholder="Adaugă o sarcină..."
        value={title}
        onChangeText={setTitle}
      />

      {/* PRIORITY */}
      <Pressable
        style={[
          styles.priorityWrap,
          importanceMode === "solid" && pillBg,
        ]}
        onPress={() => {
          if (importanceMode === "solid") setImportanceMode("segments");
        }}
      >
        <Pressable style={[styles.prioritySeg, styles.redSoft]} onPress={(e) => handleImportanceClick("high", e)} />
        <Pressable style={[styles.prioritySeg, styles.yellowSoft]} onPress={(e) => handleImportanceClick("medium", e)} />
        <Pressable style={[styles.prioritySeg, styles.greenSoft]} onPress={(e) => handleImportanceClick("low", e)} />
      </Pressable>

      {/* DATE */}
      <Pressable style={styles.dateBtn} onPress={() => { setDateTouched(true); openDatePicker(); }}>
        <Text style={styles.dateBtnText}>{dueDate || "Alege data"}</Text>
      </Pressable>

      {/* TIME */}
      <View style={styles.timeRow}>
        <Pressable
          style={[styles.clockBtn, hasSavedTime && styles.clockBtnActive]}
          onPress={() => setShowModeMenu((v) => !v)}
        >
          <Clock size={16} color="#111827" />
        </Pressable>

        {showModeMenu && (
          <View style={styles.timeMenu}>
            <Pressable style={styles.timeMenuBtn} onPress={() => handleSelectMode("single")}>
              <Text style={styles.timeMenuText}>Setează ora</Text>
            </Pressable>
            <Pressable style={styles.timeMenuBtn} onPress={() => handleSelectMode("interval")}>
              <Text style={styles.timeMenuText}>Setează intervalul</Text>
            </Pressable>
          </View>
        )}

        {timeMode === "single" && (
          <Pressable style={styles.timePickBtn} onPress={openStartPicker}>
            <Text style={styles.timePickText}>{startTime || "Ora"}</Text>
          </Pressable>
        )}

        {timeMode === "interval" && (
          <View style={styles.intervalRow}>
            <Pressable style={styles.timePickBtn} onPress={openStartPicker}>
              <Text style={styles.timePickText}>{startTime || "Start"}</Text>
            </Pressable>
            <Text style={styles.sep}>–</Text>
            <Pressable style={styles.timePickBtn} onPress={openEndPicker}>
              <Text style={styles.timePickText}>{endTime || "End"}</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* SUBMIT */}
      <Pressable style={styles.addBtn} onPress={handleSubmit}>
        <PlusCircle size={18} color="#fff" />
        <Text style={styles.addBtnText}>Adaugă</Text>
      </Pressable>

      {picker.visible && (
        <DateTimePicker
          value={pickerValue}
          mode={picker.mode}
          onChange={(event, date) => {
            // close picker
            if (event?.type === "dismissed") {
              setPicker((p) => ({ ...p, visible: false }));
              return;
            }
            if (!date) return;

            if (picker.target === "date") {
              setDueDate(dayjs(date).format("YYYY-MM-DD"));
            } else if (picker.target === "start") {
              setStartTime(dayjs(date).format("HH:mm"));
            } else if (picker.target === "end") {
              setEndTime(dayjs(date).format("HH:mm"));
            }

            setPicker((p) => ({ ...p, visible: false }));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(219,234,254,0.35)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.4)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(239,246,255,0.9)",
    marginBottom: 10,
  },

  priorityWrap: {
    height: 34,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.5)",
    marginBottom: 10,
  },
  prioritySeg: { flex: 1 },
  redSoft: { backgroundColor: "#fecaca" },
  yellowSoft: { backgroundColor: "#fef3c7" },
  greenSoft: { backgroundColor: "#bbf7d0" },

  red: { backgroundColor: "#f97373" },
  yellow: { backgroundColor: "#fde047" },
  green: { backgroundColor: "#22c55e" },

  dateBtn: {
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.5)",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 10,
    backgroundColor: "rgba(239,246,255,0.9)",
  },
  dateBtnText: { fontWeight: "900", color: "#111827" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  clockBtn: {
    height: 34, width: 34, borderRadius: 999,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(59,130,246,0.18)",
  },
  clockBtnActive: { backgroundColor: "rgba(59,130,246,0.32)" },

  timeMenu: {
    position: "absolute",
    top: 40,
    left: 0,
    backgroundColor: "rgba(239,246,255,0.98)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.35)",
    padding: 8,
    zIndex: 999,
    width: 180,
  },
  timeMenuBtn: { paddingVertical: 6, paddingHorizontal: 6, borderRadius: 10 },
  timeMenuText: { fontWeight: "800", color: "#111827" },

  timePickBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.5)",
    backgroundColor: "rgba(239,246,255,0.9)",
  },
  timePickText: { fontWeight: "900", color: "#111827" },

  intervalRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sep: { fontWeight: "900", opacity: 0.7 },

  addBtn: {
    marginTop: 2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontWeight: "900" },
});
