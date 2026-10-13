import { useEffect, useRef, useState } from "react";
import { Dial, Logo, Medal } from "../components/Art";
import { FitTable } from "./More";

// Landing sections (v6). Every founder and investor on this page is made up.

const SECTORS = ["AI", "Climate & Energy", "Deeptech", "Fintech", "B2B SaaS", "Health", "Consumer brands", "Edtech", "Agritech", "Media & adtech", "Web3", "Impact"];
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];
const ASKS = ["₹25–50L", "₹50L–1Cr", "₹1–3 Cr", "₹3–5 Cr", "₹5–10 Cr"];
export type StartAnswers = { first: string; sectors: string[]; stage: string; ask: string };

/** The hero's "Start here" card: the first questions, answered right on the page. */
export function HeroStart({ onGo, onCode }: { onGo: (a: StartAnswers) => void; onCode: () => void }) {
  const [a, setA] = useState<StartAnswers>({ first: "", sectors: [], stage: "", ask: "" });
  const toggle = (s: string) => setA((o) => ({ ...o, sectors: o.sectors.includes(s) ? o.sectors.filter((x) => x !== s) : o.sectors.length < 3 ? [...o.sectors, s] : o.sectors }));
  return (
    <form className="start-card" onSubmit={(e) => { e.preventDefault(); onGo(a); }}>
      <span className="kicker">Start here · free</span>
      <label className="sc-q">Your website, or your startup's name<input className="field" value={a.first} onChange={(e) => { const first = e.target.value; setA((o) => ({ ...o, first })); }} placeholder="e.g. kilnlabs.in" maxLength={200} autoCapitalize="none" /></label>
      <div className="sc-q"><div className="sc-label">Your space <span className="muted">(up to 3)</span></div>
      <div className="pick small-pick">{SECTORS.map((s) => <button type="button" key={s} aria-pressed={a.sectors.includes(s)} onClick={() => toggle(s)}>{s}</button>)}</div></div>
      <div className="sc-row sc-q">
        <label>Stage<select className="field" value={a.stage} onChange={(e) => { const stage = e.target.value; setA((o) => ({ ...o, stage })); }}><option value="">Choose</option>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Raising<select className="field" value={a.ask} onChange={(e) => { const ask = e.target.value; setA((o) => ({ ...o, ask })); }}><option value="">Choose</option>{ASKS.map((s) => <option key={s}>{s}</option>)}</select></label>
      </div>
      <div className="sc-actions">
        <button className="btn primary" type="submit" data-track="click_go">Find my 3 best investors, free →</button>
        <button className="btn ghost" type="button" data-track="click_code" onClick={onCode}>I have a code</button>
      </div>
    </form>
  );
}

/** Before vs after: nine pains cross out as three steps appear. */
const PAINS = ["Who do I even pitch?", "Who invests at my stage?", "Writing every email from scratch", "ChatGPT drafts that sound like everyone", "Forgetting to follow up", "Ghosted", "A spreadsheet that's always out of date", "Months pass", "Still no meeting"];
const STEPS: [string, string][] = [["Tell us about your startup", "2 MIN"], ["Find the investors who fit you", "INSTANT"], ["Send personalised emails from Gmail", "2 MIN"]];

export function BeforeAfter() {
  const ref = useRef<HTMLDivElement>(null);
  const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setGo(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setGo(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`before-after${go ? " go" : ""}`}>
      <div className="ba-side ba-before">
        <span className="kicker">Your first raise today · 9 steps</span>
        <div className="pain-pile">{PAINS.map((p, i) => <span key={p} style={{ animationDelay: `${i * 0.45}s` }}>{p}</span>)}</div>
      </div>
      <div className="ba-arrow" aria-hidden="true">→</div>
      <div className="ba-side ba-after">
        <span className="kicker">With FirstCheq · 3 steps</span>
        {STEPS.map(([t, m], i) => (
          <div className="ba-step" key={t} style={{ transitionDelay: `${1.2 + i * 0.25}s` }}><span className="num-badge">{i + 1}</span><b>{t}</b><span className="mono-time">{m}</span></div>
        ))}
      </div>
    </div>
  );
}

/** "See it work": the real app screens, light mode, with made-up investors. */
const SCENES = ["Tell us about you", "Your best-fit investors", "Personalised email, ready to send", "Your pipeline"];
const PICKS: [string, number, string][] = [
  ["Verdant Arc Capital", 94, "Backed GridLeaf at seed: software for old industry."],
  ["Northlight Seed", 89, "Smeltwise is in their portfolio: fuel savings for heavy industry."],
  ["Kestrel Ridge Angels", 86, "Wrote one of FurnaceIQ's first cheques in 2025."],
];

