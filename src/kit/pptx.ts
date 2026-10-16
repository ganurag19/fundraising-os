import { inkOn, mix } from "./brand";
import { SLIDE_TITLES } from "./kitTypes";
import type { KitView, Slide } from "./kitTypes";

// "Download PowerPoint": her deck as an editable .pptx (real text boxes, shapes and a chart), in her colours and font,
// built in her browser. Same 9 slides as the screen; sample slides keep their "Sample" tag so she replaces them.

const X = (px: number) => px / 96; // the screen slide is 960×540 px = 10×5.625 in
const PT = (px: number) => Math.round(px * 0.75 * 10) / 10;
const hex = (c: string) => c.replace("#", "").toUpperCase();
const SECTION: Record<string, string> = { problem: "THE PROBLEM", solution: "OUR SOLUTION", traction: "TRACTION", market: "MARKET", model: "BUSINESS MODEL", competition: "COMPETITION", team: "TEAM", ask: "THE ASK" };
const share = (p: string) => { const m = p.match(/^(.{2,40}?):\s*(\d{1,3})%$/); return m ? { label: m[1], pct: Math.min(100, Number(m[2])) } : null; };

export async function downloadPptx(k: KitView, made: boolean): Promise<void> {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  pptx.company = k.company;
  pptx.title = `${k.company} · investor deck`;
  const p = /^#[0-9a-f]{6}$/i.test(k.brand.primary) ? k.brand.primary : "#3D7BFF";
  const C = { p: hex(p), d: hex(mix(p, -0.62)), s: hex(mix(p, 0.86)), t: hex(mix(p, 0.94)), m: hex(mix(p, -0.25)), i: hex(inkOn(p)), a: hex(k.brand.accent && /^#[0-9a-f]{6}$/i.test(k.brand.accent) ? k.brand.accent : mix(p, 0.35)) };
  const HF = k.brand.font || "Arial", BF = "Arial";
  const minimal = k.theme === "minimal"; // Minimal exports as itself; Bold and Editorial export in the Classic layout
  type S = ReturnType<typeof pptx.addSlide>;
  const text = (sl: S, t: string, x: number, y: number, w: number, h: number, o: Record<string, unknown> = {}) =>
    sl.addText(t, { x: X(x), y: X(y), w: X(w), h: X(h), fontFace: BF, fontSize: 12, color: C.d, margin: 0, valign: "top", ...o });
  const box = (sl: S, x: number, y: number, w: number, h: number, fill: string, o: Record<string, unknown> = {}) =>
    sl.addShape(pptx.ShapeType.roundRect, { x: X(x), y: X(y), w: X(w), h: X(h), fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.12, ...o });
  const sampleTag = (sl: S, s: Slide, right = 150) => {
    if (!s.sample) return;
    box(sl, 960 - right - 190, -6, 190, 30, "FFE8A3", { line: { color: "F2C94C", width: 1 }, rectRadius: 0.08 });
    text(sl, "SAMPLE · REPLACE WITH YOURS", 960 - right - 190, 4, 190, 20, { fontSize: 8, bold: true, color: "7A4B00", align: "center", valign: "middle" });
  };
  const madeTag = (sl: S, dark: boolean) => { if (made) text(sl, "Made with FirstCheq", 760, 524, 180, 12, { fontSize: 6, color: dark ? "BBBBCC" : "9A9AAA", align: "right" }); };

  const frame = (s: Slide, n: number) => {
    const sl = pptx.addSlide();
    sl.background = { color: "FFFFFF" };
    if (!minimal) sl.addShape(pptx.ShapeType.ellipse, { x: X(680), y: X(340), w: X(420), h: X(420), fill: { color: C.t }, line: { color: C.t, width: 0 } });
    text(sl, s.headline, 40, 66, 700, 70, { fontFace: HF, fontSize: PT(minimal ? 32 : 30), bold: !minimal, color: minimal ? "111111" : C.d, valign: "top", fit: "shrink" });
    [0, 1, 2, 3].forEach((i) => sl.addShape(pptx.ShapeType.ellipse, { x: X(40 + i * 12), y: X(144), w: X(7), h: X(7), fill: { color: C.p, transparency: i > 1 ? 60 : 0 }, line: { color: C.p, width: 0 } }));
    text(sl, k.company.toUpperCase(), 720, 34, 200, 16, { fontSize: 8, bold: true, color: C.m, align: "right", charSpacing: 1 });
    if (!minimal) sl.addShape(pptx.ShapeType.pentagon, { x: X(40), y: X(30), w: X(150), h: X(26), fill: { color: C.p }, line: { color: C.p, width: 0 } });
    text(sl, SECTION[s.key] ?? SLIDE_TITLES[s.key], minimal ? 40 : 52, 30, 200, 26, { fontSize: 8.5, bold: true, color: minimal ? C.p : C.i, valign: "middle", charSpacing: minimal ? 3 : 1 });
    sl.addShape(pptx.ShapeType.ellipse, { x: X(904), y: X(490), w: X(30), h: X(30), fill: { color: C.d }, line: { color: C.d, width: 0 } });
    text(sl, String(n).padStart(2, "0"), 904, 490, 30, 30, { fontSize: 8, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    sampleTag(sl, s);
    madeTag(sl, false);
    return sl;
  };

  k.slides.forEach((s, idx) => {
    const n = idx + 1, pts = s.points, m = s.metrics;
    if (s.key === "cover" && minimal) {
      const sl = pptx.addSlide();
      sl.background = { color: "FFFFFF" };
      sl.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: X(14), h: X(540), fill: { color: C.p }, line: { color: C.p, width: 0 } });
      text(sl, k.company, 52, 150, 760, 100, { fontFace: HF, fontSize: PT(84), color: "111111", valign: "bottom", fit: "shrink" });
      text(sl, s.headline, 52, 262, 620, 70, { fontSize: PT(22), color: "333333" });
      text(sl, `${k.stage.toUpperCase()} ROUND · RAISING ${k.ask.toUpperCase()}`, 52, 380, 600, 18, { fontSize: 9, bold: true, color: C.p, charSpacing: 1.5 });
      text(sl, `${k.founder}, founder`, 52, 498, 500, 16, { fontSize: 8.5, color: "777777" });
      madeTag(sl, false);
      return;
    }
    if (s.key === "cover") {
      const sl = pptx.addSlide();
      sl.background = { color: C.d };
      sl.addShape(pptx.ShapeType.ellipse, { x: X(580), y: X(50), w: X(440), h: X(440), fill: { color: C.p, transparency: 55 }, line: { color: "FFFFFF", width: 0.5, transparency: 70 } });
      text(sl, k.company, 52, 150, 620, 100, { fontFace: HF, fontSize: PT(84), bold: true, color: "FFFFFF", valign: "bottom", fit: "shrink" });
      text(sl, s.headline, 52, 262, 560, 70, { fontSize: PT(22), color: "FFFFFF" });
      if (m.length) text(sl, m.slice(0, 3).map((x) => `${x.value} ${x.label}`).join("   ·   "), 52, 340, 600, 24, { fontSize: 11, bold: true, color: C.a });
      text(sl, `${k.stage.toUpperCase()} ROUND · RAISING ${k.ask.toUpperCase()}`, 52, 380, 600, 18, { fontSize: 9, bold: true, color: "DDDDEE", charSpacing: 1.5 });
      text(sl, `${k.founder}, founder${k.website ? ` · ${k.website.replace(/^https?:\/\/(www\.)?/, "")}` : ""}`, 52, 498, 500, 16, { fontSize: 8.5, color: "CCCCDD" });
      text(sl, "Confidential", 760, 498, 148, 16, { fontSize: 8.5, color: "CCCCDD", align: "right" });
      madeTag(sl, true);
      return;
    }
    if (s.key === "ask") {
      const sl = pptx.addSlide();
      sl.background = { color: C.d };
      text(sl, "THE ASK", 52, 150, 280, 18, { fontSize: 9, bold: true, color: "DDDDEE", charSpacing: 1.5 });
      text(sl, k.ask, 52, 175, 300, 80, { fontFace: HF, fontSize: PT(60), bold: true, color: "FFFFFF", fit: "shrink" });
      text(sl, `${k.stage} round`, 52, 262, 280, 24, { fontSize: 13, color: "DDDDEE" });
      text(sl, s.headline, 390, 120, 520, 70, { fontFace: HF, fontSize: PT(28), bold: true, color: "FFFFFF" });
      let y = 205;
      pts.forEach((pt) => {
        const b = share(pt);
        if (b) {
          text(sl, b.label, 390, y, 170, 20, { fontSize: 12, color: "FFFFFF", valign: "middle" });
          box(sl, 570, y + 5, 280, 11, mix(p, -0.4).slice(1), { rectRadius: 0.05 });
          box(sl, 570, y + 5, Math.max(8, 280 * b.pct / 100), 11, C.a, { rectRadius: 0.05 });
          text(sl, `${b.pct}%`, 860, y, 50, 20, { fontSize: 12, bold: true, color: "FFFFFF", align: "right", valign: "middle" });
        } else text(sl, `•  ${pt}`, 390, y, 520, 22, { fontSize: 12.5, color: "FFFFFF", valign: "middle" });
        y += 34;
      });
      text(sl, `${k.founder} · ${k.company}`, 52, 498, 500, 16, { fontSize: 8.5, color: "CCCCDD" });
      text(sl, "Thank you", 760, 498, 148, 16, { fontSize: 8.5, color: "CCCCDD", align: "right" });
      sampleTag(sl, s, 52);
      madeTag(sl, true);
      return;
    }
    const sl = frame(s, n);
    const top = 176;
    if (s.key === "problem" || s.key === "solution") {
      const cards = pts.slice(0, 3);
      const w = (880 - 26 * (cards.length - 1)) / Math.max(1, cards.length);
      cards.forEach((pt, i) => {
        const x = 40 + i * (w + 26);
        box(sl, x, top, w, 190, s.key === "problem" ? "FFFFFF" : C.t, s.key === "problem" ? { line: { color: C.s, width: 1.25 } } : {});
        if (s.key === "problem") text(sl, String(i + 1).padStart(2, "0"), x + 18, top + 18, 80, 34, { fontFace: HF, fontSize: 24, bold: true, color: C.p });
        else sl.addShape(pptx.ShapeType.roundRect, { x: X(x + 20), y: X(top + 20), w: X(44), h: X(44), fill: { color: C.p }, line: { color: C.p, width: 0 }, rectRadius: 0.1 });
        text(sl, pt, x + 18, top + 70, w - 36, 110, { fontSize: 13.5 });
        if (s.key === "problem" && i < cards.length - 1) text(sl, "›", x + w + 4, top + 75, 20, 40, { fontSize: 26, bold: true, color: C.p, align: "center" });
      });
      if (m.length) m.slice(0, 3).forEach((x, i, a) => {
        const w2 = (880 - 12 * (a.length - 1)) / a.length, x0 = 40 + i * (w2 + 12);
        box(sl, x0, top + 210, w2, 50, C.d);
        text(sl, `${x.value}  `, x0 + 14, top + 210, w2 - 28, 50, { fontFace: HF, fontSize: 18, bold: true, color: "FFFFFF", valign: "middle" });
        text(sl, x.label, x0 + 14 + Math.min(150, x.value.length * 13), top + 210, w2 - 40, 50, { fontSize: 10.5, color: "FFFFFF", valign: "middle" });
      });
    } else if (s.key === "traction") {
      (m.length ? m.slice(0, 3) : []).forEach((x, i) => {
        box(sl, 40, top + i * 72, 420, 60, C.d, { rectRadius: 0.5 });
        text(sl, x.label, 64, top + i * 72, 220, 60, { fontSize: 11.5, color: "FFFFFF", valign: "middle" });
        text(sl, x.value, 270, top + i * 72, 170, 60, { fontFace: HF, fontSize: 26, bold: true, color: "FFFFFF", align: "right", valign: "middle" });
      });
      if (!m.length) pts.slice(0, 3).forEach((pt, i) => { box(sl, 40, top + i * 72, 420, 60, C.t); text(sl, pt, 60, top + i * 72, 390, 60, { fontSize: 13, valign: "middle" }); });
      sl.addChart(pptx.ChartType.bar, [{ name: "Sample: replace with your monthly numbers", labels: ["M1", "M2", "M3", "M4", "M5", "M6"], values: [18, 26, 34, 47, 63, 84] }], {
        x: X(490), y: X(top), w: X(430), h: X(220), barDir: "col", chartColors: [C.s], showLegend: true, legendPos: "b", legendFontSize: 8, catAxisLabelFontSize: 8, valAxisHidden: true, valGridLine: { style: "none" },
        showTitle: true, title: "GROWTH, MONTH BY MONTH", titleFontSize: 8, titleColor: C.m,
      });
    } else if (s.key === "market") {
      [[104, 0], [72, 24], [42, 50]].forEach(([r, dy], i) => sl.addShape(pptx.ShapeType.ellipse, { x: X(40 + 110 - r), y: X(top + 110 - r + dy), w: X(r * 2), h: X(r * 2), fill: { color: [C.t, C.s, C.p][i] }, line: { color: C.p, width: 1.5 } }));
      m.slice(0, 3).forEach((x, i) => {
        const y = top + 14 + i * 66;
        text(sl, ["TAM", "SAM", "SOM"][i], 300, y, 56, 40, { fontSize: 10, bold: true, color: C.p, valign: "middle" });
        text(sl, x.value, 360, y, 220, 40, { fontFace: HF, fontSize: 24, bold: true, valign: "middle" });
        text(sl, x.label, 590, y, 330, 40, { fontSize: 11, color: C.m, valign: "middle" });
        sl.addShape(pptx.ShapeType.line, { x: X(300), y: X(y + 50), w: X(620), h: 0, line: { color: C.s, width: 1 } });
      });
      if (!m.length) pts.slice(0, 3).forEach((pt, i) => text(sl, pt, 300, top + 20 + i * 60, 620, 40, { fontSize: 13 }));
      if (m.length && pts[0]) text(sl, pts[0], 300, top + 216, 620, 18, { fontSize: 9, color: C.m });
    } else if (s.key === "model") {
      m.slice(0, 3).forEach((x, i) => {
        const x0 = 40 + i * 302;
        box(sl, x0, top, 286, 150, "FFFFFF", { line: { color: C.s, width: 1.25 } });
        text(sl, x.value, x0 + 20, top + 30, 250, 56, { fontFace: HF, fontSize: 30, bold: true, color: C.p });
        text(sl, x.label, x0 + 20, top + 92, 250, 40, { fontSize: 11.5, color: C.m });
      });
      pts.slice(0, 3).forEach((pt, i) => text(sl, `■  ${pt}`, 40, top + (m.length ? 170 : 10) + i * 28, 880, 24, { fontSize: 12.5 }));
    } else if (s.key === "competition") {
      const rivals = k.rivals?.length ? k.rivals.map((r) => `${r.name}  ·  ${r.where === "global" ? "Global" : "India"}`) : (k.facts.competitors ? k.facts.competitors.split(/[,;]/).map((c) => c.trim()).filter(Boolean) : ["Spreadsheets and WhatsApp", "Agencies and consultants", "Large global tools"]);
      box(sl, 40, top, 500, 290, "F5F5F8");
      text(sl, "WHO ELSE IS BUILDING", 58, top + 16, 300, 16, { fontSize: 8.5, bold: true, color: C.m, charSpacing: 1 });
      rivals.slice(0, 6).forEach((r, i) => { const x0 = 58 + (i % 2) * 236, y0 = top + 44 + Math.floor(i / 2) * 56; box(sl, x0, y0, 224, 46, "FFFFFF"); text(sl, r, x0 + 12, y0, 204, 46, { fontSize: 11, bold: true, valign: "middle" }); });
      box(sl, 558, top, 362, 290, C.d);
      text(sl, `WHY ${k.company.toUpperCase()} WINS`, 576, top + 16, 330, 16, { fontSize: 8.5, bold: true, color: "DDDDEE", charSpacing: 1 });
      pts.slice(0, 3).forEach((pt, i) => text(sl, `✓  ${pt}`, 576, top + 48 + i * 52, 330, 46, { fontSize: 13, color: "FFFFFF" }));
    } else if (s.key === "team") {
      const team = k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: k.founderLine ?? "" }, { name: "Priya Sharma (sample)", role: "Co-founder, CTO", line: "Ex-Razorpay engineering lead" }];
      const w = Math.min(290, (880 - 16 * (team.length - 1)) / team.length);
      team.slice(0, 4).forEach((t, i) => {
        const x0 = 40 + i * (w + 16);
        box(sl, x0, top, w, 250, C.t);
        sl.addShape(pptx.ShapeType.ellipse, { x: X(x0 + 20), y: X(top + 20), w: X(60), h: X(60), fill: { color: C.p }, line: { color: C.p, width: 0 } });
        text(sl, t.name.split(/\s+/).slice(0, 2).map((x) => x[0]).join(""), x0 + 20, top + 20, 60, 60, { fontFace: HF, fontSize: 18, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
        text(sl, t.name, x0 + 20, top + 96, w - 40, 26, { fontSize: 15, bold: true });
        text(sl, t.role, x0 + 20, top + 124, w - 40, 20, { fontSize: 10.5, bold: true, color: C.p });
        text(sl, t.line, x0 + 20, top + 150, w - 40, 90, { fontSize: 11, color: C.m });
      });
    } else pts.forEach((pt, i) => text(sl, `■  ${pt}`, 40, top + i * 30, 880, 26, { fontSize: 13 }));
  });

  await pptx.writeFile({ fileName: `${k.company} - investor deck.pptx` });
}
