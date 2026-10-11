import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { savedInviteCode, visitorToken } from "../lib/token";
import { normaliseLinkedin, normaliseUrl } from "../../convex/lib/links";

const SECTORS: [string, boolean][] = [["AI", true], ["Climate & Energy", true], ["Deeptech", true], ["Fintech", false], ["B2B software", false], ["Health", false], ["Consumer brands", false]];
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];
const ASKS = ["₹25–50L", "₹50L–1Cr", "₹1–3 Cr", "₹3–5 Cr", "₹5–10 Cr"];
const LEFT = ["~2 min left", "~2 min left", "~2 min left", "~1 min left", "~1 min left", "Almost there", "Last step"];
const TOTAL = 7;

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export default function Start() {
  const token = useMemo(() => visitorToken(), []);
  const code = savedInviteCode();
  const me = useQuery(api.founders.me, { token });
  const start = useMutation(api.founders.start);
  const saveProfile = useMutation(api.founders.saveProfile);
  const write = useAction(api.write.writeFirstEmails);
  const fromWebsite = useAction(api.suggest.fromWebsite);
  const polish = useAction(api.suggest.polish);
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(0);
  const [f, setF] = useState({ company: "", name: "", sectors: [] as string[], stage: "", ask: "" });
  const [p, setP] = useState({ website: "", linkedin: "", oneLiner: "", founderLine: "", vision: "", revenue: "", customers: "", traction: "" });
  const [suggested, setSuggested] = useState<"" | "yes" | "no">("");
  const [note, setNote] = useState(""); // why we couldn't draft from her website (not an error)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  // Coming back: her emails are already written.
  useEffect(() => { if (me?.emailsStatus === "ready" && step < 7) navigate("/emails"); }, [me, step, navigate]);
  useEffect(() => { if (step !== 7) return; const t = setInterval(() => setSeconds((s) => s + 1), 1000); return () => clearInterval(t); }, [step]);

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
  const company = me?.company || f.company || "Your startup"; // the saved name has its capitals fixed

  async function submitRound() {
    setBusy(true); setError("");
    const r = await start({ token, inviteCode: code ?? "", ...f }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection and try again." }));
    setBusy(false);
    if (r.ok) next(); else setError(r.error);
  }
  async function submitLinks() {
    setError("");
    if (p.website.trim() && !normaliseUrl(p.website)) { setError("That website doesn't look right. Try something like ledgerly.in."); return; }
    if (p.linkedin.trim() && !normaliseLinkedin(p.linkedin)) { setError("Use your LinkedIn profile link, like linkedin.com/in/your-name."); return; }
    if (!p.website.trim()) { setSuggested("no"); next(); return; }
    setBusy(true);
    const r = await fromWebsite({ token, website: p.website }).catch(() => ({ ok: false as const, error: "We couldn't read your website. Write your one-liner below." }));
    setBusy(false);
    if (r.ok) { setP((o) => ({ ...o, oneLiner: o.oneLiner || r.oneLiner, founderLine: o.founderLine || r.founderLine })); setSuggested("yes"); }
    else { setSuggested("no"); setNote(r.error); }
    next();
  }
  // Her raw notes → "How you'll come across". If the AI is busy, she edits her own words instead.
  async function submitNotes() {
    setBusy(true); setError("");
    const r = await polish({ token, oneLiner: p.oneLiner, founderLine: p.founderLine, vision: p.vision, revenue: p.revenue, customers: p.customers }).catch(() => ({ ok: false as const, error: "" }));
    setBusy(false);
    if (r.ok) setP((o) => ({ ...o, founderLine: r.founderLine || o.founderLine, oneLiner: r.oneLiner || o.oneLiner, traction: r.traction }));
    else setP((o) => ({ ...o, traction: [o.revenue, o.customers].filter(Boolean).join(", ") }));
    next();
  }
  async function submitProfile() {
    setBusy(true); setError("");
    const r = await saveProfile({ token, ...p }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection and try again." }));
    if (!r.ok) { setBusy(false); setError(r.error); return; }
    setStep(7); setSeconds(0);
    const w = await write({ token }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setBusy(false);
    if (w.ok) setStep(8); else { setStep(6); setError(w.error); }
  }

  const progress = <div className="progress">{Array.from({ length: TOTAL }, (_, i) => i).map((i) => <i key={i} className={i <= step ? "on" : ""} />)}</div>;
  const count = (n: number) => <div className="count">STEP {n} OF {TOTAL} <span className="tag gold" style={{ float: "right" }}>{LEFT[n - 1]}</span></div>;
  const actions = (canGo: boolean, onGo: () => void, label = "Continue →", showBack = true, busyLabel = "Saving…") => (
    <>
      {error && <p className="err" role="alert" style={{ marginTop: 12 }}>{error}</p>}
      <div className="step-actions">
        {showBack && <button className="back" onClick={back} aria-label="Back">←</button>}
        <button className="btn primary" disabled={!canGo || busy} onClick={onGo}>{busy ? busyLabel : label}</button>
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

      {step === 4 && <div className="step rise">{progress}{count(5)}<h1>Where can investors <span className="it">find you?</span></h1><p className="help">We read your website once to draft your one-liner. Your LinkedIn goes in your signature.</p>
        <div className="profile-form">
          <label>Website<input className="field" autoFocus inputMode="url" autoCapitalize="none" placeholder="e.g. ledgerly.in" maxLength={200} value={p.website} onChange={(e) => setP((o) => ({ ...o, website: e.target.value }))} /></label>
          <label>Your LinkedIn (optional)<input className="field" inputMode="url" autoCapitalize="none" placeholder="linkedin.com/in/your-name" maxLength={200} value={p.linkedin} onChange={(e) => setP((o) => ({ ...o, linkedin: e.target.value }))} /></label>
        </div>
        {actions(true, submitLinks, p.website.trim() ? "Continue →" : "No website yet →", true, "Reading your website…")}</div>}

      {step === 5 && <div className="step rise">{progress}{count(6)}<h1>A few words <span className="it">about you.</span></h1>
        <p className="help">{suggested === "yes" ? "Your one-liner is drafted from your website. Rough notes are fine; we'll polish them next." : note || "Rough notes are fine. We'll polish them next."}</p>
        <div className="profile-form">
          <label>What {company} does<textarea className="field" placeholder={`${company} helps [who] [achieve what] by [how].`} maxLength={200} value={p.oneLiner} onChange={(e) => setP((o) => ({ ...o, oneLiner: e.target.value }))} /></label>
          <label>About you<textarea className="field" placeholder="e.g. ex-IIT Delhi, 5 years in insurance, obsessed with climate" maxLength={220} value={p.founderLine} onChange={(e) => setP((o) => ({ ...o, founderLine: e.target.value }))} /></label>
          <label>Your vision, in a few words (optional)<input className="field" placeholder="e.g. make every Indian city climate-ready" maxLength={120} value={p.vision} onChange={(e) => setP((o) => ({ ...o, vision: e.target.value }))} /></label>
          <label>Revenue (optional)<input className="field" placeholder="e.g. ₹3.2L a month, growing 22% a month" maxLength={80} value={p.revenue} onChange={(e) => setP((o) => ({ ...o, revenue: e.target.value }))} /></label>
          <label>Customers (optional)<input className="field" placeholder="e.g. 8 CA firms, 2 paying" maxLength={80} value={p.customers} onChange={(e) => setP((o) => ({ ...o, customers: e.target.value }))} /></label>
        </div>
        {actions(!!(p.oneLiner.trim() && p.founderLine.trim()), submitNotes, "Polish my lines →", true, "Polishing…")}</div>}

      {step === 6 && <div className="step rise">{progress}{count(7)}<h1>How you'll <span className="it">come across.</span></h1>
        <p className="help">These go into every email, word for word. Make them yours.</p>
        <div className="profile-form">
          <label>You<textarea className="field tall" maxLength={220} value={p.founderLine} onChange={(e) => setP((o) => ({ ...o, founderLine: e.target.value }))} /></label>
          <label>{company}<textarea className="field tall" maxLength={200} value={p.oneLiner} onChange={(e) => setP((o) => ({ ...o, oneLiner: e.target.value }))} /></label>
          {(p.traction || p.revenue || p.customers) && <label>Traction<textarea className="field" style={{ minHeight: 60 }} maxLength={200} value={p.traction} onChange={(e) => setP((o) => ({ ...o, traction: e.target.value }))} /></label>}
        </div>
        {actions(!!(p.oneLiner.trim() && p.founderLine.trim()), submitProfile, "Find my investors →")}</div>}

      {step === 7 && <div className="step center rise"><div className="spinner" /><h1 style={{ fontSize: 24 }}>Checking 433 investors for {company}…</h1>
        <ul className="rat" style={{ textAlign: "left", maxWidth: 380, margin: "16px auto 0", listStyle: "none", padding: 0 }}>
          <li className="fg2">✓ What they invest in, and at what stage</li>
          <li className={seconds > 1 ? "fg2" : ""}>{seconds > 1 ? "✓" : "…"} Whether their cheque fits your round</li>
          <li className={seconds > 3 ? "fg2" : ""}>{seconds > 3 ? "✓" : "…"} Ranking them by match score</li>
          <li>… Writing your first 3 emails ({seconds}s)</li>
        </ul></div>}

      {step === 8 && <div className="step center rise"><span className="kicker gold">Written in {seconds < 60 ? `${Math.max(seconds, 1)} seconds` : `${Math.round(seconds / 60)} min`}</span>
        <h1 style={{ marginTop: 12 }}>Your first 3 emails <span className="it">are ready.</span></h1>
        <p className="fg2">Each one opens on something that investor actually did.</p>
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
