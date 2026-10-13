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
type Mail = { subject: string; body: string };
type Toast = (s: string) => void;

const site = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
const enc = encodeURIComponent;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);
const mailto = (to: string, d: Mail) => `mailto:${to}?subject=${enc(d.subject)}&body=${enc(d.body)}`;
/** Laptop: Gmail's compose window in her signed-in account. Phones ignore that link, so they get the app instead. */
const gmailWeb = (to: string, d: Mail, account: string | null) =>
  `https://mail.google.com/mail/${account ? `?authuser=${enc(account)}&` : "?"}view=cm&fs=1&to=${enc(to)}&su=${enc(d.subject)}&body=${enc(d.body)}`;

function openInGmail(to: string, d: Mail, account: string | null) {
  if (isIOS()) {
    // Gmail app if it's installed; if the page is still showing a moment later, her default mail app
    const fallback = setTimeout(() => { if (!document.hidden) window.location.href = mailto(to, d); }, 1200);
    document.addEventListener("visibilitychange", () => clearTimeout(fallback), { once: true });
    window.location.href = `googlegmail:///co?to=${enc(to)}&subject=${enc(d.subject)}&body=${enc(d.body)}`;
  } else if (isAndroid()) {
    window.location.href = mailto(to, d); // opens Gmail, the default mail app on most Android phones
  } else {
    window.open(gmailWeb(to, d, account), "_blank", "noopener");
  }
}

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

const CopyIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></svg>;
const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** One email (first or follow-up): To, subject, body, then Open in Gmail, copy, and her "I sent it". */
function MailBox({ to, mail, warnings = [], sent, onSent, onToast, account, onSave }: { to: string; mail: Mail; warnings?: string[]; sent: boolean; onSent: () => void; onToast: Toast; account: string | null; onSave?: (m: Mail) => Promise<string | null> }) {
  const [editing, setEditing] = useState<Mail | null>(null);
  const save = async () => {
    if (!editing || !onSave) return;
    const err = await onSave(editing);
    if (err) onToast(err); else { setEditing(null); onToast("Saved. Open in Gmail uses your version."); }
  };
  const copy = async () => {
    const text = `${mail.subject}\n\n${mail.body}`;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else if (!copyText(text)) throw new Error("copy failed");
      onToast("Copied. Paste it into any email.");
    } catch { onToast("Couldn't copy. Select the text and copy it."); }
  };
  return (
    <>
      {editing ? (
        <div className="email editing">
          <div className="to">To {to}</div>
          <input className="field subj-edit" aria-label="Subject" maxLength={150} value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
          <textarea className="field body-edit" aria-label="Email" maxLength={3000} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
          <div className="email-actions"><button className="btn primary sm" onClick={save}>Save my version</button><button className="btn ghost sm" onClick={() => setEditing(null)}>Cancel</button><span className="muted small">{editing.body.trim().split(/\s+/).filter(Boolean).length} words</span></div>
        </div>
      ) : (
        <div className="email">
          <div className="to">To {to}{onSave && <button className="edit-link" onClick={() => setEditing({ subject: mail.subject, body: mail.body })}>Edit</button>}</div>
          <div className="subj">{mail.subject}</div>
          {mail.body}
        </div>
      )}
      {warnings.map((w) => <div className="warn" key={w}>⚠ {w}</div>)}
      {!editing && <div className="email-actions">
        <button className="btn primary sm" onClick={() => openInGmail(to, mail, account)}>Open in Gmail</button>
        <button className="btn ghost sm icon" onClick={copy} aria-label="Copy email" title="Copy email"><CopyIcon /></button>
        <button className={`btn sm ${sent ? "sent" : "ghost"}`} aria-pressed={sent} onClick={onSent}>{sent ? "✓ Sent" : "I sent it"}</button>
      </div>}
    </>
  );
}

export function EmailBox({ r, d, token, onToast, account = null }: { r: Row; d: Draft; token: string; onToast: Toast; account?: string | null }) {
  const setStatus = useMutation(api.pipeline.setStatus);
  const sent = r.status !== "new";
  const onSent = () => {
    void setStatus({ token, rank: r.rank, status: sent ? "new" : "sent" });
    onToast(sent ? "Marked as not sent." : `Sent. We'll write your first follow-up for ${day(Date.now() + 3 * 864e5)}.`);
  };
  const saveEdit = useMutation(api.pipeline.saveEdit);
  const onSave = async (m: Mail) => {
    const res = await saveEdit({ token, rank: r.rank, subject: m.subject, body: m.body }).catch(() => ({ ok: false as const, error: "Couldn't save. Check your connection." }));
    return res.ok ? null : res.error;
  };
  return <MailBox to={r.email ?? ""} mail={d} warnings={d.warnings} sent={sent} onSent={onSent} onToast={onToast} account={account} onSave={sent ? undefined : onSave} />;
}

