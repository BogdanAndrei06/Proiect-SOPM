import { useMemo, useState } from "react";
import useTaskStore from "../store/taskStore";
import dayjs from "dayjs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { getTaskStatus } from "../utils/statusUtils";
import "./Dashboard.css";

export default function Dashboard() {
  const tasks = useTaskStore((state) => state.tasks);
  const [bestRange, setBestRange] = useState("all"); // "all" | "7" | "30"
  const [avgRange, setAvgRange] = useState("7"); // "7" | "30"

  const {
    todayEfficiency,
    todayCompleted,
    todayTotal,
    streakDays,
    streakDots,
    last7DaysData,
    bestAll,
    best7,
    best30,
    avg7,
    avg30,
  } = useMemo(() => {
    const now = dayjs();

    // -------- EFICIENȚA ZILEI CURENTE ----------
    const todayTasks = tasks.filter(
      (t) => t.dueDate && dayjs(t.dueDate).isSame(now, "day")
    );

    const todayActive = todayTasks.filter((t) => t.status !== "Canceled");
    const todayTotal = todayActive.length;

    const todayCompleted = todayActive.filter(
      (t) => getTaskStatus(t) === "Completed"
    ).length;

    const todayEfficiency =
      todayTotal === 0
        ? 0
        : Math.round((todayCompleted / todayTotal) * 100);

    // -------- HARTĂ COMPLETĂRI (pt. zile) ----------
    const completionMap = new Map(); // YYYY-MM-DD -> nr taskuri completate

    tasks.forEach((t) => {
      if (!t.completedAt) return;
      const comp = dayjs(t.completedAt);
      if (!comp.isValid()) return;
      const key = comp.format("YYYY-MM-DD");
      completionMap.set(key, (completionMap.get(key) || 0) + 1);
    });

    // -------- CEA MAI PRODUCTIVĂ ZI ----------
    function computeBest(spanDays) {
      let bestDate = null;
      let bestCount = 0;

      const from =
        spanDays != null ? now.subtract(spanDays - 1, "day") : null;

      completionMap.forEach((count, key) => {
        const d = dayjs(key);
        if (from && d.isBefore(from, "day")) return;
        if (d.isAfter(now, "day")) return;

        if (
          !bestDate ||
          count > bestCount ||
          (count === bestCount && d.isAfter(bestDate))
        ) {
          bestDate = d;
          bestCount = count;
        }
      });

      if (!bestDate || bestCount === 0) {
        return {
          dateLabel: null,
          summaryLabel: "Nu există încă o zi foarte productivă.",
          count: 0,
        };
      }

      const dateLabel = bestDate.format("DD MMM YYYY");
      const summaryLabel = `${bestCount} task${
        bestCount === 1 ? "" : "uri"
      } completate`;

      return { dateLabel, summaryLabel, count: bestCount };
    }

    const bestAll = computeBest(null);
    const best7 = computeBest(7);
    const best30 = computeBest(30);

    // -------- PRODUCTIVITATE PE 7 ZILE ----------
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const day = now.subtract(i, "day");
      const key = day.format("YYYY-MM-DD");
      const count = completionMap.get(key) || 0;

      last7DaysData.push({
        day: day.format("dd"),
        fullDate: day.format("DD MMM"),
        completed: count,
      });
    }

    // -------- STREAK ZILE FULL COMPLETATE ----------
    const datedTasks = tasks.filter((t) => t.dueDate);
    let streakDays = 0;
    let streakDots = [];

    if (datedTasks.length > 0) {
      const dates = datedTasks
        .map((t) => dayjs(t.dueDate))
        .filter((d) => d.isValid());
      let earliest = dates[0];

      dates.forEach((d) => {
        if (d.isBefore(earliest, "day")) earliest = d;
      });

      let cursor = now;
      let safety = 0;

      while (!cursor.isBefore(earliest, "day") && safety < 730) {
        const dayTasks = tasks.filter(
          (t) =>
            t.dueDate && dayjs(t.dueDate).isSame(cursor, "day")
        );
        const active = dayTasks.filter((t) => t.status !== "Canceled");

        if (active.length === 0) {
          cursor = cursor.subtract(1, "day");
          safety++;
          continue;
        }

        const allComplete = active.every(
          (t) => getTaskStatus(t) === "Completed"
        );

        if (allComplete) {
          streakDays++;
          cursor = cursor.subtract(1, "day");
          safety++;
        } else {
          break;
        }
      }

      // buline pentru ultimele 7 zile
      for (let i = 6; i >= 0; i--) {
        const day = now.subtract(i, "day");
        const dayTasks = tasks.filter(
          (t) =>
            t.dueDate && dayjs(t.dueDate).isSame(day, "day")
        );
        const active = dayTasks.filter((t) => t.status !== "Canceled");

        if (active.length === 0) {
          streakDots.push({
            label: day.format("dd"),
            type: "empty",
          });
        } else {
          const allComplete = active.every(
            (t) => getTaskStatus(t) === "Completed"
          );
          streakDots.push({
            label: day.format("dd"),
            type: allComplete ? "full" : "partial",
          });
        }
      }
    }

    // -------- ORA MEDIE DE FINALIZARE ----------
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

      if (count === 0) {
        return { label: null, count: 0 };
      }

      const avg = Math.round(sumMinutes / count);
      const h = Math.floor(avg / 60);
      const m = avg % 60;
      const label = `${String(h).padStart(2, "0")}:${String(m).padStart(
        2,
        "0"
      )}`;

      return { label, count };
    }

    const avg7 = computeAverageCompletion(7);
    const avg30 = computeAverageCompletion(30);

    return {
      todayEfficiency,
      todayCompleted,
      todayTotal,
      streakDays,
      streakDots,
      last7DaysData,
      bestAll,
      best7,
      best30,
      avg7,
      avg30,
    };
  }, [tasks]);

  const bestCurrent =
    bestRange === "all"
      ? bestAll
      : bestRange === "7"
      ? best7
      : best30;

  const avgCurrent = avgRange === "7" ? avg7 : avg30;

  return (
    <section className="dashboard-glass">
      <div className="dash-header">
        <div>
          <h2 className="dash-title">Dashboard de productivitate</h2>
          <p className="dash-subtitle">
            Un rezumat rapid al modului în care îți folosești timpul.
          </p>
        </div>
      </div>

      {/* CARDURI SUS */}
      <div className="glass-cards">
        {/* EFICIENȚA ZILEI CURENTE */}
        <div className="glass-card metric-card center-card">
          <h3 className="metric-title metric-title-center">
            Eficiența
            <br />
            zilei curente
          </h3>
          <div className="metric-main">
            {todayEfficiency}
            <span className="metric-main-unit">%</span>
          </div>
          <p className="metric-sub">
            {todayTotal === 0
              ? "Nu ai taskuri pentru azi."
              : `${todayCompleted}/${todayTotal} task${
                  todayTotal === 1 ? "" : "uri"
                } completate`}
          </p>
        </div>

        {/* STREAK ZILE FULL */}
        <div className="glass-card metric-card center-card">
          <h3 className="metric-title metric-title-center">
            Zile consecutive
            <br />
            completate full
          </h3>
          <div className="metric-main">
            {streakDays}
            <span className="metric-main-unit">
              {streakDays === 1 ? " zi" : " zile"}
            </span>
          </div>
          <p className="metric-sub">
            Zile în care toate taskurile active au fost duse la capăt.
          </p>
          <div className="streak-dots">
            {streakDots.map((d, idx) => (
              <div
                key={idx}
                className={`streak-dot streak-${d.type}`}
                title={d.label}
              />
            ))}
          </div>
        </div>

        {/* CEA MAI PRODUCTIVĂ ZI */}
        <div className="glass-card metric-card center-card">
          <h3 className="metric-title metric-title-center">
            Cea mai
            <br />
            productivă zi
          </h3>

          <div className="dash-tabs center-tabs">
            <button
              type="button"
              className={
                "dash-tab" + (bestRange === "all" ? " active" : "")
              }
              onClick={() => setBestRange("all")}
            >
              All time
            </button>
            <button
              type="button"
              className={
                "dash-tab" + (bestRange === "7" ? " active" : "")
              }
              onClick={() => setBestRange("7")}
            >
              7 zile
            </button>
            <button
              type="button"
              className={
                "dash-tab" + (bestRange === "30" ? " active" : "")
              }
              onClick={() => setBestRange("30")}
            >
              30 zile
            </button>
          </div>

          {bestCurrent.dateLabel ? (
            <>
              <div className="bestday-date">
                {bestCurrent.dateLabel}
              </div>
              <div className="bestday-summary">
                {bestCurrent.summaryLabel}
              </div>
            </>
          ) : (
            <p className="metric-sub bestday-empty">
              {bestCurrent.summaryLabel}
            </p>
          )}
        </div>
      </div>

      {/* GRAFIC + ORĂ MEDIE */}
      <div className="glass-charts">
        {/* PRODUCTIVITATE 7 ZILE */}
        <div className="glass-chart-card center-card">
          <h3 className="metric-title metric-title-center">
            Productivitate în
            <br />
            ultimele 7 zile
          </h3>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} taskuri`, "Completate"]}
                  labelFormatter={(label, payload) =>
                    payload && payload[0]
                      ? payload[0].payload.fullDate
                      : label
                  }
                />
                <Bar
                  dataKey="completed"
                  radius={[6, 6, 6, 6]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ORA MEDIE DE FINALIZARE */}
        <div className="glass-chart-card center-card">
          <h3 className="metric-title metric-title-center">
            Ora medie de
            <br />
            finalizare a taskurilor
          </h3>

          <div className="dash-tabs center-tabs">
            <button
              type="button"
              className={
                "dash-tab" + (avgRange === "7" ? " active" : "")
              }
              onClick={() => setAvgRange("7")}
            >
              7 zile
            </button>
            <button
              type="button"
              className={
                "dash-tab" + (avgRange === "30" ? " active" : "")
              }
              onClick={() => setAvgRange("30")}
            >
              30 zile
            </button>
          </div>

          <div className="avg-time-main">
            {avgCurrent.label ?? "--:--"}
          </div>
          <p className="avg-time-sub">
            {avgCurrent.count === 0
              ? "Încă nu există suficiente taskuri completate în această perioadă."
              : `Bazat pe ${avgCurrent.count} task${
                  avgCurrent.count === 1 ? "" : "uri"
                } completate.`}
          </p>
        </div>
      </div>
    </section>
  );
}
