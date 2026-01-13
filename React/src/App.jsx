import { useState, useEffect, useRef } from "react";
import { auth } from "./firebase";

import AddTaskForm from "./components/AddTaskForm";
import TaskList from "./components/TaskList";
import ProgressBar from "./components/ProgressBar";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";

import useTaskStore from "./store/taskStore";
import Draggable from "react-draggable";
import "./App.css";
import DaySelector from "./components/DaySelector";
import dayjs from "dayjs";
import useDayStore from "./store/useDayStore";
import useSettingsStore from "./store/useSettingsStore";

import {
  ClipboardList,
  Moon,
  Sun,
  LogOut,
  BarChart3,
  Settings as SettingsIcon,
} from "lucide-react";

import Settings from "./components/Settings";
import FullFocusView from "./components/FullFocusView";
import RecycleBinWindow from "./components/RecycleBinWindow";

function App() {
  const dashboardRef = useRef(null);
  const settingsRef = useRef(null);

  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedDay, setSelectedDay] = useState(dayjs());

  // 🔵 sortare: "time" (oră, default) sau "importance"
  const [sortMode, setSortMode] = useState("time");

  // tema
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  // dashboard window state
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(false);
  const [isDashboardMaximized, setIsDashboardMaximized] = useState(false);

  // settings window state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSettingsMinimized, setIsSettingsMinimized] = useState(false);
  const [isSettingsMaximized, setIsSettingsMaximized] = useState(false);

  // 🔴 fereastra Recycle Bin
  const [isRecycleOpen, setIsRecycleOpen] = useState(false);

  // ASCULTĂ USER AUTENTIFICAT
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // SINCRONIZARE FIRESTORE ÎN TIMP REAL
  useEffect(() => {
    if (!authReady) return;
    if (!user) return;

    // dacă e logat, ascultăm task-urile pentru user.uid
    const unsub = useTaskStore.getState().subscribeToTasks(user.uid);

    return () => {
      if (unsub) unsub();
    };
  }, [user, authReady]);

  // DARK MODE PERSISTENT + background
  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  // LOGOUT
  const handleLogout = async () => {
    await auth.signOut();
    setUser(null);
  };

  // DASHBOARD CONTROLS
  const openDashboard = () => {
    setIsDashboardOpen(true);
    setIsDashboardMinimized(false);
  };

  const closeDashboard = () => {
    setIsDashboardOpen(false);
    setIsDashboardMinimized(false);
    setIsDashboardMaximized(false);
  };

  const toggleMinimizeDashboard = () => {
    if (!isDashboardOpen) {
      openDashboard();
      return;
    }
    setIsDashboardMinimized((prev) => !prev);
  };

  const toggleMaximizeDashboard = () => {
    if (!isDashboardOpen) {
      openDashboard();
      return;
    }
    setIsDashboardMaximized((prev) => !prev);
  };

  // SETTINGS CONTROLS
  const openSettings = () => {
    setIsSettingsOpen(true);
    setIsSettingsMinimized(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setIsSettingsMinimized(false);
    setIsSettingsMaximized(false);
  };

  const toggleMinimizeSettings = () => {
    if (!isSettingsOpen) {
      openSettings();
      return;
    }
    setIsSettingsMinimized((prev) => !prev);
  };

  const toggleMaximizeSettings = () => {
    if (!isSettingsOpen) {
      openSettings();
      return;
    }
    setIsSettingsMaximized((prev) => !prev);
  };

  // RECYCLE BIN CONTROLS
  const openRecycleBin = () => {
    setIsRecycleOpen(true);
  };

  const closeRecycleBin = () => {
    setIsRecycleOpen(false);
  };

  // dacă nu e logat → login
  if (!user) return <Login />;

  const wrapperClasses =
    "app-wrapper" +
    ((isDashboardOpen && !isDashboardMinimized) ||
    (isSettingsOpen && !isSettingsMinimized)
      ? " dashboard-open"
      : "") +
    (isRecycleOpen ? " recycle-open" : "");

  return (
    <div className={wrapperClasses}>
      {/* FEREASTRĂ PRINCIPALĂ — FIXĂ, CENTRATĂ */}
      <div className="main-panel mac-window main-fixed">
        <div className="header-bar">
          <h1>
            <ClipboardList size={34} />
            Task Manager
          </h1>

          <div className="header-actions">
            {/* BUTON SETĂRI */}
            <button
              className={
                "icon-btn settings-btn" +
                (isSettingsOpen && !isSettingsMinimized
                  ? " stats-btn-active"
                  : "")
              }
              onClick={() => {
                if (isSettingsOpen && !isSettingsMinimized) {
                  closeSettings();
                } else {
                  openSettings();
                }
              }}
              title={
                isSettingsOpen && !isSettingsMinimized
                  ? "Închide setările"
                  : "Deschide setările"
              }
            >
              <SettingsIcon size={20} />
            </button>

            {/* BUTON STATISTICI */}
            <button
              className={
                "icon-btn stats-btn" +
                (isDashboardOpen && !isDashboardMinimized
                  ? " stats-btn-active"
                  : "")
              }
              onClick={() => {
                if (isDashboardOpen && !isDashboardMinimized) {
                  closeDashboard();
                } else {
                  openDashboard();
                }
              }}
              title={
                isDashboardOpen && !isDashboardMinimized
                  ? "Închide dashboard"
                  : "Deschide dashboard"
              }
            >
              <BarChart3 size={20} />
            </button>

            {/* toggle dark / light */}
            <button
              className="icon-btn theme-toggle"
              onClick={() => setDarkMode((prev) => !prev)}
              title={darkMode ? "Treci pe Light mode" : "Treci pe Dark mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* logout */}
            <button
              className="icon-btn logout-btn"
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* PROGRES ZILNIC pentru ziua selectată */}
        <ProgressBar selectedDay={selectedDay} />

        {/* FORM DE ADĂUGARE TASK – sus, sub progres */}
        <AddTaskForm />

        {/* SELECTORUL DE ZILE + SORTARE */}
        <DaySelector
          selectedDay={selectedDay}
          onChange={setSelectedDay}
          sortMode={sortMode}
          onChangeSort={setSortMode}
        />

        {/* LISTA DE TASKURI PENTRU ZIUA SELECTATĂ (cu sortare) */}
        <TaskList selectedDay={selectedDay} sortMode={sortMode} />
      </div>

      {/* DASHBOARD WINDOW */}
      {isDashboardOpen && (
        <Draggable
          handle=".window-header"
          cancel=".traffic-btn"
          nodeRef={dashboardRef}
        >
          <div
            ref={dashboardRef}
            className={
              "mac-window dashboard-window" +
              (isDashboardMaximized ? " dashboard-maximized" : "") +
              (isDashboardMinimized ? " dashboard-minimized" : "")
            }
          >
            <div className="window-header">
              <div className="traffic-lights">
                <button className="traffic-btn close" onClick={closeDashboard} />
                <button
                  className="traffic-btn minimize"
                  onClick={toggleMinimizeDashboard}
                />
                <button
                  className="traffic-btn maximize"
                  onClick={toggleMaximizeDashboard}
                />
              </div>
              <span className="window-title">Dashboard de productivitate</span>
            </div>

            {!isDashboardMinimized && (
              <div className="window-body">
                <Dashboard />
              </div>
            )}
          </div>
        </Draggable>
      )}

      {/* SETTINGS WINDOW */}
      {isSettingsOpen && (
        <Draggable
          handle=".window-header"
          cancel=".traffic-btn"
          nodeRef={settingsRef}
        >
          <div
            ref={settingsRef}
            className={
              "mac-window settings-window" +
              (isSettingsMaximized ? " dashboard-maximized" : "") +
              (isSettingsMinimized ? " dashboard-minimized" : "")
            }
          >
            <div className="window-header">
              <div className="traffic-lights">
                <button className="traffic-btn close" onClick={closeSettings} />
                <button
                  className="traffic-btn minimize"
                  onClick={toggleMinimizeSettings}
                />
                <button
                  className="traffic-btn maximize"
                  onClick={toggleMaximizeSettings}
                />
              </div>
              <span className="window-title">Setări</span>
            </div>

            {!isSettingsMinimized && (
              <div className="window-body">
                {/* trimitem handler-ul către Settings */}
                <Settings onOpenRecycleBin={openRecycleBin} />
              </div>
            )}
          </div>
        </Draggable>
      )}

      {/* RECYCLE BIN WINDOW (draggabilă, singura vizibilă când e deschisă) */}
      <RecycleBinWindow isOpen={isRecycleOpen} onClose={closeRecycleBin} />

      {/* FULL FOCUS MODE – overlay peste toată aplicația */}
      <FullFocusView />
    </div>
  );
}

export default App;
