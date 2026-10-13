import { useEffect, useState } from "react";
import { Dial, Logo } from "../components/Art";

// An auto-playing preview of the real product, with made-up founder and investors.
// Four scenes, about 4 seconds each, looping. Respects reduced motion (shows the email scene, still).
const SCENES = ["Finding your investors", "Writing to each one", "You send it", "We write the follow-up"];
const PICKS = [["Verdant Arc Capital", 94], ["Northlight Seed", 89], ["Kestrel Ridge", 86]] as const;
const EMAIL = "Hi Meera,\n\nYou backed GridLeaf at seed last year. Brick kilns are the same bet, ten years behind.\n\nI ran kiln operations at my family's business for six years. 62 kilns now pay us monthly.\n\nCould I send the deck?";

export default function LiveDemo() {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const [scene, setScene] = useState(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setScene((s) => (s + 1) % SCENES.length), 4200);
    return () => clearInterval(t);
  }, [reduced]);

  return (
    <div className="demo" aria-label="Preview of FirstCheq with made-up investors">
      <div className="demo-bar"><span /><span /><span /><b>firstcheq.ai</b></div>
      <div className="demo-steps">{SCENES.map((t, i) => <button key={t} className={i === scene ? "on" : ""} onClick={() => setScene(i)}>{i + 1}. {t}</button>)}</div>
      <div className="demo-stage">
        {scene === 0 && (
          <div className="demo-scene">
            <span className="kicker">143 investors fit Kiln Labs</span>
            {PICKS.map(([n, s], i) => (
              <div className="demo-card" key={n} style={{ animationDelay: `${i * 0.35}s` }}><Logo name={n} size={36} /><b>{n}</b><Dial score={s} size={40} /></div>
            ))}
          </div>
        )}
        {scene === 1 && (
          <div className="demo-scene">
            <span className="kicker">To meera@verdantarc.example</span>
            <TypedEmail still={reduced} />
          </div>
        )}
        {scene === 2 && (
          <div className="demo-scene">
            <div className="email demo-email short"><div className="subj">After GridLeaf, kilns are next</div>Hi Meera, you backed GridLeaf at seed last year…</div>
            <div className="demo-actions"><span className="btn primary sm pressed">Open in Gmail</span><span className="btn sm sent">✓ Sent</span></div>
            <div className="demo-card"><Logo name="Verdant Arc Capital" size={30} /><b>Verdant Arc Capital</b><span className="due">Follow-up on day 3</span></div>
          </div>
        )}
        {scene === 3 && (
          <div className="demo-scene">
            <span className="due today">Your move · follow-up ready</span>
            <div className="email demo-email short"><div className="subj">Re: After GridLeaf, kilns are next</div>Hi Meera, a quick note: 70 kilns now pay us monthly. Could I send the deck?</div>
            <span className="muted small">It stops the moment they reply.</span>
          </div>
        )}
      </div>
      <p className="muted small demo-note">Made-up founder and investors.</p>
    </div>
  );
}

/** The email "being written": mounts fresh each time its scene shows, so the typing restarts. */
function TypedEmail({ still }: { still: boolean }) {
  const [typed, setTyped] = useState(still ? EMAIL.length : 0);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setTyped((n) => (n >= EMAIL.length ? n : n + 6)), 30);
    return () => clearInterval(t);
  }, [still]);
  return <div className="email demo-email"><div className="subj">After GridLeaf, kilns are next</div>{EMAIL.slice(0, typed)}<span className="caret" /></div>;
}
