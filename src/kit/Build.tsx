import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import type { Id } from "../../convex/_generated/dataModel";
import type { Row } from "../components/Investor";
import { api } from "../../convex/_generated/api";
import { LogoMark, Wordmark } from "../components/Brand";
import { Dial } from "../components/Art";
import { freshVisitorToken, rememberInviteCode, savedInviteCode, visitorToken } from "../lib/token";
import { BrandSlide, BrandTeaser } from "./BrandDeck";
import { SLIDE_TITLES } from "./kitTypes";
import { useKitView } from "./useKitView";
import "./kit.css";

// /build: the Raise Kit flow. Reading your website → Make it sharper (files, optional) → Confirm your facts → Building → Your kit.
// Nothing is used until she confirms it; every number in her kit is one she gave us.

const SECTORS = ["AI", "Climate & Energy", "Deeptech", "Fintech", "B2B SaaS", "Health", "Consumer brands", "Edtech", "Agritech", "Media & adtech", "Web3", "Impact"];
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];
const ASKS = ["₹25–50L", "₹50L–1Cr", "₹1–3 Cr", "₹3–5 Cr", "₹5–10 Cr"];
const SWATCHES = ["#3D7BFF", "#7B5CFF", "#E8673A", "#1E9E6A", "#D9356B", "#0F766E", "#B7791F", "#111827"];

type Member = { name: string; role: string; line: string };
type Facts = {
  company: string; website: string; name: string; linkedin: string; sectors: string[]; stage: string; ask: string;
  oneLiner: string; founderLine: string; traction: string; problem: string; product: string; forWho: string; customers: string;
  market: string; businessModel: string; competitors: string; useOfFunds: string; whyNow: string; team: Member[];
  primary: string; accent: string; logo: string; font: string; fontCss: string;
};
const EMPTY: Facts = { company: "", website: "", name: "", linkedin: "", sectors: [], stage: "", ask: "", oneLiner: "", founderLine: "", traction: "", problem: "", product: "", forWho: "", customers: "", market: "", businessModel: "", competitors: "", useOfFunds: "", whyNow: "", team: [], primary: "#3D7BFF", accent: "", logo: "", font: "", fontCss: "" };
type Step = "site" | "reading" | "enrich" | "confirm" | "building" | "reveal";
type Found = { palette: string[]; numbers: string[]; problemOptions: string[]; productOptions: string[] };

const SAVE = "fos_kit_draft";
const load = (): { step: Step; f: Facts; found: Found } | null => { try { const v = sessionStorage.getItem(SAVE); return v ? JSON.parse(v) : null; } catch { return null; } };
const nowMs = () => Date.now();