export function ProductDemo() {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [scene, setScene] = useState(reduced ? 2 : 0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => setScene((s) => (s + 1) % SCENES.length), 4500);
    return () => clearInterval(t);
  }, [reduced, paused]);
  return (
    <div className="demo theme-light" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-label="FirstCheq, shown with a made-up founder and investors">
      <div className="demo-bar"><span /><span /><span /><b>firstcheq.ai/dashboard</b></div>
      <div className="demo-steps">{SCENES.map((t, i) => <button key={t} className={i === scene ? "on" : ""} onClick={() => { setScene(i); setPaused(true); }}>{i + 1}. {t}</button>)}</div>
      <div className="demo-stage">
        {scene === 0 && (
          <div className="demo-scene">
            <span className="count">STEP 1 OF 6</span>
            <h3 className="demo-h">Your website, <span className="it">or your startup's name.</span></h3>
            <div className="field demo-field">kilnlabs.in</div>
            <div className="demo-found">✓ We read your website: <b>Kiln Labs</b> helps brick kilns cut coal use by 18% with a retrofit burner and a fuel-tracking app.</div>
            <span className="btn primary sm" style={{ alignSelf: "flex-start" }}>Looks right →</span>
          </div>
        )}
        {scene === 1 && (
          <div className="demo-scene">
            <span className="kicker">86 investors fit Kiln Labs · your top picks</span>
            {PICKS.map(([n, s, why], i) => (
              <div className="row-card top demo-row" key={n} style={{ animationDelay: `${i * 0.25}s` }}>
                <div className="row-main"><Dial score={s} size={40} /><div className="pick-head"><Medal rank={i} /><Logo name={n} size={34} /><div className="who"><b>{n}</b><span>₹50L–2 Cr · leads rounds</span></div></div></div>
                <p className="row-reason">{why}</p>
              </div>
            ))}
          </div>
        )}
        {scene === 2 && (
          <div className="demo-scene">
            <div className="email demo-email"><div className="to">To meera@verdantarc.example</div><div className="subj">After GridLeaf, kilns are next</div>Hi Meera,{"\n\n"}You backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind.{"\n\n"}I'm Arjun; I ran my family's kiln for six years. Our retrofit burner cuts coal use by 18%, and 62 kilns pay us monthly.{"\n\n"}We're raising ₹3 Cr at seed. Could I send the deck?</div>
            <div className="email-actions"><span className="btn primary sm" style={{ flex: 1 }}>Open in Gmail</span><span className="btn ghost sm">Copy</span><span className="btn sm sent">✓ Sent</span></div>
          </div>
        )}
        {scene === 3 && (
          <div className="demo-scene">
            <div className="stats pipe-stats"><div className="hot"><b>1</b><span>your move</span></div><div><b>4</b><span>waiting on them</span></div><div><b>1</b><span>replied</span></div></div>
            <div className="row-card"><div className="row-main"><div className="pick-head"><Logo name="Verdant Arc Capital" size={34} /><div className="who"><b>Verdant Arc Capital</b><span>Sent 3 days ago</span></div></div><span className="due today">Follow-up 1 due</span></div>
              <div className="email demo-email short"><div className="subj">Re: After GridLeaf, kilns are next</div>Hi Meera, a quick note: 70 kilns now pay us monthly. Could I send the deck?</div></div>
            <span className="muted small">Mark a reply and the follow-ups stop.</span>
          </div>
        )}
      </div>
      <p className="muted small demo-note">The real app, with a made-up founder and investors.</p>
    </div>
  );
}

