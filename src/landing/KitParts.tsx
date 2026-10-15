import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dial } from "../components/Art";
import { SampleSlide } from "./SampleDeck";
import { DECK_TITLES } from "./deckTitles";

// Pieces of the Raise Kit landing draft (/kit). Example founder, brand and investors are made up;
// the raise-plan counts are real (counts only, from our research).

const reduced = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useSeen<T extends HTMLElement>(threshold = 0.3) {
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

/** Counts up to n once it's visible. */
function CountUp({ n, ms = 900 }: { n: number; ms?: number }) {
  const [v, setV] = useState(() => (reduced() ? n : 0));
  useEffect(() => {
    if (reduced()) return;
    let raf = 0; const t0 = performance.now(); const from = 0;
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / ms); setV(Math.round(from + (n - from) * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, ms]);
  return <>{v}</>;
}

/* ---------- 1. The live build in the hero ---------- */
const BUILD = [
  { k: "Reading kilnlabs.in", v: "Kiln Labs · climate · brick kilns · Uttar Pradesh" },
  { k: "Picking up your brand", v: "Logo, #E8673A, Inter" },
  { k: "Building your deck", v: "10 slides, in your colours" },
  { k: "Matching investors", v: "168 fit your sector, stage and round" },
  { k: "Writing your pitches", v: "Top 10, each opening on a real deal" },
];
export function HeroBuild() {
  const [step, setStep] = useState(() => (reduced() ? BUILD.length : 0));
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setStep((s) => (s >= BUILD.length + 2 ? 0 : s + 1)), 1100);
    return () => clearInterval(t);
  }, []);
  const done = Math.min(step, BUILD.length);
  return (
    <div className="kb" aria-label="Example: FirstCheq building a raise kit for a made-up startup">
      <div className="kb-bar"><i /><i /><i /><span>firstcheq.ai · building your raise kit</span></div>
      <ol className="kb-steps">
        {BUILD.map((b, i) => (
          <li key={b.k} className={i < done ? "done" : i === done ? "now" : ""}>
            <span className="kb-tick">{i < done ? "✓" : i === done ? "•" : ""}</span>
            <span><b>{b.k}</b>{i < done && <em>{b.v}</em>}</span>
          </li>
        ))}
      </ol>
      <div className={`kb-out${done >= BUILD.length ? " show" : ""}`}>
        <div className="kb-cover"><i className="kd-dot" /><b>Kiln Labs</b><span>Cutting coal in India's brick kilns</span><em>Seed · ₹3 Cr</em></div>
        <div className="kb-stats"><div><b>168</b><span>investors fit</span></div><div><b>10</b><span>pitches ready</span></div><div><b>4 min</b><span>start to finish</span></div></div>
      </div>
    </div>
  );
}

