import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";
import { WantButton } from "../components/Investor";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { HeroStart, ThreeEmails } from "./Sections";
import type { StartAnswers } from "./Sections";
import { FitTable } from "./More";
import PainPoll from "./PainPoll";
import { savedInviteCode, savePrefill } from "../lib/token";

// DRAFT B (/draft-full): the full stack, Ready → Find → Reach → Close. Find and Reach are live; Ready and Close are
// honestly marked SOON, each item with "I'm interested", so the page also measures which pain is real.
// Example founder and investors are made up. Lines marked [rewrite] are for Anurag's own words.

const GO = "Find my investors, free →";

type Stage = { n: string; name: string; live: boolean; line: string; items: string[] };
const STAGES: Stage[] = [
  { n: "1", name: "Ready", live: false, line: "Have what investors ask for, before you write to them.", items: ["Investor Q&A, drafted from your numbers", "A two-page teaser to attach", "Deck review, slide by slide", "A readiness check: what's missing"] },
  { n: "2", name: "Find", live: true, line: "The investors who back your sector, stage and round.", items: ["Ranked by FirstCheq Fit Score", "The reason and the source for each", "Who to write to at each fund"] },
  { n: "3", name: "Reach", live: true, line: "A researched email to each, and follow-ups on time.", items: ["Opens on a deal they actually did", "A LinkedIn note for each", "Follow-ups on day 3 and day 10, sent from your Gmail"] },
  { n: "4", name: "Close", live: false, line: "From first meeting to signed term sheet.", items: ["Data room checklist", "Term sheet and shareholders' agreement, explained plainly", "Partner lawyers when you need one"] },
];

