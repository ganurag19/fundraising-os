import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Dial, Face, Logo } from "../components/Art";
import { visitorToken } from "../lib/token";

type Me = NonNullable<FunctionReturnType<typeof api.founders.me>>;
type Row = Me["rows"][number];
type Draft = NonNullable<Row["draft"]>;

const lakh = (l: number) => (l >= 100 ? `₹${+(l / 100).toFixed(1)} Cr` : `₹${l}L`);
const cheque = (r: Row) => (r.chequeMinLakh != null && r.chequeMaxLakh != null ? `${lakh(r.chequeMinLakh)}–${lakh(r.chequeMaxLakh).slice(1)}` : r.chequeMaxLakh != null ? `up to ${lakh(r.chequeMaxLakh)}` : null);
const site = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const gmailUrl = (to: string, d: Draft) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;

// The reveal: her 3 top picks with emails ready, then the rest of her list behind sign-in.
export default function Emails() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });
  const { isAuthenticated } = useConvexAuth();
  const claim = useMutation(api.founders.claim);
  const claimed = useRef(false);
  const [toast, setToast] = useState("");

  // Back from Google: move her visitor list to her account.
  useEffect(() => {
    if (!isAuthenticated || !me || me.unlocked || claimed.current) return;
    claimed.current = true;
    claim({ token }).then((r) => { if (!r.ok) setToast(r.error); });
  }, [isAuthenticated, me, claim, token]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  if (me === undefined) return <Page><div className="spinner" /></Page>;
  if (!me || me.emailsStatus !== "ready") {
    return (
      <Page><div className="step center" style={{ margin: "60px auto" }}>
        <h1>Your emails aren't written yet.</h1>
        <p className="help">{me?.emailsStatus === "writing" ? "We're writing them now. This page updates by itself." : "Finish the short sign-up and we'll write them."}</p>
        <Link className="btn primary" to="/start">Continue sign-up</Link>
      </div></Page>
    );
  }

  const picks = me.rows.filter((r) => r.rank < 3);
  const rest = me.rows.filter((r) => r.rank >= 3);
  const moreCount = Math.max(0, me.matchCount - picks.length);

  return (
    <Page>
      <header className="reveal-head">
        <span className="kicker">{me.company} · {me.stage} · {me.ask}</span>
        <h1>3 investors to email <span className="it">today.</span></h1>
        {me.matchCount > 3 && <p className="fg2">Picked from {me.matchCount} that fit {me.company}.</p>}
      </header>

      <div className="picks">
        {picks.map((r) => <PickCard key={r.rank} r={r} token={token} onToast={setToast} />)}
      </div>

      {moreCount > 0 && (
        <section className="more">
          <h2>{moreCount} more investors <span className="it">fit {me.company}.</span></h2>
          {me.unlocked
            ? <div className="rows">{rest.map((r) => <MoreRow key={r.rank} r={r} token={token} onToast={setToast} />)}</div>
            : <Locked rows={rest.slice(0, 5)} />}
          {me.unlocked && moreCount > rest.length && <p className="muted small">Showing the best {rest.length}. More as you send.</p>}
        </section>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Page>
  );
}

function Head({ r, rank }: { r: Row; rank?: boolean }) {
  const name = r.displayName ?? "";
  return (
    <div className="pick-head">
      {r.kind === "angel" ? <Face name={r.person ?? name} size={44} /> : <Logo name={name} size={44} />}
      <div className="who">
        <b>{name}</b>
        <span>{[r.person && r.person !== name ? r.person : null, r.city].filter(Boolean).join(" · ")}
          {r.website && <> · <a href={r.website} target="_blank" rel="noreferrer">{site(r.website)} ↗</a></>}</span>
      </div>
      {rank && <span className="tag gold rank-tag">#{r.rank + 1}</span>}
    </div>
  );
}

function PickCard({ r, token, onToast }: { r: Row; token: string; onToast: (s: string) => void }) {
  return (
    <article className="pick-card rise">
      <Head r={r} rank />
      {r.draft ? (
        <>
          <div className="reason"><Dial score={r.score} size={52} /><p>{r.draft.reason}</p></div>
          <EmailBox r={r} d={r.draft} token={token} onToast={onToast} />
          <Why r={r} d={r.draft} />
        </>
      ) : <div className="warn">We couldn't write this one. Try again in a few minutes.</div>}
    </article>
  );
}

function EmailBox({ r, d, token, onToast }: { r: Row; d: Draft; token: string; onToast: (s: string) => void }) {
  const markSent = useMutation(api.founders.markSent);
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${d.subject}\n\n${d.body}`); onToast("Copied. Paste it into any email."); }
    catch { onToast("Couldn't copy. Select the text and copy it."); }
  };
  return (
    <>
      <div className="email">
        <div className="to">To {r.email}</div>
        <div className="subj">{d.subject}</div>
        {d.body}
      </div>
      {d.warnings.map((w) => <div className="warn" key={w}>⚠ {w}</div>)}
      <div className="email-actions">
        <a className="btn primary sm" href={gmailUrl(r.email ?? "", d)} target="_blank" rel="noreferrer">Open in Gmail</a>
        <button className="btn ghost sm icon" onClick={copy} aria-label="Copy email" title="Copy email">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>
        </button>
        <button className={`btn sm ${r.sentAt ? "sent" : "ghost"}`} aria-pressed={!!r.sentAt} onClick={() => markSent({ token, rank: r.rank, sent: !r.sentAt })}>
          {r.sentAt ? "✓ Sent" : "I sent it"}
        </button>
      </div>
    </>
  );
}

function Why({ r, d }: { r: Row; d: Draft }) {
  return (
    <details className="why">
      <summary>Why them</summary>
      <ul className="rat">{d.whyFit.map((w) => <li key={w}>{w}</li>)}</ul>
      <ul className="rat risk">{d.watchOut.map((w) => <li key={w}>{w}</li>)}</ul>
      {r.sourceUrls.length > 0 && <span className="src">Sources: {r.sourceUrls.slice(0, 2).map(site).join(" · ")}{r.lastChecked ? ` · checked ${r.lastChecked}` : ""}</span>}
    </details>
  );
}

function MoreRow({ r, token, onToast }: { r: Row; token: string; onToast: (s: string) => void }) {
  const writeMore = useAction(api.write.writeMore);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const write = async () => {
    setBusy(true);
    const res = await writeMore({ token, rank: r.rank }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setBusy(false);
    if (res.ok) setOpen(true); else onToast(res.error);
  };
  return (
    <div className="row-card">
      <div className="row-main">
        <Dial score={r.score} size={40} />
        <Head r={r} />
        <span className="muted small cheque">{cheque(r)}</span>
        {r.draft
          ? <button className="btn ghost sm" onClick={() => setOpen((o) => !o)}>{open ? "Hide email" : r.sentAt ? "✓ Sent" : "Read email"}</button>
          : <button className="btn primary sm" disabled={busy} onClick={write}>{busy ? "Writing…" : "Write email"}</button>}
      </div>
      {open && r.draft && <div className="row-email"><p className="fg2 small">{r.draft.reason}</p><EmailBox r={r} d={r.draft} token={token} onToast={onToast} /></div>}
    </div>
  );
}

function Locked({ rows }: { rows: Row[] }) {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  return (
    <div className="locked">
      <div className="rows" aria-hidden="true">
        {rows.map((r) => (
          <div className="row-card" key={r.rank}>
            <div className="row-main">
              <Dial score={r.score} size={40} />
              <div className="pick-head"><div className="blur-logo" /><div className="who"><b className="blurred">Hidden investor</b><span>{r.city ?? "India"}</span></div></div>
              <span className="muted small cheque">{cheque(r)}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="unlock">
        <b>See who they are, and write to them.</b>
        <button className="btn white" disabled={busy} onClick={() => { setBusy(true); void signIn("google", { redirectTo: "/emails" }); }}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
          {busy ? "Opening Google…" : "Continue with Google"}
        </button>
        <span className="muted small">Free. Nothing is ever sent for you.</span>
      </div>
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-wrap">
      <div className="app-top"><Link className="logo" to="/"><span className="logo-mark">F</span>Fundraising OS</Link><span className="tag gold">Beta</span></div>
      {children}
    </main>
  );
}
