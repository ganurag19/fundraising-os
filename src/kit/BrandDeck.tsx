import { useEffect, useState } from "react";
import { Scaled } from "../landing/SampleDocs";
import { brandVars, loadBrandFont } from "./brand";

// Her deck and teaser, drawn from the words written for her (every number is one she gave us) in her brand.
// Slides are 960×540 and teaser pages A4 (794×1123), scaled to fit. A missing fact shows as "To add", never invented.

import { SLIDE_TITLES } from "./kitTypes";
import type { KitView, Slide } from "./kitTypes";

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
const MONTH = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const site = (u: string | null) => (u ?? "").replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

function Mark({ k, light = false }: { k: KitView; light?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (k.brand.logo && !broken) return <img className={`bd-logo-img${light ? " light" : ""}`} src={k.brand.logo} alt="" onError={() => setBroken(true)} referrerPolicy="no-referrer" />;
  return <span className={`bd-mark${light ? " light" : ""}`}>{initials(k.company) || "•"}</span>;
}

function Head({ k, n, label, dark = false }: { k: KitView; n: number; label: string; dark?: boolean }) {
  return <div className={`bd-head${dark ? " dark" : ""}`}><Mark k={k} light={dark} /><span>{k.company} · {label}</span><span>{String(n).padStart(2, "0")}</span></div>;
}
const ICONS: Record<string, string> = {
  alert: "M12 3 2 20h20L12 3Zm0 6v5m0 3v.5",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l3 2",
  coins: "M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Zm0 0v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5",
  check: "M4 12.5 9.5 18 20 6",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
};
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[d]} /></svg>;
/** A slide we lay out for her to fill: her own numbers go in the blanks. */
const Template = () => <span className="bd-tpl">Template · add your numbers</span>;
const Blank = ({ w = 90 }: { w?: number }) => <i className="bd-blank" style={{ width: w }} />;
const ToAdd = ({ children }: { children: React.ReactNode }) => <div className="bd-toadd"><b>To add</b><span>{children}</span></div>;

