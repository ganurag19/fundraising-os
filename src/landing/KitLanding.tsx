import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { savedInviteCode, savePrefill } from "../lib/token";
import { HeroBuild, InvestorCards, KitShowcase, PlanPicker, ProofStrip } from "./KitParts";

// DRAFT (dev only, /kit): the Raise Kit landing, on Relay Studio's skeleton: one input, the product working on screen,
// alternating "visual + one promise" sections, calm light theme. Example founder and investors are made up.

const FAQ: [string, string][] = [
  ["What do I need to start?", "Your website (or a few lines about your startup), your stage and how much you're raising. Then 5 quick questions. About 5 minutes."],
  ["Is the deck really in my brand?", "Yes. We take your logo, colours and fonts from your website and build the deck from our templates. You can edit every slide."],
  ["Do you make up numbers?", "Never. The kit uses your numbers. Market size and competition come with sources; anything we can't source is marked for you to fill in."],
  ["Do you send emails for me?", "Only when you swipe or press send. They go from your own Gmail, so replies come straight to you. LinkedIn notes you send yourself."],
  ["Who are the investors?", "574 investors who back Indian startups: angels, angel networks, accelerators, incubators, grants and seed funds, researched from their own sites and deal news, checked every week."],
  ["Can you guarantee funding?", "No one honestly can. We make sure your first pitches go to investors who fit, with a kit they'll take seriously, in days instead of weeks."],
];

type Plan = { name: string; icon: string; line: string; tag: string; badge?: string; rec?: boolean; groups: [string, string[]][]; best: string; cta: string };
const PLANS: Plan[] = [
  { name: "Preview", icon: "◔", line: "See your kit before you decide", tag: "Free", cta: "Start free", best: "Seeing if FirstCheq fits you",
    groups: [["Plan", ["Your raise plan: who to approach, in order"]], ["Kit", ["Deck cover and 2 slides, in your brand"]], ["Outreach", ["Top 3 investors, each with a pitch", "Swipe to send on those 3"]]] },
  { name: "Raise Kit", icon: "◆", line: "Everything you need to go out and raise", tag: "Founding access", badge: "Most founders", rec: true, cta: "Get founding access", best: "Founders ready to raise in the next 3 months",
    groups: [["Kit, in your brand", ["10-slide investor-ready deck (PowerPoint, Google Slides, PDF)", "Two-page teaser", "The 20 investor questions, answers drafted", "Market size and competition, with sources", "Funding trends in your sector", "Data room checklist and templates"]], ["Investors", ["Everyone who fits (up to 100), ranked, with the reason"]], ["Outreach", ["A pitch, LinkedIn note and intro blurb for each", "Swipe to send and schedule from your Gmail", "Follow-ups on day 3 and day 10"]], ["Support", ["3 rounds of revisions"]]] },
  { name: "Raise Kit + Advisors", icon: "✦", line: "Learn from founders who've already raised", tag: "Founding access", badge: "For a faster round", cta: "Request access", best: "Founders who want a second pair of eyes and warm doors",
    groups: [["Everything in Raise Kit, plus", ["Advisory calls with founders who've raised their first round", "Your deck and story pressure-tested before you send", "Warm connects through our founders' networks, when you're ready", "Mock investor Q&A before your first meetings"]], ["Support", ["Priority help while you raise"]]] },
];
const COMPARE: [string, string, string, string, string][] = [
  ["Raise plan and sequence", "✓", "✓", "✓", "✓"],
  ["Deck and teaser in your brand", "Cover + 2", "✓", "✓", "✓"],
  ["Investor Q&A, market, competition", "–", "✓", "✓", "✓"],
  ["Investors who fit, with reasons", "Top 3", "Up to 100", "Up to 100", "Up to 100"],
  ["Personal pitches and follow-ups", "3", "✓", "✓", "✓"],
  ["Swipe to send from Gmail", "3", "✓", "✓", "✓"],
  ["Advisory calls with funded founders", "–", "–", "✓", "✓"],
  ["Warm connects", "–", "–", "✓", "✓"],
  ["Outreach run with you, day to day", "–", "–", "–", "✓"],
  ["Meeting prep and term-sheet support", "–", "–", "Q&A prep", "✓"],
];

