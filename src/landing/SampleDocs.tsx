import { useEffect, useRef, useState } from "react";

// Sample kit documents for the made-up startup Kiln Labs, drawn at real size and scaled to fit.
// Every number is part of the made-up example; each document says "Sample".

/** Draws children at w×h px and scales them to the width available. */
export function Scaled({ w, h, children }: { w: number; h: number; children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / w));
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return <div ref={box} className="sc-box" style={{ aspectRatio: `${w} / ${h}` }}><div className="sc-in" style={{ width: w, height: h, transform: `scale(${scale})` }}>{children}</div></div>;
}

const Brand = ({ label, n }: { label: string; n?: string }) => (
  <div className="dc-brand"><span className="sd-logo" style={{ background: "#E8673A", color: "#fff" }}>K</span><b>Kiln Labs</b><span className="dc-lbl">{label}</span><span className="sd-sample">Sample</span>{n && <span className="dc-pg">{n}</span>}</div>
);

/* ---------- Teaser: two A4 pages ---------- */
function TeaserP1() {
  return (
    <div className="dc-a4">
      <Brand label="Investor teaser · Confidential" n="1 / 2" />
      <div className="dc-hero"><h1>Cutting coal in India's brick kilns.</h1><p>A retrofit burner and a Hindi-first fuel app that cut a kiln's coal use by 18%, sold as a ₹4,500 monthly subscription that pays for itself in 9 weeks.</p></div>
      <div className="dc-kpis">{[["62", "paying kilns"], ["₹2.8L", "monthly revenue"], ["+47%", "month-on-month"], ["18%", "less coal per batch"]].map(([n, t]) => <div key={t}><b>{n}</b><span>{t}</span></div>)}</div>
      <div className="dc-2col">
        <div><h3>The problem</h3><p>India's 1,40,000 brick kilns burn coal by hand and by guesswork. Fuel is 40% of a kiln's cost, and no kiln measures coal per batch. Owners buy coal on credit and lose margin to every bad firing.</p></div>
        <div><h3>Our solution</h3><p>Our burner fits any kiln in 6 hours, with no rebuild. The app tracks coal per batch and alerts the manager when a firing runs hot. Kilns see the saving on their first fuel bill.</p></div>
      </div>
      <h3>Traction</h3>
      <div className="dc-trac">
        <svg viewBox="0 0 640 150" aria-hidden="true">{[9, 14, 22, 31, 44, 62].map((v, i) => <g key={i}><rect x={20 + i * 104} y={140 - v * 2} width="70" height={v * 2} rx="6" fill={i === 5 ? "#E8673A" : "#F9B593"} /><text x={55 + i * 104} y={132 - v * 2} fontSize="14" fontWeight="700" textAnchor="middle" fill="#B53D1E">{v}</text></g>)}</svg>
        <div className="dc-trac-l">{["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((m) => <span key={m}>{m}</span>)}</div>
      </div>
      <div className="dc-2col">
        <div><h3>Business model</h3><ul><li>₹4,500 per kiln per month</li><li>68% gross margin · ₹9,000 CAC</li><li>LTV : CAC of 12×</li></ul></div>
        <div><h3>Customers</h3><ul><li>Small and mid-size kilns in UP, Bihar, Haryana</li><li>3% monthly churn</li><li>40% come by referral</li></ul></div>
      </div>
      <blockquote className="dc-quote">"Our coal bill fell in the first month. Now the app tells my manager when a batch runs hot, before we lose it."<cite>Kiln owner, Moradabad · customer since April</cite></blockquote>
    </div>
  );
}
function TeaserP2() {
  return (
    <div className="dc-a4">
      <Brand label="Investor teaser · Confidential" n="2 / 2" />
      <h3>Market</h3>
      <div className="dc-mkt">{[["TAM", "₹30,000 Cr", "coal bought by Indian brick kilns a year"], ["SAM", "₹4,200 Cr", "coal-fired kilns in UP, Bihar, Haryana, Punjab"], ["SOM", "₹180 Cr", "1,000 kilns in 3 years"]].map(([k, v, d]) => <div key={k}><em>{k}</em><b>{v}</b><span>{d}</span></div>)}</div>
      <h3>Why we win</h3>
      <ul className="dc-ticks"><li>Measured savings, not hardware alone: the kiln sees it on its fuel bill</li><li>Data no one else has: coal per batch across 62 kilns</li><li>A Hindi-first app, built with kiln managers</li></ul>
      <h3>Team</h3>
      <div className="dc-team">{[["AR", "Arjun Rao, Founder & CEO", "6 years running his family's kiln · IIT Kanpur"], ["MS", "Meghna Sen, CTO", "Ex-embedded lead, EV charging startup"], ["VK", "Vikram Kumar, Field ops", "40+ industrial burners installed"]].map(([i, n, d]) => <div key={n}><span className="sd-av sm">{i}</span><div><b>{n}</b><span>{d}</span></div></div>)}</div>
      <div className="dc-round">
        <div><em>The round</em><b>₹3 Cr seed</b><span>to reach 400 kilns in 18 months</span></div>
        <div><em>Use of funds</em><span>Sales & installs 45% · Product 35% · Operations 20%</span></div>
        <div><em>Milestones</em><span>150 kilns by month 6 · 2 new states by month 12 · Series A ready by month 18</span></div>
      </div>
      <h3>Risks, and how we handle them</h3>
      <div className="dc-risks">{[["Seasonal demand", "Kilns fire Oct–June; we bill annually up front for the off-season"], ["Hardware cost", "Burner cost down 30% since pilot; leasing partner in talks"], ["Copycats", "Our batch data and installer network take years to build"]].map(([r, h]) => <div key={r}><b>{r}</b><span>{h}</span></div>)}</div>
      <div className="dc-contact"><b>Arjun Rao</b><span>arjun@kilnlabs.example · +91 [phone] · kilnlabs.example/deck</span></div>
    </div>
  );
}

/* ---------- Market & competition: a research report ---------- */
function MarketReport() {
  return (
    <div className="dc-rep">
      <Brand label="Market & competition report" />
      <h2>The market: ₹4,200 Cr of coal, in kilns we can reach by road.</h2>
      <div className="dc-rep-grid">
        <div>
          <h3>Bottom-up sizing</h3>
          <table className="dc-table"><thead><tr><th>Segment</th><th>Kilns</th><th>Coal / kiln / yr</th><th>Value</th></tr></thead><tbody>
            <tr><td>All India (TAM)</td><td>1,40,000</td><td>₹21 L</td><td><b>₹30,000 Cr</b></td></tr>
            <tr><td>North India, coal-fired (SAM)</td><td>20,000</td><td>₹21 L</td><td><b>₹4,200 Cr</b></td></tr>
            <tr><td>Reachable in 3 years (SOM)</td><td>1,000</td><td>₹54k our fee</td><td><b>₹180 Cr</b></td></tr>
          </tbody></table>
          <span className="dc-src">Sources: [kiln census, 2024]; [state pollution boards, 2025]; Kiln Labs pilot data. Method: kilns × coal per kiln × price.</span>
          <h3>Funding in industrial climate, India</h3>
          <svg viewBox="0 0 380 120" className="dc-fund" aria-hidden="true">{[["2023", 6], ["2024", 9], ["2025", 14], ["2026", 11]].map(([y, n], i) => <g key={y as string}><rect x={20 + i * 90} y={100 - (n as number) * 6} width="56" height={(n as number) * 6} rx="5" fill={i === 2 ? "#E8673A" : "#F9B593"} /><text x={48 + i * 90} y={92 - (n as number) * 6} fontSize="12" fontWeight="700" textAnchor="middle" fill="#B53D1E">{n}</text><text x={48 + i * 90} y="116" fontSize="11" textAnchor="middle" fill="#9A6A55">{y}</text></g>)}</svg>
          <span className="dc-src">Seed and pre-seed deals in industrial climate. In your kit this comes from FirstCheq's own deal data.</span>
        </div>
        <div>
          <h3>Competition</h3>
          <table className="dc-table comp"><thead><tr><th>Who</th><th>What they sell</th><th>Funding</th><th>Vs Kiln Labs</th></tr></thead><tbody>
            <tr><td><b>Burner makers</b></td><td>Hardware, one-time sale</td><td>Bootstrapped</td><td>No data, no savings proof</td></tr>
            <tr><td><b>Energy auditors</b></td><td>One-time audit report</td><td>Services</td><td>Advice, not a fix</td></tr>
            <tr><td><b>Zigzag retrofits</b></td><td>Kiln rebuild (₹15–25 L)</td><td>Govt subsidy</td><td>Months of downtime</td></tr>
            <tr className="us"><td><b>Kiln Labs</b></td><td>Burner + app, monthly</td><td>Raising seed</td><td>Measured, pays back in 9 weeks</td></tr>
          </tbody></table>
          <span className="dc-src">In your kit: real competitors from web research, each with a source link.</span>
          <h3>Why now</h3>
          <ul className="dc-ticks"><li>New emission rules push kilns to cut coal by [year]</li><li>Coal prices up [x]% since 2023 [source]</li><li>Kiln managers now run WhatsApp on smartphones: the app can reach them</li></ul>
        </div>
      </div>
    </div>
  );
}

export function TeaserDoc() {
  return (
    <div className="dc-pages">
      <div className="dc-page"><Scaled w={794} h={1123}><TeaserP1 /></Scaled></div>
      <div className="dc-page"><Scaled w={794} h={1123}><TeaserP2 /></Scaled></div>
    </div>
  );
}
export function MarketDoc() {
  return <div className="dc-page wide"><Scaled w={1120} h={700}><MarketReport /></Scaled></div>;
}

/* ---------- Investor Q&A: interactive list ---------- */
type QA = { cat: string; q: string; a: string; basis: string; status: "ready" | "strong" | "input"; why: string };
const QAS: QA[] = [
  { cat: "Traction", q: "What's your revenue, and how fast is it growing?", a: "₹2.8L a month from 62 kilns, up from 9 kilns in March: about 47% month-on-month.", basis: "Your traction · deck slide 4", status: "strong", why: "Is this real demand, or a few friendly customers?" },
  { cat: "Business", q: "What does it cost you to win a kiln, and how fast do you earn it back?", a: "₹9,000 to win a kiln; at 68% gross margin we earn it back in 3 months.", basis: "Your unit economics", status: "ready", why: "Can you grow without burning cash?" },
  { cat: "Business", q: "Why won't kilns stop paying after the first season?", a: "The saving shows on every fuel bill, and the app is how managers track batches. Churn is 3% a month.", basis: "Your churn · customer interviews", status: "ready", why: "Is this a one-time fix or a lasting business?" },
  { cat: "Market", q: "How big can this get?", a: "₹4,200 Cr of coal in the kilns we can reach; 1,000 kilns in 3 years is ₹54 Cr a year in fees.", basis: "Market report", status: "ready", why: "Is the prize big enough for a venture fund?" },
  { cat: "Market", q: "Who else is solving this, and why will you win?", a: "Burner makers sell hardware with no proof; auditors sell reports. We sell measured savings, monthly.", basis: "Competition table", status: "ready", why: "What stops a bigger player copying you?" },
  { cat: "Team", q: "Why are you the right team?", a: "Six years running a kiln, a CTO who shipped embedded hardware, and a field lead with 40+ installs.", basis: "Your team answers", status: "strong", why: "Can this team execute in the field?" },
  { cat: "Round", q: "What's your burn and runway today?", a: "You haven't told us your monthly burn yet. Add it, and we'll draft the answer and your runway.", basis: "Missing", status: "input", why: "How urgent is this raise?" },
  { cat: "Round", q: "What will this money get you, and what's next?", a: "₹3 Cr to reach 400 kilns in 18 months: 45% sales and installs, 35% product, 20% operations. Series A ready by month 18.", basis: "Your ask · deck slide 9", status: "ready", why: "What milestone do you hit before the next round?" },
];
const CATS = ["All", "Traction", "Business", "Market", "Team", "Round"];
export function QADoc() {
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(0);
  const list = QAS.map((q, i) => ({ ...q, i })).filter((q) => cat === "All" || q.cat === cat);
  return (
    <div className="qa">
      <div className="qa-head"><Brand label="Investor Q&A" /><div className="qa-score"><b>20</b><span>questions</span><b className="g">16</b><span>ready</span><b className="a">4</b><span>need you</span></div></div>
      <div className="qa-cats">{CATS.map((c) => <button key={c} className={cat === c ? "on" : ""} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="qa-list">
        {list.map((q) => (
          <div key={q.i} className={`qa-item${open === q.i ? " open" : ""}`}>
            <button className="qa-q" aria-expanded={open === q.i} onClick={() => setOpen(open === q.i ? null : q.i)}>
              <span className={`qa-badge ${q.status}`}>{q.status === "input" ? "Needs you" : q.status === "strong" ? "Strong" : "Ready"}</span>
              <b>{q.q}</b><span className="qa-chev" aria-hidden="true">{open === q.i ? "−" : "+"}</span>
            </button>
            <div className="qa-a"><div>
              <p className={q.status === "input" ? "warn-t" : ""}>{q.status === "input" ? "⚠ " : ""}{q.a}</p>
              <div className="qa-meta"><span><em>What they're really asking</em>{q.why}</span><span><em>Based on</em>{q.basis}</span></div>
            </div></div>
          </div>
        ))}
      </div>
      <span className="muted small">Sample: 8 of 20 questions. Your kit drafts every answer from your numbers, and flags what's missing.</span>
    </div>
  );
}

/* ---------- Data room ---------- */
const ROOM: [string, [string, "ok" | "todo" | "tpl"][]][] = [
  ["Company", [["Certificate of incorporation", "ok"], ["MoA and AoA", "ok"], ["DPIIT recognition", "ok"], ["GST registration", "ok"]]],
  ["Ownership", [["Cap table", "ok"], ["Founders' agreement", "tpl"], ["ESOP pool and policy", "tpl"]]],
  ["Financials", [["Last 12 months' P&L", "todo"], ["Bank statements, 6 months", "todo"], ["Financial model, 3 years", "tpl"]]],
  ["Business", [["Top customer contracts", "todo"], ["Pilot results and case study", "ok"], ["Product demo video", "todo"]]],
];
export function DataRoomDoc() {
  const all = ROOM.flatMap(([, xs]) => xs); const done = all.filter(([, s]) => s === "ok").length;
  return (
    <div className="dr">
      <div className="dr-head"><Brand label="Data room" /><div className="dr-ring"><svg viewBox="0 0 42 42"><circle cx="21" cy="21" r="16" fill="none" stroke="#F1E2D8" strokeWidth="5" /><circle cx="21" cy="21" r="16" fill="none" stroke="#1E8A4C" strokeWidth="5" strokeDasharray={`${(done / all.length) * 100.5} 100.5`} transform="rotate(-90 21 21)" strokeLinecap="round" /></svg><b>{done}/{all.length}</b><span>ready</span></div></div>
      <div className="dr-grid">
        {ROOM.map(([g, xs]) => (
          <div key={g} className="dr-group"><em>{g}</em>{xs.map(([t, s]) => <div key={t} className={`dr-row ${s}`}><span className="dr-ic" aria-hidden="true">{s === "ok" ? "✓" : s === "tpl" ? "⎘" : "○"}</span><span>{t}</span><span className="dr-st">{s === "ok" ? "Uploaded" : s === "tpl" ? "Template ready" : "To add"}</span></div>)}</div>
        ))}
      </div>
      <div className="dr-share"><span>🔗 kilnlabs.firstcheq.ai/room</span><span className="muted small">One link for investors · you see who opened what</span></div>
      <span className="muted small">Sample. Templates are starting points, not legal advice.</span>
    </div>
  );
}
