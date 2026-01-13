import { useState } from "react";
import useTaskStore from "../store/taskStore";
import { PlusCircle, Clock } from "lucide-react";
import "./TaskItem.css"; // folosim stilurile de timp + priority de aici

// Transformă "HH:MM" în minute de la 0 la 1440
function timeToMinutes(time) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Construiește un interval [start, end) pentru o zi
function makeInterval(dueDate, timeMode, startTime, endTime) {
  if (!dueDate || !timeMode || !startTime) return null;

  const start = timeToMinutes(startTime);
  if (start == null) return null;

  let end;
  if (timeMode === "interval") {
    end = timeToMinutes(endTime);
    if (end == null || end <= start) return null;
  } else {
    // "single" -> considerăm o fereastră de 1 minut
    end = start + 1;
  }

  return { date: dueDate, start, end };
}

// Caută un task care se suprapune cu intervalul dat
function findOverlappingTask(tasks, interval) {
  if (!interval) return null;

  for (const t of tasks) {
    // altă zi -> nu ne interesează
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

export default function AddTaskForm() {
  const addTask = useTaskStore((state) => state.addTask);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 🔵 importanță: low = verde (default), medium = galben, high = roșu
  const [importance, setImportance] = useState("low");

  // modul de afișare: "segments" (3 casete) sau "solid" (toată pastila colorată)
const [importanceMode, setImportanceMode] = useState("segments");

  // 🕒 stare pentru selecția orei
  const [timeMode, setTimeMode] = useState(null); // "single" | "interval" | null
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasSavedTime, setHasSavedTime] = useState(false);

  const resetForm = () => {
  setTitle("");
  setDueDate("");
  setImportance("low");
  setImportanceMode("segments");
  setTimeMode(null);
  setShowModeMenu(false);
  setStartTime("");
  setEndTime("");
  setHasSavedTime(false);
};


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    const payload = {
      title,
      dueDate,
      status: "Pending",
      importance,
    };

    if (timeMode === "single" && startTime) {
      payload.timeMode = "single";
      payload.startTime = startTime;
      payload.endTime = null;
    } else if (timeMode === "interval" && startTime && endTime) {
      payload.timeMode = "interval";
      payload.startTime = startTime;
      payload.endTime = endTime;
    }

    // ✅ verificare de suprapunere DOAR dacă taskul are oră/interval
    const interval = makeInterval(
      payload.dueDate,
      payload.timeMode,
      payload.startTime,
      payload.endTime
    );

    if (interval) {
      const { tasks } = useTaskStore.getState();
      const conflict = findOverlappingTask(tasks, interval);

      if (conflict) {
        alert(
          `Ai deja un task ("${conflict.title}") în ziua respectivă care se suprapune cu acest interval orar.`
        );
        return; // nu adăugăm taskul
      }
    }

    addTask(payload);
    resetForm();
  };

  const handleSelectMode = (mode) => {
    setTimeMode(mode);
    setShowModeMenu(false);
    setHasSavedTime(true);
    if (mode === "single") {
      setEndTime("");
    }
  };
   const handleImportanceClick = (level, e) => {
    if (importanceMode === "segments") {
      // când suntem în modul cu 3 segmente:
      // - oprim propagarea ca să nu se cheme onClick-ul containerului
      // - setăm culoarea și trecem pe modul "solid"
      e.stopPropagation();
      setImportance(level);
      setImportanceMode("solid");
    } else {
      // importanceMode === "solid"
      // nu schimbăm culoarea aici; containerul se ocupă să revină la 3 segmente
    }
  };


  return (
    <form className="add-task-form" onSubmit={handleSubmit}>
      {/* titlul taskului */}
      <input
        type="text"
        className="task-input"
        placeholder="Adaugă o sarcină..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

            {/* 🔴🟡🟢 selector importanță – pastilă din 3 segmente */}
            {/* 🔴🟡🟢 selector importanță – pastilă cu 3 segmente */}
      <div
        className={`priority-selector ${
          importanceMode === "solid" ? "priority-solid" : "priority-segments"
        } importance-${importance}`}
        onClick={() => {
          // dacă pastila este plină, un click oriunde pe ea revine la 3 segmente
          if (importanceMode === "solid") {
            setImportanceMode("segments");
          }
        }}
      >
        <button
          type="button"
          className="priority-pill priority-high"
          onClick={(e) => handleImportanceClick("high", e)}
          aria-label="Foarte important"
        />

        <button
          type="button"
          className="priority-pill priority-medium"
          onClick={(e) => handleImportanceClick("medium", e)}
          aria-label="Importanță medie"
        />

        <button
          type="button"
          className="priority-pill priority-low"
          onClick={(e) => handleImportanceClick("low", e)}
          aria-label="Mai puțin important"
        />
      </div>



      {/* data */}
      <input
        type="date"
        className="date-input"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />

      {/* ceas + meniu + câmpuri de timp */}
      <div className="task-time">
        <button
          type="button"
          className={
            "time-icon-btn" + (hasSavedTime ? " time-icon-btn-active" : "")
          }
          onClick={() => setShowModeMenu((v) => !v)}
          aria-label="Setează ora sau intervalul"
        >
          <Clock size={16} />
        </button>

        {showModeMenu && (
          <div className="time-mode-menu">
            <button type="button" onClick={() => handleSelectMode("single")}>
              Setează ora
            </button>
            <button type="button" onClick={() => handleSelectMode("interval")}>
              Setează intervalul orar
            </button>
          </div>
        )}

        {timeMode === "single" && (
          <input
            type="time"
            className="time-input"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        )}

        {timeMode === "interval" && (
          <div className="time-interval">
            <input
              type="time"
              className="time-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <span className="time-separator">–</span>
            <input
              type="time"
              className="time-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* buton Adaugă */}
      <button type="submit" className="add-btn">
        <PlusCircle size={18} /> Adaugă
      </button>
    </form>
  );
}