/** A follow-up that's ready: same buttons; "I sent it" schedules the next one. */
export function FollowupBox({ r, fu, token, onToast, account = null }: { r: Row; fu: Row["followups"][number]; token: string; onToast: Toast; account?: string | null }) {
  const followupSent = useMutation(api.pipeline.followupSent);
  if (!fu.subject || !fu.body) return null;
  const onSent = () => {
    void followupSent({ token, followupId: fu.id });
    onToast(fu.n === 1 ? `Sent. If they're quiet, a last follow-up on ${day(Date.now() + 7 * 864e5)}.` : "Sent. That was the last follow-up for this investor.");
  };
  return <MailBox to={r.email ?? ""} mail={{ subject: fu.subject, body: fu.body }} sent={false} onSent={onSent} onToast={onToast} account={account} />;
}

const STATUSES = [["new", "Not sent"], ["sent", "Waiting on them"], ["replied", "Replied"], ["meeting", "Meeting"], ["passed", "Passed"]] as const;

/** Status ▾: plain updates. A reply, meeting or pass stops the follow-ups. */
export function StatusMenu({ r, token, onToast }: { r: Row; token: string; onToast: Toast }) {
  const setStatus = useMutation(api.pipeline.setStatus);
  return (
    <select className="status-menu" aria-label="Status" value={r.status} onChange={(e) => {
      const status = e.target.value as Row["status"];
      void setStatus({ token, rank: r.rank, status });
      if (status === "replied" || status === "meeting") onToast("Nice. Follow-ups for this investor are stopped.");
      if (status === "passed") onToast("Noted. No more follow-ups to them.");
    }}>
      {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
    </select>
  );
}

/** The pipeline on the dashboard: Your move, Waiting on them, Replied and meetings, Passed. */
export function Pipeline({ rows, token, onToast, account }: { rows: Row[]; token: string; onToast: Toast; account: string | null }) {
  const [now] = useState(() => Date.now());
  const ready = (r: Row) => r.followups.find((f) => f.state === "ready");
  const next = (r: Row) => r.followups.find((f) => f.state === "scheduled");
  const yourMove = rows.filter((r) => r.status === "sent" && ready(r));
  const waiting = rows.filter((r) => r.status === "sent" && !ready(r));
  const talking = rows.filter((r) => r.status === "replied" || r.status === "meeting");
  const passed = rows.filter((r) => r.status === "passed");
  if (!yourMove.length && !waiting.length && !talking.length && !passed.length) return null;
  const since = (t: number | null) => { if (!t) return ""; const d = Math.floor((now - t) / 864e5); return d <= 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`; };
  return (
    <section className="pipeline">
      <div className="stats pipe-stats">
        <div className={yourMove.length ? "hot" : ""}><b>{yourMove.length}</b><span>your move</span></div>
        <div><b>{waiting.length}</b><span>waiting on them</span></div>
        <div><b>{talking.length}</b><span>replied or meeting</span></div>
      </div>
      {yourMove.length > 0 && <>
        <h2 className="dash-h">Your move</h2>
        <div className="rows">{yourMove.map((r) => { const fu = ready(r)!; return (
          <div className="row-card" key={r.rank}>
            <div className="row-main"><Head r={r} /><span className="due today">Follow-up {fu.n} due</span><StatusMenu r={r} token={token} onToast={onToast} /></div>
            <div className="row-email"><p className="fg2 small">You emailed them {since(r.sentAt)} and haven't heard back. Here's a short nudge.</p><FollowupBox r={r} fu={fu} token={token} onToast={onToast} account={account} /></div>
          </div>
        ); })}</div>
      </>}
      {waiting.length > 0 && <>
        <h2 className="dash-h">Waiting on them</h2>
        <div className="rows">{waiting.map((r) => { const n = next(r); return (
          <div className="row-card" key={r.rank}>
            <div className="row-main"><Head r={r} /><span className="due">{n ? `Follow-up ${n.n} on ${day(n.dueAt)}` : `Sent ${since(r.sentAt)}`}</span><StatusMenu r={r} token={token} onToast={onToast} /></div>
          </div>
        ); })}</div>
      </>}
      {talking.length > 0 && <>
        <h2 className="dash-h">Replied and meetings</h2>
        <div className="rows">{talking.map((r) => <div className="row-card" key={r.rank}><div className="row-main"><Head r={r} /><StatusMenu r={r} token={token} onToast={onToast} /></div></div>)}</div>
      </>}
      {passed.length > 0 && <p className="muted small" style={{ marginTop: 12 }}>Passed: {passed.map((r) => r.displayName).join(", ")}</p>}
    </section>
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

export function InvestorRow({ r, token, onToast, startOpen = false, account = null }: { r: Row; token: string; onToast: Toast; startOpen?: boolean; account?: string | null }) {
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
          <EmailBox r={r} d={r.draft} token={token} onToast={onToast} account={account} />
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
