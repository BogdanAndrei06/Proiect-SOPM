import useTaskStore from "../store/taskStore";
import dayjs from "dayjs";
import "./ProgressBar.css";

export default function ProgressBar({ selectedDay }) {
  const tasks = useTaskStore((state) => state.tasks);

  // dacă nu vine nimic, folosim azi
  const currentDay = selectedDay ? dayjs(selectedDay) : dayjs();

  // doar task-urile pentru ziua selectată
  const tasksForDay = tasks.filter((task) => {
    if (!task.dueDate) return false;
    return dayjs(task.dueDate).isSame(currentDay, "day");
  });

  // excludem taskurile Canceled (nu contează la progres)
  const activeTasks = tasksForDay.filter((task) => task.status !== "Canceled");

  const total = activeTasks.length;
  const completed = activeTasks.filter(
    (task) => task.status === "Completed"
  ).length;

  // dacă nu există taskuri sau niciunul nu e completat,
  // NU afișăm deloc bara de progres
  if (total === 0 || completed === 0) {
    return null;
  }

  // procentul de progres (rotunjit)
  const rawProgress = (completed / total) * 100;
  const progress = Math.min(100, Math.max(0, Math.round(rawProgress)));

  return (
    <div className="progress-container">
      <div className="progress-bar-shell">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        >
          <span className="progress-text">
            Progresul zilei · {progress}% ({completed}/{total})
          </span>
        </div>
      </div>
    </div>
  );
}
