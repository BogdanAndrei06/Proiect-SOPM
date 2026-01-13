import DateTimePicker from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import useTaskStore from "../store/taskStore";
import useSettingsStore from "../store/useSettingsStore";

const WEEK_DAYS = [
  { id: "Mon", label: "Luni" },
  { id: "Tue", label: "Marți" },
  { id: "Wed", label: "Miercuri" },
  { id: "Thu", label: "Joi" },
  { id: "Fri", label: "Vineri" },
  { id: "Sat", label: "Sâmbătă" },
  { id: "Sun", label: "Duminică" },
];

function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function buildIntervalForTask(task) {
  let mode = task.timeMode;

  if (!mode) {
    if (task.startTime && task.endTime) mode = "interval";
    else if (task.startTime) mode = "single";
    else return null;
  }

  if (!task.startTime) return null;

  const start = timeToMinutes(task.startTime);
  if (start == null) return null;

  let end;
  if (mode === "interval") {
    end = timeToMinutes(task.endTime);
    if (end == null || end <= start) return null;
  } else {
    end = start + 1;
  }

  return { start, end };
}

function formatTime(d) {
  return dayjs(d).format("HH:mm");
}

export default function Settings({ onOpenRecycleBin, darkMode }) {
  const {
    workLabel,
    workDays,
    workStart,
    workEnd,
    scheduleMode,
    perDaySchedule,
    setWorkLabel,
    setWorkDays,
    setWorkHours,
    setScheduleMode,
    setPerDaySchedule,
    resetPerDaySchedule,
  } = useSettingsStore();

  const tasks = useTaskStore((s) => s.tasks);
  const addTask = useTaskStore((s) => s.addTask);
  const updateTask = useTaskStore((s) => s.updateTask);
  const deleteAllWorkTasks = useTaskStore((s) => s.deleteAllWorkTasks);

  const [picker, setPicker] = useState({ visible: false, target: null, dayId: null });

  const programName = workLabel && workLabel.trim().length > 0 ? workLabel.trim() : "Muncă";
  const programNameLower = programName.charAt(0).toLowerCase() + programName.slice(1);

  const toggleDaySimple = (dayId) => {
    if (workDays.includes(dayId)) setWorkDays(workDays.filter((d) => d !== dayId));
    else setWorkDays([...workDays, dayId]);
  };

  const toggleCustomDay = (dayId) => {
    const cfg = (perDaySchedule && perDaySchedule[dayId]) || {};
    const nextEnabled = !cfg.enabled;

    const start = cfg.start || workStart || "08:00";
    const end = cfg.end || workEnd || "16:00";

    setPerDaySchedule(dayId, { enabled: nextEnabled, start, end });
  };

  const handleModeChange = (mode) => {
    if (mode === scheduleMode) return;
    if (mode === "custom") resetPerDaySchedule();
    setScheduleMode(mode);
  };

  const handleDeleteAllWork = async () => {
    Alert.alert(
      "Confirmare",
      `Ești sigur că vrei să ștergi toate taskurile de ${programNameLower}?`,
      [
        { text: "Anulează", style: "cancel" },
        { text: "Șterge", style: "destructive", onPress: () => deleteAllWorkTasks() },
      ]
    );
  };

  const handleSave = async () => {
    let day = dayjs();
    const DAYS_AHEAD = 30;
    const end = day.add(DAYS_AHEAD, "day");

    const ops = [];
    let canceledCount = 0;

    while (day.isBefore(end) || day.isSame(end, "day")) {
      const weekdayId = day.format("ddd"); // Mon, Tue...
      const dateStr = day.format("YYYY-MM-DD");

      let enabled = false;
      let start = workStart;
      let endTime = workEnd;

      if (scheduleMode === "simple") {
        enabled = workDays.includes(weekdayId);
      } else {
        const cfg = (perDaySchedule && perDaySchedule[weekdayId]) || {};
        if (cfg.enabled && cfg.start && cfg.end) {
          enabled = true;
          start = cfg.start;
          endTime = cfg.end;
        }
      }

      if (enabled) {
        const workStartMin = timeToMinutes(start);
        const workEndMin = timeToMinutes(endTime);

        if (workStartMin != null && workEndMin != null && workEndMin > workStartMin) {
          tasks.forEach((t) => {
            if (t.dueDate !== dateStr) return;
            if (t.type === "work" || t.status === "Work") return;
            if (t.status === "Completed" || t.status === "Canceled") return;

            const interval = buildIntervalForTask(t);
            if (!interval) return;

            const overlaps = workStartMin < interval.end && interval.start < workEndMin;
            if (overlaps) {
              ops.push(updateTask(t.id, { status: "Canceled" }));
              canceledCount += 1;
            }
          });
        }

        const existingWorkTask = tasks.find(
          (t) => (t.type === "work" || t.status === "Work") && t.dueDate === dateStr
        );

        const basePayload = {
          title: programName,
          status: "Work",
          type: "work",
          timeMode: "interval",
          startTime: start,
          endTime: endTime,
        };

        if (existingWorkTask) ops.push(updateTask(existingWorkTask.id, basePayload));
        else {
          ops.push(addTask({ ...basePayload, dueDate: dateStr, isAuto: true }));
        }
      }

      day = day.add(1, "day");
    }

    await Promise.all(ops);

    if (canceledCount > 0) {
      Alert.alert(
        "Info",
        `${canceledCount} task${canceledCount === 1 ? "" : "uri"} au fost trecute pe Canceled (se suprapuneau cu programul de ${programNameLower}).`
      );
    } else {
      Alert.alert("OK", "Programul a fost salvat.");
    }
  };

  const onPickTime = (event, date) => {
    const { target, dayId } = picker;
    setPicker({ visible: false, target: null, dayId: null });
    if (!date) return;

    const val = formatTime(date);

    if (target === "workStart") setWorkHours(val, workEnd);
    if (target === "workEnd") setWorkHours(workStart, val);

    if (target === "customStart" && dayId) setPerDaySchedule(dayId, { start: val });
    if (target === "customEnd" && dayId) setPerDaySchedule(dayId, { end: val });
  };

  return (
    <View style={[styles.root, darkMode && styles.rootDark]}>
      <Text style={[styles.h, darkMode && styles.textDark]}>Program de muncă</Text>

      <View style={[styles.section, darkMode && styles.sectionDark]}>
        <Text style={[styles.label, darkMode && styles.textMutedDark]}>Nume program</Text>
        <Pressable
          style={[styles.inputFake, darkMode && styles.inputFakeDark]}
          onPress={() =>
            Alert.prompt?.(
              "Nume program",
              "Ex: Muncă / Facultate / Școală",
              (text) => setWorkLabel(text || "")
            )
          }
        >
          <Text style={[styles.inputText, darkMode && styles.textDark]}>{workLabel}</Text>
        </Pressable>

        <Text style={[styles.label, darkMode && styles.textMutedDark, { marginTop: 10 }]}>Tip program</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.pill, scheduleMode === "simple" && styles.pillActive, darkMode && styles.pillDark]}
            onPress={() => handleModeChange("simple")}
          >
            <Text style={[styles.pillText, scheduleMode === "simple" && styles.pillTextActive, darkMode && styles.pillTextDark]}>
              Simplu
            </Text>
          </Pressable>
          <Pressable
            style={[styles.pill, scheduleMode === "custom" && styles.pillActive, darkMode && styles.pillDark]}
            onPress={() => handleModeChange("custom")}
          >
            <Text style={[styles.pillText, scheduleMode === "custom" && styles.pillTextActive, darkMode && styles.pillTextDark]}>
              Personalizat
            </Text>
          </Pressable>
        </View>

        {scheduleMode === "simple" && (
          <>
            <Text style={[styles.label, darkMode && styles.textMutedDark, { marginTop: 10 }]}>Zile lucrătoare</Text>
            <View style={styles.wrap}>
              {WEEK_DAYS.map((d) => {
                const active = workDays.includes(d.id);
                return (
                  <Pressable
                    key={d.id}
                    style={[styles.dayPill, active && styles.dayPillActive, darkMode && styles.dayPillDark]}
                    onPress={() => toggleDaySimple(d.id)}
                  >
                    <Text style={[styles.dayText, active && styles.dayTextActive, darkMode && styles.dayTextDark]}>{d.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, darkMode && styles.textMutedDark, { marginTop: 10 }]}>Interval orar</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.timeBtn, darkMode && styles.timeBtnDark]}
                onPress={() => setPicker({ visible: true, target: "workStart", dayId: null })}
              >
                <Text style={[styles.timeBtnText, darkMode && styles.textDark]}>{workStart}</Text>
              </Pressable>
              <Text style={[styles.sep, darkMode && styles.textMutedDark]}>–</Text>
              <Pressable
                style={[styles.timeBtn, darkMode && styles.timeBtnDark]}
                onPress={() => setPicker({ visible: true, target: "workEnd", dayId: null })}
              >
                <Text style={[styles.timeBtnText, darkMode && styles.textDark]}>{workEnd}</Text>
              </Pressable>
            </View>
          </>
        )}

        {scheduleMode === "custom" && (
          <>
            <Text style={[styles.label, darkMode && styles.textMutedDark, { marginTop: 10 }]}>Zile și intervale</Text>
            {WEEK_DAYS.map((d) => {
              const cfg = (perDaySchedule && perDaySchedule[d.id]) || {};
              const isActive = !!cfg.enabled;
              const startVal = cfg.start || workStart || "08:00";
              const endVal = cfg.end || workEnd || "16:00";

              return (
                <View key={d.id} style={styles.customRow}>
                  <Pressable
                    style={[styles.dayPill, isActive && styles.dayPillActive, darkMode && styles.dayPillDark]}
                    onPress={() => toggleCustomDay(d.id)}
                  >
                    <Text style={[styles.dayText, isActive && styles.dayTextActive, darkMode && styles.dayTextDark]}>{d.label}</Text>
                  </Pressable>

                  {isActive && (
                    <View style={styles.row}>
                      <Pressable
                        style={[styles.timeBtn, darkMode && styles.timeBtnDark]}
                        onPress={() => setPicker({ visible: true, target: "customStart", dayId: d.id })}
                      >
                        <Text style={[styles.timeBtnText, darkMode && styles.textDark]}>{startVal}</Text>
                      </Pressable>
                      <Text style={[styles.sep, darkMode && styles.textMutedDark]}>–</Text>
                      <Pressable
                        style={[styles.timeBtn, darkMode && styles.timeBtnDark]}
                        onPress={() => setPicker({ visible: true, target: "customEnd", dayId: d.id })}
                      >
                        <Text style={[styles.timeBtnText, darkMode && styles.textDark]}>{endVal}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        <Pressable style={styles.deleteBtn} onPress={handleDeleteAllWork}>
          <Text style={styles.deleteText}>{`Șterge toate taskurile de ${programNameLower}`}</Text>
        </Pressable>
      </View>

      <View style={[styles.section, darkMode && styles.sectionDark]}>
        <Text style={[styles.h2, darkMode && styles.textDark]}>Reprogramează taskurile pierdute</Text>
        <Pressable style={[styles.primaryBtn, darkMode && styles.primaryBtnDark]} onPress={() => onOpenRecycleBin && onOpenRecycleBin()}>
          <Text style={styles.primaryText}>Deschide Recycle Bin</Text>
        </Pressable>
      </View>

      <Pressable style={[styles.saveBtn, darkMode && styles.saveBtnDark]} onPress={handleSave}>
        <Text style={styles.saveText}>Salvează și generează programul (30 zile)</Text>
      </Pressable>

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
  root: { padding: 14 },
  rootDark: { backgroundColor: "transparent" },
  textDark: { color: "#f8fafc" },
  textMutedDark: { color: "#cbd5e1" },
  h: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  h2: { fontSize: 14, fontWeight: "900", marginBottom: 8 },
  section: {
    backgroundColor: "rgba(219,234,254,0.35)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    marginBottom: 12,
  },
  sectionDark: { backgroundColor: "rgba(30,64,175,0.22)", borderColor: "rgba(59,130,246,0.45)" },
  label: { fontWeight: "800", opacity: 0.8, marginBottom: 6 },
  inputFake: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(148,163,184,0.5)" },
  inputFakeDark: { backgroundColor: "rgba(15,23,42,0.6)", borderColor: "rgba(148,163,184,0.3)" },
  inputText: { fontWeight: "800" },

  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  sep: { fontWeight: "900", opacity: 0.7 },

  pill: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.45)" },
  pillDark: { borderColor: "rgba(148,163,184,0.28)" },
  pillActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  pillText: { fontWeight: "900", opacity: 0.8 },
  pillTextDark: { color: "#e2e8f0" },
  pillTextActive: { color: "white", opacity: 1 },

  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.45)" },
  dayPillDark: { borderColor: "rgba(148,163,184,0.28)" },
  dayPillActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  dayText: { fontWeight: "900", opacity: 0.8 },
  dayTextDark: { color: "#e2e8f0" },
  dayTextActive: { color: "white", opacity: 1 },

  timeBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(148,163,184,0.45)" },
  timeBtnDark: { borderColor: "rgba(148,163,184,0.28)", backgroundColor: "rgba(15,23,42,0.6)" },
  timeBtnText: { fontWeight: "900" },

  customRow: { marginTop: 8 },

  deleteBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(220,38,38,0.10)" },
  deleteText: { color: "#b91c1c", fontWeight: "900", textAlign: "center" },

  primaryBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: "#3b82f6" },
  primaryBtnDark: { backgroundColor: "#2563eb" },
  primaryText: { color: "white", fontWeight: "900", textAlign: "center" },

  saveBtn: { paddingVertical: 14, borderRadius: 14, backgroundColor: "#111827" },
  saveBtnDark: { backgroundColor: "#1e293b" },
  saveText: { color: "white", fontWeight: "900", textAlign: "center" },
});