/** "What it writes": one founder, three investors, three different emails, each with its Fit Score. */
const EMAILS = [
  { inv: "Verdant Arc Capital", to: "meera@verdantarc.example", score: 94, parts: [30, 20, 20, 15], hook: "Opens on GridLeaf, their seed deal",
    subj: "After GridLeaf, kilns are next",
    body: "Hi Meera,\n\nYou backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind: India has over a lakh of them, still burning coal by hand.\n\nI'm Arjun; I ran my family's kiln for six years before building Kiln Labs. Our retrofit burner and fuel-tracking app cut coal use by 18%.\n\n62 kilns pay us monthly, up from 9 in March.\n\nWe're raising ₹3 Cr at seed. Could I send the deck?\n\nArjun Rao\nFounder, Kiln Labs", note: "Hi Meera, you backed GridLeaf when few funds touched software for old industry. Kiln Labs cuts coal use in brick kilns by 18%, and 62 kilns now pay us. We're raising ₹3 Cr at seed; happy to share the deck. Arjun" },
  { inv: "Northlight Seed", to: "kabir@northlight.example", score: 89, parts: [30, 20, 15, 15], hook: "Opens on Smeltwise, from their portfolio",
    subj: "Smeltwise, but for brick kilns",
    body: "Hi Kabir,\n\nSmeltwise showed that heavy industry will pay for software that cuts its fuel bill. Brick kilns, one of India's biggest coal users, have no such tool yet.\n\nKiln Labs fits a retrofit burner and an app that tracks fuel per batch; kilns use 18% less coal from the first month. I learned where the coal goes running my family's kiln for six years.\n\nWe've gone from 9 paying kilns in March to 62.\n\nWe're raising ₹3 Cr at seed. Would 20 minutes next week work?\n\nArjun Rao\nFounder, Kiln Labs", note: "Hi Kabir, Smeltwise proved heavy industry pays to cut its fuel bill. Kiln Labs does that for India's brick kilns: 18% less coal, 62 paying kilns, up from 9 in March. Could I send our seed deck? Arjun" },
  { inv: "Kestrel Ridge Angels", to: "anjali@kestrelridge.example", score: 86, parts: [24, 20, 20, 15], hook: "Opens on FurnaceIQ, their 2025 cheque",
    subj: "Your FurnaceIQ cheque, and kilns",
    body: "Hi Anjali,\n\nYou wrote one of FurnaceIQ's first cheques in 2025. Kiln Labs goes after the same coal bill, in a market with almost no software: India's brick kilns.\n\nSix years running my family's kiln taught me where the coal goes. Our burner and app cut it by 18%.\n\n62 kilns pay us monthly, up from 9 in March, and we're raising ₹3 Cr at seed.\n\nCould I send you the deck?\n\nArjun Rao\nFounder, Kiln Labs", note: "Hi Anjali, after your FurnaceIQ cheque, I thought you'd like this: Kiln Labs cuts the coal bill of brick kilns by 18%. 62 kilns pay us monthly. Raising ₹3 Cr at seed; may I share the deck? Arjun" },
];
const PART_LABELS = ["Invests in your space", "Invests at your stage", "Cheque fits your round", "Invested recently"];
const PART_MAX = [30, 20, 20, 15];

export function ThreeEmails() {
  const [i, setI] = useState(0);
  const [via, setVia] = useState<"email" | "linkedin">("email");
  const e = EMAILS[i];
  return (
    <div className="three-emails">
      <div className="te-tabs" role="tablist">{EMAILS.map((x, k) => <button key={x.inv} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)}><Logo name={x.inv} size={26} /><span>{x.inv}</span></button>)}</div>
      <div className="te-body">
        <div className="te-mail">
          <div className="via-tabs" role="tablist" aria-label="Email or LinkedIn">
            <button role="tab" aria-selected={via === "email"} onClick={() => setVia("email")}>✉ Email</button>
            <button role="tab" aria-selected={via === "linkedin"} onClick={() => setVia("linkedin")}><b className="li-mark" aria-hidden="true">in</b> LinkedIn note</button>
          </div>
          {via === "email"
            ? <div className="email"><div className="to">To {e.to}</div><div className="subj">{e.subj}</div>{e.body}</div>
            : <div className="email li-note"><div className="to">LinkedIn note to {e.to.split("@")[0].replace(/^./, (c) => c.toUpperCase())} <span className="muted small">{e.note.length}/300</span></div>{e.note}</div>}
        </div>
        <aside className="te-why">
          <div className="te-score"><Dial score={e.score} size={56} /><div className="te-label"><b>FirstCheq Fit Score</b><span>{e.hook}</span></div></div>
          {PART_LABELS.map((l, k) => (
            <div className="bd-row" key={l}><span>{l}</span><span className="bd-bar" aria-hidden="true"><i className={e.parts[k] / PART_MAX[k] >= 0.75 ? "hi" : "mid"} style={{ width: `${(e.parts[k] / PART_MAX[k]) * 100}%` }} /></span><b>{e.parts[k]}/{PART_MAX[k]}</b></div>
          ))}
          <ul className="te-notes"><li>Opens on their deal</li><li>Your story, your numbers</li><li>An email and a LinkedIn note, same research</li><li>Follow-ups written, stopped when they reply</li></ul>
        </aside>
      </div>
      <p className="muted small center">Same founder, three investors, three different emails and LinkedIn notes. Made-up example.</p>
    </div>
  );
}

