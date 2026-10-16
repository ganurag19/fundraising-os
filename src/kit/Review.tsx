import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";

// Deck and pitch review: her own deck, read once (then deleted), reviewed like a seed investor would before a first call.
// Free (16 Oct): score, verdict, strengths, every fix and what's missing. The thesis stress test beyond the first, and investor questions, with full access.

const VERDICT: Record<string, [string, string]> = {
  raise_now: ["Ready to raise", "ok"], raise_with_fixes: ["Raise after these fixes", "warn"], build_traction_first: ["Build more traction first", "bad"],
};
const STEPS = ["Reading your deck, slide by slide", "Checking it against what seed investors look for", "Stress-testing your thesis", "Writing your fixes"];

export function DeckReview({ token, onUnlock }: { token: string; onUnlock: () => void }) {
  const review = useQuery(api.kit.myReview, { token });
  const uploadUrl = useMutation(api.kit.uploadUrl);
  const run = useAction(api.kitAi.reviewDeck);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [again, setAgain] = useState(false);
  async function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    if (file.type !== "application/pdf") { setError("Please upload your deck as a PDF (in PowerPoint or Google Slides: File → Download → PDF)."); return; }
    if (file.size > 15 * 1024 * 1024) { setError("That file is over 15 MB. Try a smaller PDF."); return; }
    setBusy(true);
    try {
      const u = await uploadUrl({ token });
      if (!u.ok) { setError(u.error); setBusy(false); return; }
      const r = await fetch(u.url, { method: "POST", headers: { "Content-Type": "application/pdf" }, body: file });
      const { storageId } = (await r.json()) as { storageId: Id<"_storage"> };
      const out = await run({ token, file: storageId, fileName: file.name });
      if (!out.ok) setError(out.error); else setAgain(false);
    } catch { setError("Couldn't upload that. Check your connection and try again."); }
    setBusy(false);
  }
  const picker = (label: string) => (
    <label className={`rv-drop${busy ? " busy" : ""}`}>
      <input type="file" accept="application/pdf" disabled={busy} onChange={(e) => void upload(e.target.files?.[0])} />
      <b>{busy ? "Reviewing your deck…" : label}</b>
      <span>{busy ? "About 30 seconds. Keep this page open." : "PDF, up to 15 MB. Read once to review it, then deleted."}</span>
    </label>
  );
  if (busy) return <div className="rv"><div className="rv-wait">{STEPS.map((s, i) => <span key={s} style={{ animationDelay: `${i * 6}s` }}>✓ {s}</span>)}</div>{picker("")}</div>;
  if (review === undefined) return <div className="spinner" />;
  if (!review || again) {
    return (
      <div className="rv">
        <section className="rv-intro">
          <span className="up-badge">New · Deck and pitch review</span>
          <h2>Get your deck reviewed <em>like an investor would.</em></h2>
          <p>Upload the deck you have. We read it the way a seed investor does before a first call, and tell you plainly:</p>
          <ul><li>Your readiness score, and whether to <b>raise now or build traction first</b></li><li>The weak points, slide by slide, with exactly what to fix</li><li>Your thesis, stress-tested: what investors will push on, and how to answer</li><li>The questions you'll be asked in the meeting</li></ul>
        </section>
        {picker("Upload my deck (PDF)")}
        {error && <p className="err" role="alert">{error}</p>}
      </div>
    );
  }
  return (
    <div className="rv">
      <ReviewResult review={review} onUnlock={onUnlock} />
      <button className="btn ghost sm" onClick={() => setAgain(true)}>Review a new version of my deck</button>
    </div>
  );
}

type ReviewData = NonNullable<FunctionReturnType<typeof api.kit.myReview>>;
/** The review itself: score, verdict, what works, fixes, thesis stress test, missing pieces, questions (locked parts ask to unlock). */
export function ReviewResult({ review, onUnlock, unlockLabel = "🔒 Unlock the full review", unlockLine = "Every fix, every stress test, what's missing, and the questions you'll face, with full access.", hideCta = false }: { review: ReviewData; onUnlock: () => void; unlockLabel?: string; unlockLine?: string; hideCta?: boolean }) {
  const [vLabel, vTone] = VERDICT[review.verdict];
  const lockedN = review.locked.fixes + review.locked.tests + review.locked.missing + review.locked.questions;
  return (
    <>
      <section className="rv-top">
        <div className="rv-score" style={{ "--p": review.score } as React.CSSProperties}><b>{review.score}</b><span>/100</span></div>
        <div><span className={`rv-verdict ${vTone}`}>{vLabel}</span><p>{review.verdictWhy}</p><span className="kb-dim">{review.fileName} · reviewed {new Date(review.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>
      </section>
      <section className="rv-card"><h3>What works</h3><ul className="rv-ok">{review.strengths.map((s) => <li key={s}>{s}</li>)}</ul></section>
      <section className="rv-card">
        <h3>Fix these first</h3>
        <div className="rv-fixes">{review.fixes.map((f) => <div key={f.slide + f.issue} className={`rv-fix ${f.impact}`}><span className="rv-imp">{f.impact} impact</span><b>{f.slide}</b><p className="rv-issue">{f.issue}</p><p className="rv-do">→ {f.fix}</p></div>)}</div>
        {review.locked.fixes > 0 && <Locked line={`${review.locked.fixes} more fixes`} onUnlock={onUnlock} />}
      </section>
      {review.thesis && (
        <section className="rv-card">
          <h3>Your thesis, stress-tested</h3>
          <p className="rv-claim">"{review.thesis.claim}"</p>
          {review.thesis.tests.map((t) => <div key={t.question} className={`rv-test ${t.risk}`}><b>{t.question}</b><span className="rv-imp">{t.risk} risk</span><p>{t.howToAnswer}</p></div>)}
          {review.locked.tests > 0 && <Locked line={`${review.locked.tests} more stress tests`} onUnlock={onUnlock} />}
        </section>
      )}
      {(review.missing.length > 0 || review.locked.missing > 0) && <section className="rv-card"><h3>Missing for your stage</h3>{review.missing.length ? <ul>{review.missing.map((m) => <li key={m}>{m}</li>)}</ul> : <Locked line={`${review.locked.missing} things seed investors expect`} onUnlock={onUnlock} />}</section>}
      {(review.questions.length > 0 || review.locked.questions > 0) && <section className="rv-card"><h3>Questions you'll be asked</h3>{review.questions.length ? <ol>{review.questions.map((q) => <li key={q}>{q}</li>)}</ol> : <Locked line={`The ${review.locked.questions} questions investors will most likely ask`} onUnlock={onUnlock} />}</section>}
      {lockedN > 0 && !hideCta && <div className="rv-cta"><b>See the full review</b><span>{unlockLine}</span><button className="btn primary" onClick={onUnlock}>{unlockLabel}</button></div>}
    </>
  );
}

function Locked({ line, onUnlock }: { line: string; onUnlock: () => void }) {
  return <button className="rv-locked" onClick={onUnlock}><span>🔒 {line}</span><em>Unlock</em></button>;
}
