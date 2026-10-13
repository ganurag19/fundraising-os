import { useEffect } from "react";
import { Link } from "react-router-dom";
import { LogoMark, Wordmark } from "../components/Brand";
import { Choose, Mark } from "../landing/More";

// FirstCheq vs a fundraising consultant. Honest about when a consultant is the better pick.
// Money figures are typical, indicative ranges, labelled as such on the page.

const DIFFS: [string, string, string, boolean][] = [
  ["What it is", "A person who runs parts of your raise with you", "Software that finds who fits and writes to each of them", false],
  ["Cost", "Often a monthly retainer, plus a 2–5% success fee", "Free to start", true],
  ["Time to your first email", "Weeks: onboarding, then their list", "Tonight: about 2 minutes to your first 3 emails", true],
  ["Who picks the investors", "Their network and judgement", "Researched investors, ranked by Fit Score, each with its source", false],
  ["Who writes the emails", "They do, or they introduce you", "Written for you, to each investor, in your words; you edit", false],
  ["Who sends", "Often they do, in their name", "You, from your own Gmail", true],
  ["Follow-ups", "Depends on the consultant", "Written for you on day 3, then a week later", false],
  ["In the room with you", "Yes, often", "No. You pitch; we get you to the first reply", false],
  ["Best for", "Larger or later rounds, or founders who want a partner", "First-time founders raising their first round", false],
];

const QA: [string, string][] = [
  ["Can I use both?", "Yes. Many founders start with FirstCheq to reach the investors who fit, and bring in a consultant for a larger round later."],
  ["Does FirstCheq introduce me to investors?", "No. We find the investors who fit and write to each one; the email comes from you. Warm intros from funded founders are coming later."],
  ["Will this get me a meeting?", "Nobody can promise that, and we won't. What we can do is make sure every email goes to someone who backs your space and stage, and opens on something real they did."],
  ["What does it cost?", "Your 3 best investors and their emails are free. More help is coming for founders who want it."],
];

export default function CompareConsultant() {
  useEffect(() => {
    const was = document.title;
    document.title = "FirstCheq vs a fundraising consultant · FirstCheq";
    return () => { document.title = was; };
  }, []);
  return (
    <>
      <header className="nav"><div className="nav-in">
        <Link className="logo" to="/" aria-label="FirstCheq home"><LogoMark /><Wordmark /></Link>
        <span style={{ flex: 1 }} />
        <Link className="btn primary sm" to="/" data-track="click_go">Find my investors, free</Link>
      </div></header>

      <main className="wrap">
        <section className="hero cmp-hero">
          <span className="kicker">Consultant alternative</span>
          <h1 className="h-xl">Your first raise, <span className="it"><Mark>without the success fee.</Mark></span></h1>
          <p className="lede">A good consultant brings a network and a partner for the pitch. FirstCheq brings the investors who fit, an email written to each one, and follow-ups on time, so you can start tonight, from your own Gmail.</p>
          <ul className="cmp-triad"><li>No retainer or success fee to start</li><li>No waiting weeks for an intro list</li><li>Nothing is sent until you send it</li></ul>
          <div className="cta-row"><Link className="btn primary" to="/" data-track="click_go">Find my 3 best investors, free →</Link></div>
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">Honestly</span><h2 className="h-l">Which should you <span className="it">choose?</span></h2></div>
          <Choose />
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">Side by side</span><h2 className="h-l">The key <span className="it">differences.</span></h2></div>
          <div className="cmp-diffs">
            <div className="cmp-row head"><span /><span>A consultant</span><span className="us">FirstCheq</span></div>
            {DIFFS.map(([k, them, us, key]) => (
              <div className="cmp-row" key={k}><span className="cmp-k"><b>{k}</b>{key && <em>Key difference</em>}</span><span data-l="A consultant">{them}</span><span className="us" data-l="FirstCheq">{us}</span></div>
            ))}
          </div>
          <p className="muted small center" style={{ marginTop: 10 }}>Typical, indicative ranges, not quotes. Consultants differ a lot; ask yours.</p>
        </section>

        <section className="section cmp-article">
          <h2 className="h-l">The full comparison</h2>
          <p>This isn't really a versus page. A good fundraising consultant and FirstCheq solve different problems, and the honest question is which one you have.</p>
          <h3>What a good consultant does</h3>
          <p>The best ones know investors personally, help shape your story and deck, sit in on the pitch, and push the round to close. That is real work, and for a larger or later round it can be worth the fee. It is usually paid as a monthly retainer, a success fee on the money raised, or both.</p>
          <h3>When a consultant is worth it</h3>
          <p>If your round is large, your investors are mostly outside your reach, or you want a partner in the room for every meeting, a consultant with a strong record is a good choice. Check their past rounds, and how they are paid, before you sign.</p>
          <h3>The honest limit for a first raise</h3>
          <p>Most first-time founders raising their first round don't need someone in the room yet. They need to know who backs their space and stage, and a first email good enough to get a reply. Paying a success fee for that, or waiting weeks for a list, slows down the part that should be fast.</p>
          <h3>Where FirstCheq fits</h3>
          <p>FirstCheq does that first part. You tell us about your startup; we rank researched investors by Fit Score, with the reason and the source for each; we write an email to each one that opens on something real they did; and we write the follow-ups. You read every email and send it from your own Gmail. We don't pitch for you, and we can't promise a meeting.</p>
          <h3>The verdict</h3>
          <p>Raising your first round, and want to start this week? Start with FirstCheq. Raising a large round and want a partner in every meeting? Talk to a consultant. Plenty of founders do the first, then the second.</p>
        </section>

        <section className="section">
          <div className="s-head center"><span className="kicker">Questions</span><h2 className="h-l">Asked often</h2></div>
          <div className="faq">{QA.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>

        <div className="cta-band"><h2 className="h-l" style={{ marginTop: 0 }}>You build. <span className="it"><Mark>We find who backs it.</Mark></span></h2><div className="cta-row" style={{ justifyContent: "center" }}><Link className="btn white" to="/" data-track="click_go">Find my 3 best investors, free →</Link></div></div>
        <footer><div className="foot"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link><span>Built in India · Not affiliated with any fund or consultant · <Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></span></div></footer>
      </main>
    </>
  );
}
