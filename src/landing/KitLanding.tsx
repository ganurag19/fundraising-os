import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { savedInviteCode, savePrefill } from "../lib/token";
import { HeroBuild, InvestorCards, KitShowcase, PlanPicker, ProofStrip } from "./KitParts";
import { COMPARE, PLANS } from "./plans";
import InAppHint from "../components/InAppHint";

// The main landing page (since 16 Oct; was the /kit draft): the Raise Kit landing, on Relay Studio's skeleton: one input, the product working on screen,
// alternating "visual + one promise" sections, calm light theme. Example founder and investors are made up.

const WHY: ["data" | "engine" | "templates" | "circle", string, string][] = [
  ["data", "Our own investor data", "574 active investors who back Indian startups, mapped by hand and updated daily."],
  ["engine", "Matching on real deals", "A Fit Score from what each investor actually did, explained with sources."],
  ["templates", "Proven templates", "Deck, teaser and pitch structures from first rounds that closed."],
  ["circle", "A circle that's been there", "Founders who've raised, in your corner. On the Advisors plan."],
];

/** Small moving icons for "Why FirstCheq". */
function WhyIcon({ k }: { k: "data" | "engine" | "templates" | "circle" }) {
  return (
    <span className={`k5-ic ${k}`} aria-hidden="true">
      {k === "data" && <svg viewBox="0 0 32 32"><ellipse cx="16" cy="8" rx="10" ry="4" /><path d="M6 8v8c0 2.2 4.5 4 10 4s10-1.8 10-4V8" /><path className="k5-ic-mv" d="M6 16v8c0 2.2 4.5 4 10 4s10-1.8 10-4v-8" /></svg>}
      {k === "engine" && <svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" /><circle cx="16" cy="16" r="6" /><path className="k5-ic-spin" d="M16 16 L16 5" /><circle className="k5-ic-dot" cx="22" cy="11" r="2" /></svg>}
      {k === "templates" && <svg viewBox="0 0 32 32"><rect x="9" y="5" width="16" height="20" rx="3" /><rect className="k5-ic-mv" x="6" y="8" width="16" height="20" rx="3" /><path d="M10 15h8M10 19h8M10 23h5" /></svg>}
      {k === "circle" && <svg viewBox="0 0 32 32"><circle cx="16" cy="9" r="4" /><circle cx="7" cy="22" r="4" /><circle cx="25" cy="22" r="4" /><path className="k5-ic-dash" d="M13 12 L9 19 M19 12 L23 19 M11 22 H21" /></svg>}
    </span>
  );
}

const FAQ: [string, string][] = [
  ["Isn't an AI deck just generic?", "That's why the review matters. Upload the deck you already have and we review it like a seed investor would: what works, what to fix slide by slide, your thesis stress-tested, and whether to raise now or build traction first. Your deck, your numbers, no templates."],
  ["What do I need to start?", "Your website, or a few lines about your startup. Add an old deck or your CV if you have one, check the facts we found, and your kit is built. About 5 minutes."],
  ["Is the deck really in my brand?", "Yes. We take your logo, colours and fonts from your website and build the deck from our templates. You can edit every slide."],
  ["Do you make up numbers?", "Never. The kit uses your numbers. Market size and competition come with sources; anything we can't source is marked for you to fill in."],
  ["Do you send emails for me?", "Only when you swipe or press send. They go from your own Gmail, so replies come straight to you. LinkedIn notes you send yourself."],
  ["Who are the investors?", "574 investors who back Indian startups: angels, angel networks, accelerators, incubators, grants and seed funds, researched from their own sites and deal news, checked every week."],
  ["Can you guarantee funding?", "No one honestly can. A round depends on many things, from your traction to the market. Our job is to raise your odds and your speed: the right investors, a kit they take seriously, and a system that keeps you moving."],
];

export default function KitLanding() {
  const navigate = useNavigate();
  // Existing founders: sign in from the home page and land on their dashboard.
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();
  const [site, setSite] = useState("");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [soon, setSoon] = useState(false);
  // Concept page: every button explains that the full flow is coming, and offers what's live today.
  // The Raise Kit is live for the friends test: every "Get started" opens /build with her site (and the link's code, if any).
  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = new URLSearchParams();
    if (site.trim()) q.set("site", site.trim());
    const code = new URLSearchParams(location.search).get("code");
    if (code) q.set("code", code);
    navigate(`/build${q.toString() ? `?${q}` : ""}`);
  };
  const tryLive = () => {
    setSoon(false);
    if (site.trim()) savePrefill({ first: site.trim(), sectors: [], stage: "", ask: "" });
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };
  const cup = <svg className="k3-cup" viewBox="0 0 40 40" aria-hidden="true"><path className="st s1" d="M15 9c-2 2 2 3 0 6" /><path className="st s2" d="M21 7c-2 2 2 3 0 6" /><path className="st s3" d="M27 9c-2 2 2 3 0 6" /><path d="M8 18h24v6a10 10 0 0 1-10 10h-4A10 10 0 0 1 8 24z" fill="currentColor" /><path d="M32 20h2a4 4 0 0 1 0 8h-3" stroke="currentColor" strokeWidth="2.5" fill="none" /></svg>;
  // The brewing cup after "coffee": bigger, with three wisps of steam.
  const brew = <svg className="k5-brew" viewBox="0 0 40 40" aria-hidden="true"><path className="st s1" d="M15 10c-2.5 2.5 2.5 4 0 7.5" /><path className="st s2" d="M21 7c-2.5 2.5 2.5 4 0 7.5" /><path className="st s3" d="M27 10c-2.5 2.5 2.5 4 0 7.5" /><path d="M8 19h24v6a10 10 0 0 1-10 10h-4A10 10 0 0 1 8 25z" fill="currentColor" /><path d="M32 21h2a4 4 0 0 1 0 8h-3" stroke="currentColor" strokeWidth="2.5" fill="none" /></svg>;
  const input = (cls = "") => (
    <form className={`k2-input ${cls}`} onSubmit={start}>
      <span className="k2-www" aria-hidden="true">www.</span>
      <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourstartup.in" aria-label="Your website" autoCapitalize="none" inputMode="url" />
      <button className="btn primary" type="submit">Get started, free</button>
    </form>
  );

  return (
    <div className="theme-light k2">
      <div className="draft-bar">Early preview · for friends and colleagues · feedback welcome</div>
      <header className="k2-nav">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <nav><a href="#how">How it works</a><a href="#plans">Plans</a>{isAuthenticated ? <Link className="k5-signin" to="/app">My dashboard</Link> : <button className="k5-signin" data-track="click_signin" onClick={() => void signIn("google", { redirectTo: "/app" })}>Sign in</button>}<button className="btn primary sm" onClick={() => start()}>Get started, free</button></nav>
      </header>

      {/* Hero */}
      <section className="k2-hero">
        <h1>Your first round,<br /><em>ready in 5 minutes.</em></h1>
        <p className="k5-sub">Your investor deck and collateral, fully branded. Every active investor backing startups like yours, with a personal pitch to each. Swipe right to send, track and follow up.</p>
        {input("big")}
        <span className="k4-coffee">{cup}All the heavy lifting of your first round, done over a cup of coffee.</span>
        <span className="k2-alt">No website yet? <button className="text-link" onClick={() => start()}>Tell us about your startup</button></span>
        <a className="k6-hero-link" href="#review">✓ Already have a deck? <b>Get it reviewed like an investor would →</b></a>
        <InAppHint />
        <div className="k2-fan k5-fan" aria-hidden="true">
          <div className="f1 k2-mini deck"><span className="k5-tag">Deck · 9 slides</span><b>Kiln Labs</b><span>Seed · ₹3 Cr · in your brand</span></div>
          <div className="f2 k2-mini"><em>Fit 95</em><b>Verdant Arc</b><span>Backed GridLeaf at seed, 2025</span><span className="k5-src">Source: their portfolio page</span></div>
          <div className="f3 k2-mini mail"><span className="k5-tag blue">Pitch ready</span><b>After GridLeaf, kilns are next</b><span>Hi Meera, you backed GridLeaf when few funds would…</span></div>
          <div className="f4 k2-mini plan"><b>168</b><span>active investors fit you</span><i className="k5-pulse" /></div>
          <div className="f5 k2-mini live"><span className="k5-tag green">● Live</span><b>Northlight Seed opened your deck</b><span>Read 6 of 9 slides · 2 min ago</span></div>
          <div className="f6 k2-mini teaser"><span className="k5-tag">Teaser</span><b>Two pages, ready to attach</b><span>Problem, proof, team, the ask</span></div>
          <div className="f7 k2-mini mail"><span className="k5-tag amber">Follow-up · day 3</span><b>Re: Your FurnaceIQ cheque</b><span>Written and scheduled for you</span></div>
        </div>
      </section>

      <ProofStrip />


      {/* 1: just your website */}
      <section className="k2-row" id="how">
        <div className="k2-visual"><HeroBuild /></div>
        <div className="k2-copy"><span className="k2-k">Step 1</span><h2>Give us your website.<br />You're in the game.</h2><p>We read your site (and your old deck or CV, if you add one), then build your deck, teaser and profile in your brand, research your market and competition, match you with active investors, and write a pitch tailored to each one. No forms, no blank slides.</p></div>
      </section>

      {/* 2: the kit */}
      <section className="k2-row flip">
        <div className="k2-visual"><KitShowcase /></div>
        <div className="k2-copy"><span className="k2-k">Step 2</span><h2>Everything an investor will ask for.<br />Made for you, in minutes.</h2><p>A 9-slide deck in your brand, a two-page teaser, the 20 questions investors will ask with your answers drafted, and a data room checklist. Your numbers only; gaps are marked, never made up.</p></div>
      </section>

      {/* 2b: deck and pitch review */}
      <section className="k2-row k6-review" id="review">
        <div className="k2-visual">
          <div className="k6-rv" aria-label="Example review of a made-up startup's deck">
            <div className="k6-rv-top"><div className="k6-ring"><b>46</b><span>/100</span></div><div><span className="k6-verdict">Raise after these fixes</span><p>62 paying kilns is real traction for seed. The deck hides it: no growth chart, no sourced market, no use of funds.</p></div></div>
            <div className="k6-fix high"><em>High impact · Traction</em><b>"Up from 9 in March" has no trend or date.</b><span>→ Chart paying kilns month by month, with churn.</span></div>
            <div className="k6-fix high"><em>High impact · Problem</em><b>"Coal is 40% of cost" has no source or ₹ loss.</b><span>→ Show a typical kiln's monthly coal bill and what 18% saves.</span></div>
            <div className="k6-test"><em>Thesis stress test · high risk</em><b>Does it really cut coal use, and by how much?</b><span>Answer with before-and-after numbers from two named kilns.</span></div>
            <p className="muted small">Example review of a made-up startup.</p>
          </div>
        </div>
        <div className="k2-copy"><span className="k2-k">Already have a deck?</span><h2>Get it reviewed<br />like an investor would.</h2><p>Upload your deck. We read it the way a seed investor does before a first call, then tell you plainly: your readiness score, whether to raise now or build traction first, the weak points slide by slide with exactly what to fix, your thesis stress-tested, and the questions you'll face.</p><p className="k6-not">Not a template. A second pair of eyes on <b>your</b> deck.</p></div>
      </section>

      {/* 3: who's investing in you */}
      <section className="k2-wide">
        <span className="k2-k">Step 3</span>
        <h2>See who's investing in<br /><em>startups like yours.</em></h2>
        <p className="k2-sub">Pick your space, stage and round. These are real counts from our research, and your plan tells you who to approach first.</p>
        <PlanPicker />
      </section>

      {/* 4: swipe */}
      <section className="k2-row">
        <div className="k2-visual"><InvestorCards /></div>
        <div className="k2-copy"><span className="k2-k">Step 4</span><h2>Swipe right on<br />investors who fit.</h2><p>One investor at a time: why they fit, with the source, and your pitch, written to them. Swipe right to send, left to pass. Change the words first if you want. You decide what goes out.</p></div>
      </section>

      {/* 5: scheduled */}
      <section className="k2-row flip">
        <div className="k2-visual">
          <div className="k2-cal" aria-label="Example: pitches spread across two weeks">
            <div className="k2-cal-h"><b>October</b><span>10 pitches · 6 follow-ups</span></div>
            <div className="k2-cal-g">
              {Array.from({ length: 21 }, (_, i) => i + 13).map((d) => {
                const wd = (d + 3) % 7; const weekend = wd === 5 || wd === 6;
                const pitch = !weekend && d <= 24 && d % 2 === 1; const fu = !weekend && d >= 20 && d % 3 === 0;
                return <div key={d} className={`k2-day${weekend ? " off" : ""}${pitch ? " p" : ""}${fu ? " f" : ""}`}><span>{d}</span>{pitch && <i>Pitch</i>}{fu && <i className="fu">Follow-up</i>}</div>;
              })}
            </div>
          </div>
        </div>
        <div className="k2-copy"><span className="k2-k">Step 5</span><h2>Sent, scheduled, followed up.<br />In one swipe.</h2><p>Connect Gmail once. We spread your pitches across working days, so they land well and your inbox stays healthy, then write each follow-up on day 3 and day 10. Replies come straight to you.</p></div>
      </section>

      {/* 6: replies, and who checked you out */}
      <section className="k2-row">
        <div className="k2-visual">
          <div className="k5-room">
            <div className="k5-room-h"><b>Your pitch profile</b><span>firstcheq.ai/p/kilnlabs · private</span></div>
            <div className="k5-room-stats">{[["128", "views"], ["34", "investors"], ["19", "deck opens"], ["6", "asked to meet"]].map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}</div>
            <div className="k5-feed">
              <div className="hot"><i>●</i><span><b>Verdant Arc</b> asked to meet</span><em>Reply today</em></div>
              <div><i>●</i><span><b>Northlight Seed</b> read 6 of 9 slides, twice</span><em>Warm: follow up</em></div>
              <div><i>●</i><span><b>Kestrel Ridge Angels</b> asked for access</span><em>Approve</em></div>
              <div className="quiet"><i>●</i><span><b>Monsoon Ventures</b> hasn't opened yet</span><em>Day 3 nudge</em></div>
            </div>
            <p className="muted small">Example numbers and made-up investors.</p>
          </div>
        </div>
        <div className="k2-copy"><span className="k2-k">Step 6</span><h2>See who replied, who checked you out,<br />and what to do next.</h2><p>Your private pitch profile shows who opened your deck, which slides they read, and who asked to meet. Every investor sits in one pipeline: waiting, replied, meeting, passed. When someone replies, follow-ups stop, and your next move is on top.</p></div>
      </section>

      {/* Compare */}
      <section className="k2-wide">
        <h2>Weeks of anxiety, <span className="nowrap">₹50K–1L</span> a month or <span className="nowrap">1–6%</span> of your company.<br /><em>Or one evening, over a cup of coffee.</em>{brew}</h2>
        <div className="k2-vs k5-vs">
          <div>
            <span className="k5-vs-k">The usual way</span><b>Why most first raises stall</b>
            <ul className="k5-pain">
              <li>Weeks stuck on the deck and teaser, never quite ready</li>
              <li>Days googling which investors might fit</li>
              <li>Spray and pray: one generic email to the wrong investors</li>
              <li>No system: lost threads and forgotten follow-ups</li>
              <li>Hanging on two or three investors, then getting ghosted</li>
              <li>Anxiety, burnout, and many give up</li>
              <li>Advisors at ₹50K–1L a month, or 1–6% of your equity</li>
            </ul>
          </div>
          <div className="us">
            <span className="k5-vs-k">With FirstCheq</span><b>Founders who raise follow a system</b>
            <ul className="k5-gain">
              <li>Your deck, teaser and profile in your brand, tonight</li>
              <li>Every active investor who fits, ranked, with the reason</li>
              <li>A personal pitch to each, ready to swipe</li>
              <li>Follow-ups written and scheduled, so momentum builds every week</li>
              <li>You see who's warm, and what to do next</li>
              <li>One price per round. No equity.</li>
            </ul>
          </div>
        </div>
        <p className="k5-hope">Hope is not a strategy. <em>A system is.</em></p>
      </section>

      {/* Why us: not just an AI wrapper */}
      <section className="k2-wide">
        <span className="k2-k">Why FirstCheq</span>
        <h2>Not another AI wrapper.<br /><em>Built on data, people and networks AI can't make up (yet).</em></h2>
        <div className="k2-why">
          {WHY.map(([ic, t, d]) => <div key={t} className="k2-why-card"><WhyIcon k={ic} /><b>{t}</b><p>{d}</p></div>)}
        </div>
        <p className="k2-sub" style={{ marginTop: 6 }}>And nothing in your kit is made up: every number is one you gave us.</p>
      </section>

      {/* Plans (no prices while it's a concept) */}
      <section className="k2-wide" id="plans">
        <h2>Pick how much help<br /><em>you want.</em></h2>
        <p className="k2-sub">One payment per round. No subscription. Founding access for the first founders.</p>
        <div className="k3-plans">
          {PLANS.map((p) => (
            <div key={p.name} className={`k3-plan${p.rec ? " rec" : ""}`}>
              {p.badge && <span className={`k3-badge${p.rec ? "" : " dark"}`}>{p.badge}</span>}
              <div className="k3-top"><span className="k3-ic" aria-hidden="true">{p.icon}</span><div><b>{p.name}</b><span>{p.line}</span></div></div>
              <span className={`k3-tag${p.rec ? " gold" : ""}`}>{p.tag}</span>
              {p.groups.map(([g, items]) => (
                <div key={g} className="k3-group"><em>{g}</em><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></div>
              ))}
              <span className="k3-best"><b>Best for:</b> {p.best}</span>
              <button className={`btn ${p.rec ? "primary" : "ghost"}`} onClick={() => start()}>{p.cta}</button>
            </div>
          ))}
        </div>

        <h3 className="k5-table-h">Compare plans</h3>
        <div className="k3-compare" role="table" aria-label="What each plan includes">
          <div className="k3-row head" role="row"><span /><span>Preview</span><span>Raise Kit</span><span>+ Advisors</span><span>Done for you</span></div>
          {COMPARE.map(([label, ...cells]) => (
            <div className="k3-row" role="row" key={label}><span>{label}</span>{cells.map((c, k) => <span key={k} className={c === "✓" ? "y" : c === "–" ? "n" : ""}>{c}</span>)}</div>
          ))}
        </div>

        <div className="k3-credits"><span className="k3-ic" aria-hidden="true">＋</span><div><b>Credits for later</b><span>More revisions, more investors, or a fresh kit for your next round. Top up any time.</span></div></div>

        <div className="k3-dfy">
          <div className="k3-dfy-h"><span className="k2-k light">Done for you</span><b>We run your raise with you.</b><p>A small team works on your round from day one to term sheet. You stay in every decision and send every email.</p><button className="btn white" onClick={() => setSoon(true)}>Book a call</button></div>
          <ol className="k3-timeline">
            {[["Week 1", "Raise strategy, target list and your full kit, reviewed with you"], ["Weeks 2–6", "Outreach run together every working day, with follow-ups"], ["Throughout", "Warm connects from our network of founders and investors"], ["Every meeting", "Prep before each investor call, notes and next steps after"], ["Term sheet", "What to ask, what to push back on, and partner lawyers when you need one"]].map(([w, d]) => <li key={w}><b>{w}</b><span>{d}</span></li>)}
          </ol>
        </div>
        <p className="k5-honest">No one can guarantee funding: a round depends on many things, from your traction to the market. Our job is to raise your odds and your speed, and to equip you as fully as we can.</p>
      </section>

      {/* FAQ */}
      <section className="k2-wide">
        <h2>Questions</h2>
        <div className="k2-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><div className="k2-faq-a"><p>{a}</p></div></details>)}</div>
      </section>

      <section className="k2-end">
        <h2>Get your round<br /><em>ready tonight.</em></h2>
        {input("big")}
        <span className="k2-alt">Free to start · About 5 minutes · For first-time founders in India</span>
      </section>

      <footer className="k2-foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Nothing is sent without your swipe · Example founder and investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></footer>
      {soon && (
        <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && setSoon(false)}>
          <div className="sheet rise k2-soon" role="dialog" aria-modal="true" aria-label="Coming soon">
            <button className="xbtn" style={{ alignSelf: "flex-end" }} onClick={() => setSoon(false)} aria-label="Close">✕</button>
            <span className="k2-k">Coming soon</span>
            <h2>The Raise Kit is being built.</h2>
            <p>The full flow (your branded deck, the kit and swipe-to-send) opens to founding founders first. Join the list and we'll let you in as soon as it's ready.</p>
            <p className="muted small">Today you can already try FirstCheq's investor matching and personal pitches.</p>
            <button className="btn primary" onClick={() => { setSoon(false); setSheet("request"); }}>Join the founding list</button>
            <button className="btn ghost" onClick={tryLive}>Try what's live today</button>
          </div>
        </div>
      )}
      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