export default function Build() {
  const params = useMemo(() => new URLSearchParams(location.search), []);
  const [token] = useState(() => {
    // A new site from /kit on a browser that holds another startup's list starts fresh; that list stays where it is.
    const t = visitorToken();
    return t;
  });
  const me = useQuery(api.founders.me, { token });
  const kit = useQuery(api.kit.mine, { token });
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const [saved] = useState(load);
  // Her site from /kit goes straight to reading; a reload mid-flow picks up where she was.
  const [step, setStep] = useState<Step>(() => params.get("site") && !params.has("edit") ? "reading" : saved?.step === "building" || saved?.step === "reveal" ? "site" : saved?.step ?? "site");
  const [f, setF] = useState<Facts>(() => params.get("site") ? { ...EMPTY, website: params.get("site") ?? "" } : saved?.f ?? EMPTY);
  const [found, setFound] = useState<Found>(() => (!params.get("site") && saved?.found) || { palette: [], numbers: [], problemOptions: [], productOptions: [] });
  const set = <K extends keyof Facts>(k: K, val: Facts[K]) => setF((o) => ({ ...o, [k]: val }));

  useEffect(() => { const c = params.get("code"); if (c) rememberInviteCode(c.trim().toUpperCase()); }, [params]);
  useEffect(() => { try { sessionStorage.setItem(SAVE, JSON.stringify({ step, f, found })); } catch { /* private mode */ } }, [step, f, found]);

  // This browser holds a list saved to a Google account she isn't signed into, or a classic list with no kit: start fresh.
  const stale = me !== undefined && kit !== undefined && !!me && ((me.claimed && !isAuthenticated && !isLoading) || (!kit && step === "reading" && !!params.get("site")));
  useEffect(() => { if (stale) { freshVisitorToken(); location.reload(); } }, [stale]);
  // "Edit my facts" from the dashboard: start from what's saved (adjusted during render, once).
  const editing = params.has("edit");
  const [seeded, setSeeded] = useState(false);
  if (editing && !seeded && me && kit !== undefined) {
    setSeeded(true);
    setF({
      ...EMPTY, company: me.company, website: me.website ?? "", name: me.name, linkedin: me.profile.linkedin, sectors: me.sectors, stage: me.stage, ask: me.ask,
      oneLiner: me.profile.oneLiner, founderLine: me.profile.founderLine, traction: me.profile.traction,
      problem: kit?.facts.problem ?? "", product: kit?.facts.product ?? "", forWho: kit?.facts.forWho ?? "", customers: kit?.facts.customers ?? "",
      market: kit?.facts.market ?? "", businessModel: kit?.facts.businessModel ?? "", competitors: kit?.facts.competitors ?? "", useOfFunds: kit?.facts.useOfFunds ?? "", whyNow: kit?.facts.whyNow ?? "",
      team: kit?.facts.team ?? [], primary: kit?.brand.primary ?? "#3D7BFF", accent: kit?.brand.accent ?? "", logo: kit?.brand.logo ?? "", font: kit?.brand.font ?? "", fontCss: kit?.brand.fontCss ?? "",
    });
    setStep("confirm");
  }
  // Coming back with a kit already built: signed in goes to the dashboard, otherwise the reveal.
  const built = !!kit?.deck && me?.emailsStatus === "ready" && !editing && step !== "building" && step !== "confirm";
  const toApp = built && isAuthenticated && !!me?.unlocked;
  if (built && !toApp && step !== "reveal") setStep("reveal");
  useEffect(() => { if (toApp) navigate("/app"); }, [toApp, navigate]);

  const pct = { site: 8, reading: 22, enrich: 42, confirm: 64, building: 86, reveal: 100 }[step];
  return (
    <main className="theme-light kbx">
      <header className="kb-top">
        <Link className="logo" to="/"><LogoMark /><Wordmark /></Link>
        <span className="kb-time">{step === "reveal" ? "Ready" : step === "building" ? "Almost there" : "About 4 minutes"}</span>
      </header>
      <div className="kb-prog" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <div className="kb-main">
        {(me === undefined || kit === undefined || stale) && <div className="spinner" />}
        {me !== undefined && kit !== undefined && !stale && <>
        {step === "site" && <SiteStep f={f} set={set} onRead={() => setStep("reading")} onSkip={() => setStep("enrich")} />}
        {step === "reading" && <Reading token={token} f={f} setF={setF} setFound={setFound} onDone={() => setStep("enrich")} />}
        {step === "enrich" && <Enrich token={token} f={f} setF={setF} onDone={() => setStep("confirm")} onBack={() => setStep("site")} />}
        {step === "confirm" && <Confirm token={token} f={f} set={set} setF={setF} found={found} onBuilt={() => setStep("building")} onBack={() => setStep("enrich")} />}
        {step === "building" && <Building token={token} f={f} onReady={() => setStep("reveal")} onFail={() => setStep("confirm")} />}
        {step === "reveal" && <Reveal token={token} />}
        </>}
      </div>
    </main>
  );
}

