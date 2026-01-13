import { useState } from "react";
import dayjs from "dayjs";
import { Calendar as CalendarIcon } from "lucide-react";
import "./DaySelector.css";

export default function DaySelector({
  selectedDay,
  onChange,
  sortMode,
  onChangeSort,
}) {
  const [showSortMenu, setShowSortMenu] = useState(false);

  const today = dayjs();
  const tomorrow = today.add(1, "day");

  const days = [
    { label: "Azi", date: today },
    { label: "Mâine", date: tomorrow },
    ...Array.from({ length: 3 }).map((_, i) => {
      const d = today.add(i + 2, "day");
      return { label: d.format("DD MMM"), date: d };
    }),
  ];

  const handleCalendarPick = (e) => {
    const date = dayjs(e.target.value);
    if (date.isValid()) onChange(date);
  };

  const handleSortChange = (mode) => {
    if (onChangeSort) onChangeSort(mode);
    setShowSortMenu(false);
  };

  const currentSortLabel =
    sortMode === "importance" ? "Importanță" : "Oră (default)";

  return (
    <div className="day-selector">
      {/* butoanele de zi + calendar */}
      <div className="day-selector-buttons">
        {days.map((d, i) => (
          <button
            key={i}
            className={
              "day-btn " +
              (selectedDay.isSame(d.date, "day") ? "day-btn-active" : "")
            }
            onClick={() => onChange(d.date)}
          >
            {d.label}
          </button>
        ))}

        <label className="calendar-btn">
          <CalendarIcon size={18} />
          <input type="date" onChange={handleCalendarPick} />
        </label>
      </div>

      {/* buton Sort By */}
      <div className="sort-dropdown-wrapper">
        <button
          type="button"
          className="sort-btn"
          onClick={() => setShowSortMenu((v) => !v)}
        >
          Sort By
          <span className="sort-current-label">{currentSortLabel}</span>
        </button>

        {showSortMenu && (
          <div className="sort-menu">
            <button
              type="button"
              className={
                "sort-option" +
                (sortMode === "time" ? " sort-option-active" : "")
              }
              onClick={() => handleSortChange("time")}
            >
              După oră (default)
            </button>
            <button
              type="button"
              className={
                "sort-option" +
                (sortMode === "importance" ? " sort-option-active" : "")
              }
              onClick={() => handleSortChange("importance")}
            >
              După importanță
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
