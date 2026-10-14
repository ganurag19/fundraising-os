import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { HeroStart } from "./Sections";
import type { StartAnswers } from "./Sections";
import { savedInviteCode, savePrefill } from "../lib/token";

// DRAFT landing (v8), for Anurag to review at /draft before it replaces "/".
// Plain words, six blocks, almost no animation. Lines marked [rewrite] are placeholders for his own voice.
// The example founder and investor are made up.

const GO = "Find my investors, free →";

export default function LandingDraft() {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const open = (m: SheetMode) => () => setSheet(m);
  const go = (a?: StartAnswers) => {
    if (a) savePrefill(a);
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };
  // Not for search engines while it's a draft.
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  return (
    <>
      <div className="draft-bar">Draft for review · not the live page</div>
      <header className="nav"><div className="nav-in">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm hide-sm" onClick={open("code")}>I have a code</button>
        <button className="btn primary sm" onClick={open("request")}>Request invite</button>
      </div></header>

      <main className="wrap lp2">
        {/* 1. What it does, plainly */}
        <section className="lp2-hero">
          <div className="lp2-hero-copy">
            <span className="kicker">For first-time founders in India · Free in beta</span>
            <h1 className="lp2-h1">Find the investors who fit your startup. Get a researched email for each one.</h1>
            <p className="lp2-lede">Tell us about your startup. We match you with investors who back your sector, your stage and your size of round, and write a personal email to each one, with follow-ups. You send them from your own Gmail.</p>
          </div>
          <HeroStart onGo={go} onCode={open("code")} onRequest={open("request")} />
        </section>

        {/* 2. One real example */}
        <section className="lp2-block">
          <h2 className="lp2-h2">What you get, for each investor</h2>
          <p className="lp2-sub">An example, with a made-up founder and investor.</p>
          <div className="lp2-example">
            <div className="lp2-fit">
              <div className="lp2-fit-top"><b>Verdant Arc Capital</b><span className="lp2-score">Fit Score 95</span></div>
              <p><b>Why they fit:</b> backed GridLeaf at seed in 2025, and 3 of their last 4 deals are climate.</p>
              <p className="muted small">Source: Verdant Arc website, checked Oct 2026 · Writing to: Meera, Partner</p>
            </div>
            <div className="email lp2-email">
              <div className="to">To meera@verdantarc.example</div>
              <div className="subj">After GridLeaf, kilns are next</div>
              {"Hi Meera,\n\nYou backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind.\n\nI'm Arjun; I ran my family's kiln for six years before building Kiln Labs. Our burner and fuel app cut coal use by 18%.\n\n62 kilns pay us monthly, up from 9 in March.\n\nWe're raising ₹3 Cr at seed. Could I send the deck?\n\nArjun Rao\nFounder, Kiln Labs"}
            </div>
            <ul className="lp2-notes">
              <li><b>Opens on something they actually did</b>, from their own website or deal news.</li>
              <li><b>Your story and your numbers</b>, phrased fresh for each investor.</li>
              <li><b>One small ask.</b> Plus a LinkedIn note, and follow-ups on day 3 and day 10.</li>
            </ul>
          </div>
        </section>

        {/* 3. How it works */}
        <section className="lp2-block">
          <h2 className="lp2-h2">How it works</h2>
          <ol className="lp2-steps">
            <li><b>Tell us about your startup.</b> Website or name, sector, stage, how much you're raising. About 3 minutes.</li>
            <li><b>See the investors who fit</b>, ranked by Fit Score, each with the reason and the source.</li>
            <li><b>Read, edit and send</b> each email from your own Gmail. We write the follow-ups and remind you when they're due.</li>
          </ol>
        </section>

        {/* 4. Who it's for, and who it isn't */}
        <section className="lp2-block lp2-two">
          <div className="lp2-card">
            <h3>For you if</h3>
            <ul>
              <li>It's your first round: idea to seed, ₹25L to ₹10 Cr, in India.</li>
              <li>You don't have an investor network yet.</li>
              <li>You want to start emailing investors this week, not next month.</li>
            </ul>
          </div>
          <div className="lp2-card muted-card">
            <h3>Not for you if</h3>
            <ul>
              <li>You've already raised and need investor updates.</li>
              <li>You're raising Series A or later.</li>
              <li>You want someone to send emails for you. We never do; you send every one.</li>
            </ul>
          </div>
        </section>

        {/* 5. Why I built it [rewrite in your own words] */}
        <section className="lp2-block lp2-story">
          <h2 className="lp2-h2">Why I built this</h2>
          <p>[rewrite] I'm Anurag. Right now I'm helping three first-time founders raise their first round, by hand: finding the investors who fit, writing to each one, following up. It takes weeks, and most founders don't have someone to do it with them. FirstCheq is the tool I built to do that work faster, for any founder.</p>
          <p className="muted small">Anurag Gangwar, founder · <a href="mailto:hello@firstcheq.ai">hello@firstcheq.ai</a></p>
        </section>

        {/* 6. Questions, then one button */}
        <section className="lp2-block">
          <h2 className="lp2-h2">Questions</h2>
          <div className="faq">
            {[["Is it free?", "Yes, in beta: your best investors and the emails for your top 3. More help is coming for founders who want it."],
              ["Where does the investor data come from?", "Their own websites and published deal news. Every reason shows its source."],
              ["Do you send emails for me?", "Never. You read every email and send it from your own Gmail."],
              ["Why an invite code?", "We're in a small beta. Ask for an invite and we usually reply within a day."]].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="lp2-end">
          <h2 className="lp2-h2">Start with three emails.</h2>
          <button className="btn primary" onClick={() => go()}>{GO}</button>
        </section>

        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example founder and investor on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </main>
      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </>
  );
}