/** The FirstCheq Fit Score, explained. */
export function FitScore() {
  const parts: [string, string, number, number][] = [
    ["Invests in your space", "Counted from their real deals, not just what their website says", 30, 30],
    ["Invests at your stage", "Pre-seed funds for pre-seed founders", 20, 20],
    ["Cheque fits your round", "How much of your raise one cheque can cover", 15, 20],
    ["Invested recently", "Still writing cheques this year", 15, 15],
  ];
  return (
    <div className="fit-block">
      <div className="fit-copy">
        {parts.map(([t, d]) => <div className="fit-item" key={t}><b>{t}</b><span>{d}</span></div>)}
        <p className="muted small">Every investor comes with the reason and the source.</p>
      </div>
      <FitTable />
    </div>
  );
}

/** Do it yourself, hire, agency, or FirstCheq. */
const ROWS: [string, string, string, string, string][] = [
  ["Time to your first email", "2–4 weeks", "4–8 weeks to hire and ramp up", "2–4 weeks to onboard", "2 minutes"],
  ["Targeted reach", "Anyone you can find, by guesswork", "Their own network", "Their own network", "Only investors who fit your space, stage and round, ranked by Fit Score"],
  ["Personalised emails", "Hours each, or a generic draft", "Varies", "Templates at scale", "Researched and written to each investor, opening on a real deal"],
  ["Ways in", "Whatever you have time for", "Usually email", "Usually email", "An email and a LinkedIn note for each, same research"],
  ["Follow-ups", "Easy to forget", "Manual", "Usually", "Written for you, on time"],
  ["Your effort a week", "10–15 hours", "Managing a hire", "Calls and reviews", "About 1 hour"],
  ["Cost", "Your evenings", "₹70k–1.5L a month", "₹50k–2L a month + 2–5% success fee", "Free to start"],
  ["Risk", "Wrong investors, burned first impressions", "Hiring the wrong person", "Spray-and-pray hurts your name", "You read and send every email"],
  ["Control", "Full", "Partly delegated", "Delegated", "Full: from your own Gmail"],
];

export function Compare() {
  return (
    <>
      <div className="scrollx"><table className="tbl compare">
        <thead><tr><th className="lbl"></th><th className="us us-top">FirstCheq</th><th>On your own</th><th>A full-time hire</th><th>An advisor or agency</th></tr></thead>
        <tbody>{ROWS.map(([k, own, hire, agency, us], i) => <tr key={k}><td className="lbl"><b>{k}</b></td><td className={`us${i === ROWS.length - 1 ? " us-end" : ""}`}>{us}</td><td>{own}</td><td>{hire}</td><td>{agency}</td></tr>)}</tbody>
      </table></div>
      <p className="muted small center" style={{ marginTop: 10 }}>Typical, indicative ranges, not quotes.</p>
    </>
  );
}

/** What's more, free with your account (coming soon). */
export function WhatsMore() {
  const items: [string, string, string][] = [
    ["⚔", "Track your top competitors", "Who else is raising in your space, and who backed them."],
    ["▲", "Funding trends in your sector", "Who's writing cheques, and at what size."],
    ["▤", "Pitch deck review", "Slide-by-slide notes on what investors will question."],
    ["?", "Questions investors will ask", "Are you ready? Answers drafted from your profile."],
    ["❝", "Your raise FAQ", "Round, terms, use of funds: written once, reused everywhere."],
    ["★", "Mentors, advisors and warm intros", "From founders who've already raised their first cheque."],
  ];
  return (
    <div className="soon-grid six">
      {items.map(([ic, t, d], i) => i === items.length - 1 ? (
        <div className="soon-card vip" key={t}><span className="soon-icon" aria-hidden="true">{ic}</span><span className="soon-text"><b>{t}</b><span>{d}</span><span className="vip-btn">VIP access · SOON</span></span></div>
      ) : (
        <div className="soon-card" key={t}><span className="soon-icon" aria-hidden="true">{ic}</span><span className="soon-text"><b>{t} <span className="soon-tag">SOON</span></b><span>{d}</span></span></div>
      ))}
    </div>
  );
}
