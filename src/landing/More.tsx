import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../components/Brand";

// More landing pieces (v7). Every founder and investor here is made up.

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Runs once, the first time the element scrolls into view. */
function useSeen<T extends HTMLElement>(threshold = 0.4) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

/** A highlighter stroke that sweeps across a few words as they come into view. */
export function Mark({ children }: { children: React.ReactNode }) {
  const [ref, seen] = useSeen<HTMLSpanElement>(1);
  return <span ref={ref} className={`hl${seen ? " on" : ""}`}>{children}</span>;
}

/** Hero: small notes of what FirstCheq is doing for a made-up founder, one popping in every few seconds. */
const NOTES: [string, string][] = [
  ["Northlight Seed · Fit Score 90", "Opens on Smeltwise, from their portfolio."],
  ["Email + LinkedIn note ready", "For Meera at Verdant Arc, about Kiln Labs."],
  ["86 investors fit Kiln Labs", "Your top 3 have emails ready."],
  ["Day 3: follow-up written", "For Kestrel Ridge Angels. Ready when you are."],
  ["Monsoon Angels added", "Backed two climate deals this year."],
  ["9 AM: 2 follow-ups ready today", "Read them, then send from your Gmail."],
];
const AGO = ["now", "2m ago", "6m ago"];

export function HeroFeed() {
  const [n, setN] = useState(() => (reduced() ? 3 : 1));
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setN((x) => x + 1), 2800);
    return () => clearInterval(t);
  }, []);
  const shown = [n - 1, n - 2, n - 3].filter((i) => i >= 0);
  return (
    <div className="hero-feed" aria-hidden="true">
      {shown.map((i, at) => {
        const [title, body] = NOTES[i % NOTES.length];
        return (
          <div className="feed-note" key={i} style={{ opacity: 1 - at * 0.28 }}>
            <LogoMark />
            <div><span className="feed-meta"><b>FirstCheq</b> · {AGO[at]}</span><b>{title}</b><span>{body}</span></div>
          </div>
        );
      })}
    </div>
  );
}

/** Fit Score, shown working: five made-up funds sort themselves, then a pointer opens why each fits, with sources. */
type Fund = { id: string; fund: string; score: number; cheque: string; deal: string; leads: boolean; why: string; sources: string[] };
const FUNDS: Fund[] = [
  { id: "va", fund: "Verdant Arc Capital", score: 95, cheque: "₹50L–2 Cr", deal: "GridLeaf · seed · 2025", leads: true, why: "Backed GridLeaf at seed in 2025, and 3 of their last 4 deals are climate.", sources: ["Verdant Arc website · checked Oct 2026", "Deal news · GridLeaf seed, 2025"] },
  { id: "nl", fund: "Northlight Seed", score: 90, cheque: "₹25L–1 Cr", deal: "Smeltwise · portfolio", leads: false, why: "Smeltwise, the closest company to Kiln Labs, is in their portfolio. One cheque covers a third of your round.", sources: ["Northlight portfolio page · checked Oct 2026"] },
  { id: "kr", fund: "Kestrel Ridge Angels", score: 84, cheque: "₹10–75L", deal: "FurnaceIQ · 2025", leads: false, why: "Wrote a cheque into FurnaceIQ in 2025, and backs industrial climate at seed.", sources: ["Kestrel Ridge website · checked Sep 2026", "Deal news · FurnaceIQ, 2025"] },
  { id: "ma", fund: "Monsoon Angels", score: 81, cheque: "₹10–50L", deal: "Kheti Cloud · 2024", leads: false, why: "", sources: [] },
  { id: "bs", fund: "Banyan Seed Fund", score: 77, cheque: "₹50L–1.5 Cr", deal: "Tarang Energy · 2024", leads: false, why: "", sources: [] },
];
const START = ["ma", "va", "bs", "kr", "nl"]; // shuffled, before the sort
const HEAD = 40, ROW = 56;