export default function KitLanding() {
  const navigate = useNavigate();
  const [site, setSite] = useState("");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [soon, setSoon] = useState(false);
  // Concept page: every button explains that the full flow is coming, and offers what's live today.
  const start = (e?: React.FormEvent) => { e?.preventDefault(); setSoon(true); };
  const tryLive = () => {
    setSoon(false);
    if (site.trim()) savePrefill({ first: site.trim(), sectors: [], stage: "", ask: "" });
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  const input = (cls = "") => (
    <form className={`k2-input ${cls}`} onSubmit={start}>
      <span className="k2-www" aria-hidden="true">www.</span>
      <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourstartup.in" aria-label="Your website" autoCapitalize="none" inputMode="url" />
      <button className="btn primary" type="submit">Get started</button>
    </form>
  );

  return (
    <div className="theme-light k2">
      <div className="draft-bar">Concept preview · the Raise Kit is being built · feedback welcome</div>
      <header className="k2-nav">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <nav><a href="#how">How it works</a><a href="#plans">Plans</a><button className="btn primary sm" onClick={() => setSoon(true)}>Get started</button></nav>
      </header>

      {/* Hero */}
      <section className="k2-hero">
        <h1>Your first round,<br /><em>ready in 5 minutes.</em></h1>
        <p>Your investor-ready deck and collateral, in your brand. Every investor who backs startups like yours, with a pitch written to each. Swipe to send. All the heavy lifting of your first round, done over a cup of coffee.</p>
        {input("big")}
        <span className="k2-alt">No website yet? <button className="text-link" onClick={() => setSoon(true)}>Tell us about your startup</button></span>
        <div className="k2-fan" aria-hidden="true">
          <div className="f1 k2-mini deck"><b>Kiln Labs</b><span>Seed · ₹3 Cr</span></div>
          <div className="f2 k2-mini"><em>Fit 95</em><b>Verdant Arc</b><span>Backed GridLeaf at seed</span></div>
          <div className="f3 k2-mini mail"><b>After GridLeaf, kilns are next</b><span>Hi Meera, you backed GridLeaf…</span></div>
          <div className="f4 k2-mini plan"><b>168</b><span>investors fit you</span></div>
          <div className="f5 k2-mini"><em>Fit 90</em><b>Northlight Seed</b><span>Smeltwise is in their portfolio</span></div>
          <div className="f6 k2-mini teaser"><b>Two-page teaser</b><span>Ready to attach</span></div>
          <div className="f7 k2-mini mail"><b>Your FurnaceIQ cheque, and kilns</b><span>Hi Anjali…</span></div>
        </div>
      </section>

      <ProofStrip />

      {/* 1: just your website */}
      <section className="k2-row" id="how">
        <div className="k2-visual"><HeroBuild /></div>
        <div className="k2-copy"><span className="k2-k">Step 1</span><h2>No forms to fill.<br />Just your website.</h2><p>Paste your website and we learn what you do, who it's for and how you sound, and pick up your logo and colours. Then 5 quick questions, one tap each: traction, team, the ask.</p></div>
      </section>

      {/* 2: the kit */}
      <section className="k2-row flip">
        <div className="k2-visual"><KitShowcase /></div>
        <div className="k2-copy"><span className="k2-k">Step 2</span><h2>The kit investors ask for,<br />made for you.</h2><p>A 10-slide deck in your brand, a two-page teaser, the 20 questions investors will ask with your answers drafted, and a data room checklist. Your numbers only; gaps are marked, never made up.</p></div>
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
        <div className="k2-copy"><span className="k2-k">Step 4</span><h2>All you do<br />is swipe.</h2><p>One investor at a time: why they fit, with the source, and your pitch, written to them. Swipe right to send, left to pass. Change the words first if you want. You decide what goes out.</p></div>
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
        <div className="k2-copy"><span className="k2-k">Step 5</span><h2>Scheduled for you.<br />Sent from your Gmail.</h2><p>Connect Gmail once. We spread your pitches across working days, so they land well and your inbox stays healthy, then write each follow-up on day 3 and day 10. Replies come straight to you.</p></div>
      </section>

      {/* 6: replies */}
      <section className="k2-row">
        <div className="k2-visual">
          <div className="k2-pipe">
            {[["Sent", 10, ""], ["Opened the deck", 6, ""], ["Replied", 3, "g"], ["Meetings", 2, "g"]].map(([t, n, c]) => (
              <div key={t as string} className={`k2-pipe-row ${c}`}><span>{t}</span><span className="k2-pipe-bar"><i style={{ width: `${((n as number) / 10) * 100}%` }} /></span><b>{n}</b></div>
            ))}
            <p className="muted small">Example numbers, made up. "Opened" needs the deck link, coming with the kit.</p>
          </div>
        </div>
        <div className="k2-copy"><span className="k2-k">Step 6</span><h2>See who replied,<br />and what to do next.</h2><p>Every investor in one pipeline: waiting, replied, meeting, passed. When someone replies, the follow-ups stop, and your next move is on top.</p></div>
      </section>

      {/* Compare */}
      <section className="k2-wide">
        <h2>Weeks of work and ₹50,000 a month,<br /><em>or one evening.</em></h2>
        <div className="k2-vs">
          <div><b>Doing it the usual way</b><ul><li>2–4 weeks making a deck and teaser</li><li>Days googling which investors might fit</li><li>Writing every email from scratch</li><li>Follow-ups you forget</li><li>An advisor at ₹50,000–2,00,000 a month</li></ul></div>
          <div className="us"><b>With FirstCheq</b><ul><li>Your deck and teaser in your brand, in minutes</li><li>Every investor who fits, ranked, with the reason</li><li>A personal pitch to each, ready to swipe</li><li>Follow-ups written and scheduled</li><li>One price, once per round</li></ul></div>
        </div>
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
              <button className={`btn ${p.rec ? "primary" : "ghost"}`} onClick={() => setSoon(true)}>{p.cta}</button>
            </div>
          ))}
        </div>

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
      </section>

      {/* FAQ */}
      <section className="k2-wide">
        <h2>Questions</h2>
        <div className="k2-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><div className="k2-faq-a"><p>{a}</p></div></details>)}</div>
      </section>

      <section className="k2-end">
        <h2>Get your round<br /><em>ready tonight.</em></h2>
        {input("big")}
        <span className="k2-alt">Free preview · About 5 minutes · For first-time founders in India</span>
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
