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
            <span className="bd-eyebrow">{k.stage} round · {k.ask} · {MONTH}</span>
            <h1>{k.company}</h1>
            <p>{s.headline}</p>
            {m.length > 0 && <div className="bd-chips">{m.slice(0, 3).map((x) => <span key={x.label}><b>{x.value}</b> {x.label}</span>)}</div>}
          </div>
          <div className="bd-orbs" aria-hidden="true"><i /><i /><i /></div>
          <div className="bd-foot dark"><span>{k.founder}, founder{k.website ? ` · ${site(k.website)}` : ""}</span><span>Confidential</span></div>
        </div>
      );
    case "traction":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline}</h2>
          {m.length ? <div className="bd-kpis">{m.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</div> : <ToAdd>Your numbers: paying customers, revenue, growth or pilots. Investors look for one number first.</ToAdd>}
          {pts.length > 0 && <ul className="bd-list">{pts.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      );
    case "market":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline}</h2>
          {m.length ? (
            <div className="bd-mkt">
              <svg viewBox="0 0 200 200" className="bd-rings" aria-hidden="true"><circle cx="100" cy="100" r="96" /><circle cx="100" cy="120" r="66" /><circle cx="100" cy="142" r="38" /></svg>
              <div className="bd-mkt-list">{m.map((x, i) => <div key={x.label}><em>{["TAM", "SAM", "SOM"][i] ?? ""}</em><b>{x.value}</b><span>{x.label}</span></div>)}</div>
            </div>
          ) : <ToAdd>Your market size (TAM, SAM, SOM) with a source. We never make these up; add yours and we'll lay it out.</ToAdd>}
          {pts.length > 0 && <ul className="bd-list">{pts.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      );
    case "competition":
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline}</h2>
          <div className="bd-vs">
            <div><em>Today</em>{(k.facts.competitors ? k.facts.competitors.split(/[,;]/).slice(0, 4) : ["The way it's done today"]).map((c) => <span key={c}>{c.trim()}</span>)}</div>
            <div className="us"><em>With {k.company}</em>{pts.length ? pts.map((p) => <span key={p}>✓ {p}</span>) : <span>How you're different</span>}</div>
          </div>
        </div>
      );
    case "team": {
      const team = k.facts.team.length ? k.facts.team : [{ name: k.founder, role: "Founder", line: "" }];
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline}</h2>
          <div className="bd-team">{team.slice(0, 4).map((t) => <div key={t.name}><span className="bd-av">{initials(t.name)}</span><b>{t.name}</b><em>{t.role}</em><span>{t.line}</span></div>)}</div>
        </div>
      );
    }
    case "ask":
      return (
        <div className="bd bd-askslide">
          <Head k={k} n={n} label={title} dark />
          <div className="bd-ask">
            <div><span className="bd-eyebrow">Raising</span><b className="bd-amount">{k.ask}</b><span className="bd-stage">{k.stage} round</span></div>
            <div><h2>{s.headline}</h2>{pts.length ? <ul className="bd-list light">{pts.map((p) => <li key={p}>{p}</li>)}</ul> : <ToAdd>What the round pays for, and the milestones it gets you to.</ToAdd>}</div>
          </div>
          <div className="bd-foot dark"><span>{k.founder} · {k.company}{k.website ? ` · ${site(k.website)}` : ""}</span><span>Thank you</span></div>
        </div>
      );
    default: // problem, solution, model
      return (
        <div className="bd">
          <Head k={k} n={n} label={title} />
          <h2>{s.headline || <span className="bd-dim">Add your {title.toLowerCase()}</span>}</h2>
          {(() => {
            const feats = pts.length ? <div className="bd-feats">{pts.map((p, i) => <div key={p}><span className="bd-num">{i + 1}</span><span>{p}</span></div>)}</div> : <ToAdd>Your {title.toLowerCase()}, in two or three lines.</ToAdd>;
            return m.length ? <div className="bd-split">{feats}<div className="bd-kpis">{m.map((x) => <div key={x.label}><b>{x.value}</b><span>{x.label}</span></div>)}</div></div> : feats;
          })()}
        </div>
      );
  }
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
