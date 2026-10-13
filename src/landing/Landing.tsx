import { useState } from "react";
import { Badges, Dial, Face, Logo } from "../components/Art";
import { LogoMark, Wordmark } from "../components/Brand";
import { DEMO, PAINS, TRY } from "./demoData";
import type { DemoInvestor } from "./demoData";
import InviteSheet from "./InviteSheet";
import type { SheetMode } from "./InviteSheet";

function CTA({ big, onOpen }: { big?: boolean; onOpen: (m: SheetMode) => void }) {
  return (
    <div className="cta-row" style={big ? { justifyContent: "center" } : undefined}>
      <button className={big ? "btn white" : "btn primary"} onClick={() => onOpen("request")}>Request an invite →</button>
      <button className="btn ghost" onClick={() => onOpen("code")}>I have a code</button>
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

const Mark = ({ i, size = 38 }: { i: DemoInvestor; size?: number }) => (i.angel ? <Face name={i.person} size={size} /> : <Logo name={i.name} size={size} />);

export default function Landing() {
  const [aud, setAud] = useState<"founder" | "investor">("founder");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [sector, setSector] = useState<"AI" | "Climate" | "Deeptech">("AI");
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
            <div className="hero">
              <div className="hero-grid">
                <div>
                  <span className="kicker tagline">Your journey to your first cheque starts here.</span>
                  <h1 className="h-xl rise">First round? Send your first investor email <span className="it">in 10 minutes.</span></h1>
                  <p className="lede rise">Tell us about your startup in 2 minutes. See the Indian investors who back startups like yours, and send each one an email that opens on a deal they did, from your own Gmail.</p>
                  <CTA onOpen={setSheet} />
                  <div className="trustline"><span>Invite-only beta</span><span>Nothing sent without you</span><span>Free while in beta</span></div>
                </div>
                <div className="try rise" aria-label="Three steps">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 8 }}><span className="kicker">3 steps · about 10 minutes</span><span className="tag gold">Try step 2 now</span></div>
                  <div className="steps3">
                    {[["Tell us about your startup", "Name, sector, stage, how much you're raising", "2 MIN"], ["See who fits, and why", "Investors who back startups like yours, ranked", "3 MIN"], ["Send your first email", "We wrote it. You edit and send from Gmail.", "5 MIN"]].map(([b, s, t], k) => (
                      <div className="s3" key={b}><span className="n">{k + 1}</span><div><b>{b}</b><span>{s}</span></div><span className="t">{t}</span></div>
                    ))}
                  </div>
                  <div className="pick" style={{ marginTop: 14 }}>
                    {(["AI", "Climate", "Deeptech"] as const).map((s) => <button key={s} aria-pressed={sector === s} onClick={() => setSector(s)}>{s}</button>)}
                    <button disabled>Fintech · soon</button>
                  </div>
                  {TRY[sector].map((idx, k) => { const i = DEMO[idx]; return (
                    <div className="mini-inv" key={i.name}><Mark i={i} /><div className="meta"><b>{i.name}</b><span>{i.why}</span><Badges keys={i.badges.filter((b) => b === "lead" || b === "first")} max={2} /></div><Dial score={i.score - k * 3} size={46} /></div>
                  ); })}
                  <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Example investors. Yours are matched to your startup after you join.</p>
                </div>
              </div>
            </div>

            <section className="section">
              <div className="s-head"><span className="kicker">Sound familiar?</span><h2 className="h-l">Your first raise, <span className="it">without the guesswork.</span></h2></div>
              <div className="pains">{PAINS.map(([q, b, d]) => <div className="pain" key={q}><q>{q}</q><div className="fix"><b>{b}</b> {d}</div></div>)}</div>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">What you get today</span><h2 className="h-l">Three things, <span className="it">done for you.</span></h2></div>
              <div className="board-lb">
                <div className="panel"><span className="num-badge">1</span><h3>Investors who fit</h3><p>Funds, angels and networks in India that back your sector, stage and round size. Each with a match score and one line on why.</p></div>
                <div className="panel"><span className="num-badge">2</span><h3>An email to each</h3><p>It opens on a deal that investor actually did, then your story in your words. Edit it, then send from your own Gmail.</p></div>
                <div className="panel"><span className="num-badge">3</span><h3>Follow-ups, written</h3><p>A short nudge on day 3 and a week later. It stops the moment they reply.</p></div>
              </div>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">What it writes</span><h2 className="h-l">Not a template. <span className="it">Written to them.</span></h2></div>
              <div className="example-mail">
                <div className="email"><div className="to">To meera@verdantarc.example</div><div className="subj">After GridLeaf, kilns are next</div>{EXAMPLE_EMAIL}</div>
                <ul className="mail-notes">
                  <li><b>Opens on their deal.</b> GridLeaf is in their record, with the source.</li>
                  <li><b>Your story, your numbers.</b> From the two lines you give us.</li>
                  <li><b>One small ask.</b> Under 100 words, ready to send.</li>
                </ul>
              </div>
              <p className="muted small" style={{ marginTop: 10 }}>Example founder and investor, made up for this page.</p>
            </section>
          </>
        )}

        <section className="section">
          <div className="s-head"><span className="kicker">Built for India</span><h2 className="h-l">Your raise, <span className="it">your rules.</span></h2></div>
          <div className="board-lb">
            <div className="panel"><h3>Nothing sent without you</h3><p>Every email leaves from your own Gmail, only when you press send.</p></div>
            <div className="panel"><h3>Not a listing</h3><p>We help you research and write. Your company is never listed publicly, and we take no part in your deal.</p></div>
            <div className="panel"><h3>Your data, your call</h3><p>Built for India's DPDP Act. See or delete your data any time.</p></div>
          </div>
        </section>

        <section className="section">
          <div className="s-head"><span className="kicker">Coming next</span><h2 className="h-l">More help, <span className="it">step by step.</span></h2></div>
          <div className="soon-chips">{["Investor Q&A prep", "Competitor analysis", "Pitch deck review", "Data room", "Founder ratings of investors"].map((t) => <span key={t}>{t}<b>SOON</b></span>)}</div>
        </section>

        <section className="section">
          <div className="s-head"><span className="kicker">FAQ</span><h2 className="h-l">Questions, answered</h2></div>
          <div className="faq">
            {[["I've never raised before. Is this for me?", "Yes. It's built for first rounds in India: pre-seed and seed, ₹25L to ₹10 Cr."],
              ["Where does the investor information come from?", "Investors' own websites and published news about their deals. Every fact shows its source."],
              ["Do you send emails for me?", "No. You send from your own Gmail. We never send anything for you."],
              ["Why invite-only?", "So every founder gets a good list while we're small. We start with AI, Climate and Deeptech."],
              ["What does it cost?", "Free during the beta."]].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <div className="cta-band"><h2 className="h-l" style={{ marginTop: 0 }}>Your first cheque starts with one email. <span className="it">Send it today.</span></h2><CTA big onOpen={setSheet} /></div>
        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </div>

      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </>
  );
}
