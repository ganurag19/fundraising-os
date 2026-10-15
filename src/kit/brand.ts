// Her brand on the kit: colours from her site (she confirms them), her logo, and her font when Google Fonts has it.

export type Brand = { primary: string; accent?: string; logo?: string; font?: string; fontCss?: string };

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => clamp(x).toString(16).padStart(2, "0")).join("")}`;
/** Mix with black (amt < 0) or white (amt > 0), 0–1. */
export function mix(hex: string, amt: number) {
  const [r, g, b] = rgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  return toHex(r + (t - r) * p, g + (t - g) * p, b + (t - b) * p);
}
/** White or near-black text, whichever reads better on this colour. */
export function inkOn(hex: string) {
  const [r, g, b] = rgb(hex).map((x) => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? "#14141A" : "#FFFFFF";
}

/** CSS variables for one deck or teaser: --bp main, --bd deep, --bs soft, --bt tint, --bi ink on main, --bf font. */
export function brandVars(b: Brand): React.CSSProperties {
  const p = /^#[0-9a-f]{6}$/i.test(b.primary) ? b.primary : "#3D7BFF";
  return {
    "--bp": p, "--bd": mix(p, -0.62), "--bs": mix(p, 0.86), "--bt": mix(p, 0.94), "--bm": mix(p, -0.25), "--bi": inkOn(p),
    "--ba": b.accent && /^#[0-9a-f]{6}$/i.test(b.accent) ? b.accent : mix(p, 0.35),
    "--bf": b.font ? `"${b.font}", var(--display)` : "var(--display)",
  } as React.CSSProperties;
}

const loaded = new Set<string>();
/** Loads her font from Google Fonts once; if Google doesn't have it, the deck falls back to our heading font. */
export function loadBrandFont(font?: string, fontCss?: string) {
  if (!font || loaded.has(font) || typeof document === "undefined" || !/^[A-Za-z0-9 ]{2,40}$/.test(font)) return;
  loaded.add(font);
  const l = document.createElement("link");
  l.rel = "stylesheet";
  // Her site's own Google Fonts link has the weights that exist; asking for one that doesn't makes Google return nothing.
  l.href = fontCss && /^https:\/\/fonts\.googleapis\.com\//.test(fontCss) ? fontCss : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, "+")}&display=swap`;
  document.head.appendChild(l);
}