/* ---------- Step 0: her website ---------- */
function SiteStep({ f, set, onRead, onSkip }: { f: Facts; set: <K extends keyof Facts>(k: K, v: Facts[K]) => void; onRead: () => void; onSkip: () => void }) {
  return (
    <section className="kb-step rise">
      <span className="kb-kicker">Step 1 of 4 · Your website</span>
      <h1>Let's start with <em>your website.</em></h1>
      <p className="kb-help">We read it once to pull out what you do, your numbers, your logo and your colours. You check everything next.</p>
      <form className="k2-input big" onSubmit={(e) => { e.preventDefault(); if (f.website.trim()) onRead(); }}>
        <span className="k2-www" aria-hidden="true">www.</span>
        <input autoFocus value={f.website.replace(/^https?:\/\//, "").replace(/^www\./, "")} onChange={(e) => set("website", e.target.value)} placeholder="yourstartup.in" aria-label="Your website" autoCapitalize="none" inputMode="url" />
        <button className="btn primary" type="submit" disabled={!f.website.trim()}>Read my website</button>
      </form>
      <button className="text-link kb-skip" onClick={onSkip}>No website yet? Start with your deck or a few facts</button>
    </section>
  );
}

/* ---------- Step 1: Reading your website, with findings as they arrive ---------- */
const READING = ["Opening your website", "Reading what you do and who it's for", "Looking for your numbers", "Finding your logo, colours and font", "Spotting your team and customers"];
function Reading({ token, f, setF, setFound, onDone }: { token: string; f: Facts; setF: React.Dispatch<React.SetStateAction<Facts>>; setFound: (x: Found) => void; onDone: () => void }) {
  const readSite = useAction(api.kitAi.readSite);
  const [shown, setShown] = useState(1);
  const [res, setRes] = useState<Awaited<ReturnType<typeof readSite>> | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    readSite({ token, website: f.website }).catch(() => ({ ok: false as const, error: "We couldn't read your website. Fill in your facts by hand." })).then((r) => {
      setRes(r);
      if (!r.ok) return;
      setF((o) => ({
        ...o, company: o.company || r.companyName, oneLiner: o.oneLiner || r.oneLiner, problem: o.problem || r.problem, product: o.product || r.product,
        forWho: o.forWho || r.forWho, customers: o.customers || r.customers, sectors: o.sectors.length ? o.sectors : r.sectors,
        team: o.team.length ? o.team : r.team, primary: r.brand.palette[0] ?? o.primary, accent: r.brand.palette[1] ?? "", logo: r.brand.logo ?? "", font: r.brand.font ?? "", fontCss: r.brand.fontCss ?? "",
        traction: o.traction || r.numbers.join(" · "),
      }));
      setFound({ palette: r.brand.palette, numbers: r.numbers, problemOptions: r.problemOptions, productOptions: r.productOptions });
    });
  }, [readSite, token, f.website, setF, setFound]);
  useEffect(() => { const t = setInterval(() => setShown((n) => Math.min(READING.length, n + 1)), 1200); return () => clearInterval(t); }, []);
  const host = f.website.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  return (
    <section className="kb-step rise">
      <span className="kb-kicker">Step 1 of 4 · Reading your website</span>
      <h1>{res?.ok ? <>Here's what we <em>found.</em></> : <>Reading <em>{host}</em>…</>}</h1>
      {!res && <Scanner host={host} shown={shown} />}
      {!res && <ul className="kb-reading">{READING.slice(0, shown).map((x, i) => <li key={x} className={i < shown - 1 ? "done" : ""}><i aria-hidden="true">{i < shown - 1 ? "✓" : ""}</i>{x}</li>)}</ul>}
      {res && !res.ok && <><p className="kb-note">{res.error}</p><button className="btn primary" onClick={onDone}>Continue →</button></>}
      {res?.ok && (
        <>
          <div className="kb-finds">
            <Find label="Startup" value={res.companyName} d={0} />
            <Find label="What you do" value={res.oneLiner} d={1} />
            {res.forWho && <Find label="Who it's for" value={res.forWho} d={2} />}
            {res.problem && <Find label="The problem" value={res.problem} d={3} />}
            {res.numbers.length > 0 && <Find label="Numbers on your site" value={res.numbers.join(" · ")} d={4} />}
            {res.team.length > 0 && <Find label="Team" value={res.team.map((m) => m.name + (m.role ? `, ${m.role}` : "")).join(" · ")} d={5} />}
            {res.customers && <Find label="Customers and partners" value={res.customers} d={6} />}
            <div className="kb-find brand" style={{ animationDelay: "1.05s" }}>
              <em>Your brand</em>
              <div className="kb-brandrow">
                {res.brand.logo && <img src={res.brand.logo} alt="Your logo" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                {res.brand.palette.slice(0, 4).map((c) => <span key={c} className="kb-sw" style={{ background: c }} title={c} />)}
                {res.brand.font && <span className="kb-font">Aa · {res.brand.font}</span>}
                {!res.brand.palette.length && !res.brand.logo && <span className="kb-dim">No colours found; you'll pick one next.</span>}
              </div>
            </div>
          </div>
          <p className="kb-help">You'll check and edit all of this in a minute.</p>
          <button className="btn primary kb-go" onClick={onDone}>Looks right →</button>
        </>
      )}
    </section>
  );
}
/** While we read her site: a browser window being scanned, and what we're picking up, chip by chip. */
const CHIPS = ["What you do", "Who it's for", "Your numbers", "Logo", "Colours", "Font", "Team", "Customers"];
function Scanner({ host, shown }: { host: string; shown: number }) {
  return (
    <div className="kb-scan" aria-hidden="true">
      <div className="kb-scan-bar"><i /><i /><i /><span>{host || "your website"}</span></div>
      <div className="kb-scan-page">
        <span className="sk w60" /><span className="sk w90" /><span className="sk w75" />
        <div className="sk-row"><span className="sk box" /><span className="sk box" /><span className="sk box" /></div>
        <span className="sk w80" /><span className="sk w50" />
        <div className="kb-beam" />
      </div>
      <div className="kb-chips">{CHIPS.slice(0, Math.min(CHIPS.length, shown * 2)).map((c, i) => <span key={c} style={{ animationDelay: `${(i % 2) * 0.25}s` }}>✓ {c}</span>)}</div>
    </div>
  );
}
const Find = ({ label, value, d }: { label: string; value: string; d: number }) => <div className="kb-find" style={{ animationDelay: `${d * 0.15}s` }}><em>{label}</em><span>{value}</span></div>;

/* ---------- Step 2: Make it sharper (optional): deck, CV, LinkedIn PDF ---------- */
function Enrich({ token, f, setF, onDone, onBack }: { token: string; f: Facts; setF: React.Dispatch<React.SetStateAction<Facts>>; onDone: () => void; onBack: () => void }) {
  const uploadUrl = useMutation(api.kit.uploadUrl);
  const readDocs = useAction(api.kitAi.readDocs);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const pick = (list: FileList | null) => {
    setError("");
    const pdfs = Array.from(list ?? []).filter((x) => x.type === "application/pdf");
    if (list && pdfs.length < list.length) setError("PDFs only, please.");
    const big = pdfs.find((x) => x.size > 15 * 1024 * 1024);
    if (big) { setError(`${big.name} is over 15 MB. Try a smaller PDF.`); return; }
    setFiles((o) => [...o, ...pdfs].slice(0, 3));
  };
  async function read() {
    setError(""); setBusy("Uploading…");
    try {
      const ids: Id<"_storage">[] = [];
      for (const file of files) {
        const u = await uploadUrl({ token });
        if (!u.ok) { setError(u.error); setBusy(""); return; }
        const r = await fetch(u.url, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file });
        if (!r.ok) throw new Error("upload");
        ids.push(((await r.json()) as { storageId: Id<"_storage"> }).storageId);
      }
      setBusy("Reading your files…");
      const out = await readDocs({ token, files: ids });
      setBusy("");
      if (!out.ok) { setError(out.error); return; }
      // Files fill what the site didn't say, and their numbers win (her deck is more exact than her site).
      setF((o) => ({
        ...o, name: o.name || out.founderName, founderLine: o.founderLine || out.founderLine, company: o.company || out.companyName,
        oneLiner: o.oneLiner || out.oneLiner, problem: o.problem || out.problem, product: o.product || out.product, forWho: o.forWho || out.forWho,
        traction: out.traction || [out.revenue, out.customers].filter(Boolean).join(", ") || o.traction, customers: out.customersNamed || o.customers,
        team: out.team.length ? out.team : o.team, market: out.market || o.market, businessModel: out.businessModel || o.businessModel,
        competitors: out.competitors || o.competitors, useOfFunds: out.useOfFunds || o.useOfFunds, whyNow: out.whyNow || o.whyNow,
        stage: STAGES.includes(out.stage) ? out.stage : o.stage,
      }));
      onDone();
    } catch {
      setBusy(""); setError("Couldn't upload that. Check your connection and try again, or skip this step.");
    }
  }
  return (
    <section className="kb-step rise">
      <span className="kb-kicker">Step 2 of 4 · Optional, recommended</span>
      <h1>Make it <em>sharper.</em></h1>
      <p className="kb-help">Got an old deck, your CV or your LinkedIn profile as a PDF? We'll pull out your team, traction, customers and use of funds, so {f.company || "your kit"} says more than your website does.</p>
      <label className={`kb-drop${files.length ? " has" : ""}`}>
        <input type="file" accept="application/pdf" multiple onChange={(e) => pick(e.target.files)} />
        <b>Drop PDFs here, or tap to choose</b>
        <span>Pitch deck · CV · LinkedIn PDF · one-pager. Up to 3, 15 MB each.</span>
      </label>
      {files.length > 0 && <ul className="kb-files">{files.map((x, i) => <li key={x.name + i}><span>📄 {x.name}</span><button aria-label={`Remove ${x.name}`} onClick={() => setFiles((o) => o.filter((_, j) => j !== i))}>✕</button></li>)}</ul>}
      <p className="kb-fine">LinkedIn: open your profile → More → Save to PDF. We read your files once, then delete them. They're never shown to anyone.</p>
      {error && <p className="err" role="alert">{error}</p>}
      <div className="kb-actions">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        {files.length ? <button className="btn primary" disabled={!!busy} onClick={read}>{busy || "Read my files →"}</button> : <button className="btn primary" onClick={onDone}>Skip, go to my facts →</button>}
      </div>
    </section>
  );
}

/* ---------- Step 3: Confirm your facts ---------- */
function Confirm({ token, f, set, setF, found, onBuilt, onBack }: { token: string; f: Facts; set: <K extends keyof Facts>(k: K, v: Facts[K]) => void; setF: React.Dispatch<React.SetStateAction<Facts>>; found: Found; onBuilt: () => void; onBack: () => void }) {
  const confirm = useMutation(api.kit.confirm);
  const [more, setMore] = useState(!!(f.market || f.businessModel || f.competitors || f.useOfFunds));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const missing = (v: string) => !v.trim();
  // What's still needed, in the order she sees it. Pressing the button with gaps says what, and scrolls there.
  const need: [string, string][] = [
    [f.company.trim() ? "" : "startup name", "kb-company"], [f.name.trim() ? "" : "your name", "kb-name"],
    [f.sectors.length ? "" : "sector", "kb-sector"], [f.stage ? "" : "stage", "kb-stage"], [f.ask ? "" : "how much you're raising", "kb-ask"],
    [f.oneLiner.trim() ? "" : "what you do", "kb-oneliner"], [f.founderLine.trim() ? "" : "a line about you", "kb-founder"],
  ].filter(([x]) => x) as [string, string][];
  const [tried, setTried] = useState(false);
  const pickLabel = (label: string, ok: boolean, id: string) => <div className="kb-pickl" id={id}>{label} {ok ? null : <i className={`need${tried ? " hot" : ""}`}>needed</i>}{label === "Sector" && <span className="kb-dim">up to 3</span>}</div>;
  async function go() {
    if (need.length) { setTried(true); document.getElementById(need[0][1])?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    setError(""); setBusy(true);
    const r = await confirm({
      token, code: savedInviteCode() ?? "", company: f.company, name: f.name, website: f.website, linkedin: f.linkedin, sectors: f.sectors, stage: f.stage, ask: f.ask,
      oneLiner: f.oneLiner, founderLine: f.founderLine, traction: f.traction,
      brand: { primary: f.primary, accent: f.accent || undefined, logo: f.logo || undefined, font: f.font || undefined, fontCss: f.fontCss || undefined },
      facts: { problem: f.problem, product: f.product, forWho: f.forWho, customers: f.customers, market: f.market, businessModel: f.businessModel, competitors: f.competitors, useOfFunds: f.useOfFunds, whyNow: f.whyNow, team: f.team },
      uploads: 0,
    }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection and try again." }));
    setBusy(false);
    if (r.ok) onBuilt(); else setError(r.error);
  }
  const chips = (opts: string[], k: "problem" | "product") => opts.length > 0 && <div className="kb-opts">{opts.map((o) => <button key={o} type="button" aria-pressed={f[k] === o} onClick={() => set(k, o)}>{o}</button>)}</div>;
  const field = (label: string, k: keyof Facts, ph: string, opt = false, tall = false, max = 300) => (
    <label className="kb-field" id={`kb-${k === "oneLiner" ? "oneliner" : k === "founderLine" ? "founder" : k}`}><span>{label}{opt ? <i className="opt">optional</i> : missing(String(f[k])) ? <i className={`need${tried ? " hot" : ""}`}>needed</i> : null}</span>
      {tall ? <textarea className="field" maxLength={max} placeholder={ph} value={String(f[k])} onChange={(e) => set(k, e.target.value as never)} />
        : <input className="field" maxLength={max} placeholder={ph} value={String(f[k])} onChange={(e) => set(k, e.target.value as never)} />}
    </label>
  );
  const palette = [...new Set([...found.palette, ...SWATCHES])].slice(0, 9);
  return (
    <section className="kb-step wide rise">
      <span className="kb-kicker">Step 3 of 4 · Confirm your facts</span>
      <h1>Check your facts. <em>We use only these.</em></h1>
      <p className="kb-help">Every number in your deck, teaser and pitches comes from here. Fix anything that's off; leave blank what you don't have.</p>

      <div className="kb-card">
        <h3>Your brand</h3>
        <div className="kb-brand">
          <div className="kb-logo-prev" style={{ background: f.primary }}>{f.logo ? <img src={f.logo} alt="" referrerPolicy="no-referrer" onError={() => set("logo", "")} /> : <b>{f.company.slice(0, 2).toUpperCase() || "Aa"}</b>}</div>
          <div>
            <div className="kb-sws" role="radiogroup" aria-label="Main colour">{palette.map((c) => <button key={c} role="radio" aria-checked={f.primary === c} aria-label={c} style={{ background: c }} onClick={() => set("primary", c)} />)}
              <label className="kb-custom" title="Pick your own"><input type="color" value={f.primary} onChange={(e) => set("primary", e.target.value)} aria-label="Pick your own colour" />+</label></div>
            <span className="kb-dim">{f.font ? `Font: ${f.font}` : "Font: our clean default"}{f.logo ? " · logo from your site" : " · no logo found, we'll use your initials"}</span>
          </div>
        </div>
      </div>

      <div className="kb-card">
        <h3>The basics</h3>
        <div className="kb-grid">
          {field("Startup name", "company", "Kiln Labs", false, false, 80)}
          {field("Website", "website", "kilnlabs.in", true, false, 200)}
          {field("Your name", "name", "Your full name", false, false, 80)}
          {field("Your LinkedIn", "linkedin", "linkedin.com/in/your-name", true, false, 200)}
        </div>
        {pickLabel("Sector", f.sectors.length > 0, "kb-sector")}
        <div className="pick">{SECTORS.map((s) => <button key={s} aria-pressed={f.sectors.includes(s)} onClick={() => set("sectors", f.sectors.includes(s) ? f.sectors.filter((x) => x !== s) : f.sectors.length < 3 ? [...f.sectors, s] : f.sectors)}>{s}</button>)}</div>
        {pickLabel("Stage", !!f.stage, "kb-stage")}
        <div className="pick">{STAGES.map((s) => <button key={s} aria-pressed={f.stage === s} onClick={() => set("stage", s)}>{s}</button>)}</div>
        {pickLabel("Raising", !!f.ask, "kb-ask")}
        <div className="pick">{ASKS.map((s) => <button key={s} aria-pressed={f.ask === s} onClick={() => set("ask", s)}>{s}</button>)}</div>
      </div>

      <div className="kb-card">
        <h3>Your story</h3>
        {field("What you do, in one line", "oneLiner", "Kiln Labs helps brick kilns cut coal use by 18% with a retrofit burner and an app.", false, true, 200)}
        {field("The problem", "problem", "What's broken today, for whom", true, true)}
        {chips(found.problemOptions, "problem")}
        {field("Your product", "product", "What it is and how it works", true, true)}
        {chips(found.productOptions, "product")}
        {field("Who it's for", "forWho", "e.g. brick kiln owners in Uttar Pradesh", true, false, 120)}
      </div>

      <div className="kb-card">
        <h3>Your proof</h3>
        {field("Your traction, with a number", "traction", "e.g. 62 kilns pay us monthly, up from 9 in March · ₹3.2L a month", true, true, 200)}
        {!/\d/.test(f.traction) && <p className="warn">Investors look for one number first: paying customers, revenue, pilots, a waitlist.</p>}
        {field("Named customers or partners", "customers", "e.g. Sharma Bricks, IIT Kanpur incubator", true, false, 200)}
      </div>

      <div className="kb-card">
        <h3>You and your team</h3>
        {field("About you, one line", "founderLine", "I'm Arjun; I ran my family's kiln for six years.", false, true, 220)}
        {f.team.map((m, i) => (
          <div className="kb-member" key={i}>
            <input className="field" placeholder="Name" maxLength={60} value={m.name} onChange={(e) => setF((o) => ({ ...o, team: o.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))} />
            <input className="field" placeholder="Role" maxLength={60} value={m.role} onChange={(e) => setF((o) => ({ ...o, team: o.team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)) }))} />
            <input className="field wide" placeholder="Background, a few words" maxLength={160} value={m.line} onChange={(e) => setF((o) => ({ ...o, team: o.team.map((x, j) => (j === i ? { ...x, line: e.target.value } : x)) }))} />
            <button className="xbtn" aria-label="Remove" onClick={() => setF((o) => ({ ...o, team: o.team.filter((_, j) => j !== i) }))}>✕</button>
          </div>
        ))}
        {f.team.length < 4 && <button className="btn ghost sm" onClick={() => setF((o) => ({ ...o, team: [...o.team, { name: "", role: "", line: "" }] }))}>+ Add a team member</button>}
      </div>

      <div className="kb-card">
        <button className="kb-more" aria-expanded={more} onClick={() => setMore((x) => !x)}><h3>More for your deck</h3><span>{more ? "▴" : "▾ Market, model, competitors, use of funds"}</span></button>
        {more && <>
          {field("Market size, with its source", "market", "e.g. ₹12,000 Cr spent on kiln coal a year (CSE, 2023)", true, true)}
          {field("How you make money", "businessModel", "e.g. ₹4,500 a month per kiln", true)}
          {field("Competitors, and how you're different", "competitors", "e.g. local burner makers; none track fuel", true, true)}
          {field("What the round pays for", "useOfFunds", "e.g. 200 more kilns, 4 engineers, 18 months of runway", true, true)}
          {field("Why now", "whyNow", "e.g. new emission rules from 2026", true)}
        </>}
      </div>

      {error && <p className="err" role="alert">{error}</p>}
      <div className="kb-actions sticky">
        <button className="back" onClick={onBack} aria-label="Back">←</button>
        <button className="btn primary" disabled={busy} onClick={go}>{busy ? "Saving…" : "Prepare my round →"}</button>
      </div>
      {tried && need.length > 0 && <p className="err center" role="alert">Still needed: {need.map(([x]) => x).join(", ")}.</p>}
    </section>
  );
}

/* ---------- Step 4: Building, with real progress ---------- */
function Building({ token, f, onReady, onFail }: { token: string; f: Facts; onReady: () => void; onFail: () => void }) {
  const build = useAction(api.kitAi.build);
  const me = useQuery(api.founders.me, { token });
  const kit = useQuery(api.kit.mine, { token });
  const stats = useQuery(api.founders.publicStats, {});
  const [error, setError] = useState("");
  const [clock, setClock] = useState({ from: 0, now: 0 });
  // A rebuild starts from a ready kit: wait until this build has begun before calling it done.
  const [began, setBegan] = useState(false);
  if (!began && kit?.status === "building") setBegan(true);
  const [run, setRun] = useState(0);
  const started = useRef(-1);
  useEffect(() => {
    if (started.current === run) return;
    started.current = run;
    const from = nowMs();
    setClock({ from, now: from });
    build({ token }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." })).then((r) => { if (!r.ok) setError(r.error); else setBegan(true); });
  }, [build, token, run]);
  useEffect(() => { const t = setInterval(() => setClock((c) => ({ ...c, now: Date.now() })), 500); return () => clearInterval(t); }, []);
  const s = Math.max(0, Math.round((clock.now - clock.from) / 1000));
  const drafts = me?.rows.filter((r) => r.rank < 5 && r.draft).length ?? 0;
  const matched = (me?.rows.length ?? 0) > 0;
  const pitched = drafts >= 5 || me?.emailsStatus === "ready";
  const deckDone = !!kit?.deck && kit.status === "ready" && began;
  const deckFailed = began && kit?.status === "failed";
  const done = deckDone && me?.emailsStatus === "ready";
  useEffect(() => { if (done) { const t = setTimeout(onReady, 900); return () => clearTimeout(t); } }, [done, onReady]);
  const items: [string, boolean, boolean][] = [
    ["Locking your facts", true, false],
    [`Scanning the recent deals of ${stats?.total ?? "our"} active investors`, matched || s > 3, !matched],
    [matched ? `Ranking the ${me?.matchCount ?? 0} that fit ${f.company}, by Fit Score` : "Ranking the ones that fit you", matched, false],
    ["Researching each of your top 5: their deals, cheques and partners", pitched || drafts > 1, matched && drafts <= 1],
    [`Writing 5 personal pitches from proven templates · ${drafts}/5`, pitched, matched && drafts > 1 && !pitched],
    ["Designing your deck in your brand", deckDone, !deckDone && !deckFailed && s > 3],
    ["Writing your two-page teaser", deckDone, false],
    ["Laying out your game plan", done, false],
  ];
  if (error) {
    return (
      <section className="kb-step center rise">
        <h1>That didn't work <em>this time.</em></h1>
        <p className="kb-note">{error}</p>
        <div className="kb-actions center"><button className="btn primary" onClick={onFail}>Back to my facts</button></div>
      </section>
    );
  }
  const n = me?.matchCount ?? 0;
  return (
    <section className="kb-step center rise">
      <span className="kb-kicker">Step 4 of 4 · Preparing your round · {s}s</span>
      <h1>Preparing <em>{f.company}'s</em> round.</h1>
      <div className="kb-radar" aria-hidden="true" style={{ "--rc": f.primary } as React.CSSProperties}>
        <div className="kb-sweep" />
        {Array.from({ length: 18 }, (_, i) => <i key={i} className={matched && i < Math.min(18, Math.ceil(n / 8)) ? "on" : ""} style={{ left: `${50 + 42 * Math.cos(i * 2.4) * ((i % 3) + 1) / 3}%`, top: `${50 + 42 * Math.sin(i * 2.4) * ((i % 3) + 1) / 3}%`, animationDelay: `${i * 0.12}s` }} />)}
        <div className="kb-core"><b>{matched ? n : "…"}</b><span>{matched ? "fit you" : "scanning"}</span></div>
      </div>
      <ul className="kb-build">{items.map(([t, ok, live]) => <li key={t} className={ok ? "done" : live ? "live" : ""}><i aria-hidden="true">{ok ? "✓" : ""}</i>{t}</li>)}</ul>
      {deckFailed && pitched && (
        <div className="kb-note kb-recover">
          <b>Your 5 pitches are ready. Your deck didn't finish this time.</b>
          <div className="kb-actions center"><button className="btn ghost" onClick={() => { setBegan(false); setRun((x) => x + 1); }}>Try the deck again</button><button className="btn primary" onClick={onReady}>See my results →</button></div>
        </div>
      )}
      {!deckFailed && s > 75 && pitched && !done && (
        <div className="kb-note kb-recover"><span>Your pitches are ready; your deck is still being written and will show up by itself.</span><div className="kb-actions center"><button className="btn primary" onClick={onReady}>See my results →</button></div></div>
      )}
      {!deckFailed && s > 40 && !pitched && <p className="kb-help" role="status">Taking a little longer than usual. Keep this page open.</p>}
    </section>
  );
}

/* ---------- The reveal: plan, deck, teaser, top 5 pitches → sign in ---------- */
const GoogleG = () => <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>;
const host = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");

function Reveal({ token }: { token: string }) {
  const me = useQuery(api.founders.me, { token });
  const view = useKitView(token);
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  // The slim button hides once the full summary at the end is on screen.
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaSeen, setCtaSeen] = useState(false);
  useEffect(() => {
    const el = ctaRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setCtaSeen(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [me]);
  if (!me) return <div className="spinner" />;
  const picks = me.rows.filter((r) => r.rank < 5 && r.draft);
  const peek = [0, 1, 2]; // the 3 slides open on the free kit
  const go = () => { setBusy(true); if (isAuthenticated) navigate("/app"); else void signIn("google", { redirectTo: "/app" }); };
  const cta = (
    <div className="kb-cta" ref={ctaRef}>
      <p className="kb-cta-line"><b>{me.matchCount} investors</b> fit {me.company} · <b>{me.activeCount}</b> invested recently · <b>5 personal pitches</b> ready · your deck and teaser in your brand</p>
      <button className="btn white big" data-track="click_signin" disabled={busy} onClick={go}><GoogleG />{busy ? "Opening…" : isAuthenticated ? <>Open my dashboard <em className="kb-free">Free</em></> : <>Read and send my pitches <em className="kb-free">Free</em></>}</button>
      <span className="kb-dim">Saved to your Google account. Nothing is ever sent without you.</span>
    </div>
  );
  return (
    <section className="kb-reveal rise">
      <span className="kb-kicker gold">Your round is ready to go</span>
      <h1>{me.company}, <em>ready to raise.</em></h1>
      <div className="kb-plan">
        <div><b>{me.matchCount}</b><span>active investors fit {me.company}</span></div>
        <div><b>{me.activeCount}</b><span>invested this year or last</span></div>
        <div><b>{me.leadCount}</b><span>lead rounds</span></div>
        <div><b>5</b><span>personal pitches ready</span></div>
      </div>

      <h2>Your top 5, <em>with a pitch written to each.</em></h2>
      <p className="kb-help">Tap an investor to see why they fit, the score behind it, and the pitch we wrote them.</p>
      <div className="kb-picks2">
        {picks.map((r, i) => <PickPeek key={r.rank} r={r} open={open === i} onToggle={() => setOpen(open === i ? null : i)} onUnlock={go} signedIn={isAuthenticated} />)}
      </div>

      <h2>Your deck, <em>in your brand.</em></h2>
      {view ? (
        <div className="kb-deckpeek">
          <div className="kb-slide"><BrandSlide k={view} i={peek[cur]} /></div>
          <div className="kb-thumbs">
            {peek.map((i, j) => <button key={i} className={j === cur ? "on" : ""} onClick={() => setCur(j)} aria-label={SLIDE_TITLES[view.slides[i]?.key]}><BrandSlide k={view} i={i} /></button>)}
            <div className="kb-more-slides">+6 more slides in your full kit</div>
          </div>
        </div>
      ) : <div className="kb-note">Your deck is still being written. It will show up here, and in your dashboard.</div>}

      {view && (
        <>
          <h2>Your teaser, <em>ready to attach.</em></h2>
          <div className="kb-teaser"><BrandTeaser k={view} page={1} /></div>
        </>
      )}
      {cta}
      <div className={`kb-stick${ctaSeen ? " gone" : ""}`}><button className="btn white" disabled={busy} onClick={go}><GoogleG />{busy ? "Opening…" : isAuthenticated ? <>Open my dashboard <em className="kb-free">Free</em></> : <>Read and send my pitches <em className="kb-free">Free</em></>}</button></div>
    </section>
  );
}

/** One of her top 5, tap to open: who, why, the score, and the start of the pitch (the rest after sign-in). */
function PickPeek({ r, open, onToggle, onUnlock, signedIn }: { r: Row; open: boolean; onToggle: () => void; onUnlock: () => void; signedIn: boolean }) {
  const [tab, setTab] = useState<"email" | "linkedin">("email");
  const d = r.draft!;
  const person = r.person && r.person !== r.displayName ? r.person : null;
  const body = tab === "email" ? d.body : d.linkedin ?? "";
  return (
    <article className={`kb-pick${open ? " open" : ""}`}>
      <button className="kb-pick-h" aria-expanded={open} onClick={onToggle}>
        <Dial score={r.score} size={46} />
        <span className="kb-pick-who"><b>{r.displayName}</b><span>{[person, r.title, r.city].filter(Boolean).join(" · ")}</span><em>{d.hook ?? d.reason}</em></span>
        <span className="kb-chev" aria-hidden="true">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="kb-pick-b">
          {r.website && <a className="kb-site" href={r.website} target="_blank" rel="noreferrer noopener">{host(r.website)} ↗</a>}
          <div className="kb-why2"><em>Why they fit you</em><ul>{d.whyFit.map((x) => <li key={x}>{x}</li>)}</ul>{d.watchOut.map((x) => <p key={x}>Watch out: {x}</p>)}</div>
          {r.parts.length > 0 && (
            <div className="kb-score"><em>Fit Score {r.score}, part by part</em>
              {r.parts.map((p) => <div key={p.key}><span>{p.label}</span><span className="kb-sbar"><i style={{ width: `${(p.got / Math.max(1, p.max)) * 100}%` }} /></span><b>{p.got}/{p.max}</b></div>)}
            </div>
          )}
          {r.sourceUrls.length > 0 && <span className="kb-dim">Sources: {r.sourceUrls.slice(0, 2).map(host).join(" · ")}{r.lastChecked ? ` · checked ${r.lastChecked}` : ""}</span>}
          <div className="kc-tabs" role="tablist"><button role="tab" aria-selected={tab === "email"} className={tab === "email" ? "on" : ""} onClick={() => setTab("email")}>Email</button><button role="tab" aria-selected={tab === "linkedin"} className={tab === "linkedin" ? "on" : ""} onClick={() => setTab("linkedin")}>LinkedIn note</button></div>
          <div className={`kb-mail${signedIn ? "" : " gated"}`}>
            {tab === "email" && <b>{d.subject}</b>}
            <p>{body}</p>
            {!signedIn && <div className="kb-gate"><span>🔒 Sign in free to read, edit and send it</span><button className="btn primary sm" onClick={onUnlock}>Read my pitch</button></div>}
          </div>
        </div>
      )}
    </article>
  );
}
