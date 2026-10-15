import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { savedInviteCode, savePrefill } from "../lib/token";

// DRAFT (dev only, /kit): the Raise Kit landing. One input, the output shown right away (Relay's pattern).
// Example founder, brand and investors are made up.

const INVESTORS = [
  { name: "Verdant Arc Capital", who: "Meera, Partner", score: 95, why: "Backed GridLeaf at seed in 2025; 3 of their last 4 deals are climate.", subj: "After GridLeaf, kilns are next" },
  { name: "Northlight Seed", who: "Kabir, Principal", score: 90, why: "Smeltwise, the closest company to yours, is in their portfolio.", subj: "Smeltwise, but for brick kilns" },
  { name: "Kestrel Ridge Angels", who: "Anjali, Angel", score: 84, why: "Wrote one of FurnaceIQ's first cheques in 2025.", subj: "Your FurnaceIQ cheque, and kilns" },
];

/** A card stack that swipes itself: what outreach feels like. */
function SwipeDemo() {
  const [i, setI] = useState(0);
  const [out, setOut] = useState<"right" | "left" | null>(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setOut((o) => (o ? o : (i % 3 === 1 ? "left" : "right")));
      setTimeout(() => { setOut(null); setI((x) => x + 1); }, 650);
    }, 2600);
    return () => clearInterval(t);
  }, [i]);
  const cards = [0, 1, 2].map((k) => INVESTORS[(i + k) % INVESTORS.length]);
  return (
    <div className="kd-swipe" aria-hidden="true">
      {cards.slice().reverse().map((c, idx) => {
        const depth = 2 - idx;
        const top = depth === 0;
        return (
          <div key={c.name + i + depth} className={`kd-card${top && out ? ` out-${out}` : ""}`} style={{ transform: top && out ? undefined : `translateY(${depth * 10}px) scale(${1 - depth * 0.04})`, zIndex: 10 - depth, opacity: depth > 1 ? 0.6 : 1 }}>
            <div className="kd-card-top"><b>{c.name}</b><span className="kd-fit">Fit {c.score}</span></div>
            <span className="muted small">{c.who}</span>
            <p className="kd-why">{c.why}</p>
            <div className="kd-mail"><span className="muted small">Subject</span><b>{c.subj}</b><span className="muted small">Hi {c.who.split(",")[0]}, you backed …</span></div>
            <div className="kd-actions"><span className="kd-skip">✕ Skip</span><span className="kd-send">Send ✓</span></div>
          </div>
        );
      })}
    </div>
  );
}