export default function LandingFull() {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const open = (m: SheetMode) => () => setSheet(m);
  const go = (a?: StartAnswers) => {
    if (a) savePrefill(a);
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  return (
    <>
      <div className="draft-bar">Draft B for review · the full stack · not the live page</div>
      <header className="nav"><div className="nav-in">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm hide-sm" onClick={open("code")}>I have a code</button>
        <button className="btn primary sm" onClick={open("request")}>Request invite</button>
      </div></header>

      <main className="wrap lp2">
        <section className="lp2-hero">
          <div className="lp2-hero-copy">
            <span className="kicker">For first-time founders in India · Free in beta</span>
            <h1 className="lp2-h1">Get ready, find the right investors, and reach them. Your first round, in one place.</h1>
            <p className="lp2-lede">Prepare what investors ask for. See the investors who back your sector, stage and round, with the reason for each. Send a researched email to each one, with follow-ups, from your own Gmail.</p>
            <div className="stage-strip" aria-label="The four stages">
              {STAGES.map((s) => <span key={s.name} className={s.live ? "on" : ""}><b>{s.n}</b> {s.name}{s.live ? "" : <em> · soon</em>}</span>)}
            </div>
          </div>
          <HeroStart onGo={go} onCode={open("code")} onRequest={open("request")} />
        </section>

        <PainPoll />

        <section className="lp2-block">
          <h2 className="lp2-h2">Four stages. Two live today.</h2>
          <p className="lp2-sub">Find and Reach work now. Ready and Close are being built; tell us which you want first.</p>
          <div className="stage-grid">
            {STAGES.map((s) => (
              <div key={s.name} className={`stage-card${s.live ? " live" : ""}`}>
                <div className="stage-top"><span className="stage-n">{s.n}</span><b>{s.name}</b><span className={`tag ${s.live ? "green" : "violet"}`}>{s.live ? "Live" : "Soon"}</span></div>
                <p>{s.line}</p>
                <ul>{s.items.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        <section className="lp2-block">
          <span className="kicker">Stage 1 · Ready · soon</span>
          <h2 className="lp2-h2">Have it ready before investors ask.</h2>
          <p className="lp2-sub">The first reply is often "send the deck" or "what's your burn?". These are coming; tap the ones you want.</p>
          <div className="soon-grid">
            {([["qa", "?", "Investor Q&A prep", "The 20 questions Indian seed investors ask, answers drafted from your numbers; gaps flagged."],
               ["teaser", "▤", "Two-page teaser", "A one-pager from your facts, to attach to every email."],
               ["deck", "◧", "Deck review", "Upload your deck: slide-by-slide notes on what investors will question."],
               ["readiness", "✓", "Readiness check", "A score and a short list of what's missing before you send."]] as const).map(([k, ic, t, d]) => (
              <div className="soon-card" key={k}><span className="soon-icon" aria-hidden="true">{ic}</span><span className="soon-text"><b>{t} <span className="soon-tag">SOON</span></b><span>{d}</span><WantButton k={k} /></span></div>
            ))}
          </div>
        </section>

        <section className="lp2-block">
          <span className="kicker">Stage 2 · Find · live</span>
          <h2 className="lp2-h2">The investors who fit, and why.</h2>
          <p className="lp2-sub">Researched from their own websites and deal news. Every reason shows its source. Example below, made up.</p>
          <FitTable />
        </section>

        <section className="lp2-block">
          <span className="kicker">Stage 3 · Reach · live</span>
          <h2 className="lp2-h2">A researched email to each, in your words.</h2>
          <p className="lp2-sub">Same founder, three investors, three different emails and LinkedIn notes. Follow-ups on day 3 and day 10. You send every one.</p>
          <ThreeEmails />
        </section>

        <section className="lp2-block">
          <span className="kicker">Stage 4 · Close · soon</span>
          <h2 className="lp2-h2">From first meeting to signed term sheet.</h2>
          <div className="soon-grid">
            {([["dataroom", "▣", "Data room checklist", "What to have ready before diligence, and one link to share."],
               ["terms", "§", "Term sheet and SHA, explained", "Each clause in plain words, and what to ask a lawyer. Information, not legal advice."]] as const).map(([k, ic, t, d]) => (
              <div className="soon-card" key={k}><span className="soon-icon" aria-hidden="true">{ic}</span><span className="soon-text"><b>{t} <span className="soon-tag">SOON</span></b><span>{d}</span><WantButton k={k} /></span></div>
            ))}
          </div>
        </section>

        <section className="lp2-block lp2-two">
          <div className="lp2-card">
            <h3>For you if</h3>
            <ul>
              <li>It's your first round: idea to seed, ₹25L to ₹10 Cr, in India.</li>
              <li>You don't have an investor network yet.</li>
              <li>You want to start this week, not next month.</li>
            </ul>
          </div>
          <div className="lp2-card muted-card">
            <h3>Not for you if</h3>
            <ul>
              <li>You've already raised and need investor updates.</li>
              <li>You're raising Series A or later.</li>
              <li>You want someone to send emails for you. We never do.</li>
            </ul>
          </div>
        </section>

        <section className="lp2-block lp2-story">
          <h2 className="lp2-h2">Why I built this</h2>
          <p>[rewrite] I'm Anurag. Right now I'm helping three first-time founders raise their first round, by hand: getting their deck and numbers ready, finding the investors who fit, writing to each one, following up. FirstCheq is the tool I built to do that work faster, for any founder.</p>
          <p className="muted small">Anurag Gangwar, founder · <a href="mailto:hello@firstcheq.ai">hello@firstcheq.ai</a></p>
        </section>

        <section className="lp2-block">
          <h2 className="lp2-h2">Questions</h2>
          <div className="faq">
            {[["What works today?", "Find and Reach: your matched investors, a researched email and LinkedIn note for each, and follow-ups. Ready and Close are coming."],
              ["Is it free?", "Yes, in beta: your best investors and the emails for your top 3."],
              ["Do you send emails for me?", "Never. You read every email and send it from your own Gmail."],
              ["Why an invite code?", "We're in a small beta. Ask for an invite and we usually reply within a day."]].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="lp2-end">
          <h2 className="lp2-h2">Start with Find and Reach today.</h2>
          <button className="btn primary" data-track="click_go" onClick={() => go()}>{GO}</button>
        </section>

        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example founder and investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </main>
      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </>
  );
}
