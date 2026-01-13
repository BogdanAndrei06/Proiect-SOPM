// src/utils/statusUtils.js
import dayjs from "dayjs";

function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return dayjs(`${dateStr}T${timeStr}`);
}

export function getTaskStatus(task) {
  if (!task) return "In Progress";

  const rawStatus = task.status || "Pending";

  if (rawStatus === "Canceled") return "Canceled";
  if (rawStatus === "Completed" || task.completedAt) return "Completed";

  const now = dayjs();
  const due = task.dueDate ? dayjs(task.dueDate) : null;

  if (!due || !due.isValid()) {
    return rawStatus === "Pending" ? "In Progress" : rawStatus;
  }

  const isWorkTask = rawStatus === "Work" || task.type === "work";

  if (isWorkTask) {
    if (due.isAfter(now, "day")) return "Upcoming";
    if (due.isBefore(now, "day")) return "Completed";

    const start = parseDateTime(task.dueDate, task.startTime);
    const end = parseDateTime(task.dueDate, task.endTime);

    if (start && end) {
      if (now.isBefore(start)) return "Upcoming";
      if (now.isAfter(end)) return "Completed";
      return "In Progress";
    }

    return "In Progress";
  }

  if (due.isAfter(now, "day")) return "Upcoming";
  if (due.isBefore(now, "day")) return "Overdue";

  const mode = task.timeMode;
  const hasInterval = mode === "interval" && task.startTime && task.endTime;
  const hasSingle = (mode === "single" || !mode) && task.startTime && !task.endTime;

  if (hasInterval) {
    const start = parseDateTime(task.dueDate, task.startTime);
    const end = parseDateTime(task.dueDate, task.endTime);

    if (start && end) {
      if (now.isBefore(start)) return "Upcoming";
      if (now.isAfter(end)) return "Overdue";
      return "In Progress";
    }
  }

  if (hasSingle) {
    const at = parseDateTime(task.dueDate, task.startTime);
    if (at) {
      if (now.isBefore(at)) return "Upcoming";
      return "Overdue";
    }
  }

  return "In Progress";
}