function SlideBody({ k, s, n }: { k: KitView; s: Slide; n: number }) {
  const title = SLIDE_TITLES[s.key] ?? s.key;
  const pts = s.points, m = s.metrics;
  switch (s.key) {
    case "cover":
      return (
        <div className="bd bd-cover">
          <Head k={k} n={n} label="Investor presentation" dark />
          <div className="bd-cover-body">
            <span className="bd-eyebrow"><i className="bd-pill">{k.stage} round</i> Raising {k.ask} · {MONTH}</span>
            <h1>{k.company}</h1>
            <p>{s.headline}</p>
            {m.length > 0 && <div className="bd-chips">{m.slice(0, 3).map((x) => <span key={x.label}><b>{x.value}</b> {x.label}</span>)}</div>}
          </div>
          <div className="bd-orbs" aria-hidden="true"><i /><i /><i /></div>
          <div className="bd-glow" aria-hidden="true" />
          <div className="bd-foot dark"><span>{k.founder}, founder{k.website ? ` · ${site(k.website)}` : ""}</span><span>Confidential</span></div>
        </div>
      );
    case "traction":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline}</h2>
          <div className="bd-trac">
            <div className="bd-trac-l">
              {m.length ? <div className={`bd-kpis${m.length > 2 ? " three" : ""}`}>{m.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</div> : <ToAdd>Your one number first: paying customers, revenue or pilots.</ToAdd>}
              {pts.length > 0 && m.length < 3 && <ul className="bd-list">{pts.slice(0, 2).map((p) => <li key={p}>{p}</li>)}</ul>}
            </div>
            <div className="bd-chart">
              <em>Growth, month by month</em>
              <div className="bd-bars" aria-hidden="true">{[22, 30, 36, 48, 61, 78].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
              <span>Add 6 months of revenue or customers to chart your growth</span>
            </div>
          </div>
        </div>
      );
    case "market":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline || "A market worth building for"}</h2>
          {m.length ? (
            <div className="bd-mkt">
              <svg viewBox="0 0 200 200" className="bd-rings" aria-hidden="true"><circle cx="100" cy="100" r="96" /><circle cx="100" cy="120" r="66" /><circle cx="100" cy="142" r="38" /></svg>
              <div className="bd-mkt-list">{m.map((x, i) => <div key={x.label}><em>{["TAM", "SAM", "SOM"][i] ?? ""}</em><b>{x.value}</b><span>{x.label}</span></div>)}</div>
            </div>
          ) : (
            <div className="bd-mkt">
              <svg viewBox="0 0 200 200" className="bd-rings ghost" aria-hidden="true"><circle cx="100" cy="100" r="96" /><circle cx="100" cy="120" r="66" /><circle cx="100" cy="142" r="38" /></svg>
              <div className="bd-mkt-list">{[["TAM", "Everyone who could buy"], ["SAM", "Who you can reach"], ["SOM", "Who you'll win in 3 years"]].map(([a, b]) => <div key={a}><em>{a}</em><b className="ph">₹ <Blank w={70} /> Cr</b><span>{b} · source <Blank w={80} /></span></div>)}</div>
            </div>
          )}
          {pts.length > 0 && <ul className="bd-list">{pts.map((p) => <li key={p}>{p}</li>)}</ul>}
          {!m.length && <Template />}
        </div>
      );
    case "competition":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline || `Who else is building, and why ${k.company} wins`}</h2>
          <div className="bd-vs">
            <div><em>{k.rivals?.length ? "Who else is building" : "Today"}</em>
              {k.rivals?.length
                ? <div className="bd-rivals">{k.rivals.slice(0, 6).map((r) => <span key={r.name}><RivalLogo r={r} /><b>{r.name}</b><small>{r.where === "global" ? "Global" : "India"}</small></span>)}</div>
                : (k.facts.competitors ? k.facts.competitors.split(/[,;]/).slice(0, 4) : ["The way it's done today"]).map((c) => <span key={c}>{c.trim()}</span>)}
            </div>
            <div className="us"><em>With {k.company}</em>{pts.length ? pts.map((p) => <span key={p}>✓ {p}</span>) : <>{[1, 2, 3].map((i) => <span key={i} className="ph">✓ What you do better <Blank w={120} /></span>)}</>}</div>
          </div>
          {!pts.length && <Template />}
        </div>
      );
    case "team": {
      const team = k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: "" }];
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline || `The team building ${k.company}`}</h2>
          <div className="bd-team">{team.slice(0, 4).map((t) => <div key={t.name}><span className="bd-av">{initials(t.name)}</span><b>{t.name}</b><em>{t.role}</em><span>{t.line || "Your background in one line: where you worked, what you built"}</span></div>)}
            {team.length < 3 && <div className="ph"><span className="bd-av ph">+</span><b>Co-founder or key hire</b><em>Role</em><span>Why they're the right person for this</span></div>}</div>
        </div>
      );
    }
    case "ask":
      return (
        <div className="bd bd-askslide">
          <Head k={k} n={n} label={title} dark />
          <div className="bd-ask">
            <div><span className="bd-eyebrow">Raising</span><b className="bd-amount">{k.ask}</b><span className="bd-stage">{k.stage} round</span></div>
            <div><h2>{s.headline || "What this round gets us to"}</h2>{pts.length ? <ul className="bd-list light">{pts.map((p) => <li key={p}>{p}</li>)}</ul> : (
              <div className="bd-uof">{["Product and tech", "Sales and growth", "Team"].map((x) => <div key={x}><span>{x}</span><i><b /></i><em><Blank w={34} />%</em></div>)}<span className="bd-uof-n">Add your split and the milestone it reaches</span></div>
            )}</div>
          </div>
          <div className="bd-foot dark"><span>{k.founder} · {k.company}{k.website ? ` · ${site(k.website)}` : ""}</span><span>Thank you</span></div>
        </div>
      );
    default: { // problem, solution, model
      if (s.key === "model" && !s.headline && !pts.length) return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>How {k.company} makes money</h2>
          <div className="bd-cards">
            <div className="ph"><span className="bd-ic"><Icon d="coins" /></span><b>Price</b><span>₹ <Blank w={60} /> per <Blank w={60} /></span></div>
            <div className="ph"><span className="bd-ic"><Icon d="check" /></span><b>Who pays</b><span><Blank w={150} /></span></div>
            <div className="ph"><span className="bd-ic"><Icon d="chart" /></span><b>Margin and payback</b><span><Blank w={40} />% margin · <Blank w={40} /> months</span></div>
          </div>
          <Template />
        </div>
      );
      const icons = s.key === "problem" ? ["alert", "clock", "coins"] : ["check", "bolt", "chart"];
      const cards = pts.length ? <div className={`bd-cards${s.key === "problem" ? " pain" : ""}`}>{pts.slice(0, 3).map((p, i) => <div key={p}><span className="bd-ic"><Icon d={icons[i]} /></span><span>{p}</span></div>)}</div> : <ToAdd>Your {title.toLowerCase()}, in two or three lines.</ToAdd>;
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline || <span className="bd-dim">Add your {title.toLowerCase()}</span>}</h2>
          {m.length ? <div className="bd-split">{cards}<div className="bd-kpis col">{m.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</div></div> : cards}
        </div>
      );
    }
  }
}

