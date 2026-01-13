import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { Calendar, CheckCircle2, Clock, Trash2, XCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";

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
    end = start + 1;
  }

  return { date: dueDate, start, end };
}

function findOverlappingTask(tasks, interval, excludeId) {
  if (!interval) return null;

  for (const t of tasks) {
    if (t.id === excludeId) continue;
    if (t.dueDate !== interval.date) continue;

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

function formatFromPicker(d) {
  return dayjs(d).format("HH:mm");
}

export default function TaskItem({ task }) {
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const status = getTaskStatus(task);

  const isWorkTask = task.type === "work" || task.status === "Work";
  const isAuto = !!task.isAuto;

  const importance = isWorkTask ? "high" : task.importance || "low";

  const statusClass = useMemo(() => {
    const c = status.toLowerCase().replace(/\s+/g, "-");
    return c;
  }, [status]);

  const initialMode =
    task.timeMode ||
    (task.startTime && task.endTime ? "interval" : task.startTime ? "single" : null);

  const [timeMode, setTimeMode] = useState(initialMode);
  const [hasSavedTime, setHasSavedTime] = useState(!!initialMode);
  const [isEditingTime, setIsEditingTime] = useState(false);

  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showTimeModeMenu, setShowTimeModeMenu] = useState(false);

  const [singleTime, setSingleTime] = useState(initialMode === "single" ? task.startTime || "" : "");
  const [intervalStart, setIntervalStart] = useState(initialMode === "interval" ? task.startTime || "" : "");
  const [intervalEnd, setIntervalEnd] = useState(initialMode === "interval" ? task.endTime || "" : "");

  const [picker, setPicker] = useState({ visible: false, mode: "time", target: null });

  const handleImportanceClick = () => {
    if (isWorkTask) return;

    const next =
      importance === "low" ? "medium" : importance === "medium" ? "high" : "low";

    updateTask(task.id, { importance: next });
  };

  const summaryText = useMemo(() => {
    if (!hasSavedTime) return null;
    if (timeMode === "single") {
      const t = singleTime || task.startTime;
      return t ? `Ora: ${t}` : null;
    }
    if (timeMode === "interval") {
      const s = intervalStart || task.startTime;
      const e = intervalEnd || task.endTime;
      return s && e ? `Interval: ${s} – ${e}` : null;
    }
    return null;
  }, [hasSavedTime, timeMode, singleTime, intervalStart, intervalEnd, task.startTime, task.endTime]);

  const openTimePicker = (target) => {
    setPicker({ visible: true, mode: "time", target });
  };

  const onPickTime = (event, date) => {
    setPicker((p) => ({ ...p, visible: false }));
    if (!date) return;

    const val = formatFromPicker(date);
    if (picker.target === "single") setSingleTime(val);
    if (picker.target === "start") setIntervalStart(val);
    if (picker.target === "end") setIntervalEnd(val);
  };

  const handleSaveTime = () => {
    if (!timeMode) return;

    if (timeMode === "single" && !singleTime) return;
    if (timeMode === "interval" && (!intervalStart || !intervalEnd)) return;

    const newStart = timeMode === "single" ? singleTime : intervalStart;
    const newEnd = timeMode === "single" ? null : intervalEnd;

    const interval = makeInterval(task.dueDate, timeMode, newStart, newEnd);

    if (interval) {
      const { tasks } = useTaskStore.getState();
      const conflict = findOverlappingTask(tasks, interval, task.id);

      if (conflict) {
        Alert.alert(
          "Conflict",
          `Intervalul ales se suprapune cu taskul "${conflict.title}". Alege altă oră.`
        );
        return;
      }
    }

    if (!isAuto) {
      updateTask(task.id, {
        startTime: timeMode === "single" ? singleTime : intervalStart,
        endTime: timeMode === "single" ? null : intervalEnd,
        timeMode,
      });
    }

    setHasSavedTime(true);
    setIsEditingTime(false);
  };

  const badgeIcon = () => {
    if (status === "Completed") return <CheckCircle2 size={14} color="#16a34a" />;
    if (status === "Canceled") return <XCircle size={14} color="#dc2626" />;
    return <Clock size={14} color="#2563eb" />;
  };

  const dotStyle =
    importance === "high"
      ? styles.dotHigh
      : importance === "medium"
      ? styles.dotMedium
      : styles.dotLow;

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleImportanceClick}
          disabled={isWorkTask}
          style={[styles.dot, dotStyle, isWorkTask && styles.dotStatic]}
        />
        <Text style={styles.title} numberOfLines={2}>{task.title}</Text>

        {!isAuto && (
          <Pressable onPress={() => setShowStatusMenu(true)} style={styles.statusBtn}>
            <Text style={styles.statusBtnText}>Status</Text>
          </Pressable>
        )}
      </View>

      {/* INFO */}
      <View style={styles.infoRow}>
        <View style={styles.badge}>
          {badgeIcon()}
          <Text style={styles.badgeText}>{status}</Text>
        </View>

        <View style={styles.dateRow}>
          <Calendar size={14} />
          <Text style={styles.dateText}>{task.dueDate}</Text>
        </View>
      </View>

      {/* TIME */}
      {(hasSavedTime || !isAuto) && (
        <View style={styles.timeBox}>
          {hasSavedTime && !isEditingTime && summaryText ? (
            <View style={styles.timeSummary}>
              <Text style={styles.timeSummaryText}>{summaryText}</Text>
              {!isAuto && (
                <Pressable onPress={() => setIsEditingTime(true)}>
                  <Text style={styles.link}>Editează</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {!isAuto && (!hasSavedTime || isEditingTime) && (
            <>
              <Pressable onPress={() => setShowTimeModeMenu(true)} style={styles.timeModeBtn}>
                <Clock size={16} />
                <Text style={styles.timeModeBtnText}>
                  {timeMode === "interval"
                    ? "Interval"
                    : timeMode === "single"
                    ? "Ora"
                    : "Setează timp"}
                </Text>
              </Pressable>

              {timeMode === "single" && (
                <Pressable onPress={() => openTimePicker("single")} style={styles.timePickBtn}>
                  <Text style={styles.timePickText}>{singleTime || "Alege ora"}</Text>
                </Pressable>
              )}

              {timeMode === "interval" && (
                <View style={styles.intervalRow}>
                  <Pressable onPress={() => openTimePicker("start")} style={styles.timePickBtn}>
                    <Text style={styles.timePickText}>{intervalStart || "Start"}</Text>
                  </Pressable>
                  <Text style={styles.sep}>–</Text>
                  <Pressable onPress={() => openTimePicker("end")} style={styles.timePickBtn}>
                    <Text style={styles.timePickText}>{intervalEnd || "End"}</Text>
                  </Pressable>
                </View>
              )}

              {isEditingTime && timeMode && (
                <Pressable onPress={handleSaveTime} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>Salvează ora</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      )}

      {/* ACTIONS */}
      <View style={styles.actionsRow}>
        {!isAuto && (
          <Pressable
            onPress={() =>
              Alert.alert("Ștergere", "Ștergi acest task?", [
                { text: "Anulează", style: "cancel" },
                { text: "Șterge", style: "destructive", onPress: () => deleteTask(task.id) },
              ])
            }
            style={styles.iconAction}
          >
            <Trash2 size={18} color="#dc2626" />
          </Pressable>
        )}

      </View>

      {/* STATUS MENU */}
      <Modal visible={showStatusMenu} transparent animationType="fade" onRequestClose={() => setShowStatusMenu(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowStatusMenu(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Setează status</Text>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                updateTask(task.id, { status: "Completed" });
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.modalOptionText}>Completed</Text>
            </Pressable>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                updateTask(task.id, { status: "Canceled" });
                setShowStatusMenu(false);
              }}
            >
              <Text style={styles.modalOptionText}>Canceled</Text>
            </Pressable>

            <Pressable style={[styles.modalOption, styles.modalCancel]} onPress={() => setShowStatusMenu(false)}>
              <Text style={[styles.modalOptionText, styles.modalCancelText]}>Închide</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* TIME MODE MENU */}
      <Modal visible={showTimeModeMenu} transparent animationType="fade" onRequestClose={() => setShowTimeModeMenu(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTimeModeMenu(false)}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Alege modul</Text>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setTimeMode("single");
                setIsEditingTime(true);
                setShowTimeModeMenu(false);
              }}
            >
              <Text style={styles.modalOptionText}>Setează ora</Text>
            </Pressable>

            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setTimeMode("interval");
                setIsEditingTime(true);
                setShowTimeModeMenu(false);
              }}
            >
              <Text style={styles.modalOptionText}>Setează interval</Text>
            </Pressable>

            <Pressable style={[styles.modalOption, styles.modalCancel]} onPress={() => setShowTimeModeMenu(false)}>
              <Text style={[styles.modalOptionText, styles.modalCancelText]}>Închide</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* TIME PICKER */}
      {picker.visible && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour
          onChange={onPickTime}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(219,234,254,0.35)",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    marginBottom: 12,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  dot: { width: 12, height: 12, borderRadius: 999, marginRight: 10 },
  dotStatic: { opacity: 0.9 },
  dotHigh: { backgroundColor: "#ef4444" },
  dotMedium: { backgroundColor: "#facc15" },
  dotLow: { backgroundColor: "#22c55e" },
  title: { flex: 1, fontSize: 16, fontWeight: "700" },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.2)",
  },
  statusBtnText: { fontWeight: "700", color: "#1d4ed8" },

  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  badge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(59,130,246,0.15)" },
  badgeText: { marginLeft: 6, fontWeight: "700" },
  dateRow: { flexDirection: "row", alignItems: "center", marginLeft: 12, opacity: 0.8 },
  dateText: { marginLeft: 6 },

  timeBox: { marginTop: 10 },
  timeSummary: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeSummaryText: { fontWeight: "700" },
  link: { color: "#2563eb", fontWeight: "700", marginLeft: 10 },
  timeModeBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  timeModeBtnText: { marginLeft: 8, fontWeight: "700" },
  timePickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.5)",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  timePickText: { fontWeight: "700" },
  intervalRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  sep: { marginHorizontal: 8, opacity: 0.7, fontWeight: "800" },
  saveBtn: { marginTop: 10, backgroundColor: "#2563eb", paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  saveBtnText: { color: "white", fontWeight: "800" },

  actionsRow: { flexDirection: "row", alignItems: "center", marginTop: 12, justifyContent: "space-between" },
  iconAction: { padding: 8, borderRadius: 12, backgroundColor: "rgba(220,38,38,0.08)" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", padding: 18 },
  modalCard: { backgroundColor: "white", borderRadius: 16, padding: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 8 },
  modalOption: { paddingVertical: 12 },
  modalOptionText: { fontSize: 15, fontWeight: "700" },
  modalCancel: { marginTop: 6, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.25)" },
  modalCancelText: { color: "#111827" },
});