/* ---------- 2. Personalised raise plan (real counts) ---------- */
const SECTORS = ["AI", "Climate & Energy", "Fintech", "B2B SaaS", "Health", "Consumer brands", "Edtech", "Agritech", "Deeptech", "Media & adtech", "Web3", "Impact"];
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A"];
const ASKS = ["₹25–50L", "₹50L–1Cr", "₹1–3 Cr", "₹3–5 Cr", "₹5–10 Cr"];
const YEAR = new Date().getFullYear();
export function PlanPicker() {
  const [sector, setSector] = useState("Climate & Energy");
  const [stage, setStage] = useState("Seed");
  const [ask, setAsk] = useState("₹1–3 Cr");
  const p = useQuery(api.founders.planPreview, { sectors: [sector], stage, ask, year: YEAR });
  const rows: [string, number | undefined, string, string][] = [
    ["Angels", p?.angels, "Weeks 1–2", "Fast, small cheques. Your first yeses build momentum."],
    ["Angel networks", p?.networks, "Weeks 1–3", "One pitch, many angels at once."],
    ["Accelerators, incubators & grants", p?.programmes, "Weeks 2–4", "Money plus a stamp of approval. Watch the deadlines."],
    ["Micro-VCs and seed funds", p?.funds, "Weeks 3–8", "Bigger cheques. Go in with your early commitments."],
  ];
  const max = Math.max(1, ...rows.map((r) => r[1] ?? 0));
  return (
    <div className="kp">
      <div className="kp-pick">
        <div className="kp-chips" role="group" aria-label="Your sector">{SECTORS.map((s) => <button key={s} aria-pressed={sector === s} className={sector === s ? "on" : ""} onClick={() => setSector(s)}>{s}</button>)}</div>
        <div className="kp-selects">
          <label>Stage<select className="field" value={stage} onChange={(e) => setStage(e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Raising<select className="field" value={ask} onChange={(e) => setAsk(e.target.value)}>{ASKS.map((s) => <option key={s}>{s}</option>)}</select></label>
        </div>
      </div>
      <div className="kp-result">
        <p className="kp-head">Raising <b>{ask}</b> at <b>{stage.toLowerCase()}</b> in <b>{sector}</b>?</p>
        <p className="kp-big">{p ? <><CountUp key={`${sector}${stage}${ask}`} n={p.total} /> investors</> : "…"} <span>in our research fit you.</span></p>
        {p && <p className="muted small">{p.activeInSector} backed a {sector.toLowerCase()} startup this year or last · {p.leads} can lead your round</p>}
        <div className="kp-rows">
          {rows.map(([t, n, when, why]) => (
            <div className="kp-row" key={t}>
              <div className="kp-row-top"><b>{t}</b><span className="kp-when">{when}</span></div>
              <div className="kp-bar"><i style={{ width: `${((n ?? 0) / max) * 100}%` }} /><span>{n ?? "·"}</span></div>
              <span className="muted small">{why}</span>
            </div>
          ))}
        </div>
        <p className="muted small">Real counts from the 574 investors we research. Your kit names every one, ranked, with the reason.</p>
      </div>
    </div>
  );
}

/* ---------- 3. The investor kit: a slide viewer + the rest of the kit ---------- */
const KIT_TABS = ["Deck", "Teaser", "Investor Q&A", "Market & competition", "Data room"] as const;
export function KitShowcase() {
  const [ref, seen] = useSeen<HTMLDivElement>(0.25);
  const [tab, setTab] = useState<(typeof KIT_TABS)[number]>("Deck");
  const [cur, setCur] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!seen || !auto || tab !== "Deck" || reduced()) return;
    const t = setInterval(() => setCur((c) => (c + 1) % DECK_TITLES.length), 3200);
    return () => clearInterval(t);
  }, [seen, auto, tab]);
  const pick = (i: number) => { setAuto(false); setCur(i); };
  return (
    <div ref={ref} className="kk2">
      <div className="kk2-tabs" role="tablist">{KIT_TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === "Deck" && (
        <div className="kk2-viewer">
          <div className="kk2-label"><b>Sample deck</b><span>A made-up startup, built the way yours will be · {cur + 1} / {DECK_TITLES.length} · {DECK_TITLES[cur]}</span></div>
          <div className="kk2-main" key={cur}><SampleSlide i={cur} /></div>
          <div className="kk2-thumbs">{DECK_TITLES.map((t, i) => <button key={t} className={`kk2-thumb2${i === cur ? " on" : ""}`} onClick={() => pick(i)} aria-label={`Slide ${i + 1}: ${t}`}><SampleSlide i={i} /><span>{t}</span></button>)}</div>
          <div className="kk2-meta"><span>✓ In your logo, colours and fonts</span><span>✓ PowerPoint, Google Slides, PDF</span><span>✓ Your numbers; sources on every claim</span></div>
        </div>
      )}
      {tab === "Teaser" && (
        <div className="kk2-doc">
          <div className="kk2-doc-h"><i className="kd-dot" /><b>Kiln Labs</b><span>Investor teaser · 2 pages</span></div>
          <div className="kk2-doc-grid">
            <div><em>What we do</em><p>A retrofit burner and fuel app that cuts coal use in brick kilns by 18%.</p></div>
            <div><em>Traction</em><p>62 paying kilns, up from 9 in March. ₹4,500 per kiln per month.</p></div>
            <div><em>Why now</em><p className="sl-gap">[From your answers]</p></div>
            <div><em>The round</em><p>₹3 Cr seed, to reach 400 kilns in 18 months.</p></div>
          </div>
        </div>
      )}
      {tab === "Investor Q&A" && (
        <div className="kk2-doc">
          <div className="kk2-doc-h"><b>The 20 questions investors will ask you</b><span>Answers drafted from your numbers · gaps flagged</span></div>
          {[["What's your CAC and payback?", "₹4,500/month per kiln; the kiln saves its cost back in 9 weeks.", ""], ["Why won't kilns switch back?", "The saving shows on their first fuel bill, and the burner stays fitted.", ""], ["What's your burn and runway?", "You haven't told us yet. Add it before you send.", "gap"], ["Who else is trying this?", "Drafted from your competitors, with sources.", ""]].map(([q, a, g]) => <details key={q}><summary>{q}</summary><p className={g ? "sl-gap" : ""}>{g ? "⚠ " : ""}{a}</p></details>)}
          <span className="muted small">+16 more questions</span>
        </div>
      )}
      {tab === "Market & competition" && (
        <div className="kk2-doc">
          <div className="kk2-doc-h"><b>Market & competition</b><span>Researched, with a source for every number</span></div>
          <div className="kk2-mkt">{[["TAM", "All brick kilns in India", "[source]"], ["SAM", "Coal-fired kilns in North India", "[source]"], ["SOM", "Reachable in 3 years", "[your plan]"]].map(([k, d, src]) => <div key={k}><b>{k}</b><span>{d}</span><em>{src}</em></div>)}</div>
          <div className="kk2-comp"><span>Funding in your sector, from our deal data</span><b>Who backed startups like yours in the last 2 years, at what stage and cheque size</b></div>
        </div>
      )}
      {tab === "Data room" && (
        <div className="kk2-doc">
          <div className="kk2-doc-h"><b>Data room</b><span>A checklist, templates, and one link to share</span></div>
          <ul className="kk2-check">{[["Certificate of incorporation", 1], ["DPIIT recognition", 1], ["Cap table", 1], ["Founders' agreement", 0], ["ESOP pool", 0], ["12 months of financials", 0], ["Customer contracts", 0], ["GST registration", 1]].map(([x, ok]) => <li key={x as string} className={ok ? "ok" : ""}>{x}</li>)}</ul>
          <div className="kk2-progress"><i style={{ width: "50%" }} /><span>4 of 8 ready</span></div>
          <span className="muted small">Templates where you need them. Information, not legal advice.</span>
        </div>
      )}
    </div>
  );
}

