import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import Scene from "./Scene";

// "Request full access": the plan she wants, then the questions we need from the friends test. No payment.

const PLANS = [
  { key: "raise_kit", name: "Raise Kit", line: "Your full kit, every investor and pitch", points: ["All 9 slides, editable PowerPoint and PDF", "Two-page teaser, Q&A prep, market and competition", "Every investor who fits, a pitch to each", "Follow-ups and your pitch room"] },
  { key: "raise_kit_advisors", name: "Raise Kit + Advisors", line: "The kit, plus founders who have raised", points: ["Everything in the Raise Kit", "Two calls with founders who raised their seed", "Deck and pitch review before you send", "Warm intros where they know someone"] },
  { key: "done_for_you", name: "Done for you", line: "We run the outreach with you", points: ["We build and polish the kit with you", "We plan and run your outreach weekly", "Meeting prep and term-sheet support"] },
] as const;
const PRICES = ["Under ₹5,000", "₹5,000–15,000", "₹15,000–25,000", "₹25,000–50,000", "₹50,000+"];
const WHEN = ["Now", "In 1–3 months", "In 3–6 months", "Later"];

function Rate({ label, value, set }: { label: string; value: number; set: (n: number) => void }) {
  return (
    <div className="up-q">
      <span>{label}</span>
      <div className="up-rate" role="radiogroup" aria-label={label}>{[1, 2, 3, 4, 5].map((n) => <button key={n} role="radio" aria-checked={value === n} className={n <= value ? "on" : ""} onClick={() => set(n)}>{n}</button>)}</div>
      <div className="up-scale"><span>Not at all</span><span>Completely</span></div>
    </div>
  );
}

