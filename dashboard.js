const STORAGE_KEY = "myClockSettings";
const KO_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const EN_WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const QUOTES = [
  "오늘도 당신의 하루를 응원합니다.",
  "작은 한 걸음이 큰 변화를 만듭니다.",
  "잠깐의 휴식도 성장의 일부예요.",
  "지금 이 순간에 집중해보세요.",
  "완벽하지 않아도 괜찮아요, 계속 나아가고 있으니까요.",
  "오늘 하루도 수고 많았어요.",
  "당신의 속도로 나아가면 충분해요.",
  "포기하지 않는 당신이 멋져요.",
  "커피 한 잔의 여유를 가져보세요.",
  "내일은 오늘보다 더 나아질 거예요.",
];

const WEATHER_CODE_MAP = {
  0: ["맑음", "☀️"],
  1: ["대체로 맑음", "🌤️"],
  2: ["구름 조금", "⛅"],
  3: ["흐림", "☁️"],
  45: ["안개", "🌫️"],
  48: ["안개", "🌫️"],
  51: ["약한 이슬비", "🌦️"],
  53: ["이슬비", "🌦️"],
  55: ["강한 이슬비", "🌦️"],
  61: ["약한 비", "🌧️"],
  63: ["비", "🌧️"],
  65: ["강한 비", "🌧️"],
  71: ["약한 눈", "🌨️"],
  73: ["눈", "🌨️"],
  75: ["강한 눈", "🌨️"],
  80: ["소나기", "🌦️"],
  81: ["소나기", "🌦️"],
  82: ["강한 소나기", "🌦️"],
  85: ["눈 소나기", "🌨️"],
  86: ["눈 소나기", "🌨️"],
  95: ["뇌우", "⛈️"],
  96: ["뇌우", "⛈️"],
  99: ["강한 뇌우", "⛈️"],
};

const DEFAULT_LOCATION = { lat: 37.5665, lon: 126.978, name: "서울" };
const DEFAULT_POMODORO = { work: 25, shortBreak: 5, longBreak: 15 };
const POMODORO_CYCLES_BEFORE_LONG_BREAK = 4;

const dashboardDateEl = document.getElementById("dashboardDate");
const weatherIconEl = document.getElementById("weatherIcon");
const weatherCityEl = document.getElementById("weatherCity");
const weatherDescEl = document.getElementById("weatherDesc");
const quoteTextEl = document.getElementById("quoteText");

const clockDateEl = document.getElementById("clockDate");
const clockAmpmEl = document.getElementById("clockAmpm");
const clockTimeEl = document.getElementById("clockTime");
const clockSecondsEl = document.getElementById("clockSeconds");

const timerTabs = document.getElementById("timerTabs");
const gearBtn = document.getElementById("pomodoroGearBtn");
const settingsPopover = document.getElementById("pomodoroSettingsPopover");
const popWorkValue = document.getElementById("popWorkValue");
const popShortValue = document.getElementById("popShortValue");
const popLongValue = document.getElementById("popLongValue");
const timerDisplayEl = document.getElementById("timerDisplay");
const timerMinuteRow = document.getElementById("timerMinuteRow");
const timerMinutesLabel = document.getElementById("timerMinutesLabel");
const timerMinusBtn = document.getElementById("timerMinusBtn");
const timerPlusBtn = document.getElementById("timerPlusBtn");
const timerResetBtn = document.getElementById("timerResetBtn");
const timerStartBtn = document.getElementById("timerStartBtn");
const timerCaptionEl = document.getElementById("timerCaption");
const toastEl = document.getElementById("toast");

/* ---- date / quote ---- */

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function renderQuote() {
  quoteTextEl.textContent = QUOTES[dayOfYear(new Date()) % QUOTES.length];
}

/* ---- clock ---- */