export default function KitLanding() {
  const navigate = useNavigate();
  const [site, setSite] = useState("");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const start = (e?: React.FormEvent) => {
    e?.preventDefault();
    savePrefill({ first: site.trim(), sectors: [], stage: "", ask: "" });
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };
  const Input = ({ big = false }: { big?: boolean }) => (
    <form className={`kd-input${big ? " big" : ""}`} onSubmit={start}>
      <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="yourstartup.in" aria-label="Your website" autoCapitalize="none" inputMode="url" />
      <button className="btn primary" type="submit">Build my raise kit →</button>
    </form>
  );

  return (
    <>
      <div className="draft-bar">Local draft · Raise Kit landing · not live</div>
      <header className="nav"><div className="nav-in">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm hide-sm" onClick={() => setSheet("code")}>I have a code</button>
        <button className="btn primary sm" onClick={() => setSheet("request")}>Request invite</button>
      </div></header>

      <main className="wrap kd">
        <section className="kd-hero">
          <span className="kicker">For first-time founders in India</span>
          <h1>Paste your website.<br />Start raising today.</h1>
          <p className="kd-lede">In 5 minutes: your raise plan, a pitch deck in your brand, and a personal pitch to every investor who fits. Swipe to send from your own Gmail.</p>
          {Input({ big: true })}
          <p className="muted small">Free preview · No card · About 5 minutes</p>
        </section>

        <section className="kd-three">
          <div className="kd-panel">
            <span className="kd-step">1 · Your raise plan</span>
            <h3>Who to ask, in what order</h3>
            <div className="kd-plan">
              {[["Angels", 38], ["Angel networks", 6], ["Accelerators & grants", 9], ["Micro-VCs", 31]].map(([t, n]) => (
                <div key={t as string}><b>{n}</b><span>{t}</span></div>
              ))}
            </div>
            <p className="muted small">Weeks 1–2 angels → 2–4 accelerators → 3–8 micro-VCs</p>
          </div>
          <div className="kd-panel">
            <span className="kd-step">2 · Your investor kit</span>
            <h3>A deck in your brand</h3>
            <div className="kd-deck">
              <div className="kd-slide main"><i className="kd-dot" /><b>Kiln Labs</b><span>Cutting coal in India's brick kilns</span><em>Seed · ₹3 Cr</em></div>
              <div className="kd-slide s2"><b>Traction</b><span>62 kilns paying monthly</span></div>
              <div className="kd-slide s3"><b>The ask</b><span>₹3 Cr to reach 400 kilns</span></div>
            </div>
            <p className="muted small">Plus teaser, investor Q&A, market, competition, data room.</p>
          </div>
          <div className="kd-panel">
            <span className="kd-step">3 · Your outreach</span>
            <h3>Swipe to send</h3>
            <SwipeDemo />
          </div>
        </section>

        <section className="kd-block">
          <h2>Everything an investor asks for. In one kit.</h2>
          <div className="kd-grid">
            {["Pitch deck in your brand", "Two-page teaser", "The 20 questions investors ask, answered", "Business model and roadmap", "Funding trends in your sector", "Competition, with sources", "Market size, with sources", "Data room and compliance checklist", "A pitch, LinkedIn note and intro blurb for every investor", "Follow-ups on day 3 and day 10", "Build-in-public post templates", "Your raise plan and timeline"].map((x) => (
              <div key={x} className="kd-item">✓ {x}</div>
            ))}
          </div>
          <p className="muted small">Your numbers only. Anything we can't source is marked for you to fill in, never made up.</p>
        </section>

        <section className="kd-block kd-vs">
          <h2>Weeks of work, or 5 minutes.</h2>
          <div className="kd-vs-grid">
            <div><b>Today</b><ul><li>2–4 weeks building a deck and teaser</li><li>Googling investors who might fit</li><li>Writing every email from scratch</li><li>₹50,000+ a month for an advisor</li></ul></div>
            <div className="us"><b>With FirstCheq</b><ul><li>Your kit in 5 minutes</li><li>Every investor ranked, with the reason</li><li>A personal pitch to each, ready to send</li><li>One price, once per round</li></ul></div>
          </div>
        </section>

        <section className="kd-block">
          <h2>Pricing</h2>
          <div className="kd-prices">
            <div className="kd-price"><b>Free preview</b><span className="kd-amt">₹0</span><ul><li>Your raise plan</li><li>Deck cover and 2 slides</li><li>Your top 3 investors, with pitches</li></ul></div>
            <div className="kd-price us"><b>Raise Kit</b><span className="kd-amt">₹24,999 <em>₹14,999 for the first 20 founders</em></span><ul><li>The full kit, in your brand</li><li>Every investor who fits, with pitches</li><li>Swipe to send, with follow-ups</li><li>3 rounds of revisions</li></ul></div>
            <div className="kd-price"><b>Add-ons</b><span className="kd-amt">from ₹5,000</span><ul><li>Deck and story review call</li><li>Done-with-you outreach, 3 weeks</li><li>Warm-intro help</li></ul></div>
          </div>
        </section>

        <section className="kd-end">
          <h2>Start with your website.</h2>
          {Input({})}
        </section>

        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Nothing is sent without your swipe · Example founder and investors are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </main>
      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </>
  );
}
