import { useEffect, useState } from "react";
import { Scaled } from "../landing/SampleDocs";
import { brandVars, loadBrandFont } from "./brand";
import { SLIDE_TITLES } from "./kitTypes";
import type { KitView, Slide } from "./kitTypes";

// Her deck and teaser, drawn from the words written for her (every number is one she gave us) in her brand.
// Slides are 960×540 and teaser pages A4 (794×1123), scaled to fit. Deck v3 (17 Oct), after real seed decks:
// a claim as the headline, a section tab, numbered steps, icon cards, big numbers. A slide we have no facts for
// shows sample content in the same design, marked "Sample" on the slide, until she gives us hers.

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
const MONTH = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const site = (u: string | null) => (u ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const SECTION: Record<string, string> = { problem: "The problem", solution: "Our solution", traction: "Traction", market: "Market", model: "Business model", competition: "Competition", team: "Team", ask: "The ask" };

const ICONS: Record<string, string> = {
  alert: "M12 3 2 20h20L12 3Zm0 6v5m0 3v.5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  coins: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5",
  check: "M4 12.5 9.5 18 20 6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  users: "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 9v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[d]} /></svg>;

function Mark({ k, light = false }: { k: KitView; light?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (k.brand.logo && !broken) return <img className={`bd-logo-img${light ? " light" : ""}`} src={k.brand.logo} alt="" onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
  return <span className={`bd-mark${light ? " light" : ""}`}>{initials(k.company) || "•"}</span>;
}
function RivalLogo({ r }: { r: { name: string; logo: string | null } }) {
  const [broken, setBroken] = useState(false);
  return r.logo && !broken ? <img src={r.logo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <i>{initials(r.name)}</i>;
}

/** The frame every content slide shares: claim headline with an accent, section tab, logo, page badge. */
function Frame({ k, s, n, children, dark = false }: { k: KitView; s: Slide; n: number; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`dk${dark ? " dark" : ""}${s.sample ? " is-sample" : ""}`}>
      <div className="dk-top">
        <div className="dk-hl"><span className="dk-tab">{SECTION[s.key] ?? SLIDE_TITLES[s.key]}</span><h2>{s.headline}</h2><i className="dk-dots" aria-hidden="true"><b /><b /><b /><b /></i></div>
        <div className="dk-brand"><Mark k={k} light={dark} /><span>{k.company}</span></div>
      </div>
      <div className="dk-body">{children}</div>
      <span className="dk-pg">{String(n).padStart(2, "0")}</span>
      {s.sample && <span className="dk-sample">Sample · replace with yours</span>}
    </div>
  );
}

/** "Product and tech: 45%" → a bar; anything else stays a line. */
const share = (p: string) => { const m = p.match(/^(.{2,40}?):\s*(\d{1,3})%$/); return m ? { label: m[1], pct: Math.min(100, Number(m[2])) } : null; };

function SlideBody({ k, s, n }: { k: KitView; s: Slide; n: number }) {
  const pts = s.points, m = s.metrics;
  switch (s.key) {
    case "cover":
      return (
        <div className="dk-cover">
          <div className="dk-cover-l">
            <div className="dk-cover-mark"><Mark k={k} light /></div>
            <h1>{k.company}</h1>
            <p>{s.headline}</p>
            {m.length > 0 && <div className="dk-chips">{m.slice(0, 3).map((x) => <span key={x.label}><b>{x.value}</b> {x.label}</span>)}</div>}
            <span className="dk-cover-meta">{k.stage} round · raising {k.ask} · {MONTH}</span>
          </div>
          <div className="dk-cover-r" aria-hidden="true"><span>{initials(k.company)}</span></div>
          <div className="dk-cover-foot"><span>{k.founder}, founder{k.website ? ` · ${site(k.website)}` : ""}</span><span>Confidential</span></div>
        </div>
      );
    case "problem":
      return (
        <Frame k={k} s={s} n={n}>
          <div className="dk-steps">{(pts.length ? pts : ["—"]).slice(0, 3).map((p, i, a) => (
            <div key={p} className="dk-step"><em>{String(i + 1).padStart(2, "0")}</em><span className="dk-ic"><Icon d={["alert", "clock", "coins"][i]} /></span><p>{p}</p>{i < a.length - 1 && <i className="dk-chev" aria-hidden="true" />}</div>
          ))}</div>
          {m.length > 0 && <div className="dk-band">{m.slice(0, 2).map((x) => <span key={x.label}><b>{x.value}</b>{x.label}</span>)}</div>}
        </Frame>
      );
    case "solution":
      return (
        <Frame k={k} s={s} n={n}>
          <div className="dk-cards">{pts.slice(0, 3).map((p, i) => <div key={p}><span className="dk-ic solid"><Icon d={["check", "bolt", "chart"][i]} /></span><p>{p}</p></div>)}</div>
          {m.length > 0 && <div className="dk-band">{m.slice(0, 3).map((x) => <span key={x.label}><b>{x.value}</b>{x.label}</span>)}</div>}
        </Frame>
      );
    case "traction":
      return (
        <Frame k={k} s={s} n={n}>
          <div className="dk-trac">
            <div className="dk-pills">{m.length ? m.slice(0, 3).map((x) => <div key={x.label}><span>{x.label}</span><b>{x.value}</b></div>) : pts.slice(0, 3).map((p) => <div key={p} className="txt"><span>{p}</span></div>)}</div>
            <div className="dk-chart">
              <em>Growth, month by month</em>
              <div className="dk-bars" aria-hidden="true">{[18, 26, 34, 47, 63, 84].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
              <span className="dk-chart-n">Sample chart · add 6 months of revenue or customers</span>
            </div>
          </div>
        </Frame>
      );
    case "market":
      return (
        <Frame k={k} s={s} n={n}>
          <div className="dk-mkt">
            <svg viewBox="0 0 220 220" className="dk-rings" aria-hidden="true"><circle cx="110" cy="110" r="104" /><circle cx="110" cy="134" r="72" /><circle cx="110" cy="160" r="42" /></svg>
            <div className="dk-mkt-list">{m.slice(0, 3).map((x, i) => <div key={x.label}><em>{["TAM", "SAM", "SOM"][i]}</em><b>{x.value}</b><span>{x.label}</span></div>)}
              {!m.length && pts.slice(0, 3).map((p) => <div key={p}><span>{p}</span></div>)}</div>
          </div>
          {m.length > 0 && pts[0] && <span className="dk-src">{pts[0]}</span>}
        </Frame>
      );
    case "model":
      return (
        <Frame k={k} s={s} n={n}>
          {m.length > 0 && <div className="dk-big">{m.slice(0, 3).map((x, i) => <div key={x.label}><span className="dk-ic solid"><Icon d={["coins", "chart", "target"][i]} /></span><b>{x.value}</b><span>{x.label}</span></div>)}</div>}
          {pts.length > 0 && <ul className="dk-ticks">{pts.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>}
        </Frame>
      );
    case "competition": {
      const rivals = k.rivals?.length ? k.rivals : (k.facts.competitors ? k.facts.competitors.split(/[,;]/).map((c) => ({ name: c.trim(), logo: null, where: "india" })).filter((c) => c.name) : []);
      return (
        <Frame k={k} s={s} n={n}>
          <div className="dk-vs">
            <div className="dk-vs-them"><em>Who else is building</em>
              {rivals.length ? <div className="dk-logos">{rivals.slice(0, 6).map((r) => <span key={r.name}><RivalLogo r={r} /><b>{r.name}</b><small>{r.where === "global" ? "Global" : "India"}</small></span>)}</div>
                : <div className="dk-logos">{["Spreadsheets and WhatsApp", "Agencies and consultants", "Large global tools"].map((x) => <span key={x}><i>•</i><b>{x}</b></span>)}</div>}
            </div>
            <div className="dk-vs-us"><em>Why {k.company} wins</em>{pts.slice(0, 3).map((p) => <span key={p}><b className="dk-tick">✓</b>{p}</span>)}</div>
          </div>
        </Frame>
      );
    }
    case "team": {
      const team = k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: k.founderLine ?? "" }];
      const sample = !k.facts.team.length;
      return (
        <Frame k={k} s={{ ...s, sample }} n={n}>
          <div className="dk-team">{team.slice(0, 4).map((t) => <div key={t.name}><span className="dk-av">{initials(t.name)}</span><b>{t.name}</b><em>{t.role}</em><span>{t.line || "Where you worked, what you built, why you"}</span></div>)}
            {sample && <div className="smp"><span className="dk-av">+</span><b>Priya Sharma</b><em>Co-founder, CTO</em><span>Ex-Razorpay engineering lead; built payments for 2M merchants</span></div>}</div>
        </Frame>
      );
    }
    case "ask": {
      const bars = pts.map(share).filter(Boolean) as { label: string; pct: number }[];
      const lines = pts.filter((p) => !share(p));
      return (
        <div className={`dk-ask${s.sample ? " is-sample" : ""}`}>
          <div className="dk-ask-l"><span className="dk-cover-meta">The ask</span><b>{k.ask}</b><span>{k.stage} round</span></div>
          <div className="dk-ask-r">
            <h2>{s.headline}</h2>
            {bars.length > 0 && <div className="dk-uof">{bars.map((x) => <div key={x.label}><span>{x.label}</span><i><b style={{ width: `${x.pct}%` }} /></i><em>{x.pct}%</em></div>)}</div>}
            {lines.length > 0 && <ul className="dk-ticks light">{lines.slice(0, 3).map((p) => <li key={p}>{p}</li>)}</ul>}
          </div>
          <div className="dk-cover-foot"><span>{k.founder} · {k.company}{k.website ? ` · ${site(k.website)}` : ""}</span><span>Thank you</span></div>
          {s.sample && <span className="dk-sample">Sample · replace with yours</span>}
        </div>
      );
    }
    default:
      return <Frame k={k} s={s} n={n}><ul className="dk-ticks">{pts.map((p) => <li key={p}>{p}</li>)}</ul></Frame>;
  }
}

export function BrandSlide({ k, i }: { k: KitView; i: number }) {
  useEffect(() => loadBrandFont(k.brand.font, k.brand.fontCss), [k.brand.font, k.brand.fontCss]);
  const s = k.slides[i];
  if (!s) return null;
  return <Scaled w={960} h={540}><div className="bd-wrap" style={brandVars(k.brand)}><SlideBody k={k} s={s} n={i + 1} /></div></Scaled>;
}

const Smp = ({ on }: { on?: boolean }) => (on ? <span className="bt-smp">Sample</span> : null);

/** The two-page teaser. */
export function BrandTeaser({ k, page }: { k: KitView; page: 1 | 2 }) {
  useEffect(() => loadBrandFont(k.brand.font, k.brand.fontCss), [k.brand.font, k.brand.fontCss]);
  const t = k.teaser;
  const slide = (key: string) => k.slides.find((s) => s.key === key);
  const traction = slide("traction");
  const market = slide("market"), model = slide("model"), comp = slide("competition"), ask = slide("ask");
  const team = k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: k.founderLine ?? "" }];
  return (
    <Scaled w={794} h={1123}>
      <div className="bt" style={brandVars(k.brand)}>
        <header className="bt-band"><Mark k={k} light /><div><b>{k.company}</b><span>{k.stage} · raising {k.ask}</span></div><span className="bt-pg">{page} / 2</span></header>
        {page === 1 ? (
          <div className="bt-body">
            <h1>{slide("cover")?.headline ?? ""}</h1>
            {t && <p className="bt-sum">{t.summary}</p>}
            {traction && traction.metrics.length > 0 && <div className="bt-kpis">{traction.metrics.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}<Smp on={traction.sample} /></div>}
            <div className="bt-two">
              <section><em>The problem</em><p>{slide("problem")?.headline}</p><ul>{slide("problem")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
              <section><em>Our solution</em><p>{slide("solution")?.headline}</p><ul>{slide("solution")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
            </div>
            {t && t.highlights.length > 0 && <section className="bt-hi"><em>Highlights</em><ul>{t.highlights.map((h) => <li key={h}>{h}</li>)}</ul></section>}
          </div>
        ) : (
          <div className="bt-body">
            <div className="bt-two">
              <section><em>Market <Smp on={market?.sample} /></em><p>{market?.headline}</p>{market && market.metrics.length > 0 && <div className="bt-mini">{market.metrics.map((x, i) => <span key={x.label}><i>{["TAM", "SAM", "SOM"][i]}</i><b>{x.value}</b></span>)}</div>}</section>
              <section><em>Business model <Smp on={model?.sample} /></em><p>{model?.headline}</p>{model && model.metrics.length > 0 ? <div className="bt-mini">{model.metrics.map((x) => <span key={x.label}><b>{x.value}</b><i>{x.label}</i></span>)}</div> : <ul>{model?.points.map((p) => <li key={p}>{p}</li>)}</ul>}</section>
            </div>
            <section><em>Competition <Smp on={comp?.sample && !k.rivals?.length} /></em><p>{comp?.headline}</p>
              {k.rivals?.length ? <div className="bt-rivals">{k.rivals.slice(0, 6).map((r) => <span key={r.name}>{r.name}<i>{r.where === "global" ? "Global" : "India"}</i></span>)}</div> : null}
              <ul>{comp?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
            <section><em>Team <Smp on={!k.facts.team.length && !k.founderLine} /></em><div className="bt-team">{team.map((m) => <div key={m.name}><b>{m.name}</b><span>{m.role}</span><span>{m.line}</span></div>)}</div></section>
            <section className="bt-ask"><em>The ask <Smp on={ask?.sample} /></em><b>{k.ask} · {k.stage}</b><ul>{ask?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
          </div>
        )}
        <footer className="bt-foot"><span>{k.founder}, founder · {k.company}{k.website ? ` · ${site(k.website)}` : ""}</span><span>Confidential</span></footer>
      </div>
    </Scaled>
  );
}
