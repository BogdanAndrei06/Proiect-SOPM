// src/components/TaskItem.jsx
import { useState } from "react";
import { Trash2, Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";
import "./TaskItem.css";

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

// excludeId = taskul pe care îl edităm acum (ca să nu ne "ciocnim" de el însuși)
function findOverlappingTask(tasks, interval, excludeId) {
  if (!interval) return null;

  for (const t of tasks) {
    if (t.id === excludeId) continue;
    if (t.dueDate !== interval.date) continue;

    // ignorăm doar taskurile deja închise
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

export default function TaskItem({ task }) {
  const { updateTask, deleteTask } = useTaskStore();
  const status = getTaskStatus(task);

  // este task de Muncă? (cele generate din setări)
  const isWorkTask = task.type === "work" || task.status === "Work";

  // importanță: la Muncă este mereu "high"
  const importance = isWorkTask ? "high" : task.importance || "low";

  const handleImportanceClick = () => {
    // pentru Muncă nu permitem schimbare
    if (isWorkTask) return;

    const next =
      importance === "low"
        ? "medium"
        : importance === "medium"
        ? "high"
        : "low";

    updateTask(task.id, { importance: next });
  };

  // status brut din store (folosit doar pentru dropdown)
  const rawStatus = task.status || "Pending";
  const selectValue =
    rawStatus === "Completed" || rawStatus === "Canceled" ? rawStatus : "";

  const statusClass = status.toLowerCase().replace(/\s+/g, "-");

  const isAuto = task.isAuto; // task generat automat din programul de muncă

  // ---- TIME / SCHEDULE STATE ----
  const initialMode =
    task.timeMode ||
    (task.startTime && task.endTime
      ? "interval"
      : task.startTime
      ? "single"
      : null);

  const [timeMode, setTimeMode] = useState(initialMode);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [hasSavedTime, setHasSavedTime] = useState(!!initialMode);

  const cardClass =
    "task-card-premium" + (showModeMenu ? " task-card-active" : "");

  const [singleTime, setSingleTime] = useState(
    initialMode === "single" ? task.startTime || "" : ""
  );
  const [intervalStart, setIntervalStart] = useState(
    initialMode === "interval" ? task.startTime || "" : ""
  );
  const [intervalEnd, setIntervalEnd] = useState(
    initialMode === "interval" ? task.endTime || "" : ""
  );

  const toggleTimeMenu = () => {
    setShowModeMenu((prev) => !prev);
  };

  const chooseMode = (mode) => {
    setTimeMode(mode);
    setIsEditingTime(true);
    setShowModeMenu(false);

    if (mode === "single" && !singleTime) {
      setSingleTime(task.startTime || "");
    }
    if (mode === "interval" && !intervalStart && !intervalEnd) {
      setIntervalStart(task.startTime || "");
      setIntervalEnd(task.endTime || "");
    }
  };

  const handleSaveTime = () => {
    if (!timeMode) return;

    if (timeMode === "single" && !singleTime) return;
    if (timeMode === "interval" && (!intervalStart || !intervalEnd)) return;

    // intervalul nou pentru taskul curent
    const newStart = timeMode === "single" ? singleTime : intervalStart;
    const newEnd = timeMode === "single" ? null : intervalEnd;

    const interval = makeInterval(task.dueDate, timeMode, newStart, newEnd);

    if (interval) {
      const { tasks } = useTaskStore.getState();
      const conflict = findOverlappingTask(tasks, interval, task.id);

      if (conflict) {
        alert(
          `Intervalul ales se suprapune cu taskul "${conflict.title}" din aceeași zi. Te rog alege altă oră.`
        );
        return; // nu salvăm modificarea
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
    setShowModeMenu(false);
  };

  const handleEditTime = () => {
    setIsEditingTime(true);
    setShowModeMenu(false);
  };

  // textul mare afișat după „Salvează”
  let summaryText = null;
  if (hasSavedTime && timeMode === "single" && (singleTime || task.startTime)) {
    summaryText = `Ora: ${singleTime || task.startTime}`;
  } else if (
    hasSavedTime &&
    timeMode === "interval" &&
    (intervalStart || intervalEnd || task.startTime || task.endTime)
  ) {
    const start = intervalStart || task.startTime || "";
    const end = intervalEnd || task.endTime || "";
    if (start && end) summaryText = `Interval: ${start} – ${end}`;
  }

  // afișăm butonul cu ceas DOAR când nu avem încă timp salvat
  // sau când suntem în modul de editare
  const showClockButton = !hasSavedTime || isEditingTime;

  return (
    <div className={cardClass}>
      {/* HEADER: titlu + dropdown status */}
      <div className="task-header">
        <div className="task-title-row">
          {isWorkTask ? (
            // MUNCĂ: bulină roșie, nu e clickabilă
            <span
              className="priority-dot-header high priority-dot-static"
              aria-label="Task de muncă - foarte important"
            />
          ) : (
            // task normal: bulină clickabilă
            <button
              type="button"
              className={`priority-dot-header ${
                importance === "high"
                  ? "high"
                  : importance === "medium"
                  ? "medium"
                  : "low"
              }`}
              onClick={handleImportanceClick}
              aria-label="Schimbă importanța taskului"
            />
          )}

          <h3 className="task-title">{task.title}</h3>
        </div>

        {/* Dropdown status – doar pentru taskurile normale,
            userul poate alege DOAR Completed sau Canceled */}
        {!isAuto && (
          <select
            className="task-select"
            value={selectValue}
            onChange={(e) => updateTask(task.id, { status: e.target.value })}
          >
            <option value="" disabled>
              Setează status
            </option>
            <option value="Completed">Completed</option>
            <option value="Canceled">Canceled</option>
          </select>
        )}
      </div>

      {/* INFO ROW: badge status + data + oră + acțiuni */}
      <div className="task-info-row">
        {/* Badge status (sub titlu) */}
        <span className={`task-badge ${statusClass}`}>
          {status === "Completed" && <CheckCircle2 size={14} />}
          {status === "Upcoming" && <Clock size={14} />}
          {status === "In Progress" && <Clock size={14} />}
          {status === "Canceled" && <XCircle size={14} />}
          {status === "Overdue" && <Clock size={14} />}
          {status}
        </span>

        {/* Data */}
        <span className="task-date">
          <Calendar size={14} />
          {task.dueDate}
        </span>

        {/* ORA / INTERVAL ORAR */}
        {(hasSavedTime || !isAuto) && (
          <div className="task-time">
            {/* VIEW: timp salvat */}
            {hasSavedTime && !isEditingTime && summaryText && (
              <div className="task-time-summary">
                <div className="task-time-text">{summaryText}</div>
                {/* butonul Editează doar pentru taskurile normale */}
                {!isAuto && (
                  <button
                    type="button"
                    className="time-edit-btn"
                    onClick={handleEditTime}
                  >
                    Editează
                  </button>
                )}
              </div>
            )}

            {/* prima setare / editare – doar pentru taskuri normale, nu pentru Muncă auto */}
            {!isAuto && showClockButton && (
              <>
                <button
                  type="button"
                  className={
                    "time-icon-btn" +
                    (isEditingTime && timeMode ? " time-icon-btn-active" : "")
                  }
                  onClick={toggleTimeMenu}
                  title="Setează ora sau intervalul orar"
                >
                  <Clock size={15} />
                </button>

                {showModeMenu && (
                  <div className="time-mode-menu">
                    <button
                      type="button"
                      onClick={() => chooseMode("single")}
                    >
                      Setează ora
                    </button>
                    <button
                      type="button"
                      onClick={() => chooseMode("interval")}
                    >
                      Setează intervalul orar
                    </button>
                  </div>
                )}

                {timeMode === "single" && (
                  <input
                    type="time"
                    className="time-input"
                    value={singleTime}
                    onChange={(e) => setSingleTime(e.target.value)}
                  />
                )}

                {timeMode === "interval" && (
                  <div className="time-interval">
                    <input
                      type="time"
                      className="time-input"
                      value={intervalStart}
                      onChange={(e) => setIntervalStart(e.target.value)}
                    />
                    <span className="time-separator">–</span>
                    <input
                      type="time"
                      className="time-input"
                      value={intervalEnd}
                      onChange={(e) => setIntervalEnd(e.target.value)}
                    />
                  </div>
                )}

                {isEditingTime && timeMode && (
                  <button
                    type="button"
                    className="time-save-btn"
                    onClick={handleSaveTime}
                  >
                    Salvează ora
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Delete + Focus */}
        <div className="task-actions-right">
          {!isAuto && (
            <button
              type="button"
              className="delete-btn-premium"
              onClick={() => deleteTask(task.id)}
            >
              <Trash2 size={16} />
            </button>
          )}

          {/* buton Full Focus doar pentru taskuri normale */}
          {!isWorkTask && (
            <button
              type="button"
              className="focus-btn-premium"
              onClick={() => {
                const useFocusStore = require("../store/focusStore").default;
                const { enterFocus } = useFocusStore.getState();
                enterFocus(task);
              }}
              title="Full Focus Mode"
            >
              🔍
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
