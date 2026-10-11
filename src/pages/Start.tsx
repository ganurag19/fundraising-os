import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { savedInviteCode, visitorToken } from "../lib/token";

const SECTORS: [string, boolean][] = [["AI", true], ["Climate & Energy", true], ["Deeptech", true], ["Fintech", false], ["B2B software", false], ["Health", false], ["Consumer brands", false]];
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];
const ASKS = ["₹25–50L", "₹50L–1Cr", "₹1–3 Cr", "₹3–5 Cr", "₹5–10 Cr"];
const LEFT = ["~2 min left", "~2 min left", "~1 min left", "Almost there", "1 more step"];

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function Start() {
  const token = useMemo(() => visitorToken(), []);
  const code = savedInviteCode();
  const me = useQuery(api.founders.me, { token });
  const start = useMutation(api.founders.start);
  const saveProfile = useMutation(api.founders.saveProfile);
  const write = useAction(api.write.writeFirstEmails);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [f, setF] = useState({ company: "", name: "", sectors: [] as string[], stage: "", ask: "" });
  const [p, setP] = useState({ forWho: "", outcome: "", how: "", reduce: "", founderLine: "", revenue: "", customers: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  // Coming back: her emails are already written.
  useEffect(() => { if (me?.emailsStatus === "ready" && step < 5) navigate("/emails"); }, [me, step, navigate]);
  useEffect(() => { if (step !== 5) return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [step]);

  if (me === undefined) return <Shell><div className="spinner" /></Shell>;
  if (!me && !code) {
    return (
      <Shell><div className="step center">
        <span className="tag gold">Invite-only beta</span>
        <h1 style={{ marginTop: 16 }}>You'll need an invite <span className="it">to start.</span></h1>
        <p className="help">Go back to the home page to enter your code or request an invite.</p>
        <Link className="btn primary" to="/">Back to the home page</Link>
      </div></Shell>
    );
  }

  const next = () => { setError(""); setStep((s) => (s + 1) as Step); };
  const back = () => { setError(""); setStep((s) => (s - 1) as Step); };
  const oneLiner = `${f.company || me?.company || "Your startup"} helps ${p.forWho || "[who]"} ${p.outcome || "[achieve what]"} through ${p.how || "[how]"}${p.reduce ? `, reducing ${p.reduce}` : ""}.`;

  async function submitRound() {
    setBusy(true); setError("");
    const r = await start({ token, inviteCode: code ?? "", ...f }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection and try again." }));
    setBusy(false);
    if (r.ok) next(); else setError(r.error);
  }
  async function submitProfile() {
    setBusy(true); setError("");
    const r = await saveProfile({ token, ...p }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection and try again." }));
    if (!r.ok) { setBusy(false); setError(r.error); return; }
    setStep(5); setSeconds(0);
    const w = await write({ token }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setBusy(false);
    if (w.ok) setStep(6); else { setStep(4); setError(w.error); }
  }

  const progress = <div className="progress">{[0, 1, 2, 3, 4].map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>;
  const count = (n: number) => <div className="count">STEP {n} OF 5 <span className="tag gold" style={{ float: "right" }}>{LEFT[n - 1]}</span></div>;
  const actions = (canGo: boolean, onGo: () => void, label = "Continue →", showBack = true) => (
    <>
      {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div className="step-actions">
        {showBack && <button className="back" onClick={back} aria-label="Back">←</button>}
        <button className="btn primary" disabled={!canGo || busy} onClick={onGo}>{busy ? "Saving…" : label}</button>
      </div>
    </>
  );
  const onEnter = (ok: boolean) => (e: React.KeyboardEvent) => { if (e.key === "Enter" && ok) next(); };

  return (
    <Shell>
      {step === 0 && <div className="step rise">{progress}{count(1)}<h1>What's your startup called?</h1><p className="help">Or your idea's working name. You can change it later.</p>
        <input className="field" autoFocus placeholder="e.g. Ledgerly" maxLength={80} value={f.company} onChange={(e) => setF((o) => ({ ...o, company: e.target.value }))} onKeyDown={onEnter(!!f.company.trim())} />
        {actions(!!f.company.trim(), next, "Continue →", false)}</div>}

      {step === 1 && <div className="step rise">{progress}{count(2)}<h1>What's your name?</h1><p className="help">We sign every email with it.</p>
        <input className="field" autoFocus placeholder="Your full name" autoComplete="name" maxLength={80} value={f.name} onChange={(e) => setF((o) => ({ ...o, name: e.target.value }))} onKeyDown={onEnter(!!f.name.trim())} />
        {actions(!!f.name.trim(), next)}</div>}

      {step === 2 && <div className="step rise">{progress}{count(3)}<h1>What space are you in?</h1><p className="help">{f.sectors.length ? `${f.sectors.length} selected` : "Pick all that fit. AI, Climate and Deeptech are open first."}</p>
        <div className="pick">{SECTORS.map(([n, on]) => <button key={n} aria-pressed={f.sectors.includes(n)} disabled={!on} onClick={() => setF((o) => ({ ...o, sectors: o.sectors.includes(n) ? o.sectors.filter((x) => x !== n) : [...o.sectors, n] }))}>{n}{on ? "" : " · soon"}</button>)}</div>
        {actions(f.sectors.length > 0, next)}</div>}

      {step === 3 && <div className="step rise">{progress}{count(4)}<h1>Tell us about your round.</h1><p className="help">So every investor we show can write your size of cheque.</p>
        <div className="pick-label">Stage</div><div className="pick">{STAGES.map((n) => <button key={n} aria-pressed={f.stage === n} onClick={() => setF((o) => ({ ...o, stage: n }))}>{n}</button>)}</div>
        <div className="pick-label">Raising</div><div className="pick">{ASKS.map((n) => <button key={n} aria-pressed={f.ask === n} onClick={() => setF((o) => ({ ...o, ask: n }))}>{n}</button>)}</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 18 }}>For Indian startups. Used only to find investors and write your emails. Nothing is sent without you.</p>
        {actions(!!f.stage && !!f.ask, submitRound)}</div>}

      {step === 4 && <div className="step rise">{progress}{count(5)}<h1>So the email <span className="it">sounds like you.</span></h1><p className="help">Asked once. These two lines go into every email.</p>
        <div className="profile-form">
          <label>{f.company || me?.company} helps (who)<input className="field" placeholder="e.g. CA firms" maxLength={80} value={p.forWho} onChange={(e) => setP((o) => ({ ...o, forWho: e.target.value }))} /></label>
          <label>achieve (what)<input className="field" placeholder="e.g. file GST returns 3x faster" maxLength={100} value={p.outcome} onChange={(e) => setP((o) => ({ ...o, outcome: e.target.value }))} /></label>
          <label>through (how)<input className="field" placeholder="e.g. AI that reads bank statements" maxLength={100} value={p.how} onChange={(e) => setP((o) => ({ ...o, how: e.target.value }))} /></label>
          <label>reducing (optional)<input className="field" placeholder="e.g. manual entry, errors and late fees" maxLength={100} value={p.reduce} onChange={(e) => setP((o) => ({ ...o, reduce: e.target.value }))} /></label>
          <div className="preview"><span className="sub-h">Your one-liner</span><br />{oneLiner}</div>
          <label>One line about you<textarea className="field" placeholder="e.g. I'm Neha, a chartered accountant who ran a 40-client practice for five years." maxLength={220} value={p.founderLine} onChange={(e) => setP((o) => ({ ...o, founderLine: e.target.value }))} /></label>
          <label>Revenue today (optional)<input className="field" placeholder="e.g. ₹3.2L a month, growing 22% a month" maxLength={80} value={p.revenue} onChange={(e) => setP((o) => ({ ...o, revenue: e.target.value }))} /></label>
          <label>Customers (optional)<input className="field" placeholder="e.g. 8 CA firms, 2 paying" maxLength={80} value={p.customers} onChange={(e) => setP((o) => ({ ...o, customers: e.target.value }))} /></label>
        </div>
        {actions(!!(p.forWho.trim() && p.outcome.trim() && p.how.trim() && p.founderLine.trim()), submitProfile, "Find my investors →")}</div>}

      {step === 5 && <div className="step center rise"><div className="spinner" /><h1 style={{ fontSize: 24 }}>Checking 433 investors for {f.company || me?.company}…</h1>
        <ul className="rat" style={{ textAlign: "left", maxWidth: 380, margin: "16px auto 0", listStyle: "none", padding: 0 }}>
          <li className="fg2">✓ What they invest in, and at what stage</li>
          <li className={seconds > 1 ? "fg2" : ""}>{seconds > 1 ? "✓" : "…"} Whether their cheque fits your round</li>
          <li className={seconds > 3 ? "fg2" : ""}>{seconds > 3 ? "✓" : "…"} Ranking them by match score</li>
          <li>… Writing your first 3 emails ({seconds}s)</li>
        </ul></div>}

      {step === 6 && <div className="step center rise"><span className="kicker gold">3 top picks · 3 emails written</span>
        <h1 style={{ marginTop: 12 }}>That took {seconds < 60 ? `${Math.max(seconds, 1)} seconds` : `${Math.round(seconds / 60)} minute${seconds >= 90 ? "s" : ""}`}. <span className="it">Your first emails are ready.</span></h1>
        <p className="fg2">Each one is written to that investor, using only what they've actually backed, plus your one-liner and your line.</p>
        <button className="btn white" style={{ borderRadius: 14, padding: 14, marginTop: 18 }} onClick={() => navigate("/emails")}>Read my emails →</button></div>}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flow">
      <div className="flow-top"><Link className="logo" to="/"><span className="logo-mark">F</span>Fundraising OS</Link><Link className="btn ghost sm" to="/">Exit</Link></div>
      <div className="flow-main">{children}</div>
    </main>
  );
}
