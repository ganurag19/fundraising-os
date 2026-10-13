import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import LiveDemo from "./LiveDemo";
import { LogoMark, Wordmark } from "../components/Brand";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";

function CTA({ big, center, onOpen }: { big?: boolean; center?: boolean; onOpen: (m: SheetMode) => void }) {
  return (
    <div className="cta-row" style={big || center ? { justifyContent: "center" } : undefined}>
      <button className={big ? "btn white" : "btn primary"} onClick={() => onOpen("code")}>Get my 3 emails →</button>
      <button className="btn ghost" onClick={() => onOpen("request")}>Request an invite</button>
    </div>
  );
}

/** Phones: a "Get my 3 emails" bar once she scrolls past the hero. */
function StickyCta({ onOpen }: { onOpen: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return <div className={`sticky-cta${show ? " show" : ""}`} aria-hidden={!show}><button className="btn primary" tabIndex={show ? 0 : -1} onClick={onOpen}>Get my 3 emails →</button></div>;
}

/** Live counts from the investor table, so the numbers are always true. */
function ProofBar() {
  const s = useQuery(api.founders.publicStats, {});
  const items: [number | undefined, string][] = [
    [s?.total, "investors researched"], [s?.vc, "VC funds"], [s?.angel, "angels"], [s?.angelNetwork, "angel networks"],
    [s && s.accelerator + s.incubator, s && s.incubator ? "accelerators and incubators" : "accelerators"], [s?.grant, "grant schemes"],
  ];
  return (
    <section className="proof-bar" aria-label="What we've researched">
      {items.filter(([n]) => n === undefined || n > 0).map(([n, label]) => <div key={label}><b>{n ?? "·"}</b><span>{label}</span></div>)}
      <p className="muted small">Every fact with its source</p>
    </section>
  );
}

/** Founding list (Round Pass) or a call (Custom). Saves interest; no payment. */
function JoinSheet({ plan, onClose }: { plan: "round_pass" | "custom"; onClose: () => void }) {
  const joinList = useMutation(api.founders.joinList);
  const [f, setF] = useState({ name: "", email: "", note: "" });
  const [state, setState] = useState<"" | "busy" | "done">("");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("busy"); setError("");
    const r = await joinList({ plan, ...f }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection." }));
    if (r.ok) setState("done"); else { setState(""); setError(r.error); }
  };
  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rise" role="dialog" aria-modal="true" aria-label={plan === "round_pass" ? "Join the founding list" : "Book a call"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="tag gold">{plan === "round_pass" ? "Round Pass · ₹9,999 founding price" : "Custom"}</span><button className="xbtn" onClick={onClose} aria-label="Close">✕</button></div>
        {state === "done" ? (
          <><h2>You're on the list.</h2><p className="fg2" style={{ margin: 0 }}>{plan === "round_pass" ? "We'll email you when Round Pass opens, at the founding price." : "We'll email you within a day to set up a call."}</p><div className="row"><button className="btn primary" onClick={onClose}>Done</button></div></>
        ) : (
          <form onSubmit={submit} style={{ display: "contents" }}>
            <h2>{plan === "round_pass" ? <>Join the <span className="it">founding list</span></> : <>Book a <span className="it">call</span></>}</h2>
            <label>Your name<input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={100} autoComplete="name" /></label>
            <label>Email<input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required maxLength={200} autoComplete="email" /></label>
            {plan === "custom" && <label>What do you need help with? (optional)<textarea className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={500} /></label>}
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row"><button className="btn primary" disabled={state === "busy"} type="submit">{state === "busy" ? "Saving…" : plan === "round_pass" ? "Join the list" : "Request a call"}</button></div>
            <p className="muted small" style={{ margin: 0 }}>No payment now. We only use this to contact you.</p>
          </form>
        )}
      </div>
    </div>
  );
}

