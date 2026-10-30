// Settings kept on this device (localStorage), as JSON, under a page's own key prefix. Never
// throws: storage can be off or full (private browsing, blocked site data) — the page then just
// doesn't remember. Shared by the hub pages; bundled into each by scripts/build.js.
export function createStore(prefix = '') {
  return {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(prefix + key);
        return v ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* not remembered */ }
    }
  };
}