export function FitTable() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.45);
  const [sorted, setSorted] = useState(reduced);
  const [focus, setFocus] = useState(() => (reduced() ? 0 : -1));
  const [px, setPx] = useState(0); // the pointer's x: over the Fit Score column, measured whenever the table resizes

  useEffect(() => {
    if (!seen || reduced()) return;
    let loop: ReturnType<typeof setInterval> | undefined;
    const t1 = setTimeout(() => setSorted(true), 600);
    const t2 = setTimeout(() => { setFocus(0); loop = setInterval(() => setFocus((f) => (f + 1) % 3), 3600); }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); if (loop) clearInterval(loop); };
  }, [seen]);

  const order = sorted ? [...FUNDS].sort((a, b) => b.score - a.score).map((f) => f.id) : START;
  const top = (id: string) => HEAD + order.indexOf(id) * ROW;
  const active = focus >= 0 ? FUNDS.find((f) => f.id === order[focus]) : undefined;

  useEffect(() => {
    const box = ref.current;
    if (!box || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(() => {
      const cell = box.querySelector(".ft-row:not(.ft-head) .ft-score");
      if (cell) setPx(cell.getBoundingClientRect().left - box.getBoundingClientRect().left + 30);
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, [ref]);

  return (
    <div className="fit-table-wrap">
      <div className="fit-table-cap"><span className="dot-live" aria-hidden="true" /> Research done · Kiln Labs · Climate · Seed <span className="muted">· 5 of 86 shown</span></div>
      <div ref={ref} className="fit-table" style={{ height: HEAD + FUNDS.length * ROW }} role="table" aria-label="Example: five made-up investors ranked by Fit Score">
        <div className="ft-row ft-head" role="row"><span>Investor</span><span><span className="ft-long">Fit Score</span><span className="ft-short">Fit</span> ↓</span><span><span className="ft-long">Recent deal in your space</span><span className="ft-short">Recent deal</span></span><span className="ft-hide">Cheque</span></div>
        {FUNDS.map((f) => (
          <div key={f.id} role="row" className={`ft-row${active?.id === f.id ? " on" : ""}`} style={{ top: top(f.id) }}>
            <span className="ft-fund"><span className="ft-logo" aria-hidden="true">{f.fund[0]}</span><b>{f.fund}</b>{f.leads && <span className="ft-lead">Leads</span>}</span>
            <span className={`ft-score${f.score >= 85 ? " hi" : ""}`}><i aria-hidden="true">▮▮▮</i>{f.score}</span>
            <span className="ft-deal">{f.deal}</span>
            <span className="ft-hide">{f.cheque}</span>
          </div>
        ))}
        {active && px > 0 && <svg className="ft-pointer" style={{ transform: `translate(${px}px, ${top(active.id) + ROW * 0.6}px)` }} width="20" height="22" viewBox="0 0 20 22" aria-hidden="true"><path d="M2 2l15 9-6.5 1.6L7.5 19z" fill="#fff" stroke="#0B0B10" strokeWidth="1.6" strokeLinejoin="round" /></svg>}
        {active && active.why && (
          <div className="ft-pop" key={active.id} style={{ top: top(active.id) + ROW + 4 }}>
            <span className="ft-pop-k">Why they fit</span>
            <p>{active.why}</p>
            <span className="ft-pop-k">Sources</span>
            {active.sources.map((s) => <span className="ft-src" key={s}>↗ {s}</span>)}
          </div>
        )}
      </div>
      <p className="muted small" style={{ margin: "10px 0 0" }}>Example list, made up. Yours shows real funds, each with its source.</p>
    </div>
  );
}

/** "Which should you choose?" Honest about when another route is better. */
export function Choose() {
  const cols: [string, string[], boolean][] = [
    ["On your own, if", ["You already know the 20 investors who fit", "You have evenings to research and write", "You never forget a follow-up"], false],
    ["A fundraising consultant, if", ["You want someone to pitch alongside you", "Your round is ₹10 Cr or more", "A 2–5% success fee works for you"], false],
    ["FirstCheq, if", ["It's your first round", "You want to start emailing this week", "You want every email to come from you"], true],
  ];
  return (
    <div className="choose">
      {cols.map(([h, pts, us]) => (
        <div className={`choose-card${us ? " us" : ""}`} key={h}>
          <b>{h}</b>
          <ul>{pts.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      ))}
    </div>
  );
}

/** Her 9 AM reminder, on a phone lock screen. */
export function Reminder() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.35);
  return (
    <div ref={ref} className={`reminder${seen ? " go" : ""}`}>
      <div className="reminder-copy">
        <span className="kicker">Every morning</span>
        <h2 className="h-l">Follow-ups that <span className="it">never forget.</span></h2>
        <p className="lede">Day 3, then a week later. We write each nudge and email you at 9 AM when one is ready. You read it, and you press send.</p>
        <ul className="te-notes"><li>At most one reminder a day</li><li>Stops when they reply</li><li>Turn it off any time in Settings</li></ul>
      </div>
      <div className="phone" aria-label="Example: a 9 AM reminder email on a phone, made up">
        <div className="phone-notch" aria-hidden="true" />
        <div className="phone-time"><b>9:00</b><span>Thursday, 15 October</span></div>
        <div className="phone-note n1"><LogoMark /><div><span className="feed-meta"><b>FirstCheq</b> · now</span><b>2 follow-ups ready for Kiln Labs</b><span>Kestrel Ridge Angels (day 3) and Banyan Seed Fund (day 10). Read them, then send from your Gmail.</span></div></div>
        <div className="phone-note n2"><LogoMark /><div><span className="feed-meta"><b>FirstCheq</b> · yesterday</span><b>Welcome to FirstCheq</b><span>Your 3 best investors and their emails are ready.</span></div></div>
      </div>
    </div>
  );
}
