import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";

function Tabs({ value, onChange, options, darkMode }) {
  return (
    <View style={[styles.tabs, darkMode && styles.tabsDark]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => onChange(o.value)}
          style={[
            styles.tab,
            value === o.value && styles.tabActive,
            darkMode && styles.tabDark,
            value === o.value && darkMode && styles.tabActiveDark,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              value === o.value && styles.tabTextActive,
              darkMode && styles.tabTextDark,
              value === o.value && darkMode && styles.tabTextActiveDark,
            ]}
          >
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function Dashboard({ darkMode }) {
  const tasks = useTaskStore((s) => s.tasks);
  const [bestRange, setBestRange] = useState("all");
  const [avgRange, setAvgRange] = useState("7");

  const computed = useMemo(() => {
    const now = dayjs();

    const todayTasks = tasks.filter((t) => t.dueDate && dayjs(t.dueDate).isSame(now, "day"));
    const todayActive = todayTasks.filter((t) => t.status !== "Canceled");
    const todayTotal = todayActive.length;

    const todayCompleted = todayActive.filter((t) => getTaskStatus(t) === "Completed").length;
    const todayEfficiency = todayTotal === 0 ? 0 : Math.round((todayCompleted / todayTotal) * 100);

    const completionMap = new Map();
    tasks.forEach((t) => {
      if (!t.completedAt) return;
      const comp = dayjs(t.completedAt);
      if (!comp.isValid()) return;
      const key = comp.format("YYYY-MM-DD");
      completionMap.set(key, (completionMap.get(key) || 0) + 1);
    });

    function computeBest(spanDays) {
      let bestDate = null;
      let bestCount = 0;
      const from = spanDays != null ? now.subtract(spanDays - 1, "day") : null;

      completionMap.forEach((count, key) => {
        const d = dayjs(key);
        if (from && d.isBefore(from, "day")) return;
        if (d.isAfter(now, "day")) return;

        if (!bestDate || count > bestCount || (count === bestCount && d.isAfter(bestDate))) {
          bestDate = d;
          bestCount = count;
        }
      });

      if (!bestDate || bestCount === 0) {
        return { dateLabel: null, summaryLabel: "Nu există încă o zi foarte productivă.", count: 0 };
      }

      return {
        dateLabel: bestDate.format("DD MMM YYYY"),
        summaryLabel: `${bestCount} task${bestCount === 1 ? "" : "uri"} completate`,
        count: bestCount,
      };
    }

    const bestAll = computeBest(null);
    const best7 = computeBest(7);
    const best30 = computeBest(30);

    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const day = now.subtract(i, "day");
      const key = day.format("YYYY-MM-DD");
      const count = completionMap.get(key) || 0;

      last7DaysData.push({
        label: day.format("dd"),
        fullDate: day.format("DD MMM"),
        completed: count,
      });
    }

    function computeAverageCompletion(spanDays) {
      const from = now.subtract(spanDays - 1, "day");
      let sumMinutes = 0;
      let count = 0;

      tasks.forEach((t) => {
        if (!t.completedAt) return;
        const comp = dayjs(t.completedAt);
        if (!comp.isValid()) return;
        if (comp.isBefore(from, "day") || comp.isAfter(now, "day")) return;

        const minutes = comp.hour() * 60 + comp.minute();
        sumMinutes += minutes;
        count++;
      });

      if (count === 0) return { label: null, count: 0 };

      const avg = Math.round(sumMinutes / count);
      const h = Math.floor(avg / 60);
      const m = avg % 60;
      return { label: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, count };
    }

    const avg7 = computeAverageCompletion(7);
    const avg30 = computeAverageCompletion(30);

    return {
      todayEfficiency,
      todayCompleted,
      todayTotal,
      last7DaysData,
      bestAll,
      best7,
      best30,
      avg7,
      avg30,
    };
  }, [tasks]);

  const bestCurrent =
    bestRange === "all" ? computed.bestAll : bestRange === "7" ? computed.best7 : computed.best30;

  const avgCurrent = avgRange === "7" ? computed.avg7 : computed.avg30;

  const maxCompleted = Math.max(1, ...computed.last7DaysData.map((d) => d.completed));

  return (
    <View style={[styles.root, darkMode && styles.rootDark]}>
      <Text style={[styles.title, darkMode && styles.titleDark]}>Dashboard de productivitate</Text>
      <Text style={[styles.sub, darkMode && styles.subDark]}>Rezumat rapid al modului în care îți folosești timpul.</Text>

      <View style={styles.cardsRow}>
        <View style={[styles.card, darkMode && styles.cardDark]}>
          <Text style={[styles.cardTitle, darkMode && styles.textDark]}>Eficiența zilei curente</Text>
          <Text style={[styles.big, darkMode && styles.textDark]}>{computed.todayEfficiency}<Text style={[styles.unit, darkMode && styles.unitDark]}>%</Text></Text>
          <Text style={[styles.muted, darkMode && styles.mutedDark]}>
            {computed.todayTotal === 0
              ? "Nu ai taskuri pentru azi."
              : `${computed.todayCompleted}/${computed.todayTotal} task${computed.todayTotal === 1 ? "" : "uri"} completate`}
          </Text>
        </View>

        <View style={[styles.card, darkMode && styles.cardDark]}>
          <Text style={[styles.cardTitle, darkMode && styles.textDark]}>Cea mai productivă zi</Text>
          <Tabs
            value={bestRange}
            onChange={setBestRange}
            darkMode={darkMode}
            options={[
              { value: "all", label: "All" },
              { value: "7", label: "7 zile" },
              { value: "30", label: "30 zile" },
            ]}
          />
          {bestCurrent.dateLabel ? (
            <>
              <Text style={[styles.bestDate, darkMode && styles.textDark]}>{bestCurrent.dateLabel}</Text>
              <Text style={[styles.muted, darkMode && styles.mutedDark]}>{bestCurrent.summaryLabel}</Text>
            </>
          ) : (
            <Text style={[styles.muted, darkMode && styles.mutedDark]}>{bestCurrent.summaryLabel}</Text>
          )}
        </View>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.textDark]}>Productivitate ultimele 7 zile</Text>

        <View style={styles.barChart}>
          {computed.last7DaysData.map((d, idx) => {
            const raw = Math.round((d.completed / maxCompleted) * 90);
            const h = Math.max(6, raw);
            const isZero = d.completed === 0;
            return (
              <View key={idx} style={styles.barCol}>
                <View
                  style={[
                    styles.bar,
                    darkMode && styles.barDark,
                    isZero && styles.barZero,
                    darkMode && isZero && styles.barZeroDark,
                    { height: h },
                  ]}
                />
                <Text style={[styles.barLabel, darkMode && styles.barLabelDark]}>{d.label}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.card, darkMode && styles.cardDark]}>
        <Text style={[styles.cardTitle, darkMode && styles.textDark]}>Ora medie de finalizare</Text>
        <Tabs
          value={avgRange}
          onChange={setAvgRange}
          darkMode={darkMode}
          options={[
            { value: "7", label: "7 zile" },
            { value: "30", label: "30 zile" },
          ]}
        />
        <Text style={[styles.big, darkMode && styles.textDark]}>{avgCurrent.label ?? "--:--"}</Text>
        <Text style={[styles.muted, darkMode && styles.mutedDark]}>
          {avgCurrent.count === 0
            ? "Încă nu există suficiente taskuri completate."
            : `Bazat pe ${avgCurrent.count} task${avgCurrent.count === 1 ? "" : "uri"} completate.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: 12 },
  rootDark: { backgroundColor: "transparent" },
  title: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  titleDark: { color: "#f8fafc" },
  sub: { opacity: 0.7, marginTop: 4, marginBottom: 12, color: "#334155" },
  subDark: { color: "#cbd5e1" },

  cardsRow: { flexDirection: "row", gap: 10 },
  card: {
    flex: 1,
    backgroundColor: "rgba(219,234,254,0.35)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.45)",
    marginBottom: 10,
  },
  cardDark: { backgroundColor: "rgba(30,64,175,0.22)", borderColor: "rgba(59,130,246,0.45)" },
  cardTitle: { fontWeight: "900", marginBottom: 8, color: "#0f172a" },
  textDark: { color: "#f8fafc" },
  big: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  unit: { fontSize: 14, opacity: 0.7, color: "#64748b" },
  unitDark: { color: "#94a3b8" },
  muted: { opacity: 0.7, marginTop: 6, color: "#475569" },
  mutedDark: { color: "#94a3b8" },

  tabs: { flexDirection: "row", backgroundColor: "rgba(148,163,184,0.16)", borderRadius: 999, padding: 3, alignSelf: "flex-start" },
  tabsDark: { backgroundColor: "rgba(148,163,184,0.22)" },
  tab: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999 },
  tabDark: { borderWidth: 1, borderColor: "rgba(148,163,184,0.18)" },
  tabActive: { backgroundColor: "white" },
  tabActiveDark: { backgroundColor: "rgba(15,23,42,0.9)" },
  tabText: { fontWeight: "800", opacity: 0.7, color: "#0f172a" },
  tabTextDark: { color: "#e2e8f0" },
  tabTextActive: { opacity: 1 },
  tabTextActiveDark: { opacity: 1 },

  bestDate: { fontWeight: "900", marginTop: 8, color: "#0f172a" },

  barChart: { flexDirection: "row", alignItems: "flex-end", marginTop: 8, height: 120 },
  barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  bar: { width: 16, borderRadius: 8, backgroundColor: "rgba(59,130,246,0.8)" },
  barDark: { backgroundColor: "rgba(96,165,250,0.9)" },
  barZero: { backgroundColor: "rgba(148,163,184,0.45)" },
  barZeroDark: { backgroundColor: "rgba(148,163,184,0.35)" },
  barLabel: { marginTop: 6, fontWeight: "800", opacity: 0.75, fontSize: 11, color: "#0f172a" },
  barLabelDark: { color: "#cbd5e1" },
});

