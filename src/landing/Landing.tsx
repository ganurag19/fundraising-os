import { useState } from "react";
import { Badges, Dial, Face, Logo, Medal, Stars } from "../components/Art";
import { LogoMark, Wordmark } from "../components/Brand";
import { COMP, DEMO, PAINS, QUESTIONS, TRY } from "./demoData";
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

const Mark = ({ i, size = 38 }: { i: DemoInvestor; size?: number }) => (i.angel ? <Face name={i.person} size={size} /> : <Logo name={i.name} size={size} />);

export default function Landing() {
  const [aud, setAud] = useState<"founder" | "investor">("founder");
  const [sheet, setSheet] = useState<SheetMode | null>(null);
  const [sector, setSector] = useState<"AI" | "Climate" | "Deeptech">("AI");
  const open = (m: SheetMode) => () => setSheet(m);
  const top = DEMO[0];
  const friendly = [...DEMO].sort((a, b) => b.rating - a.rating).slice(0, 5);
  const fast = [...DEMO].sort((a, b) => parseInt(a.days) - parseInt(b.days)).slice(0, 5);
  const active = [DEMO[2], DEMO[0], DEMO[5], DEMO[4], DEMO[1]];

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
                  <span className="kicker tagline">Your first cheque starts here.</span>
                  <h1 className="h-xl rise">First round? Send your first investor email <span className="it">in 10 minutes.</span></h1>
                  <p className="lede rise">No warm intros, no investor list, no idea what to write? That's every first-time founder. Tell us about your startup, see the investors who back companies like yours and why, then send the email we've written, from your own Gmail. We handle the follow-ups.</p>
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
                    <div className="mini-inv" key={i.name}><Mark i={i} /><div className="meta"><b>{i.name}</b><span>{i.why}</span><Badges keys={i.badges} max={2} /></div><Dial score={i.score - k * 3} size={46} /></div>
                  ); })}
                  <p className="muted" style={{ fontSize: 12, margin: "10px 0 0" }}>Example investors. Yours are matched to your startup after you join.</p>
                </div>
              </div>
            </div>

            <section className="section">
              <div className="s-head"><span className="kicker">We've been there</span><h2 className="h-l">Your first raise feels like this. <span className="it">It doesn't have to.</span></h2></div>
              <div className="pains">{PAINS.map(([q, b, d]) => <div className="pain" key={q}><q>{q}</q><div className="fix"><b>{b}</b> {d}</div></div>)}</div>
            </section>

            <div className="emotion"><span className="kicker">The difference</span><h2 style={{ marginTop: 14 }}>The best-prepared founders don't wing their raise. <span className="it">Neither should you.</span></h2></div>

            <section className="section">
              <div className="s-head"><span className="kicker">Your first two weeks</span><h2 className="h-l">Hope is not a strategy. <span className="it">This is.</span></h2><p className="lede">Real times. The first evening is the biggest; after that, about an hour a day.</p></div>
              <div className="timeline">
                {[["EVENING 1", "2–3 hours", "Your list and first 5 emails", "Read your top picks, edit five emails, send them from Gmail."], ["DAYS 2–3", "About 1 hour a day", "The next 10 emails", "Same rhythm. Your answers fill in as you go."], ["DAY 3", "15 minutes", "First follow-ups", "Already written. Skipped for anyone who replied."], ["DAY 7", "20 minutes", "Replies in one place", "Answers drafted from your own numbers."], ["DAY 14", "Your calendar", "First meetings", "You walk in knowing their questions and your answers."]].map(([d, t, h, p]) => (
                  <div className="tl" key={d}><span className="d">{d}</span><span className="t">{t}</span><h3>{h}</h3><p>{p}</p></div>
                ))}
              </div>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">Built on your numbers</span><h2 className="h-l">Not a generic list. <span className="it">Tailored to you.</span></h2><p className="lede">We start from your company, round, traction and competitors, then pick investors. Each comes with why they fit, what to watch out for, and what to say.</p></div>
              <div className="split">
                <div className="panel">
                  <span className="sub-h">What we use about you</span>
                  <div className="params">{[["SECTOR", "AI for finance"], ["STAGE", "Seed"], ["RAISING", "₹1–3 Cr"], ["CITY", "Bengaluru"], ["REVENUE", "₹3.2L a month, +22%"], ["CUSTOMERS", "CA firms"], ["COMPETITORS", "2 named"]].map(([k, v]) => <span className="param" key={k}><i>{k}</i>{v}</span>)}</div>
                  <div className="center muted" style={{ fontSize: 13 }}>↓ checked against 600+ Indian investors ↓</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {[["Invests in what you do", 94], ["Invests at your stage", 100], ["Cheque fits your round", 91], ["Invested recently", 88]].map(([t, v]) => (
                      <div className="rbar" key={t as string} style={{ gridTemplateColumns: "170px minmax(0,1fr) 30px" }}><span>{t}</span><div className="bar"><i style={{ width: `${v}%` }} /></div><b>{v}</b></div>
                    ))}
                    <div className="rbar" style={{ gridTemplateColumns: "170px minmax(0,1fr) 30px" }}><span>Not backing a competitor</span><div className="bar g"><i style={{ width: "100%" }} /></div><b>✓</b></div>
                  </div>
                  <p className="muted" style={{ fontSize: 13 }}>Saves about an hour of research per investor. Every point links to where we found it.</p>
                </div>
                <div className="panel">
                  <span className="sub-h">Example · a #1 match</span>
                  <div className="pick-head"><Mark i={top} size={48} /><div style={{ flex: 1, minWidth: 0 }}><b>{top.name}</b><span>{top.person} · {top.cheque}</span><div><Stars rating={top.rating} reviews={top.reviews} /></div></div><Dial score={top.score} /></div>
                  <Badges keys={top.badges} />
                  <div className="why2">{top.why}</div>
                  <span className="sub-h gold">Why they fit</span><ul className="rat">{top.rat.map((r) => <li key={r}>{r}</li>)}</ul>
                  <span className="sub-h" style={{ color: "var(--amber)" }}>Watch out</span><ul className="rat risk">{top.risk.map((r) => <li key={r}>{r}</li>)}</ul>
                  <span className="sub-h" style={{ color: "var(--blue-ink)" }}>What to say</span><ul className="rat talk">{top.talk.map((r) => <li key={r}>{r}</li>)}</ul>
                  <span className="src">Example investor · made up for this page</span>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">Investor questions</span><h2 className="h-l">They will ask these. <span className="it">Are you ready?</span></h2><p className="lede">The questions Indian seed investors ask most. We draft your answers from your profile, so you never freeze on a call.</p></div>
              <div className="qlist">{QUESTIONS.map(([c, q]) => <div className="qitem" key={c}><span style={{ color: "var(--blue-ink)" }}>?</span><div><span className="c">{c}</span>{q}</div></div>)}</div>
              <div className="cta-row"><button className="btn primary" onClick={open("request")}>Get my answers drafted →</button></div>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">Know your market</span><h2 className="h-l">Know your competition <span className="it">before investors ask.</span></h2><p className="lede">Who else is building it, when they started, what they raised, who backed them, and the gap you can own.</p></div>
              <div className="scrollx"><table className="tbl">
                <thead><tr><th>Company</th><th>What they do</th><th>Sells to</th><th>Started</th><th>Stage</th><th className="num">Raised</th><th>Backed by</th></tr></thead>
                <tbody>{COMP.map((c) => (
                  <tr key={c.name} className={c.you ? "you" : ""}><td><div style={{ display: "flex", gap: 10, alignItems: "center" }}><Logo name={c.name} size={30} /><b>{c.name}</b>{c.you && <span className="tag blue">You</span>}</div></td><td className="fg2">{c.what}</td><td>{c.who}</td><td className="num">{c.start}</td><td>{c.stage}</td><td className="num">{c.raised}</td><td>{c.backers}</td></tr>
                ))}</tbody>
              </table></div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Example competitors, made up for this page.</p>
            </section>

            <section className="section">
              <div className="s-head"><span className="kicker">Picks of the week</span><h2 className="h-l">Rated <span className="it">founder-friendly</span> by founders.</h2><p className="lede">Only founders who emailed or met an investor can rate them. Badges are earned, not bought.</p></div>
              <div className="board-lb">
                {([["Most founder-friendly", "Rated by founders who emailed or met them", friendly, (i: DemoInvestor) => <><Stars rating={i.rating} reviews={i.reviews} /><Badges keys={i.badges} max={2} /></>],
                   ["Fastest to reply", "Average time to first reply", fast, (i: DemoInvestor) => <><span className="muted" style={{ fontSize: 12 }}>⚡ Replies in {i.days}</span><Badges keys={i.badges.filter((b) => b !== "fast")} max={1} /></>],
                   ["Most active in AI", "New investments in the last 30 days", active, (i: DemoInvestor, k: number) => <><span className="muted" style={{ fontSize: 12 }}>▲ {4 - Math.min(k, 3)} new investments</span><Badges keys={i.badges.filter((b) => b !== "active")} max={1} /></>],
                ] as const).map(([t, sub, arr, fn]) => (
                  <div className="panel" key={t}>
                    <div><h3 style={{ fontSize: 18 }}>{t}</h3><p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{sub}</p></div>
                    {arr.map((i, k) => <div className="lb-row" key={i.name}><Medal rank={k} /><Mark i={i} /><div className="meta"><b>{i.name}{k === 0 && <span className="tag gold" style={{ marginLeft: 6 }}>Pick of the week</span>}</b>{fn(i, k)}</div></div>)}
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Example ratings. Real ratings start once founders have emailed investors through us.</p>
            </section>
          </>
        )}

        <section className="section">
          <div className="s-head"><span className="kicker">Built for India</span><h2 className="h-l">Built for India's rules, <span className="it">not around them.</span></h2></div>
          <div className="board-lb">
            <div className="panel"><h3>A research and outreach service</h3><p>We're a fundraising assistant for founders, not a fundraising platform. You choose whom to write to. No public listings of companies raising.</p></div>
            <div className="panel"><h3>Your data, under India's privacy law</h3><p>Built for the DPDP Act: every field has a purpose, investors can fix or remove their profile, and you can delete your data anytime.</p></div>
            <div className="panel"><h3>The paperwork investors ask for</h3><p>A data room checklist for Indian rounds: DPIIT, incorporation, cap table, GST and ROC filings.</p></div>
          </div>
        </section>

        <section className="section">
          <div className="s-head"><span className="kicker">Coming soon</span><h2 className="h-l">More help for <span className="it">every step.</span></h2></div>
          <div className="coming">
            {[["Living data room", "Updates itself as you raise, talk to investors, close, and grow."], ["Deck & model builder", "Pitch deck, cap table and financial model, made from your profile."], ["Learning", "Short lessons from Indian founders and investors who've done it."], ["Templates & blog", "Investor updates, a term sheet checklist, and who's investing in what."]].map(([h, p]) => (
              <div className="panel" key={h}><span className="soon" style={{ alignSelf: "flex-start" }}>SOON</span><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="s-head"><span className="kicker">FAQ</span><h2 className="h-l">Questions, answered</h2></div>
          <div className="faq">
            {[["Why is it invite-only?", "So every founder gets a good list and real help while we're small. We let new founders in every week, starting with AI, Climate and Deeptech."],
              ["I've never raised before. Is this for me?", "Yes. It's built for first rounds: pre-seed and seed, ₹25L to ₹10 Cr, in India. It tells you what to do next, one step at a time."],
              ["Where does the investor information come from?", "Investors' own websites and public news about their deals. Every fact shows where it came from and when we last checked."],
              ["Do you send emails for me?", "No. You send from your own Gmail. We never send anything for you."],
              ["Is this a fundraising platform?", "No. We're a research and outreach assistant. We don't list your company publicly, take part in your deal, or handle money."],
              ["What does it cost?", "Free during beta."]].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <div className="cta-band"><h2 className="h-l" style={{ marginTop: 0 }}>Your first round starts with one email. <span className="it">Send it this week.</span></h2><CTA big onOpen={setSheet} /></div>
        <footer><div className="foot"><a className="logo" href="/"><LogoMark /><Wordmark /></a><span>Built in India · Not affiliated with any fund · Example investors on this page are made up · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span></div></footer>
      </div>

      {sheet && <InviteSheet mode={sheet} onMode={setSheet} onClose={() => setSheet(null)} />}
    </>
  );
}
