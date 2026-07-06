const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const STORAGE_KEY = "myClockSettings";

const clockEl = document.querySelector(".clock");
const dateEl = document.getElementById("date");
const ampmEl = document.getElementById("ampm");
const mainTimeEl = document.getElementById("mainTime");
const secondsEl = document.getElementById("seconds");

const settingsToggle = document.getElementById("settingsToggle");
const settingsPanel = document.getElementById("settingsPanel");
const settingsBackdrop = document.getElementById("settingsBackdrop");
const formatSegment = document.getElementById("formatSegment");
const dateToggle = document.getElementById("dateToggle");
const colorSwatches = document.getElementById("colorSwatches");
const customColor = document.getElementById("customColor");
const editLayoutBtn = document.getElementById("editLayoutBtn");
const resetLayoutBtn = document.getElementById("resetLayoutBtn");
const editBar = document.getElementById("editBar");
const editDoneBtn = document.getElementById("editDoneBtn");
const screenEl = document.querySelector(".screen");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const toastEl = document.getElementById("toast");
const sizeMinus = document.getElementById("sizeMinus");
const sizePlus = document.getElementById("sizePlus");
const sizeValue = document.getElementById("sizeValue");
const previewFrame = document.getElementById("previewFrame");
const previewViewport = document.getElementById("previewViewport");

const layoutElements = Array.from(document.querySelectorAll(".layout-el"));
const LAYOUT_KEYS = ["date", "ampm", "time", "seconds"];
const MIN_SCALE = 0.4;
const MAX_SCALE = 3;

const MIN_SIZE_SCALE = 0.6;
const MAX_SIZE_SCALE = 1.2;
const SIZE_SCALE_STEP = 0.1;

function defaultLayout() {
  const layout = {};
  LAYOUT_KEYS.forEach((key) => {
    layout[key] = { x: 0, y: 0, scale: 1 };
  });
  return layout;
}

const defaultSettings = {
  format: "12",
  dateVisible: true,
  color: "#eef1f6",
  sizeScale: 1,
  layout: defaultLayout(),
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const merged = { ...defaultSettings, ...saved };
    merged.layout = { ...defaultLayout(), ...(saved && saved.layout) };
    LAYOUT_KEYS.forEach((key) => {
      merged.layout[key] = { ...defaultLayout()[key], ...merged.layout[key] };
    });
    return merged;
  } catch {
    return { ...defaultSettings, layout: defaultLayout() };
  }
}

const settings = loadSettings();

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyFormat() {
  formatSegment.querySelectorAll(".seg-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.format === settings.format);
  });
  ampmEl.classList.toggle("hidden", settings.format === "24");
  refreshPreview();
}

function applyDateVisibility() {
  dateEl.classList.toggle("hidden", !settings.dateVisible);
  dateToggle.classList.toggle("active", settings.dateVisible);
  refreshPreview();
}

function applyColor() {
  document.documentElement.style.setProperty("--clock-color", settings.color);
  colorSwatches.querySelectorAll(".swatch[data-color]").forEach((swatch) => {
    swatch.classList.toggle("active", swatch.dataset.color.toLowerCase() === settings.color.toLowerCase());
  });
  customColor.value = settings.color;
}

function applySizeScale() {
  document.documentElement.style.setProperty("--clock-scale", settings.sizeScale);
  sizeValue.textContent = `${Math.round(settings.sizeScale * 100)}%`;
  sizeMinus.disabled = settings.sizeScale <= MIN_SIZE_SCALE + 1e-9;
  sizePlus.disabled = settings.sizeScale >= MAX_SIZE_SCALE - 1e-9;
}

function applyLayoutFor(el) {
  const key = el.dataset.el;
  const { x, y, scale } = settings.layout[key];
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
}

function applyAllLayout() {
  layoutElements.forEach(applyLayoutFor);
  refreshPreview();
}

function applyAllSettings() {
  applyFormat();
  applyDateVisibility();
  applyColor();
  applySizeScale();
  applyAllLayout();
}

/* ---- edit-mode live preview window ---- */

const PREVIEW_TARGET_LONG_SIDE = 130;
let previewActive = false;

function layoutPreviewFrame() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ratio = vw / vh;
  let frameW;
  let frameH;
  if (vh >= vw) {
    frameH = PREVIEW_TARGET_LONG_SIDE;
    frameW = Math.round(frameH * ratio);
  } else {
    frameW = PREVIEW_TARGET_LONG_SIDE;
    frameH = Math.round(frameW / ratio);
  }
  previewFrame.style.width = `${frameW}px`;
  previewFrame.style.height = `${frameH}px`;

  const scale = frameW / vw;
  previewViewport.style.width = `${vw}px`;
  previewViewport.style.height = `${vh}px`;
  previewViewport.style.transform = `scale(${scale})`;
}

function stripIds(root) {
  if (root.id) root.removeAttribute("id");
  root.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
}

function refreshPreview() {
  if (!previewActive) return;
  const clone = clockEl.cloneNode(true);
  stripIds(clone);
  previewViewport.replaceChildren(clone);
}

function startPreview() {
  previewActive = true;
  layoutPreviewFrame();
  refreshPreview();
  window.addEventListener("resize", layoutPreviewFrame);
}

function stopPreview() {
  previewActive = false;
  previewViewport.replaceChildren();
  window.removeEventListener("resize", layoutPreviewFrame);
}

