import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { Dial, Face, Logo } from "./Art";
import { cheque, SOON } from "../lib/investor";

// Shared by the reveal page and the dashboard: one investor, their email, and the buttons around it.

export type Me = NonNullable<FunctionReturnType<typeof api.founders.me>>;
export type Row = Me["rows"][number];
type Draft = NonNullable<Row["draft"]>;
type Toast = (s: string) => void;

const site = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const gmailUrl = (to: string, d: Draft) => `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(d.subject)}&body=${encodeURIComponent(d.body)}`;

export function Head({ r, rank }: { r: Row; rank?: boolean }) {
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

export function PickCard({ r, token, onToast }: { r: Row; token: string; onToast: Toast }) {
  return (
    <article className="pick-card rise">
      <Head r={r} rank />
      {r.draft ? (
        <>
          <div className="reason"><Dial score={r.score} size={52} /><p>{r.draft.reason}</p></div>
          <Why r={r} d={r.draft} />
          <EmailBox r={r} d={r.draft} token={token} onToast={onToast} />
        </>
      ) : <div className="warn">We couldn't write this one. Try again in a few minutes.</div>}
    </article>
  );
}

function copyText(text: string): boolean {
  // navigator.clipboard only exists on https and localhost; the hidden-textarea copy works everywhere else
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

export function EmailBox({ r, d, token, onToast }: { r: Row; d: Draft; token: string; onToast: Toast }) {
  const markSent = useMutation(api.founders.markSent);
  const copy = async () => {
    const text = `${d.subject}\n\n${d.body}`;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else if (!copyText(text)) throw new Error("copy failed");
      onToast("Copied. Paste it into any email.");
    } catch { onToast("Couldn't copy. Select the text and copy it."); }
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

/** "Why they fit you": a gold button that opens the reasons, the one watch-out and the sources. */
export function Why({ r, d }: { r: Row; d: Draft }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`why${open ? " open" : ""}`}>
      <button className="why-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>Why they fit you</span><span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="why-body">
          <ul className="rat">{d.whyFit.map((w) => <li key={w}>{w}</li>)}</ul>
          <ul className="rat risk">{d.watchOut.map((w) => <li key={w}>Watch out: {w}</li>)}</ul>
          {r.sourceUrls.length > 0 && <span className="src">Sources: {r.sourceUrls.slice(0, 2).map(site).join(" · ")}{r.lastChecked ? ` · checked ${r.lastChecked}` : ""}</span>}
        </div>
      )}
    </div>
  );
}

export function InvestorRow({ r, token, onToast, startOpen = false }: { r: Row; token: string; onToast: Toast; startOpen?: boolean }) {
  const writeMore = useAction(api.write.writeMore);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(startOpen);
  const write = async () => {
    setBusy(true);
    const res = await writeMore({ token, rank: r.rank }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setBusy(false);
    if (res.ok) setOpen(true); else onToast(res.error);
  };
  return (
    <div className={`row-card${r.rank < 3 ? " top" : ""}`}>
      <div className="row-main">
        <Dial score={r.score} size={40} />
        <Head r={r} rank={r.rank < 3} />
        <span className="muted small cheque">{cheque(r)}</span>
        {r.draft
          ? <button className="btn ghost sm" onClick={() => setOpen((o) => !o)}>{open ? "Hide" : r.sentAt ? "✓ Sent" : "Email"}</button>
          : <button className="btn primary sm" disabled={busy} onClick={write}>{busy ? "Writing…" : "Write email"}</button>}
      </div>
      {open && r.draft && (
        <div className="row-email">
          <p className="fg2 small">{r.draft.reason}</p>
          <Why r={r} d={r.draft} />
          <EmailBox r={r} d={r.draft} token={token} onToast={onToast} />
        </div>
      )}
    </div>
  );
}

export function SoonCards({ onToast }: { onToast: Toast }) {
  return (
    <div className="soon-grid">
      {SOON.map((s) => (
        <button className="soon-card" key={s.title} onClick={() => onToast(`${s.title} is coming soon.`)}>
          <span className="soon-icon" aria-hidden="true">{s.icon}</span>
          <span className="soon-text"><b>{s.title} <span className="soon-tag">SOON</span></b><span>{s.line}</span></span>
        </button>
      ))}
    </div>
  );
}