const EXAMPLE_EMAIL = `Hi Meera,

You backed GridLeaf at seed last year, when few funds would touch software for old industry. Brick kilns are the same bet, ten years behind.

I'm Arjun; I ran kiln operations at my family's business for six years.

Kiln Labs helps brick kilns cut coal use by 18% with a retrofit burner and a fuel-tracking app. 62 kilns pay us monthly, up from 9 in March.

We're raising ₹3 Cr at seed. Could I send the deck, or take 20 minutes next week?

Arjun Rao
Founder, Kiln Labs`;

export default function Landing() {
  const [aud, setAud] = useState<"founder" | "investor">("founder");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [join, setJoin] = useState<"round_pass" | "custom" | null>(null);
  const open = (m: SheetMode) => () => setSheet(m);

  return (
    <>
      <header className="nav"><div className="nav-in">
        <a className="logo" href="/" aria-label="FirstCheq home"><LogoMark /><Wordmark hideOnSmall /></a>
        <div className="aud" role="group" aria-label="I am a">
          <button aria-pressed={aud === "founder"} onClick={() => setAud("founder")}>Founders</button>
          <button aria-pressed={aud === "investor"} onClick={() => setAud("investor")}>Investors</button>
        </div>
        <button className="btn ghost sm hide-sm" onClick={open("code")}>I have a code</button>
        <button className="btn primary sm" onClick={open("request")}>Request invite</button>
      </div></header>

      <div className="wrap">
        {aud === "investor" ? (
          <div className="hero">
            <span className="kicker">For VCs, angels & angel networks in India</span>
            <h1 className="h-xl">Only the founders <span className="it">you'd actually</span> want to hear from.</h1>
            <p className="lede">Founders use us to research investors and write to the right ones. Investor profiles you can confirm and manage are <b>coming soon</b>.</p>
            <div className="cta-row"><button className="btn ghost" onClick={() => setAud("founder")}>← I'm a founder</button></div>
          </div>
        ) : (
          <>
            <section className="hero hero-min">
              <span className="kicker">FirstCheq · for first-time founders in India</span>
              <h1 className="h-xl rise">The journey to your first cheque <span className="it">starts here.</span></h1>
              <p className="lede rise">2 minutes. 3 investor emails, personalised and ready to send.</p>
              <CTA onOpen={setSheet} center />
              <div className="trustline center-row"><span>Free to start</span><span>Nothing sent without you</span></div>
            </section>

            <ProofBar />

            <section className="section">
              <div className="s-head center"><span className="kicker">See it work</span><h2 className="h-l">From your website <span className="it">to a sent email.</span></h2></div>
              <LiveDemo />
            </section>

            <section className="difference">
              <span className="kicker">The difference</span>
              <h2>The best-prepared founders don't wing their raise. <span className="it">Neither should you.</span></h2>
            </section>

            <section className="section">
              <div className="s-head center"><span className="kicker">This is for you if</span><h2 className="h-l">You've never <span className="it">raised before.</span></h2></div>
              <div className="board-lb">
                {[["You don't know a single investor.", "We show you the ones who back startups like yours."],
                  ["You've sent 30 emails and heard nothing.", "Each email opens on a deal that investor actually did."],
                  ["You're doing this at night, after work.", "Five minutes, then one clear next step a day."]].map(([q, a]) => (
                  <div className="panel foryou" key={q}><q>{q}</q><p>{a}</p></div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="s-head center"><span className="kicker">How it works</span><h2 className="h-l">Three steps. <span className="it">Five minutes.</span></h2></div>
              <div className="board-lb">
                {[["1", "Tell us about your startup", "2 MIN"], ["2", "See the investors who fit, and why", "1 MIN"], ["3", "Send from your own Gmail", "2 MIN"]].map(([n, t, m]) => (
                  <div className="panel step-box" key={n}><span className="num-badge">{n}</span><h3>{t}</h3><span className="mono-time">{m}</span></div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="s-head center"><span className="kicker">What it writes</span><h2 className="h-l">Not a template. <span className="it">Written to them.</span></h2></div>
              <div className="example-mail">
                <div className="email"><div className="to">To meera@verdantarc.example</div><div className="subj">After GridLeaf, kilns are next</div>{EXAMPLE_EMAIL}</div>
                <ul className="mail-notes">
                  <li><b>Opens on their deal.</b> From their record, with the source.</li>
                  <li><b>Your story, your numbers.</b> Fresh words for every investor.</li>
                  <li><b>One small ask.</b> Ready to send.</li>
                </ul>
              </div>
              <p className="muted small center" style={{ marginTop: 10 }}>Example founder and investor, made up for this page.</p>
            </section>

            <section className="section">
              <div className="s-head center"><span className="kicker">Why not just…</span><h2 className="h-l">Do it yourself, <span className="it">or hire someone?</span></h2></div>
              <div className="scrollx"><table className="tbl compare">
                <thead><tr><th></th><th>On your own</th><th>An agency</th><th className="us">FirstCheq</th></tr></thead>
                <tbody>
                  <tr><td>Finding who fits</td><td>Weeks of spreadsheets</td><td>Done for you</td><td className="us">2 minutes</td></tr>
                  <tr><td>Each email</td><td>Generic, or hours each</td><td>Written for you</td><td className="us">Written to that investor</td></tr>
                  <tr><td>Follow-ups</td><td>Easy to forget</td><td>Usually</td><td className="us">Written for you, on time</td></tr>
                  <tr><td>Cost</td><td>Your evenings</td><td>₹2–5 lakh + a success fee</td><td className="us">Free to start</td></tr>
                </tbody>
              </table></div>
            </section>

            <section className="section" id="pricing">
              <div className="s-head center"><span className="kicker">Pricing</span><h2 className="h-l">Start free. <span className="it">Go further when you raise.</span></h2></div>
              <div className="plans">
                <div className="plan">
                  <span className="plan-name">Free</span>
                  <div className="price">₹0</div>
                  <ul><li>Your 3 best-fit investors</li><li>3 emails, ready to send</li><li>Score and the reason for each</li></ul>
                  <button className="btn ghost" onClick={open("code")}>Get my 3 emails</button>
                </div>
                <div className="plan featured">
                  <span className="plan-name">Round Pass <span className="tag gold">Founding price</span></span>
                  <div className="price">₹9,999 <s>₹14,999</s></div>
                  <span className="muted small">120 days · first 50 founders</span>
                  <ul><li>Up to 100 investors, each with an email</li><li>Follow-ups written for you</li><li>Pipeline for your whole raise</li></ul>
                  <span className="addons">Add-ons: deck review ₹4,999 · investor Q&A prep ₹2,999</span>
                  <button className="btn primary" onClick={() => setJoin("round_pass")}>Join the founding list</button>
                  <span className="muted small">Opening soon. No payment now.</span>
                </div>
                <div className="plan">
                  <span className="plan-name">Custom</span>
                  <div className="price">Let's talk</div>
                  <ul><li>We work through your raise with you</li><li>List, emails, deck and meeting prep</li><li>You send every email</li></ul>
                  <button className="btn ghost" onClick={() => setJoin("custom")}>Book a call</button>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="s-head center"><span className="kicker">FAQ</span><h2 className="h-l">Questions, answered</h2></div>
              <div className="faq">
                {[["Is this for me?", "Yes, if it's your first round: pre-seed or seed, ₹25L to ₹10 Cr, in India."],
                  ["Where does the investor data come from?", "Their own websites and published deal news. Every fact shows its source."],
                  ["Do you send emails for me?", "Never. You send every email from your own Gmail."],
                  ["What does it cost?", "Your first 3 emails are free. Round Pass opens soon at a founding price."]].map(([q, ans]) => (
                  <details key={q}><summary>{q}</summary><p>{ans}</p></details>
                ))}
              </div>
            </section>
          </>
        )}

        <div className="cta-band"><h2 className="h-l" style={{ marginTop: 0 }}>Your first cheque starts with <span className="it">one email.</span></h2><CTA big onOpen={setSheet} center /></div>
        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </div>

      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
      {join && <JoinSheet plan={join} onClose={() => setJoin(null)} />}
      {aud === "founder" && <StickyCta onOpen={() => setSheet("code")} />}
    </>
  );
}
