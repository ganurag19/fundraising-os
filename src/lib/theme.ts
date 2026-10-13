// Dark (default) or light, remembered per browser. Applied before the first paint in main.tsx.
export type Theme = "dark" | "light";
const KEY = "fos_theme";

export function savedTheme(): Theme {
  try { return localStorage.getItem(KEY) === "light" ? "light" : "dark"; } catch { return "dark"; }
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#F6F7F9" : "#050507");
  try { localStorage.setItem(KEY, t); } catch { /* private mode: still applies for this visit */ }
}
