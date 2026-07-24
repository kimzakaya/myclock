/*
  Shared timer logic.
*/

const STORAGE_KEY = "gredoSettings";
const LEGACY_STORAGE_KEY = "myClockSettings";
const DEFAULT_POMODORO = { work: 25, shortBreak: 5, longBreak: 15 };
const POMODORO_LIMITS = {
  work: { min: 5, max: 90 },
  shortBreak: { min: 1, max: 30 },
  longBreak: { min: 5, max: 60 },
};

(function migrateLegacyStorage() {
  if (localStorage.getItem(STORAGE_KEY) !== null) return;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null) localStorage.setItem(STORAGE_KEY, legacy);
})();

function loadPomodoroSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return { ...DEFAULT_POMODORO, ...(saved.pomodoro || {}) };
  } catch {
    return { ...DEFAULT_POMODORO };
  }
}

function savePomodoroSettings(pomodoroSettings) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    saved = {};
  }
  saved.pomodoro = pomodoroSettings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
}

function loadNotificationPref() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return !!(saved && saved.notifications);
  } catch {
    return false;
  }
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (hh > 0) {
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
