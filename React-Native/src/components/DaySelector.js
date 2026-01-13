import dayjs from "dayjs";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function DaySelector({ selectedDay, onChange, sortMode, onChangeSort }) {
  const center = selectedDay ? dayjs(selectedDay) : dayjs();

  const days = useMemo(() => {
    // 7 zile: -3..+3 în jurul zilei selectate
    return Array.from({ length: 7 }, (_, i) => center.add(i - 3, "day"));
  }, [center.valueOf()]);

  const title = center.format("DD MMM YYYY");

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Pressable style={styles.navBtn} onPress={() => onChange(center.subtract(1, "day"))}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>

        <Pressable style={styles.navBtn} onPress={() => onChange(center.add(1, "day"))}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View style={styles.daysRow}>
        {days.map((d) => {
          const active = d.isSame(center, "day");
          return (
            <Pressable
              key={d.format("YYYY-MM-DD")}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() => onChange(d)}
            >
              <Text style={[styles.dayDow, active && styles.dayTextActive]}>{d.format("dd")}</Text>
              <Text style={[styles.dayNum, active && styles.dayTextActive]}>{d.format("D")}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sortRow}>
        <Text style={styles.sortLabel}>Sortare:</Text>

        <Pressable
          style={[styles.pill, sortMode === "time" && styles.pillActive]}
          onPress={() => onChangeSort("time")}
        >
          <Text style={[styles.pillText, sortMode === "time" && styles.pillTextActive]}>Time</Text>
        </Pressable>

        <Pressable
          style={[styles.pill, sortMode === "importance" && styles.pillActive]}
          onPress={() => onChangeSort("importance")}
        >
          <Text style={[styles.pillText, sortMode === "importance" && styles.pillTextActive]}>
            Importance
          </Text>
        </Pressable>
      </View>
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
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(59,130,246,0.45)", backgroundColor: "rgba(219,234,254,0.85)" },
  navText: { fontSize: 22, fontWeight: "900" },
  title: { fontSize: 14, fontWeight: "900" },

  daysRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  dayChip: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
  },
  dayChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  dayDow: { fontWeight: "900", opacity: 0.75, fontSize: 12 },
  dayNum: { fontWeight: "900", fontSize: 14, marginTop: 2 },
  dayTextActive: { color: "white", opacity: 1 },

  sortRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
  sortLabel: { fontWeight: "900", opacity: 0.75 },

  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: "rgba(59,130,246,0.45)" },
  pillActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pillText: { fontWeight: "900", opacity: 0.8 },
  pillTextActive: { color: "white", opacity: 1 },
});
