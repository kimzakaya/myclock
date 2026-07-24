/*
  Custom background page: photo upload + draggable widget placement.
*/

const BG_STORAGE_KEY = "gredoBackgroundBoard";
const LEGACY_BG_STORAGE_KEY = "myClockBackgroundBoard";

(function migrateLegacyBackgroundStorage() {
  if (localStorage.getItem(BG_STORAGE_KEY) !== null) return;
  const legacy = localStorage.getItem(LEGACY_BG_STORAGE_KEY);
  if (legacy !== null) localStorage.setItem(BG_STORAGE_KEY, legacy);
})();
const MAX_ACTIVE_WIDGETS = 3;
const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.82;
const SCALE_MIN = 0.7;
const SCALE_MAX = 1.6;

const DEFAULT_WIDGET_POSITIONS = {
  clock: { x: 4, y: 14 },
  weather: { x: 36, y: 14 },
  timer: { x: 68, y: 14 },
  todo: { x: 4, y: 56 },
};

function defaultBoard() {
  return {
    version: 1,
    image: null,
    widgets: {
      clock: { active: false, scale: 1, ...DEFAULT_WIDGET_POSITIONS.clock },
      weather: { active: false, scale: 1, ...DEFAULT_WIDGET_POSITIONS.weather },
      timer: { active: false, scale: 1, ...DEFAULT_WIDGET_POSITIONS.timer },
      todo: { active: false, scale: 1, ...DEFAULT_WIDGET_POSITIONS.todo },
    },
  };
}

function loadBoard() {
  const board = defaultBoard();
  try {
    const saved = JSON.parse(localStorage.getItem(BG_STORAGE_KEY));
    if (saved && typeof saved === "object") {
      board.image = saved.image || null;
      if (saved.widgets) {
        Object.keys(board.widgets).forEach((key) => {
          if (saved.widgets[key]) {
            board.widgets[key] = { ...board.widgets[key], ...saved.widgets[key] };
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to load background board:", error);
  }
  return board;
}

function saveBoard() {
  try {
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(board));
  } catch (error) {
    console.error("Failed to save background board:", error);
    showToast("저장 공간이 부족해요. 사진을 더 작은 파일로 시도해보세요.");
  }
}

const board = loadBoard();

const bgCanvas = document.getElementById("bgCanvas");
const bgEmpty = document.getElementById("bgEmpty");
const bgUploadInput = document.getElementById("bgUploadInput");

const widgetEls = {
  clock: document.getElementById("widgetClock"),
  weather: document.getElementById("widgetWeather"),
  timer: document.getElementById("widgetTimer"),
  todo: document.getElementById("widgetTodo"),
};

const pickerChips = Array.from(document.querySelectorAll(".picker-chip"));

/* ---- background photo ---- */

function renderBackground() {
  if (board.image) {
    bgCanvas.style.backgroundImage = `url("${board.image}")`;
    bgEmpty.classList.add("hidden");
  } else {
    bgCanvas.style.backgroundImage = "none";
    bgEmpty.classList.remove("hidden");
  }
}

function processImageFile(file) {
  if (!file.type.startsWith("image/")) {
    showToast("이미지 파일만 올릴 수 있어요.");
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width >= height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);

      try {
        board.image = canvas.toDataURL("image/jpeg", IMAGE_QUALITY);
        saveBoard();
        renderBackground();
        showToast("배경 사진을 저장했어요.");
      } catch (error) {
        showToast("이미지가 너무 커서 저장하지 못했어요.");
      }
    };
    img.onerror = () => showToast("이미지를 불러오지 못했어요.");
    img.src = event.target.result;
  };
  reader.onerror = () => showToast("파일을 읽을 수 없어요.");
  reader.readAsDataURL(file);
}

bgUploadInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) processImageFile(file);
  e.target.value = "";
});

/* ---- widget picker ---- */

function activeWidgetCount() {
  return Object.values(board.widgets).filter((w) => w.active).length;
}

function renderWidgets() {
  Object.keys(widgetEls).forEach((key) => {
    const el = widgetEls[key];
    const state = board.widgets[key];
    el.classList.toggle("hidden", !state.active);
    el.style.left = `${state.x}%`;
    el.style.top = `${state.y}%`;
    el.style.transform = `scale(${state.scale})`;
  });
  pickerChips.forEach((chip) => {
    chip.classList.toggle("active", board.widgets[chip.dataset.widget].active);
  });
}

pickerChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const key = chip.dataset.widget;
    const state = board.widgets[key];
    if (!state.active && activeWidgetCount() >= MAX_ACTIVE_WIDGETS) {
      showToast(`위젯은 최대 ${MAX_ACTIVE_WIDGETS}개까지 선택할 수 있어요.`);
      return;
    }
    state.active = !state.active;
    saveBoard();
    renderWidgets();
  });
});

/* ---- drag to reposition ---- */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

Object.keys(widgetEls).forEach((key) => {
  const wrapper = widgetEls[key];
  const handle = wrapper.querySelector(".bg-widget-handle");
  let startClientX = 0;
  let startClientY = 0;
  let startX = 0;
  let startY = 0;

  function onMove(e) {
    const dxPct = ((e.clientX - startClientX) / window.innerWidth) * 100;
    const dyPct = ((e.clientY - startClientY) / window.innerHeight) * 100;
    const nextX = clamp(startX + dxPct, 0, 88);
    const nextY = clamp(startY + dyPct, 0, 88);
    board.widgets[key].x = nextX;
    board.widgets[key].y = nextY;
    wrapper.style.left = `${nextX}%`;
    wrapper.style.top = `${nextY}%`;
  }

  function onUp(e) {
    handle.releasePointerCapture(e.pointerId);
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    saveBoard();
  }

  handle.addEventListener("pointerdown", (e) => {
    handle.setPointerCapture(e.pointerId);
    startClientX = e.clientX;
    startClientY = e.clientY;
    startX = board.widgets[key].x;
    startY = board.widgets[key].y;
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  });
});

/* ---- drag to resize ---- */

Object.keys(widgetEls).forEach((key) => {
  const wrapper = widgetEls[key];
  const resizeHandle = wrapper.querySelector(".bg-widget-resize");
  let resizeStartClientX = 0;
  let resizeStartClientY = 0;
  let startScale = 1;

  function onResizeMove(e) {
    const dx = e.clientX - resizeStartClientX;
    const dy = e.clientY - resizeStartClientY;
    const nextScale = clamp(startScale + (dx + dy) / 2 / 150, SCALE_MIN, SCALE_MAX);
    board.widgets[key].scale = nextScale;
    wrapper.style.transform = `scale(${nextScale})`;
  }

  function onResizeUp(e) {
    resizeHandle.releasePointerCapture(e.pointerId);
    resizeHandle.removeEventListener("pointermove", onResizeMove);
    resizeHandle.removeEventListener("pointerup", onResizeUp);
    resizeHandle.removeEventListener("pointercancel", onResizeUp);
    saveBoard();
  }

  resizeHandle.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    resizeHandle.setPointerCapture(e.pointerId);
    resizeStartClientX = e.clientX;
    resizeStartClientY = e.clientY;
    startScale = board.widgets[key].scale;
    resizeHandle.addEventListener("pointermove", onResizeMove);
    resizeHandle.addEventListener("pointerup", onResizeUp);
    resizeHandle.addEventListener("pointercancel", onResizeUp);
  });

  resizeHandle.addEventListener("dblclick", () => {
    board.widgets[key].scale = 1;
    wrapper.style.transform = "scale(1)";
    saveBoard();
  });
});

/* ---- init ---- */

renderBackground();
renderWidgets();
