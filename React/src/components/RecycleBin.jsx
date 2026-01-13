// src/components/RecycleBin.jsx
import { useState } from "react";
import dayjs from "dayjs";
import useTaskStore from "../store/taskStore";
import { getTaskStatus } from "../utils/statusUtils";
import "./RecycleBin.css";

export default function RecycleBin({ onBack }) {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);

  const [rescheduleDates, setRescheduleDates] = useState({});

  // doar Canceled / Overdue, fără program de muncă/facultate
  const recycledTasks = tasks.filter((task) => {
    const isWorkTask = task.type === "work" || task.status === "Work";
    if (isWorkTask) return false;

    const uiStatus = getTaskStatus(task);
    return uiStatus === "Overdue" || uiStatus === "Canceled";
  });

  const handleDateChange = (id, value) => {
    setRescheduleDates((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleReschedule = async (task) => {
    const newDate = rescheduleDates[task.id];
    if (!newDate) {
      alert("Selectează o dată nouă pentru acest task!");
      return;
    }

    await updateTask(task.id, {
      dueDate: newDate,
      status: "Pending",
      completedAt: null,
    });

    alert(
      `Task-ul "${task.title}" a fost reprogramat pentru ${dayjs(
        newDate
      ).format("DD MMM YYYY")}`
    );
  };

  const hasTasks = recycledTasks.length > 0;

  return (
    <div className="recycle-content">
      <h2 className="recycle-title">Recycle Bin</h2>
      <p className={hasTasks ? "recycle-subtitle" : "recycle-empty"}>
        {hasTasks
          ? "Taskurile expirate sau anulate pot fi reprogramate."
          : "Nu există taskuri Canceled sau Overdue."}
      </p>

      {hasTasks && (
        <div className="recycle-list">
          {recycledTasks.map((task) => {
            const uiStatus = getTaskStatus(task);
            const formattedDate = task.dueDate
              ? dayjs(task.dueDate).format("YYYY-MM-DD")
              : "-";

            return (
              <div key={task.id} className="recycle-card">
                <div className="recycle-info">
                  <h4>{task.title}</h4>
                  <p className="recycle-date">Inițial: {formattedDate}</p>
                  <p className="recycle-status">
                    Status: <span>{uiStatus}</span>
                  </p>
                </div>

                <div className="recycle-actions">
                  <input
                    type="date"
                    value={rescheduleDates[task.id] || ""}
                    onChange={(e) =>
                      handleDateChange(task.id, e.target.value)
                    }
                  />
                  <button
                    className="recycle-btn"
                    onClick={() => handleReschedule(task)}
                  >
                    Reprogramează
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="recycle-footer">
        <button className="recycle-close-btn" onClick={onBack}>
          ← Înapoi
        </button>
      </div>
    </div>
  );
}
