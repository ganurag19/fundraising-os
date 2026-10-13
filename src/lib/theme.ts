// Public pages (landing, sign-up, reveal) are always dark. The dashboard defaults to light,
// and her choice there is remembered per browser.
export type Theme = "dark" | "light";
const KEY = "fos_theme_app";

export function savedTheme(): Theme {
  try { return localStorage.getItem(KEY) === "dark" ? "dark" : "light"; } catch { return "light"; }
}

/** Paint a theme. Pass remember=true only from the dashboard's switch. */
export function applyTheme(t: Theme, remember = false) {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#F6F7F9" : "#050507");
  if (remember) try { localStorage.setItem(KEY, t); } catch { /* private mode: still applies for this visit */ }
}