function renderClock() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  dashboardDateEl.textContent = `${y}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${KO_WEEKDAYS[now.getDay()]})`;
  clockDateEl.textContent = `${y}.${m}.${d} | ${EN_WEEKDAYS[now.getDay()]}`;

  const hours24 = now.getHours();
  clockAmpmEl.textContent = hours24 >= 12 ? "PM" : "AM";
  let displayHours = hours24 % 12;
  if (displayHours === 0) displayHours = 12;
  clockTimeEl.textContent = `${String(displayHours).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  clockSecondsEl.textContent = String(now.getSeconds()).padStart(2, "0");
}

/* ---- weather ---- */

function describeWeather(code) {
  return WEATHER_CODE_MAP[code] || ["알 수 없음", "🌡️"];
}

async function fetchCityName(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
    );
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || "내 위치";
  } catch {
    return "내 위치";
  }
}

async function fetchWeather(lat, lon) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
  );
  if (!res.ok) throw new Error("weather fetch failed");
  return res.json();
}

function showWeather(cityName, weatherData) {
  const current = weatherData.current;
  const [desc, emoji] = describeWeather(current.weather_code);
  weatherIconEl.textContent = emoji;
  weatherCityEl.textContent = `${cityName} | ${Math.round(current.temperature_2m)}°C`;
  weatherDescEl.textContent = desc;
}

function loadWeatherFor(lat, lon, cityNamePromise) {
  Promise.all([fetchWeather(lat, lon), cityNamePromise])
    .then(([weatherData, cityName]) => showWeather(cityName, weatherData))
    .catch(() => {
      weatherCityEl.textContent = "날씨 정보를 불러오지 못했어요";
      weatherDescEl.textContent = "";
    });
}

function loadWeather() {
  weatherCityEl.textContent = "위치 확인 중...";
  weatherDescEl.textContent = "";

  if (!navigator.geolocation) {
    loadWeatherFor(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, Promise.resolve(DEFAULT_LOCATION.name));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      loadWeatherFor(latitude, longitude, fetchCityName(latitude, longitude));
    },
    () => {
      loadWeatherFor(DEFAULT_LOCATION.lat, DEFAULT_LOCATION.lon, Promise.resolve(DEFAULT_LOCATION.name));
    },
    { timeout: 8000 }
  );
}

/* ---- shared settings (synced with index.html via localStorage) ---- */

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

const pomodoroSettings = loadPomodoroSettings();

/* ---- toast + chime ---- */

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const start = now + i * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio not available; silently skip the chime */
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

/* ---- pomodoro tab ---- */

const pomodoro = {
  phase: "work",
  remaining: pomodoroSettings.work * 60,
  running: false,
};

function pomodoroPhaseDuration(phase) {
  if (phase === "work") return pomodoroSettings.work * 60;
  if (phase === "short") return pomodoroSettings.shortBreak * 60;
  return pomodoroSettings.longBreak * 60;
}

const POMODORO_COMPLETE_MESSAGES = {
  work: "집중 시간이 끝났어요. 잠시 쉬어가세요.",
  short: "휴식 종료! 다시 집중해볼까요?",
  long: "긴 휴식 종료! 다음 사이클을 시작해요.",
};

let pomodoroCyclesCompleted = 0;

function advancePomodoroPhase() {
  const endedPhase = pomodoro.phase;
  if (pomodoro.phase === "work") {
    pomodoroCyclesCompleted += 1;
    pomodoro.phase = pomodoroCyclesCompleted >= POMODORO_CYCLES_BEFORE_LONG_BREAK ? "long" : "short";
  } else if (pomodoro.phase === "long") {
    pomodoroCyclesCompleted = 0;
    pomodoro.phase = "work";
  } else {
    pomodoro.phase = "work";
  }
  pomodoro.remaining = pomodoroPhaseDuration(pomodoro.phase);
  pomodoro.running = false;
  showToast(POMODORO_COMPLETE_MESSAGES[endedPhase]);
  playChime();
}

function tickPomodoro() {
  if (!pomodoro.running) return;
  pomodoro.remaining -= 1;
  if (pomodoro.remaining <= 0) {
    advancePomodoroPhase();
  }
}

function resetPomodoro() {
  pomodoro.phase = "work";
  pomodoro.running = false;
  pomodoroCyclesCompleted = 0;
  pomodoro.remaining = pomodoroPhaseDuration("work");
}

const POMODORO_CAPTION = () =>
  `${pomodoroSettings.work}분 집중 · ${pomodoroSettings.shortBreak}분 휴식`;

/* ---- countdown timer tab ---- */

const timerState = {
  durationMinutes: 10,
  remaining: 10 * 60,
  running: false,
};

const TIMER_MIN = 1;
const TIMER_MAX = 120;

function tickTimer() {
  if (!timerState.running) return;
  timerState.remaining -= 1;
  if (timerState.remaining <= 0) {
    timerState.remaining = 0;
    timerState.running = false;
    showToast("타이머가 끝났어요!");
    playChime();
  }
}

function resetTimer() {
  timerState.running = false;
  timerState.remaining = timerState.durationMinutes * 60;
}

/* ---- stopwatch tab ---- */

const stopwatchState = {
  elapsed: 0,
  running: false,
};

function tickStopwatch() {
  if (!stopwatchState.running) return;
  stopwatchState.elapsed += 1;
}

function resetStopwatch() {
  stopwatchState.running = false;
  stopwatchState.elapsed = 0;
}

/* ---- tab switching + rendering ---- */

let activeTab = "pomodoro";

function renderActiveTimer() {
  if (activeTab === "pomodoro") {
    timerDisplayEl.textContent = formatTime(pomodoro.remaining);
    timerCaptionEl.textContent = POMODORO_CAPTION();
    timerStartBtn.textContent = pomodoro.running ? "⏸ 일시정지" : "▶ 시작하기";
    timerStartBtn.classList.toggle("is-running", pomodoro.running);
  } else if (activeTab === "timer") {
    timerDisplayEl.textContent = formatTime(timerState.remaining);
    timerCaptionEl.textContent = "카운트다운 타이머";
    timerStartBtn.textContent = timerState.running ? "⏸ 일시정지" : "▶ 시작하기";
    timerStartBtn.classList.toggle("is-running", timerState.running);
    timerMinutesLabel.textContent = `${timerState.durationMinutes}분`;
    timerMinusBtn.disabled = timerState.durationMinutes <= TIMER_MIN;
    timerPlusBtn.disabled = timerState.durationMinutes >= TIMER_MAX;
  } else {
    timerDisplayEl.textContent = formatTime(stopwatchState.elapsed);
    timerCaptionEl.textContent = "스톱워치";
    timerStartBtn.textContent = stopwatchState.running ? "⏸ 일시정지" : "▶ 시작";
    timerStartBtn.classList.toggle("is-running", stopwatchState.running);
  }
}

function setActiveTab(tab) {
  activeTab = tab;
  timerTabs.querySelectorAll(".timer-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  timerMinuteRow.classList.toggle("hidden", tab !== "timer");
  gearBtn.classList.toggle("hidden", tab !== "pomodoro");
  settingsPopover.classList.add("hidden");
  renderActiveTimer();
}

timerTabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".timer-tab");
  if (!btn) return;
  setActiveTab(btn.dataset.tab);
});

timerStartBtn.addEventListener("click", () => {
  if (activeTab === "pomodoro") {
    pomodoro.running = !pomodoro.running;
  } else if (activeTab === "timer") {
    if (timerState.remaining <= 0) timerState.remaining = timerState.durationMinutes * 60;
    timerState.running = !timerState.running;
  } else {
    stopwatchState.running = !stopwatchState.running;
  }
  renderActiveTimer();
});

timerResetBtn.addEventListener("click", () => {
  if (activeTab === "pomodoro") resetPomodoro();
  else if (activeTab === "timer") resetTimer();
  else resetStopwatch();
  renderActiveTimer();
});

timerMinusBtn.addEventListener("click", () => {
  timerState.durationMinutes = Math.max(TIMER_MIN, timerState.durationMinutes - 1);
  if (!timerState.running) timerState.remaining = timerState.durationMinutes * 60;
  renderActiveTimer();
});

timerPlusBtn.addEventListener("click", () => {
  timerState.durationMinutes = Math.min(TIMER_MAX, timerState.durationMinutes + 1);
  if (!timerState.running) timerState.remaining = timerState.durationMinutes * 60;
  renderActiveTimer();
});

/* ---- pomodoro settings popover ---- */

function syncPopoverLabels() {
  popWorkValue.textContent = `${pomodoroSettings.work}분`;
  popShortValue.textContent = `${pomodoroSettings.shortBreak}분`;
  popLongValue.textContent = `${pomodoroSettings.longBreak}분`;
}

gearBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsPopover.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (settingsPopover.classList.contains("hidden")) return;
  if (settingsPopover.contains(e.target) || e.target === gearBtn) return;
  settingsPopover.classList.add("hidden");
});

const POMODORO_LIMITS = {
  work: { min: 5, max: 90 },
  shortBreak: { min: 1, max: 30 },
  longBreak: { min: 5, max: 60 },
};

settingsPopover.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-key]");
  if (!btn) return;
  const key = btn.dataset.key;
  const delta = Number(btn.dataset.delta);
  const { min, max } = POMODORO_LIMITS[key];
  pomodoroSettings[key] = Math.min(max, Math.max(min, pomodoroSettings[key] + delta));
  savePomodoroSettings(pomodoroSettings);
  syncPopoverLabels();
  if (!pomodoro.running && pomodoro.phase === (key === "work" ? "work" : key === "shortBreak" ? "short" : "long")) {
    pomodoro.remaining = pomodoroPhaseDuration(pomodoro.phase);
  }
  renderActiveTimer();
});

/* ---- main loop ---- */

function tick() {
  renderClock();
  tickPomodoro();
  tickTimer();
  tickStopwatch();
  renderActiveTimer();
  const now = new Date();
  setTimeout(tick, 1000 - now.getMilliseconds());
}

renderQuote();
loadWeather();
setInterval(loadWeather, 15 * 60 * 1000);

syncPopoverLabels();
timerMinutesLabel.textContent = `${timerState.durationMinutes}분`;
setActiveTab("pomodoro");
tick();

/* ---- 3D tilt + glass glare on cards ---- */

const TILT_MAX_DEG = 7;
const canTilt =
  window.matchMedia("(pointer: fine)").matches &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function attachTilt(card) {
  function onMove(e) {
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * TILT_MAX_DEG * 2;
    const rotateX = (0.5 - py) * TILT_MAX_DEG * 2;
    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.015)`;
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
    card.classList.add("tilting");
  }

  function onLeave() {
    card.style.transform = "";
    card.classList.remove("tilting");
  }

  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerleave", onLeave);
}

if (canTilt) {
  document.querySelectorAll(".card").forEach(attachTilt);
}
