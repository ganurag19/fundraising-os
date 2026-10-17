import { useMemo, useRef, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dial } from "../components/Art";
import { Pipeline } from "../components/Investor";
import { copyOut, openInGmail } from "../lib/send";
import type { Me, Row } from "../components/Investor";
import { cheque } from "../lib/investor";
import { InvestorSheet } from "./InvestorSheet";
import { PartnerFace } from "./PartnerFace";
import { pitchLine } from "./partner";

// Outreach: one investor at a time as a card. Swipe right (or Send) opens the pitch in her Gmail and marks it sent;
// swipe left (or Skip) moves it to the back. Nothing leaves without her pressing send in Gmail.

type Toast = (s: string) => void;
const SKIP = "fos_kit_skipped";
const readSkipped = (): number[] => { try { return JSON.parse(sessionStorage.getItem(SKIP) ?? "[]"); } catch { return []; } };
const site = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
const KIND: Record<string, string> = { angel: "Angel", angel_network: "Angel network", vc: "Fund", corporate_vc: "Corporate fund", accelerator: "Accelerator", incubator: "Incubator", grant: "Grant", family_office: "Family office" };
const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export function Outreach({ me, token, onToast, onUnlock, goal = 20 }: { me: Me; token: string; onToast: Toast; onUnlock: () => void; goal?: number }) {
  const [view, setView] = useState<"cards" | "list">("list");
  const [skipped, setSkipped] = useState<number[]>(readSkipped);
  const [first, setFirst] = useState<number | null>(null); // "Open as card" from the list puts that investor on top
  const live = me.rows.filter((r) => !r.retired && !r.locked);
  const queue = useMemo(() => {
    const todo = live.filter((r) => r.status === "new");
    // drafted first, then by rank; skipped ones go to the back in the order she skipped them
    const fresh = todo.filter((r) => !skipped.includes(r.rank)).sort((a, b) => Number(!a.draft) - Number(!b.draft) || a.rank - b.rank);
    const later = skipped.map((k) => todo.find((r) => r.rank === k)).filter((r): r is Row => !!r);
    const all = [...fresh, ...later];
    const i = first === null ? -1 : all.findIndex((r) => r.rank === first);
    return i > 0 ? [all[i], ...all.slice(0, i), ...all.slice(i + 1)] : all;
  }, [live, skipped, first]);
  const sent = live.filter((r) => r.status !== "new").length;
  const skip = (r: Row) => { const next = [...skipped.filter((k) => k !== r.rank), r.rank]; setSkipped(next); try { sessionStorage.setItem(SKIP, JSON.stringify(next)); } catch { /* ignore */ } };
  return (
    <section className="ko">
      <div className="ko-top">
        <div className="ko-progress"><span>Your outreach · <b>{sent}</b> sent · {Math.max(0, goal - sent)} to go this week</span><span className="kc-bar"><i style={{ width: `${Math.min(100, (sent / goal) * 100)}%` }} /></span></div>
        <div className="ko-switch" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === "list"} onClick={() => setView("list")}>List</button>
          <button role="tab" aria-selected={view === "cards"} onClick={() => setView("cards")}>Swipe cards</button>
        </div>
      </div>
      {view === "cards"
        ? (queue.length ? <Stack key={queue[0].rank} r={queue[0]} next={queue[1]} me={me} token={token} onToast={onToast} onUnlock={onUnlock} onSkip={skip} left={queue.length} /> : <div className="empty"><b>You've been through everyone on your list.</b><span>Your sent pitches and follow-ups are in the list view.</span><button className="btn primary sm" onClick={() => setView("list")}>See the list</button></div>)
        : <List me={me} token={token} onToast={onToast} onUnlock={onUnlock} onOpen={(r) => { setFirst(r.rank); setView("cards"); }} />}
    </section>
  );
}

