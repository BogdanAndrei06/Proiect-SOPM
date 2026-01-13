import { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";
import useFocusStore from "../store/focusStore";
import useTaskStore from "../store/taskStore";
import "./FullFocusView.css";

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function FullFocusView() {
  const { focusedTask, exitFocus, isFocusActive } = useFocusStore();
  const updateTask = useTaskStore((state) => state.updateTask);

  const [seconds, setSeconds] = useState(0);
  const [isCountdown, setIsCountdown] = useState(false);

  // 🎧 audio
  const audioRef = useRef(null);
  const [activeSound, setActiveSound] = useState(null);
  const [volume, setVolume] = useState(60); // 0–100

  // oprește orice sunet
  function stopSound() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setActiveSound(null);
  }

  // pornește / oprește un anumit sunet
  function toggleSound(soundName) {
    // dacă apăsăm același buton -> stop
    if (activeSound === soundName) {
      stopSound();
      return;
    }

    // oprim ce era înainte
    stopSound();

    const audio = new Audio(`/sounds/${soundName}.mp3`);
    audio.loop = true;
    audio.volume = volume / 100;

    audio
      .play()
      .then(() => {
        audioRef.current = audio;
        setActiveSound(soundName);
      })
      .catch(() => {
        // dacă browserul blochează auto-play, ignorăm
      });
  }

  // update volum când miști sliderul
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // TIMER
  useEffect(() => {
    if (!isFocusActive || !focusedTask) return;

    let timerId;

    const hasInterval =
      focusedTask.timeMode === "interval" &&
      focusedTask.dueDate &&
      focusedTask.startTime &&
      focusedTask.endTime;

    if (hasInterval) {
      // countdown până la sfârșitul intervalului
      const end = dayjs(`${focusedTask.dueDate}T${focusedTask.endTime}`);
      let diffSec = end.diff(dayjs(), "second");
      if (diffSec < 0) diffSec = 0;

      setIsCountdown(true);
      setSeconds(diffSec);

      if (diffSec > 0) {
        timerId = setInterval(() => {
          setSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timerId);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else {
      // count-up de la 0
      setIsCountdown(false);
      setSeconds(0);

      timerId = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isFocusActive, focusedTask]);

  // când ieși din focus, oprește sunetele
  useEffect(() => {
    if (!isFocusActive) {
      stopSound();
    }
  }, [isFocusActive]);

  if (!isFocusActive || !focusedTask) return null;

  const formatted = formatSeconds(seconds);

  const handleBack = () => {
    stopSound();
    exitFocus();
  };

  const handleFinish = async () => {
    stopSound();
    await updateTask(focusedTask.id, { status: "Completed" });
    exitFocus();
  };

  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };

    // 🔥 BACKGROUND DIFERIT PENTRU FIECARE SUNET
  // default: negru când nu e niciun sunet activ
  const backgroundStyle = {
    backgroundColor: "#000000",
  };

  if (activeSound === "waves") {
    backgroundStyle.backgroundImage = "url('/backgrounds/beach.jpg')";
  } else if (activeSound === "rain") {
    backgroundStyle.backgroundImage = "url('/backgrounds/rain.jpg')";
  } else if (activeSound === "cafe") {
    backgroundStyle.backgroundImage = "url('/backgrounds/coffee.jpg')";
  }

  if (activeSound) {
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
    backgroundStyle.backgroundRepeat = "no-repeat";
  }

  // dacă activeSound este null → backgroundStyle rămâne gol
  // ⇒ overlay-ul e transparent și se vede fundalul original (light/dark)

  return (
    <div className="focus-overlay" style={backgroundStyle}>
      <div className="focus-content">
        <h1 className="focus-title">{focusedTask.title}</h1>

        {focusedTask.dueDate && (
          <p className="focus-date">Data: {focusedTask.dueDate}</p>
        )}

        {focusedTask.startTime && (
          <p className="focus-time">
            {focusedTask.endTime
              ? `Interval: ${focusedTask.startTime} – ${focusedTask.endTime}`
              : `Ora: ${focusedTask.startTime}`}
          </p>
        )}

        {/* TIMER */}
        <div className="focus-timer">
          <span className="focus-timer-label">
            {isCountdown ? "Timp rămas" : "Timp în focus"}
          </span>
          <span className="focus-timer-value">{formatted}</span>
        </div>

        {/* 🎧 SUNETE DE FUNDAL */}
        <div className="focus-sounds">
          <button
            type="button"
            className={
              "sound-btn" + (activeSound === "waves" ? " sound-btn-active" : "")
            }
            onClick={() => toggleSound("waves")}
            title="Valuri"
          >
            🌊
          </button>

          <button
            type="button"
            className={
              "sound-btn" + (activeSound === "rain" ? " sound-btn-active" : "")
            }
            onClick={() => toggleSound("rain")}
            title="Ploaie"
          >
            🌧️
          </button>

          <button
            type="button"
            className={
              "sound-btn" + (activeSound === "cafe" ? " sound-btn-active" : "")
            }
            onClick={() => toggleSound("cafe")}
            title="Cafenea"
          >
            ☕
          </button>
        </div>

        {/* SLIDER VOLUM – doar dacă avem sunet activ */}
        {activeSound && (
          <div className="focus-volume">
            <span className="focus-volume-label">Volum</span>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="focus-volume-range"
            />
          </div>
        )}

        {/* BUTOANE */}
        <div className="focus-actions">
          <button className="focus-back-btn" onClick={handleBack}>
            ← Înapoi
          </button>
          <button className="focus-finish-btn" onClick={handleFinish}>
            Am terminat
          </button>
        </div>
      </div>
    </div>
  );
}