export function UpgradeSheet({ token, company, onClose, start = "raise_kit" }: { token: string; company: string; onClose: () => void; start?: string }) {
  const request = useMutation(api.kit.requestUpgrade);
  const [a, setA] = useState({ plan: start, wouldPay: "", price: "", liked: "", missing: "", solves: 0, valuable: 0, raisingWhen: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const set = <K extends keyof typeof a>(k: K, v: (typeof a)[K]) => setA((o) => ({ ...o, [k]: v }));
  const ok = a.wouldPay && a.solves && a.valuable;
  async function submit() {
    setBusy(true); setError("");
    const r = await request({ token, ...a }).catch(() => ({ ok: false as const, error: "Couldn't send that. Check your connection and try again." }));
    setBusy(false);
    if (r.ok) setDone(true); else setError(r.error);
  }
  return (
    <div className="up-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="up-card rise" role="dialog" aria-modal="true" aria-label="Request full access">
        <Scene />
        <div className="up-inner">
          <button className="up-x" onClick={onClose} aria-label="Close">✕</button>
          <span className="up-badge">🔒 Founding access</span>
          {done ? (
            <div className="up-done">
              <h2>You're on the <em>founding list.</em></h2>
              <p>Thank you. Your answers shape what we build next. We'll reach out about {company}'s full kit, usually within a day.</p>
              <button className="btn white" onClick={onClose}>Back to my kit</button>
            </div>
          ) : (
            <>
              <h2>Unlock {company}'s <em>full raise kit.</em></h2>
              <p className="up-sub">Every slide, the full teaser, every investor who fits with a pitch to each, and what's coming next. Founding members get founding prices.</p>
              <div className="up-plans" role="radiogroup" aria-label="Plan">
                {PLANS.map((p) => (
                  <button key={p.key} role="radio" aria-checked={a.plan === p.key} className={`up-plan theme-light p-${p.key}${a.plan === p.key ? " on" : ""}`} onClick={() => set("plan", p.key)}>
                    <span className="up-check" aria-hidden="true">{a.plan === p.key ? "✓ Selected" : "Select"}</span>
                    <b>{p.name}</b><span>{p.line}</span>
                    <ul>{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
                  </button>
                ))}
              </div>
              <div className="up-form theme-light">
                <div className="up-q"><span>Would you pay for this?</span><div className="pick">{[["yes", "Yes"], ["maybe", "Maybe"], ["no", "No"]].map(([k, l]) => <button key={k} aria-pressed={a.wouldPay === k} onClick={() => set("wouldPay", k)}>{l}</button>)}</div></div>
                {a.wouldPay && a.wouldPay !== "no" && <div className="up-q"><span>What would feel fair for your whole round?</span><div className="pick">{PRICES.map((p) => <button key={p} aria-pressed={a.price === p} onClick={() => set("price", p)}>{p}</button>)}</div></div>}
                <Rate label="Does this solve your problem?" value={a.solves} set={(n) => set("solves", n)} />
                <Rate label="How valuable is this to you?" value={a.valuable} set={(n) => set("valuable", n)} />
                <label className="up-q"><span>Your wins so far: what did you like most?</span><textarea className="field" maxLength={600} placeholder="e.g. the pitches open on a deal they actually did" value={a.liked} onChange={(e) => set("liked", e.target.value)} /></label>
                <label className="up-q"><span>What should we improve, or add?</span><textarea className="field" maxLength={600} placeholder="Be blunt. It helps." value={a.missing} onChange={(e) => set("missing", e.target.value)} /></label>
                <div className="up-q"><span>When are you raising?</span><div className="pick">{WHEN.map((w) => <button key={w} aria-pressed={a.raisingWhen === w} onClick={() => set("raisingWhen", w)}>{w}</button>)}</div></div>
                <label className="up-q"><span>Phone or WhatsApp <i className="opt">optional</i></span><input className="field" inputMode="tel" maxLength={20} placeholder="+91 98xxx xxxxx" value={a.phone} onChange={(e) => set("phone", e.target.value)} /></label>
              </div>
              {error && <p className="err" role="alert">{error}</p>}
              <div className="up-actions">
                <button className="btn ghost-w" onClick={onClose}>Close</button>
                <button className="btn white" data-track="click_upgrade_kit" disabled={!ok || busy} onClick={submit}>{busy ? "Sending…" : "Request full access"}</button>
              </div>
              {!ok && <p className="up-fine">Answer "would you pay" and the two ratings to send.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** A frosted preview over the moving scene, for features that are coming (pitch room analytics, data room). */
export function GlassPreview({ badge, title, sub, stats, rows, cta, onCta, note }: { badge: string; title: React.ReactNode; sub: string; stats: [string, string, string][]; rows: { name: string; meta: string; tags: string[]; quiet?: string }[]; cta: string; onCta: () => void; note?: string }) {
  return (
    <div className="gp">
      <Scene />
      <div className="gp-inner">
        <span className="up-badge">{badge}</span>
        <h2>{title}</h2>
        <p className="up-sub">{sub}</p>
        <div className="gp-stats">{stats.map(([ic, n, l]) => <div key={l}><i aria-hidden="true">{ic}</i><b>{n}</b><span>{l}</span></div>)}</div>
        <div className="gp-rows">{rows.map((r) => <div key={r.name}><div><b>{r.name}</b><span>{r.meta}</span></div><div className="gp-tags">{r.tags.map((t, i) => <span key={t} className={i ? "solid" : ""}>{t}</span>)}{r.quiet && <span className="quiet">{r.quiet}</span>}</div></div>)}</div>
        {note && <p className="up-fine">{note}</p>}
        <div className="up-actions"><button className="btn white" onClick={onCta}>{cta}</button></div>
      </div>
    </div>
  );
}

/** "Rate your kit · 60 sec": just the feedback, no plans and no price. */
export function RateSheet({ token, company, onClose, start = 0 }: { token: string; company: string; onClose: () => void; start?: number }) {
  const rate = useMutation(api.kit.rate);
  const [a, setA] = useState({ useful: start, solves: 0, valuable: 0, liked: "", missing: "" });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof a>(k: K, v: (typeof a)[K]) => setA((o) => ({ ...o, [k]: v }));
  const send = async () => {
    setBusy(true);
    await rate({ token, useful: a.useful || undefined, solves: a.solves || undefined, valuable: a.valuable || undefined, liked: a.liked, missing: a.missing }).catch(() => null);
    setBusy(false); setDone(true);
  };
  return (
    <div className="up-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rs-card theme-light rise" role="dialog" aria-modal="true" aria-label="Rate your kit">
        <button className="up-x dark" onClick={onClose} aria-label="Close">✕</button>
        {done ? (
          <div className="up-done"><h2>Thank you. <em>Really.</em></h2><p>Every answer shapes what we build next for {company} and founders like you.</p><button className="btn primary" onClick={onClose}>Back to my kit</button></div>
        ) : (
          <>
            <span className="kb-kicker">60 seconds · helps us a lot</span>
            <h2>How's your kit so far?</h2>
            <div className="up-form">
              <Rate label="How useful is this for your raise?" value={a.useful} set={(n) => set("useful", n)} />
              <Rate label="Does it solve your problem?" value={a.solves} set={(n) => set("solves", n)} />
              <Rate label="How valuable is it to you?" value={a.valuable} set={(n) => set("valuable", n)} />
              <label className="up-q"><span>What worked best?</span><textarea className="field" maxLength={600} placeholder="e.g. the reasons each investor fits" value={a.liked} onChange={(e) => set("liked", e.target.value)} /></label>
              <label className="up-q"><span>What should we improve?</span><textarea className="field" maxLength={600} placeholder="Be blunt. It helps." value={a.missing} onChange={(e) => set("missing", e.target.value)} /></label>
            </div>
            <div className="up-actions"><button className="btn ghost" onClick={onClose}>Later</button><button className="btn primary" disabled={busy || !(a.useful || a.solves || a.valuable || a.liked.trim() || a.missing.trim())} onClick={send}>{busy ? "Sending…" : "Send feedback"}</button></div>
          </>
        )}
      </div>
    </div>
  );
}

/** Once, about 45 seconds into her first dashboard visit: one tap, 1–5. Then the longer form, if she likes. */
export function QuickRate({ token, onMore, onShow }: { token: string; onMore: (n: number) => void; onShow: (open: boolean) => void }) {
  const rate = useMutation(api.kit.rate);
  const [show, setShow] = useState(false);
  const [picked, setPicked] = useState(0);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem("fos_kit_quickrate") === "1"; } catch { /* private mode */ }
    if (seen) return;
    const t = setTimeout(() => { setShow(true); onShow(true); try { localStorage.setItem("fos_kit_quickrate", "1"); } catch { /* ignore */ } }, 45000);
    return () => clearTimeout(t);
  }, [onShow]);
  const close = () => { setShow(false); onShow(false); };
  if (!show) return null;
  const pick = (n: number) => { setPicked(n); void rate({ token, useful: n }).catch(() => null); };
  return (
    <div className="qr rise" role="dialog" aria-label="Quick feedback">
      <button className="qr-x" onClick={close} aria-label="Close">✕</button>
      {picked ? (
        <><b>Thank you!</b><span>Got 60 more seconds? Two more answers help us a lot.</span><div className="qr-a"><button className="btn primary sm" onClick={() => { setShow(false); onMore(picked); }}>Tell us more</button><button className="btn ghost sm" onClick={close}>Not now</button></div></>
      ) : (
        <><b>Quick favour?</b><span>How useful is FirstCheq for your raise?</span><div className="qr-n">{[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => pick(n)} aria-label={`${n} out of 5`}>{n}</button>)}</div><div className="qr-scale"><span>Not useful</span><span>Very useful</span></div></>
      )}
    </div>
  );
}
