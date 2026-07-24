/*
  Thin wrapper around the browser Notification API.
  Kept dependency-free and DOM-free so it can be swapped for a native
  push implementation (e.g. React Native / Flutter) behind the same
  function signatures later.

  Classic script (not an ES module) so it can be shared as a plain
  <script> include across every page without changing script load
  order or requiring a bundler.
*/
(function (global) {
  function isSupported() {
    return typeof Notification !== "undefined";
  }

  function getPermission() {
    return isSupported() ? Notification.permission : "unsupported";
  }

  function requestPermission() {
    if (!isSupported()) return Promise.resolve("unsupported");
    if (Notification.permission !== "default") return Promise.resolve(Notification.permission);
    return Notification.requestPermission();
  }

  function notify(title, options = {}) {
    if (!isSupported() || Notification.permission !== "granted") return null;
    try {
      return new Notification(title, options);
    } catch {
      return null;
    }
  }

  global.Gredo = global.Gredo || {};
  global.Gredo.Notifications = { isSupported, getPermission, requestPermission, notify };
})(window);
