import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";
import { BeforeAfter, Compare, FitScore, HeroStart, ProductDemo, ThreeEmails, WhatsMore } from "./Sections";
import type { StartAnswers } from "./Sections";
import { savedInviteCode, savePrefill } from "../lib/token";

const GO = "Find my 3 best investors, free →";

/** "don't wing": italic red, struck through as it scrolls into view. */
function StrikeOnView({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setOn(true); return; }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 1, rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <span ref={ref} className={`strike-red${on ? " on" : ""}`}>{children}</span>;
}

/** Phones: the main button, once she scrolls past the hero. */
function StickyCta({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 640);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className={`sticky-cta${show ? " show" : ""}`} aria-hidden={!show}><button className="btn primary" data-track="click_go" tabIndex={show ? 0 : -1} onClick={onOpen}>{GO}</button></div>;
}

/** Live counts from the investor table, so the numbers are always true. */
function ProofBar() {
  const s = useQuery(api.founders.publicStats, {});
  const items: [number | undefined, string][] = [
    [s?.total, "investors"], [s?.vc, "VC funds"], [s?.angel, "angels"], [s?.incubator, "incubators"], [s?.grant, "grant schemes"], [s?.angelNetwork, "angel networks"],
  ];
  return (
    <section className="proof">
      <span className="ribbon">Designed and built for India · checked every week</span>
      <div className="proof-bar">{items.filter(([n]) => n === undefined || n > 0).map(([n, label]) => <div key={label}><b>{n ?? "·"}</b><span>{label}</span></div>)}</div>
    </section>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const open = (m: SheetMode) => () => setSheet(m);
  // Hero card answers go to sign-up; without a saved code she enters one first.
  const go = (a?: StartAnswers) => {
    if (a) savePrefill(a);
    if (savedInviteCode()) navigate("/start"); else setSheet("code");
  };

  return (
    <>
      <header className="nav"><div className="nav-in">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></a>
        <span style={{ flex: 1 }} />
        <button className="btn ghost sm hide-sm" data-track="click_code" onClick={open("code")}>I have a code</button>
        <button className="btn primary sm" data-track="click_request" onClick={open("request")}>Request invite</button>
      </div></header>

      <div className="wrap">
        <section className="hero hero-split">
          <div className="hero-copy">
            <h1 className="h-xl rise">The journey to your first cheque <span className="it">starts here.</span></h1>
            <p className="lede rise">Your investor outreach starts tonight. Follow-ups run themselves.</p>
            <div className="facts rise"><span>Free</span><span>2 minutes</span><span>Your 3 best-fit investors, emails ready</span></div>
          </div>
          <HeroStart onGo={go} onCode={open("code")} />
        </section>

        <ProofBar />

        <section className="section">
          <div className="s-head center"><span className="kicker">Before and after</span><h2 className="h-l">Nine steps of guesswork. <span className="it">Or three.</span></h2></div>
          <BeforeAfter />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">See it work</span><h2 className="h-l">The real app, <span className="it">start to finish.</span></h2></div>
          <ProductDemo />
        </section>

        <section className="difference">
          <span className="kicker">The difference</span>
          <h2>The best-prepared founders <StrikeOnView>don't wing</StrikeOnView> their raise. <span className="it">Neither should you.</span></h2>
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">What it writes</span><h2 className="h-l">Researched, tailored, <span className="it">in your voice.</span></h2><p className="lede center-lede">No more spray and pray. Every email is written to that investor, about your company, in your words.</p></div>
          <ThreeEmails />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker-pill">FirstCheq Fit Score</span><h2 className="h-l">Goodbye, spray and pray. <span className="it">Find the investors looking for you.</span></h2><p className="lede center-lede">Not a list of 5,000. The few who back your space, your stage and your size of round, ranked with the reason.</p></div>
          <FitScore />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">Why not just…</span><h2 className="h-l">Do it yourself, hire, <span className="it">or FirstCheq?</span></h2><p className="lede center-lede">The fastest, cheapest and most effective path to your first cheque.</p></div>
          <Compare />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">What's more</span><h2 className="h-l">Free with <span className="it">your account.</span></h2></div>
          <WhatsMore />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">FAQ</span><h2 className="h-l">Questions, answered</h2></div>
          <div className="faq">
            {[["Is this for me?", "Yes, if it's your first round: pre-seed or seed, ₹25L to ₹10 Cr, in India."],
              ["Where does the investor data come from?", "Their own websites and published deal news. Every fact shows its source. Contact links are checked every week, and every investor is re-researched at least every 6 months."],
              ["Do you send emails for me?", "Never. You read every email and send it from your own Gmail."],
              ["What does it cost?", "Your 3 best investors and their emails are free. More help is coming for founders who want it."]].map(([q, ans]) => (
              <details key={q}><summary>{q}</summary><p>{ans}</p></details>
            ))}
          </div>
        </section>

        <div className="cta-band"><h2 className="h-l" style={{ marginTop: 0 }}>Your first cheque starts with <span className="it">one email.</span></h2><div className="cta-row" style={{ justifyContent: "center" }}><button className="btn white" data-track="click_go" onClick={() => go()}>{GO}</button></div></div>
        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example founders and investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </div>

      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
      <StickyCta onOpen={() => go()} />
    </>
  );
}
