// Illustrated faces, fund logos and the match-score dial, drawn as SVG strings.
// Used for made-up people and funds until investors confirm their profiles (DESIGN.md section 4).
let uid = 0;
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const SKIN = ["#F6D1B5", "#EBB894", "#D9A07A", "#C0855E", "#A36A47", "#82502F"];
const HAIR = ["#1B1714", "#2C1E16", "#4A3020", "#6B4A2E", "#1D1D24", "#8A8A92"];
const BGS = [["#7FA6FF", "#A98BFF"], ["#9AD0FF", "#7FA6FF"], ["#F7D58A", "#F2A97A"], ["#7FE3C2", "#7C9CFF"], ["#C6B6FF", "#8FB4FF"], ["#A6E3FF", "#7FE3C2"], ["#E9C46A", "#B8D0FF"]];
const SHIRT = ["#2B2B33", "#F2F2F5", "#3D7BFF", "#7B5CFF", "#14141A", "#2E8A6E", "#B0B6C3"];

export function faceSvg(name: string, size = 40): string {
  const h = hash(name), g = h % 2, sk = SKIN[(h >>> 3) % SKIN.length], hc = HAIR[(h >>> 6) % HAIR.length];
  const bg = BGS[(h >>> 9) % BGS.length], sh = SHIRT[(h >>> 12) % SHIRT.length], style = (h >>> 15) % 5;
  const glasses = (h >>> 18) % 4 === 0, beard = !g && (h >>> 20) % 3 === 0, id = "f" + uid++;
  const long = [
    `<path d="M17 30c0-11 6-17 15-17s15 6 15 17v14h-5V31c-3-4-6-6-10-6s-7 2-10 6v13h-5z" fill="${hc}"/>`,
    `<path d="M18 29c0-10 6-16 14-16s14 6 14 16c-2-3-6-6-14-6s-12 3-14 6z" fill="${hc}"/><circle cx="32" cy="12" r="6" fill="${hc}"/>`,
    `<path d="M16 34c0-13 7-21 16-21s16 8 16 21c0 6-2 11-4 14h-4V30c-2-3-5-5-8-5s-6 2-8 5v18h-4c-2-3-4-8-4-14z" fill="${hc}"/>`,
    `<path d="M18 30c0-10 6-17 14-17 9 0 14 7 14 17-5-4-9-5-14-5s-9 1-14 5z" fill="${hc}"/><path d="M44 28c3 4 3 12 1 18h-3V30z" fill="${hc}"/>`,
    `<path d="M17 31c0-11 6-18 15-18s15 7 15 18l-3 8h-2V30c-3-3-6-5-10-5s-7 2-10 5v9h-2z" fill="${hc}"/>`,
  ];
  const short = [
    `<path d="M19 28c0-9 6-14 13-14s13 5 13 14c-2-3-6-5-13-5s-11 2-13 5z" fill="${hc}"/>`,
    `<path d="M19 27c1-9 6-13 13-13 8 0 13 4 13 12-4-2-8-6-12-6-3 4-9 6-14 7z" fill="${hc}"/>`,
    `<path d="M20 26c0-7 5-11 12-11s12 4 12 11c-3-2-7-3-12-3s-9 1-12 3z" fill="${hc}"/>`,
    `<path d="M19 29c-1-10 5-16 13-16s14 6 13 16c-1-4-3-6-6-7l-7 1-7-1c-3 1-5 3-6 7z" fill="${hc}"/>`,
    `<path d="M21 24c2-6 6-9 11-9s9 3 11 9c-3-1-7-2-11-2s-8 1-11 2z" fill="${hc}"/>`,
  ];
  const beardP = beard ? `<path d="M22 36c1 7 5 11 10 11s9-4 10-11c-2 2-5 3-10 3s-8-1-10-3z" fill="${hc}"/>` : "";
  const gl = glasses ? `<g fill="none" stroke="#111" stroke-width="1.6"><circle cx="27" cy="31" r="3.6"/><circle cx="37" cy="31" r="3.6"/><path d="M30.6 31h2.8"/></g>` : "";
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 64 64" style="border-radius:50%" role="img" aria-label="${esc(name)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs><rect width="64" height="64" fill="url(#${id})"/><path d="M10 64c2-11 11-17 22-17s20 6 22 17z" fill="${sh}"/><rect x="28" y="40" width="8" height="9" rx="3" fill="${sk}"/><ellipse cx="32" cy="31" rx="12" ry="14" fill="${sk}"/><ellipse cx="20" cy="32" rx="2" ry="3" fill="${sk}"/><ellipse cx="44" cy="32" rx="2" ry="3" fill="${sk}"/>${(g ? long : short)[style]}<circle cx="27" cy="31" r="1.5" fill="#1a1a1a"/><circle cx="37" cy="31" r="1.5" fill="#1a1a1a"/><path d="M24.5 27.3q2.5-1.4 5 0M34.5 27.3q2.5-1.4 5 0" stroke="#2a2a2a" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M28.5 38q3.5 2.6 7 0" stroke="#7a3b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>${beardP}${gl}</svg>`;
}

export function logoSvg(name: string, size = 40): string {
  const h = hash(name), bg = BGS[h % BGS.length], id = "l" + uid++, v = (h >>> 5) % 6, ink = "#0B0B0E";
  const shapes = [
    `<circle cx="20" cy="20" r="9" fill="${ink}"/><circle cx="20" cy="20" r="4" fill="url(#${id})"/>`,
    `<rect x="11" y="11" width="18" height="18" rx="4" fill="${ink}" transform="rotate(45 20 20)"/>`,
    `<path d="M20 9l11 20H9z" fill="${ink}"/>`,
    `<path d="M10 27a10 10 0 0 1 20 0z" fill="${ink}"/><rect x="10" y="28" width="20" height="3" rx="1.5" fill="${ink}" opacity=".7"/>`,
    `<path d="M11 12h8v16h-8zM21 18h8v10h-8z" fill="${ink}"/>`,
    `<path d="M12 28l8-16 8 16M15 22h10" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  ];
  return `<svg class="mark" width="${size}" height="${size}" viewBox="0 0 40 40" style="border-radius:${size / 4}px" role="img" aria-label="${esc(name)} logo"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient></defs><rect width="40" height="40" fill="url(#${id})"/>${shapes[v]}</svg>`;
}

export function dialSvg(score: number, size = 64): string {
  const r = 26, c = 2 * Math.PI * r, o = c * (1 - score / 100);
  const col = score >= 85 ? "#E9C46A" : score >= 70 ? "#3D7BFF" : "#83838F";
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" fill="none" style="stroke:var(--line2)" stroke-width="6"/><circle cx="32" cy="32" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${o}"/></svg>`;
}