function render() {
  const now = new Date();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const weekday = WEEKDAYS_KO[now.getDay()];
  dateEl.textContent = `${y}.${m}.${d} (${weekday})`;

  const hours24 = now.getHours();
  const isPM = hours24 >= 12;
  ampmEl.textContent = isPM ? "PM" : "AM";

  let displayHours = hours24;
  if (settings.format === "12") {
    displayHours = hours24 % 12;
    if (displayHours === 0) displayHours = 12;
  }

  const hh = String(displayHours).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  mainTimeEl.textContent = `${hh}:${mm}`;
  secondsEl.textContent = ss;

  refreshPreview();
}

function tick() {
  render();
  const now = new Date();
  const delay = 1000 - now.getMilliseconds();
  setTimeout(tick, delay);
}

function openSettings() {
  settingsPanel.classList.add("open");
  settingsBackdrop.classList.add("open");
}

function closeSettings() {
  settingsPanel.classList.remove("open");
  settingsBackdrop.classList.remove("open");
}

settingsToggle.addEventListener("click", () => {
  const isOpen = settingsPanel.classList.contains("open");
  if (isOpen) {
    closeSettings();
  } else {
    openSettings();
  }
});

settingsBackdrop.addEventListener("click", closeSettings);

formatSegment.addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  settings.format = btn.dataset.format;
  applyFormat();
  saveSettings();
  render();
});

dateToggle.addEventListener("click", () => {
  settings.dateVisible = !settings.dateVisible;
  applyDateVisibility();
  saveSettings();
});

colorSwatches.addEventListener("click", (e) => {
  const swatch = e.target.closest(".swatch[data-color]");
  if (!swatch) return;
  settings.color = swatch.dataset.color;
  applyColor();
  saveSettings();
});

customColor.addEventListener("input", (e) => {
  settings.color = e.target.value;
  applyColor();
  saveSettings();
});

function changeSizeScale(delta) {
  const next = Math.round((settings.sizeScale + delta) * 100) / 100;
  settings.sizeScale = Math.min(MAX_SIZE_SCALE, Math.max(MIN_SIZE_SCALE, next));
  applySizeScale();
  saveSettings();
}

sizeMinus.addEventListener("click", () => changeSizeScale(-SIZE_SCALE_STEP));
sizePlus.addEventListener("click", () => changeSizeScale(SIZE_SCALE_STEP));

/* ---- layout editing: drag to move, handle to resize ---- */

function setEditMode(active) {
  screenEl.classList.toggle("edit-mode", active);
  editLayoutBtn.textContent = active ? "편집 종료" : "편집 시작";
  if (active) {
    closeSettings();
    startPreview();
  } else {
    stopPreview();
  }
}

editLayoutBtn.addEventListener("click", () => {
  const active = !screenEl.classList.contains("edit-mode");
  setEditMode(active);
});

editDoneBtn.addEventListener("click", () => {
  setEditMode(false);
});

resetLayoutBtn.addEventListener("click", () => {
  settings.layout = defaultLayout();
  applyAllLayout();
  saveSettings();
});

layoutElements.forEach((el) => {
  const key = el.dataset.el;
  const handle = el.querySelector(".resize-handle");

  el.addEventListener("pointerdown", (e) => {
    if (!screenEl.classList.contains("edit-mode")) return;
    if (e.target === handle) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = { ...settings.layout[key] };

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      settings.layout[key] = { ...startPos, x: startPos.x + dx, y: startPos.y + dy };
      applyLayoutFor(el);
      refreshPreview();
    }

    function onUp() {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      saveSettings();
    }

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  });

  handle.addEventListener("pointerdown", (e) => {
    if (!screenEl.classList.contains("edit-mode")) return;
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startScale = settings.layout[key].scale;

    function onMove(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const delta = (dx + dy) / 2;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale + delta / 150));
      settings.layout[key] = { ...settings.layout[key], scale: newScale };
      applyLayoutFor(el);
      refreshPreview();
    }

    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      saveSettings();
    }

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
});

/* ---- fullscreen toggle ---- */

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function isFullscreen() {
  return !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.msFullscreenElement
  );
}

function requestFullscreen() {
  const el = document.documentElement;
  const request =
    el.requestFullscreen ||
    el.webkitRequestFullscreen ||
    el.msRequestFullscreen;

  if (!request) {
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    showToast(
      isIOS
        ? "iOS Safari는 전체화면 API를 지원하지 않아요. 공유 버튼 → \"홈 화면에 추가\"로 설치하면 주소창 없이 앱처럼 쓸 수 있어요."
        : "이 브라우저에서는 전체화면을 지원하지 않아요."
    );
    return;
  }

  const result = request.call(el);
  if (result && result.catch) {
    result.catch(() => {
      showToast("전체화면 전환에 실패했어요.");
    });
  }
}

function exitFullscreen() {
  const exit =
    document.exitFullscreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (exit) exit.call(document);
}

function updateFullscreenButton() {
  fullscreenToggle.classList.toggle("is-fullscreen", isFullscreen());
}

fullscreenToggle.addEventListener("click", () => {
  if (isFullscreen()) {
    exitFullscreen();
  } else {
    requestFullscreen();
  }
});

["fullscreenchange", "webkitfullscreenchange", "MSFullscreenChange"].forEach((evt) => {
  document.addEventListener(evt, updateFullscreenButton);
});

applyAllSettings();
tick();