function RivalLogo({ r }: { r: { name: string; logo: string | null } }) {
  const [broken, setBroken] = useState(false);
  return r.logo && !broken ? <img src={r.logo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <i>{initials(r.name)}</i>;
}

export function BrandSlide({ k, i }: { k: KitView; i: number }) {
  useEffect(() => loadBrandFont(k.brand.font, k.brand.fontCss), [k.brand.font, k.brand.fontCss]);
  const s = k.slides[i];
  if (!s) return null;
  return <Scaled w={960} h={540}><div className="bd-wrap" style={brandVars(k.brand)}><SlideBody k={k} s={s} n={i + 1} /></div></Scaled>;
}

/** The two-page teaser. Page 2 is what the full kit opens. */
export function BrandTeaser({ k, page }: { k: KitView; page: 1 | 2 }) {
  useEffect(() => loadBrandFont(k.brand.font, k.brand.fontCss), [k.brand.font, k.brand.fontCss]);
  const t = k.teaser;
  const slide = (key: string) => k.slides.find((s) => s.key === key);
  const traction = slide("traction")?.metrics ?? [];
  return (
    <Scaled w={794} h={1123}>
      <div className="bt" style={brandVars(k.brand)}>
        <header className="bt-band"><Mark k={k} light /><div><b>{k.company}</b><span>{k.stage} · raising {k.ask}</span></div><span className="bt-pg">{page} / 2</span></header>
        {page === 1 ? (
          <div className="bt-body">
            <h1>{slide("cover")?.headline ?? ""}</h1>
            {t && <p className="bt-sum">{t.summary}</p>}
            {traction.length > 0 && <div className="bt-kpis">{traction.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</div>}
            <div className="bt-two">
              <section><em>The problem</em><p>{slide("problem")?.headline}</p><ul>{slide("problem")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
              <section><em>Our solution</em><p>{slide("solution")?.headline}</p><ul>{slide("solution")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
            </div>
            {t && t.highlights.length > 0 && <section className="bt-hi"><em>Highlights</em><ul>{t.highlights.map((h) => <li key={h}>{h}</li>)}</ul></section>}
          </div>
        ) : (
          <div className="bt-body">
            <div className="bt-two">
              <section><em>Market</em><p>{slide("market")?.headline}</p><ul>{slide("market")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
              <section><em>Business model</em><p>{slide("model")?.headline}</p><ul>{slide("model")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
            </div>
            <section><em>Competition</em><p>{slide("competition")?.headline}</p></section>
            <section><em>Team</em><div className="bt-team">{(k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: "" }]).map((m) => <div key={m.name}><b>{m.name}</b><span>{m.role}</span><span>{m.line}</span></div>)}</div></section>
            <section className="bt-ask"><em>The ask</em><b>{k.ask} · {k.stage}</b><ul>{slide("ask")?.points.map((p) => <li key={p}>{p}</li>)}</ul></section>
          </div>
        )}
        <footer className="bt-foot"><span>{k.founder}, founder · {k.company}{k.website ? ` · ${site(k.website)}` : ""}</span><span>Confidential</span></footer>
      </div>
    </Scaled>
  );
}
