import useTaskStore from "../store/taskStore";
import TaskItem from "./TaskItem";
import dayjs from "dayjs";
import "./TaskItem.css";

/* ===== HELPERE PENTRU SORTARE ===== */

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function getTimeKey(task) {
  const minutes = parseTimeToMinutes(task.startTime);
  if (minutes === null) {
    // task fără oră → la final
    return 24 * 60 + 1;
  }
  return minutes;
}

// 0 = cel mai important (sus), 2 = cel mai puțin important (jos)
function getImportanceRank(task) {
  // taskurile de Muncă sunt mereu "high"
  if (task.type === "work" || task.status === "Work") return 0;

  const importance = task.importance || "low";
  if (importance === "high") return 0;
  if (importance === "medium") return 1;
  return 2; // low
}

function sortTasks(tasks, mode) {
  if (mode === "importance") {
    return tasks.slice().sort((a, b) => {
      const rankDiff = getImportanceRank(a) - getImportanceRank(b);
      if (rankDiff !== 0) return rankDiff;

      // la aceeași importanță, ordonăm după oră
      return getTimeKey(a) - getTimeKey(b);
    });
  }

  // default: sortare după oră
  return tasks.slice().sort((a, b) => {
    const timeDiff = getTimeKey(a) - getTimeKey(b);
    if (timeDiff !== 0) return timeDiff;

    // fallback: după titlu, ca să fie stabil
    return (a.title || "").localeCompare(b.title || "");
  });
}

/* ===== COMPONENTA PRINCIPALĂ ===== */

export default function TaskList({ selectedDay, sortMode = "time" }) {
  const tasks = useTaskStore((state) => state.tasks);

  // Afișăm DOAR taskurile pentru ziua selectată
  const filteredTasks = tasks.filter(
    (task) => task.dueDate && dayjs(task.dueDate).isSame(selectedDay, "day")
  );

  if (filteredTasks.length === 0) {
    return <p className="no-tasks">Nu există sarcini pentru această zi.</p>;
  }

  const sortedTasks = sortTasks(filteredTasks, sortMode);

  return (
    <div className="task-list-premium">
      {sortedTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </div>
  );
}