function Stack({ r, next, me, token, onToast, onUnlock, onSkip, left }: { r: Row; next?: Row; me: Me; token: string; onToast: Toast; onUnlock: () => void; onSkip: (r: Row) => void; left: number }) {
  const setStatus = useMutation(api.pipeline.setStatus);
  const saveEdit = useMutation(api.pipeline.saveEdit);
  const writeMore = useAction(api.write.writeMore);
  const [dx, setDx] = useState(0);
  const [out, setOut] = useState<"left" | "right" | null>(null);
  const [why, setWhy] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState<"email" | "linkedin">("email");
  const [edit, setEdit] = useState<{ subject: string; body: string } | null>(null);
  const [writing, setWriting] = useState(false);
  const drag = useRef<{ x: number; id: number } | null>(null);
  const d = r.draft;
  const applyOnly = !r.hasEmail && !!r.applyUrl;
  const canSend = !!d && (!!r.email || applyOnly);

  const finish = (dir: "left" | "right") => {
    setOut(dir);
    setTimeout(() => {
      if (dir === "left") onSkip(r);
      else void setStatus({ token, rank: r.rank, status: "sent" });
    }, 380);
  };
  const send = () => {
    if (applyOnly && r.applyUrl) { window.open(r.applyUrl, "_blank", "noopener"); onToast("Opened their form. Marked as applied."); finish("right"); return; }
    if (!d || !r.email) return;
    openInGmail(r.email, { subject: d.subject, body: d.body }, me.gmail);
    onToast(`Opened in Gmail. Press send there. First follow-up on ${day(Date.now() + 3 * 864e5)}.`);
    finish("right");
  };
  const write = async () => {
    setWriting(true);
    const res = await writeMore({ token, rank: r.rank }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setWriting(false);
    if (!res.ok) { if (/unlock/i.test(res.error)) onUnlock(); else onToast(res.error); }
  };
  const save = async () => {
    if (!edit) return;
    const res = await saveEdit({ token, rank: r.rank, subject: edit.subject, body: edit.body }).catch(() => ({ ok: false as const, error: "Couldn't save. Check your connection." }));
    if (res.ok) { setEdit(null); onToast("Saved. Send uses your version."); } else onToast(res.error);
  };
  // Swipe: drag the card sideways; past 110px it goes. Taps on buttons and text don't start a drag.
  const onDown = (e: React.PointerEvent) => {
    if (edit || (e.target as HTMLElement).closest("button, a, textarea, input, select, .ko-msg")) return;
    drag.current = { x: e.clientX, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => { if (drag.current?.id === e.pointerId) setDx(e.clientX - drag.current.x); };
  const onUp = () => {
    if (!drag.current) return;
    drag.current = null;
    if (dx > 110 && canSend) send();
    else if (dx < -110) finish("left");
    setDx(0);
  };
  const tilt = out ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 22}deg)`, transition: dx ? "none" : undefined };
  const person = r.person && r.person !== r.displayName ? r.person : null;
  return (
    <div className="ko-stack">
      {next && <div className="kc-card under" aria-hidden="true"><b>{next.displayName ?? "Next investor"}</b></div>}
      <article className={`kc-card ko-card${out ? ` out-${out}` : ""}`} style={tilt} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        {dx > 40 && canSend && <span className="ko-stamp send">Send</span>}
        {dx < -40 && <span className="ko-stamp skip">Later</span>}
        <header className="kc-head">
          <Dial score={r.score} size={54} />
          <PartnerFace face={r.face} logo={r.logo} name={r.displayName ?? ""} kind={r.kind} size={48} />
          <div className="ko-who">
            <b>{r.displayName}</b>
            <span>{pitchLine(r.face) ?? [person, r.title].filter(Boolean).join(", ")}</span>
            <span className="muted small">{[KIND[r.kind] ?? "Investor", r.city, r.leadsRounds ? "Leads rounds" : null].filter(Boolean).join(" · ")}{r.website && <> · <a href={r.website} target="_blank" rel="noreferrer">{site(r.website)} ↗</a></>}</span>
          </div>
          <span className="ko-left">{left} left</span>
        </header>
        <button className="ko-prof" onClick={() => setSheet(true)}>See their profile, deals and team ›</button>
        <div className="kc-facts">
          <span><em>Recent deal</em>{r.deal ? `${r.deal.company}${r.deal.round ? ` · ${r.deal.round}` : ""}${r.deal.year ? ` · ${r.deal.year}` : ""}` : "None on record"}</span>
          <span><em>Cheque</em>{cheque(r) || "Not published"}</span>
        </div>
        <button className="kc-why-btn" aria-expanded={why} onClick={() => setWhy((w) => !w)}><span>Why this investor</span><span aria-hidden="true">{why ? "▴" : "▾"}</span></button>
        <div className={`kc-why${why ? " open" : ""}`}><div>
          {d ? <><ul>{d.whyFit.map((x) => <li key={x}>{x}</li>)}</ul>{d.watchOut.map((x) => <p key={x} className="ko-watch">Watch out: {x}</p>)}</> : <p>{r.reason}</p>}
          {r.sourceUrls.length > 0 && <span className="muted small">Sources: {r.sourceUrls.slice(0, 2).map(site).join(" · ")}{r.lastChecked ? ` · checked ${r.lastChecked}` : ""}</span>}
        </div></div>

        {d ? (
          <>
            <div className="kc-tabs" role="tablist">
              <button role="tab" aria-selected={tab === "email"} className={tab === "email" ? "on" : ""} onClick={() => setTab("email")}>Email</button>
              <button role="tab" aria-selected={tab === "linkedin"} className={tab === "linkedin" ? "on" : ""} onClick={() => setTab("linkedin")}>LinkedIn note</button>
            </div>
            {tab === "email" && (edit ? (
              <div className="ko-edit">
                <input className="field" aria-label="Subject" maxLength={150} value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} />
                <textarea className="field" aria-label="Email" maxLength={3000} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} />
                <div className="ko-row"><button className="btn primary sm" onClick={save}>Save my version</button><button className="btn ghost sm" onClick={() => setEdit(null)}>Cancel</button></div>
              </div>
            ) : (
              <div className="kc-msg ko-msg"><span className="muted small">To {r.email ?? (applyOnly ? "their application form" : "no email on record")}</span><b>{d.subject}</b><p>{d.body}</p></div>
            ))}
            {tab === "linkedin" && (
              <div className="kc-msg ko-msg">
                {d.linkedin ? <><p>{d.linkedin}</p><div className="ko-row">
                  <button className="btn ghost sm" onClick={() => copyOut(d.linkedin ?? "", onToast, "Copied. On LinkedIn, tap Connect, then Add a note, and paste.")}>Copy note</button>
                  <a className="btn ghost sm" target="_blank" rel="noreferrer noopener" href={r.linkedin ?? `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent([r.person, r.displayName].filter(Boolean).join(" "))}`}>{r.linkedin ? "Open LinkedIn" : "Find on LinkedIn"}</a>
                </div></> : <p className="muted">No LinkedIn note for this one yet. Use the list view to write one.</p>}
              </div>
            )}
            {d.warnings.map((w) => <div className="warn" key={w}>⚠ {w}</div>)}
          </>
        ) : (
          <div className="kc-msg ko-msg ko-nodraft"><p>{r.reason ?? "Fits your sector, stage and round."}</p><button className="btn primary sm" disabled={writing} onClick={write}>{writing ? "Writing your pitch…" : "Write my pitch to them"}</button></div>
        )}

        <div className="kc-actions">
          <button className="btn ghost" data-track="click_swipe_skip" onClick={() => finish("left")}>✕ Later</button>
          {d && tab === "email" && !edit && <button className="btn ghost sm" onClick={() => setEdit({ subject: d.subject, body: d.body })}>Edit</button>}
          <button className="btn primary" data-track="click_swipe_send" disabled={!canSend} onClick={send}>{applyOnly ? "Apply ✓" : "Send ✓"}</button>
        </div>
      </article>
      {sheet && <InvestorSheet r={r} me={me} token={token} onClose={() => setSheet(false)} onToast={onToast} onUnlock={() => { setSheet(false); onUnlock(); }} onCard={() => setSheet(false)} />}
      <p className="muted small center ko-hint">Swipe right to send from your Gmail, left for later. Or use the buttons.</p>
    </div>
  );
}

const TYPES: [string, string, string[]][] = [
  ["all", "All", []], ["angel", "Angels", ["angel"]], ["network", "Angel networks", ["angel_network"]], ["vc", "VC funds", ["vc", "corporate_vc", "family_office"]],
  ["programme", "Accelerators & incubators", ["accelerator", "incubator"]], ["grant", "Grants", ["grant"]],
];
const SORTS: [string, string][] = [["fit", "Fit Score"], ["recent", "Most recent deal"], ["cheque", "Biggest cheque"], ["leads", "Leads rounds first"]];

function List({ me, token, onToast, onOpen, onUnlock }: { me: Me; token: string; onToast: Toast; onOpen: (r: Row) => void; onUnlock: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("fit");
  const kinds = TYPES.find(([k]) => k === type)?.[2] ?? [];
  const all = me.rows.filter((r) => r.status === "new");
  const count = (ks: string[]) => (ks.length ? all.filter((r) => ks.includes(r.kind)).length : all.length);
  const todo = all.filter((r) => !kinds.length || kinds.includes(r.kind)).sort((a, b) =>
    sort === "recent" ? (b.lastDealYear ?? 0) - (a.lastDealYear ?? 0) || a.rank - b.rank
      : sort === "cheque" ? (b.chequeMaxLakh ?? 0) - (a.chequeMaxLakh ?? 0) || a.rank - b.rank
        : sort === "leads" ? Number(b.leadsRounds) - Number(a.leadsRounds) || a.rank - b.rank
          : a.rank - b.rank);
  const lockedN = todo.filter((r) => r.locked).length;
  const openRow = open === null ? null : me.rows.find((r) => r.rank === open) ?? null;
  if (!todo.length && type !== "all") return <div className="ko-list"><div className="empty"><b>None of this type on your list yet.</b><button className="btn ghost sm" onClick={() => setType("all")}>Show all</button></div></div>;
  return (
    <div className="ko-list">
      <Pipeline rows={me.rows.filter((r) => !r.locked)} token={token} onToast={onToast} account={me.gmail} />
      <h2 className="dash-h">To send · {todo.length - lockedN} pitch ready{lockedN ? ` · ${lockedN} more fit you` : ""}</h2>
      <div className="ko-filters">
        <div className="ko-types" role="tablist" aria-label="Investor type">{TYPES.filter(([, , ks]) => !ks.length || count(ks) > 0).map(([k, label, ks]) => <button key={k} role="tab" aria-selected={type === k} onClick={() => setType(k)}>{label}<i>{count(ks)}</i></button>)}</div>
        <label className="ko-sort">Sort<select value={sort} onChange={(e) => setSort(e.target.value)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      {openRow && <InvestorSheet r={openRow} me={me} token={token} onClose={() => setOpen(null)} onToast={onToast} onUnlock={() => { setOpen(null); onUnlock(); }} onCard={(r) => { setOpen(null); onOpen(r); }} />}
      <p className="ko-tip">Tap any investor to see their profile, team and your pitch.</p>
      <div className="ko-legend"><span className="t5">Top 5 · pitch ready</span><span className="op">Next 15 · named, free</span><span className="lk">🔒 Email, pitch and the rest: full kit</span></div>
      <div className="ko-rows">
        {todo.map((r) => (
          <button key={r.rank} className={`ko-row2${r.rank < 5 ? " top" : ""}${r.locked ? " locked" : ""}${r.retired ? " retired" : ""}`} onClick={() => setOpen(r.rank)}>
            <Dial score={r.score} size={40} />
            {r.rank < 20 ? <PartnerFace face={r.face} logo={r.logo} name={r.displayName ?? ""} kind={r.kind} size={38} /> : <span className="ko-mask" aria-hidden="true">🔒</span>}
            <span className="ko-li-main"><b>{r.displayName}{r.rank < 5 && <span className="ko-top5">Top 5</span>}</b>{r.face && <span className="ko-who-p">{pitchLine(r.face)}</span>}<span>{r.retired ? "No longer active" : r.draft?.hook ?? r.reason ?? "Fits your sector, stage and round."}</span></span>
            <span className={`ko-li-tag${r.draft ? " ok" : ""}${r.locked ? " lk" : ""}`}>{r.status !== "new" ? "✓ Sent" : r.draft ? "Pitch ready" : r.locked ? (r.rank < 20 ? "🔒 Email & pitch" : "🔒 Full kit") : "Write pitch"}</span>
            <span className="ko-go" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

