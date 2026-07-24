/*
  Framework-agnostic pomodoro state machine shared by every page that
  runs a pomodoro timer. No DOM access here — callers own rendering
  via the onChange/onPhaseComplete callbacks, so this same logic can
  be ported to a native app shell later without rewriting the rules.

  Countdown is wall-clock based (an end timestamp, not a per-tick
  decrement) so it stays correct across throttled/background tabs:
  call tick() as often as you like, and resync() right when the page
  becomes visible again to update immediately instead of waiting for
  the next tick.

  Classic script (not an ES module), attaches to window.Gredo.PomodoroEngine.
*/
(function (global) {
  const DEFAULT_DURATIONS = { work: 25, shortBreak: 5, longBreak: 15 };
  const CYCLES_BEFORE_LONG_BREAK = 4;

  function phaseSeconds(durations, phase) {
    if (phase === "work") return durations.work * 60;
    if (phase === "short") return durations.shortBreak * 60;
    return durations.longBreak * 60;
  }

  function durationsKeyToPhase(key) {
    if (key === "work") return "work";
    if (key === "shortBreak") return "short";
    return "long";
  }

  function create(options = {}) {
    const durations = { ...DEFAULT_DURATIONS, ...options.durations };
    const onChange = options.onChange || function () {};
    const onPhaseComplete = options.onPhaseComplete || function () {};

    let phase = "work";
    let remaining = phaseSeconds(durations, phase);
    let running = false;
    let active = false;
    let cyclesCompleted = 0;
    let endTime = null;

    function getState() {
      return { phase, remaining, running, active, cyclesCompleted, durations: { ...durations } };
    }

    function emitChange() {
      onChange(getState());
    }

    function advance(notify) {
      const endedPhase = phase;
      if (phase === "work") {
        cyclesCompleted += 1;
        phase = cyclesCompleted >= CYCLES_BEFORE_LONG_BREAK ? "long" : "short";
      } else if (phase === "long") {
        cyclesCompleted = 0;
        phase = "work";
      } else {
        phase = "work";
      }
      remaining = phaseSeconds(durations, phase);
      if (notify) {
        running = false;
        endTime = null;
        onPhaseComplete(endedPhase);
      }
      emitChange();
    }

    function tick() {
      if (!running || endTime === null) return;
      const left = Math.round((endTime - Date.now()) / 1000);
      if (left <= 0) {
        advance(true);
      } else {
        remaining = left;
        emitChange();
      }
    }

    function start() {
      if (running) return;
      running = true;
      active = true;
      endTime = Date.now() + remaining * 1000;
      emitChange();
    }

    function pause() {
      if (!running) return;
      remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      running = false;
      endTime = null;
      emitChange();
    }

    function toggle() {
      if (running) pause();
      else start();
    }

    function reset() {
      running = false;
      active = false;
      phase = "work";
      cyclesCompleted = 0;
      remaining = phaseSeconds(durations, "work");
      endTime = null;
      emitChange();
    }

    function skip() {
      active = true;
      advance(false);
      if (running) {
        endTime = Date.now() + remaining * 1000;
      }
    }

    function setDuration(key, minutes) {
      durations[key] = minutes;
      if (!active && phase === durationsKeyToPhase(key)) {
        remaining = phaseSeconds(durations, phase);
      }
      emitChange();
    }

    return { getState, start, pause, toggle, reset, skip, tick, resync: tick, setDuration };
  }

  global.Gredo = global.Gredo || {};
  global.Gredo.PomodoroEngine = { create };
})(window);