/* ---------- 4. Rich investor cards, swipe to send ---------- */
const CARDS = [
  { fund: "Verdant Arc Capital", who: "Meera Iyer, Partner", score: 95, deal: "GridLeaf · seed · 2025", cheque: "₹50L–2 Cr", type: "Seed fund · leads rounds",
    why: ["Backed GridLeaf at seed in 2025: software for old industry, like yours", "3 of their last 4 deals are climate", "Their cheque covers half your round"], src: "verdantarc.example/portfolio · checked Oct 2026",
    subj: "After GridLeaf, kilns are next", body: "Hi Meera,\n\nYou backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind.\n\nI'm Arjun; I ran my family's kiln for six years before building Kiln Labs. Our burner and fuel app cut coal use by 18%, and 62 kilns pay us monthly, up from 9 in March.\n\nWe're raising ₹3 Cr at seed. Could I send the deck?",
    li: "Hi Meera, you backed GridLeaf when few funds touched software for old industry. Kiln Labs cuts coal use in brick kilns by 18%, and 62 kilns pay us. Raising ₹3 Cr at seed; happy to share the deck. Arjun",
    intro: "Arjun runs Kiln Labs: a burner + app that cuts coal in brick kilns by 18%; 62 paying kilns. Raising ₹3 Cr seed. Given GridLeaf, Meera at Verdant Arc may want to see it." },
  { fund: "Northlight Seed", who: "Kabir Shah, Principal", score: 90, deal: "Smeltwise · portfolio", cheque: "₹25L–1 Cr", type: "Seed fund",
    why: ["Smeltwise, the closest company to yours, is in their portfolio", "Writes first cheques at pre-seed and seed", "One cheque covers a third of your round"], src: "northlight.example/companies · checked Oct 2026",
    subj: "Smeltwise, but for brick kilns", body: "Hi Kabir,\n\nSmeltwise showed that heavy industry will pay for software that cuts its fuel bill. Brick kilns, one of India's biggest coal users, have no such tool yet.\n\nKiln Labs fits a retrofit burner and an app that tracks fuel per batch; kilns use 18% less coal from the first month. We've gone from 9 paying kilns in March to 62.\n\nWe're raising ₹3 Cr at seed. Would 20 minutes next week work?",
    li: "Hi Kabir, Smeltwise proved heavy industry pays to cut its fuel bill. Kiln Labs does that for brick kilns: 18% less coal, 62 paying kilns. Could I send our seed deck? Arjun",
    intro: "Kiln Labs: Smeltwise-style fuel savings for brick kilns. 18% less coal, 62 paying kilns, raising ₹3 Cr seed. Kabir at Northlight backed Smeltwise." },
  { fund: "Kestrel Ridge Angels", who: "Anjali Rao, Angel", score: 84, deal: "FurnaceIQ · 2025", cheque: "₹10–75L", type: "Angel",
    why: ["Wrote one of FurnaceIQ's first cheques in 2025", "Backs industrial climate at seed", "Fast decisions: angels often reply within a week"], src: "Deal news · FurnaceIQ, 2025",
    subj: "Your FurnaceIQ cheque, and kilns", body: "Hi Anjali,\n\nYou wrote one of FurnaceIQ's first cheques in 2025. Kiln Labs goes after the same coal bill, in a market with almost no software: India's brick kilns.\n\nSix years running my family's kiln taught me where the coal goes. Our burner and app cut it by 18%, and 62 kilns pay us monthly.\n\nWe're raising ₹3 Cr at seed. Could I send you the deck?",
    li: "Hi Anjali, after your FurnaceIQ cheque, I thought you'd like this: Kiln Labs cuts the coal bill of brick kilns by 18%. 62 kilns pay us monthly. Raising ₹3 Cr at seed; may I share the deck? Arjun",
    intro: "Anjali backed FurnaceIQ early. Arjun's Kiln Labs cuts coal in brick kilns by 18% (62 paying kilns) and is raising ₹3 Cr seed. Worth a 20-minute call?" },
];
export function InvestorCards() {
  const [i, setI] = useState(0);
  const [out, setOut] = useState<"left" | "right" | null>(null);
  const [sent, setSent] = useState(0);
  const [why, setWhy] = useState(false);
  const [tab, setTab] = useState<"Email" | "LinkedIn" | "Intro">("Email");
  const c = CARDS[i % CARDS.length], next = CARDS[(i + 1) % CARDS.length];
  const swipe = (dir: "left" | "right") => {
    if (out) return;
    setOut(dir);
    setTimeout(() => { setOut(null); setWhy(false); setTab("Email"); setI((x) => x + 1); if (dir === "right") setSent((s) => s + 1); }, 450);
  };
  return (
    <div className="kc">
      <div className="kc-progress"><span>Your outreach · <b>{sent}</b> sent · {Math.max(0, 10 - sent)} to go</span><span className="kc-bar"><i style={{ width: `${Math.min(100, sent * 10)}%` }} /></span></div>
      <div className="kc-stack">
        <div className="kc-card under" aria-hidden="true"><b>{next.fund}</b></div>
        <article className={`kc-card${out ? ` out-${out}` : ""}`} key={i}>
          <header className="kc-head">
            <Dial score={c.score} size={52} />
            <div><b>{c.fund}</b><span>{c.who}</span><span className="muted small">{c.type}</span></div>
          </header>
          <div className="kc-facts"><span><em>Recent deal</em>{c.deal}</span><span><em>Cheque</em>{c.cheque}</span></div>
          <button className="kc-why-btn" aria-expanded={why} onClick={() => setWhy((w) => !w)}><span>Why this investor</span><span aria-hidden="true">{why ? "▴" : "▾"}</span></button>
          <div className={`kc-why${why ? " open" : ""}`}><div><ul>{c.why.map((x) => <li key={x}>{x}</li>)}</ul><span className="muted small">Source: {c.src}</span></div></div>
          <div className="kc-tabs" role="tablist">{(["Email", "LinkedIn", "Intro"] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "Intro" ? "Intro blurb" : t === "LinkedIn" ? "LinkedIn note" : "Email"}</button>)}</div>
          <div className="kc-msg">
            {tab === "Email" && <><b>{c.subj}</b><p>{c.body}</p></>}
            {tab === "LinkedIn" && <p>{c.li}</p>}
            {tab === "Intro" && <><span className="muted small">For anyone who can introduce you, to forward:</span><p>{c.intro}</p></>}
          </div>
          <div className="kc-actions"><button className="btn ghost" onClick={() => swipe("left")}>✕ Skip</button><button className="btn ghost sm" disabled>Edit</button><button className="btn primary" onClick={() => swipe("right")}>Send ✓</button></div>
        </article>
      </div>
      <p className="muted small center">Try it: tap "Why this investor", switch tabs, then Send or Skip. Made-up founder and investors.</p>
    </div>
  );
}

/* ---------- 5. Proof strip (real counts) ---------- */
export function ProofStrip() {
  const s = useQuery(api.founders.publicStats, {});
  const items: [number | undefined, string][] = [[s?.total, "investors researched"], [s?.angel, "angels"], [s ? s.incubator + s.accelerator + s.grant : undefined, "accelerators, incubators & grants"], [s?.vc, "funds"]];
  return (
    <div className="kproof">
      {items.map(([n, l]) => <div key={l}><b>{n === undefined ? "·" : <CountUp n={n} />}</b><span>{l}</span></div>)}
      <div><b>Weekly</b><span>contact links checked</span></div>
    </div>
  );
}
