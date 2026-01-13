import dayjs from "dayjs";
import useSettingsStore from "../store/useSettingsStore";
import useTaskStore from "../store/taskStore";

const WEEK_DAYS = [
  { id: "Mon", label: "Luni" },
  { id: "Tue", label: "Marți" },
  { id: "Wed", label: "Miercuri" },
  { id: "Thu", label: "Joi" },
  { id: "Fri", label: "Vineri" },
  { id: "Sat", label: "Sâmbătă" },
  { id: "Sun", label: "Duminică" },
];

// "HH:MM" -> minute
function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// construiește un interval [start, end) pentru un task normal
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
    end = start + 1; // single -> interval mic
  }

  return { start, end };
}

export default function Settings({ onOpenRecycleBin }) {
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

  const tasks = useTaskStore((state) => state.tasks);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteAllWorkTasks = useTaskStore(
    (state) => state.deleteAllWorkTasks
  );

  const programName =
    workLabel && workLabel.trim().length > 0 ? workLabel.trim() : "Muncă";
  const programNameLower =
    programName.charAt(0).toLowerCase() + programName.slice(1);

  // toggle zi în mod SIMPLU
  const toggleDaySimple = (dayId) => {
    if (workDays.includes(dayId)) {
      setWorkDays(workDays.filter((d) => d !== dayId));
    } else {
      setWorkDays([...workDays, dayId]);
    }
  };

  // toggle zi în mod PERSONALIZAT
  const toggleCustomDay = (dayId) => {
    const cfg = (perDaySchedule && perDaySchedule[dayId]) || {};
    const nextEnabled = !cfg.enabled;

    const start = cfg.start || workStart || "08:00";
    const end = cfg.end || workEnd || "16:00";

    setPerDaySchedule(dayId, {
      enabled: nextEnabled,
      start,
      end,
    });
  };

  const handleModeChange = (mode) => {
    if (mode === scheduleMode) return;

    if (mode === "custom") {
      resetPerDaySchedule(); // toate zilele stinse când intri pe personalizat
    }

    setScheduleMode(mode);
  };

  // Șterge toate taskurile de work
  const handleDeleteAllWork = async () => {
    const ok = window.confirm(
      `Ești sigur că vrei să ștergi toate taskurile de ${programNameLower}?`
    );
    if (!ok) return;
    await deleteAllWorkTasks();
  };

  // Salvează și generează programul de muncă pentru următoarele 30 de zile
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

        // 1️⃣ anulăm taskurile normale care se suprapun
        if (
          workStartMin != null &&
          workEndMin != null &&
          workEndMin > workStartMin
        ) {
          tasks.forEach((t) => {
            if (t.dueDate !== dateStr) return;

            // ignorăm programul de muncă/facultate
            if (t.type === "work" || t.status === "Work") return;

            // ignorăm ce e deja închis
            if (t.status === "Completed" || t.status === "Canceled") return;

            const interval = buildIntervalForTask(t);
            if (!interval) return;

            const overlaps =
              workStartMin < interval.end && interval.start < workEndMin;

            if (overlaps) {
              ops.push(updateTask(t.id, { status: "Canceled" }));
              canceledCount += 1;
            }
          });
        }

        // 2️⃣ creăm / actualizăm taskul de work pentru acea zi
        const existingWorkTask = tasks.find(
          (t) =>
            (t.type === "work" || t.status === "Work") &&
            t.dueDate === dateStr
        );

        const basePayload = {
          title: programName,
          status: "Work",
          type: "work",
          timeMode: "interval",
          startTime: start,
          endTime: endTime,
        };

        if (existingWorkTask) {
          ops.push(updateTask(existingWorkTask.id, basePayload));
        } else {
          ops.push(
            addTask({
              ...basePayload,
              dueDate: dateStr,
              isAuto: true,
            })
          );
        }
      }

      day = day.add(1, "day");
    }

    await Promise.all(ops);

    if (canceledCount > 0) {
      window.alert(
        `${canceledCount} task${
          canceledCount === 1 ? "" : "uri"
        } normale au fost trecute automat pe Canceled, deoarece se suprapuneau cu programul de ${programNameLower}.`
      );
    }
  };

  return (
    <div className="settings-root">
      {/* PROGRAM DE MUNCĂ / FACULTATE */}
      <section className="settings-section">
        <h3>Program de muncă</h3>

        {/* NUME PROGRAM */}
        <div className="settings-row">
          <span className="settings-label">Nume program</span>
          <input
            type="text"
            value={workLabel}
            onChange={(e) => setWorkLabel(e.target.value)}
            placeholder="ex: Muncă, Facultate, Școală..."
          />
        </div>

        {/* TIP PROGRAM */}
        <div className="settings-row">
          <span className="settings-label">Tip program</span>
          <div className="settings-mode-toggle">
            <button
              type="button"
              className={
                "mode-pill" +
                (scheduleMode === "simple" ? " mode-pill-active" : "")
              }
              onClick={() => handleModeChange("simple")}
            >
              Simplu (același interval)
            </button>
            <button
              type="button"
              className={
                "mode-pill" +
                (scheduleMode === "custom" ? " mode-pill-active" : "")
              }
              onClick={() => handleModeChange("custom")}
            >
              Personalizat pe zile
            </button>
          </div>
        </div>

        {/* MOD SIMPLU */}
        {scheduleMode === "simple" && (
          <>
            <div className="settings-row">
              <span className="settings-label">Zile lucrătoare</span>
              <div className="settings-days">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    className={
                      "day-pill" +
                      (workDays.includes(d.id) ? " day-pill-active" : "")
                    }
                    onClick={() => toggleDaySimple(d.id)}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-row">
              <span className="settings-label">Interval orar</span>
              <div className="settings-inline-inputs">
                <input
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkHours(e.target.value, workEnd)}
                />
                <span className="settings-separator">–</span>
                <input
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkHours(workStart, e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        {/* MOD PERSONALIZAT */}
        {scheduleMode === "custom" && (
          <div className="settings-row">
            <span className="settings-label">Zile și intervale orare</span>
            <div className="settings-days-custom">
              {WEEK_DAYS.map((d) => {
                const cfg =
                  (perDaySchedule && perDaySchedule[d.id]) || {};
                const isActive = !!cfg.enabled;
                const startVal = cfg.start || workStart || "08:00";
                const endVal = cfg.end || workEnd || "16:00";

                return (
                  <div key={d.id} className="day-row-custom">
                    <button
                      type="button"
                      className={
                        "day-pill" + (isActive ? " day-pill-active" : "")
                      }
                      onClick={() => toggleCustomDay(d.id)}
                    >
                      {d.label}
                    </button>

                    {isActive && (
                      <div className="settings-inline-inputs">
                        <input
                          type="time"
                          value={startVal}
                          onChange={(e) =>
                            setPerDaySchedule(d.id, {
                              start: e.target.value,
                            })
                          }
                        />
                        <span className="settings-separator">–</span>
                        <input
                          type="time"
                          value={endVal}
                          onChange={(e) =>
                            setPerDaySchedule(d.id, {
                              end: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ȘTERGERE PROGRAM */}
        <div className="settings-row">
          <span className="settings-label">Ștergere program</span>
          <button
            type="button"
            className="settings-delete-btn"
            onClick={handleDeleteAllWork}
          >
            {`Șterge toate taskurile de ${programNameLower}`}
          </button>
        </div>
      </section>

      {/* SECȚIUNE RECYCLE BIN */}
      <section className="settings-section">
        <h3>Reprogramează taskurile pierdute (Canceled sau Overdue)</h3>
        <div className="settings-recycle-row">
          <button
            type="button"
            className="settings-recycle-btn"
            onClick={() => onOpenRecycleBin && onOpenRecycleBin()}
          >
            Reprogramează
          </button>
        </div>
      </section>

      {/* BUTON SALVARE */}
      <div className="settings-actions">
        <button
          type="button"
          className="settings-save-btn"
          onClick={handleSave}
        >
          Salvează și adaugă programul de azi
        </button>
      </div>
    </div>
  );
}
