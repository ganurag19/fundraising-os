import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dial } from "../components/Art";
import { StatusMenu } from "../components/Investor";
import type { Me, Row } from "../components/Investor";
import { copyOut, openInGmail } from "../lib/send";
import { cheque } from "../lib/investor";
import { PartnerFace } from "./PartnerFace";
import { pitchLine } from "./partner";

// One investor, everything in one place (17 Oct, after "the open card is not intuitive"): who they are, where their
// money goes, their deals and team (from their own site), why they fit her, and her pitch with Send. Facts from the record only.

type Toast = (s: string) => void;
const site = (u: string) => u.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/.*$/, "");
const KIND: Record<string, string> = { angel: "Angel", angel_network: "Angel network", vc: "Fund", corporate_vc: "Corporate fund", accelerator: "Accelerator", incubator: "Incubator", grant: "Grant", family_office: "Family office" };
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Face({ name, photo }: { name: string; photo: string | null }) {
  const [broken, setBroken] = useState(false);
  return photo && !broken ? <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} /> : <i>{initials(name)}</i>;
}

export function InvestorSheet({ r, me, token, onClose, onToast, onUnlock, onCard }: { r: Row; me: Me; token: string; onClose: () => void; onToast: Toast; onUnlock: () => void; onCard: (r: Row) => void }) {
  const setStatus = useMutation(api.pipeline.setStatus);
  const writeMore = useAction(api.write.writeMore);
  const [tab, setTab] = useState<"email" | "linkedin">("email");
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);
  const p = r.profile, d = r.draft;
  const person = r.person && r.person !== r.displayName ? r.person : null;
  const applyOnly = !r.hasEmail && !!r.applyUrl;
  const send = () => {
    if (applyOnly && r.applyUrl) { window.open(r.applyUrl, "_blank", "noopener"); void setStatus({ token, rank: r.rank, status: "sent" }); onToast("Opened their form. Marked as applied."); return; }
    if (!d || !r.email) return;
    openInGmail(r.email, { subject: d.subject, body: d.body }, me.gmail);
    void setStatus({ token, rank: r.rank, status: "sent" });
    onToast(`Opened in Gmail. Press send there. First follow-up on ${day(Date.now() + 3 * 864e5)}.`);
  };
  const write = async () => {
    setWriting(true);
    const res = await writeMore({ token, rank: r.rank }).catch(() => ({ ok: false as const, error: "Busy right now. Try again in a few minutes." }));
    setWriting(false);
    if (!res.ok) { if (/unlock/i.test(res.error)) onUnlock(); else onToast(res.error); }
  };
  const total = (xs: { n: number }[]) => Math.max(1, xs.reduce((a, x) => a + x.n, 0));
  return createPortal(
    <div className="is-wrap" role="dialog" aria-modal="true" aria-label={r.displayName ?? "Investor"} onClick={onClose}>
      <aside className="is" onClick={(e) => e.stopPropagation()}>
        <header className="is-head">
          <PartnerFace face={r.face} logo={r.logo} name={r.displayName ?? ""} kind={r.kind} size={56} />
          <div className="is-who">
            <b>{r.displayName}</b>
            {r.face ? <span>Pitch <b className="is-pp">{pitchLine(r.face)}</b></span> : (person || r.title) && <span>{[person, r.title].filter(Boolean).join(", ")}</span>}
            <span className="is-meta">{[KIND[r.kind] ?? "Investor", r.city].filter(Boolean).join(" · ")}{r.website && <> · <a href={r.website} target="_blank" rel="noreferrer noopener">{site(r.website)} ↗</a></>}</span>
          </div>
          <Dial score={r.score} size={50} />
          <button className="is-x" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="is-facts">
          <span><em>Cheque</em>{cheque(r) || "Not published"}</span>
          <span><em>Leads rounds</em>{r.leadsRounds ? "Yes" : "Not on record"}</span>
          <span><em>Last deal</em>{r.lastDealYear ?? "Not on record"}</span>
          <span><em>Stages</em>{p?.stages.length ? p.stages.join(", ") : "Not on record"}</span>
        </div>

        <section className="is-sec">
          <h3>Why they fit you</h3>
          {d ? <><ul>{d.whyFit.map((x) => <li key={x}>{x}</li>)}</ul>{d.watchOut.map((x) => <p key={x} className="is-watch">Watch out: {x}</p>)}</> : <p>{r.reason ?? "Fits your sector, stage and round."}</p>}
          {r.parts.length > 0 && <details className="is-parts"><summary>Fit Score {r.score}, part by part</summary>{r.parts.map((x) => <div key={x.key}><span>{x.label}</span><span className="kb-sbar"><i style={{ width: `${(x.got / Math.max(1, x.max)) * 100}%` }} /></span><b>{x.got}/{x.max}</b></div>)}</details>}
        </section>

        {p && (p.sectorMix.length > 0 || p.focus.length > 0) && (
          <section className="is-sec">
            <h3>Where their money goes</h3>
            {p.sectorMix.length > 0 ? <div className="is-bars">{p.sectorMix.map((x) => <div key={x.label}><span>{x.label}</span><i><b style={{ width: `${(x.n / total(p.sectorMix)) * 100}%` }} /></i><em>{x.n}</em></div>)}</div> : null}
            {p.stageMix.length > 0 && <div className="is-chips"><span className="is-k">Rounds</span>{p.stageMix.map((x) => <span key={x.label}>{x.label} · {x.n}</span>)}</div>}
            {p.focus.length > 0 && <div className="is-chips"><span className="is-k">Says they back</span>{p.focus.map((x) => <span key={x}>{x}</span>)}</div>}
          </section>
        )}

        {p && p.deals.length > 0 && (
          <section className="is-sec">
            <h3>Recent deals</h3>
            <div className="is-deals">{p.deals.map((x) => <div key={x.company + x.year}><b>{x.company}</b><span>{[x.round, x.sector, x.year].filter(Boolean).join(" · ")}</span></div>)}</div>
          </section>
        )}

        {p && p.team.length > 0 && (
          <section className="is-sec">
            <h3>Their team</h3>
            <div className="is-team">{p.team.map((t) => <div key={t.name}><Face name={t.name} photo={t.photo} /><b>{t.name}</b><span>{t.role}</span></div>)}</div>
            <span className="is-src">From their website: <a href={p.team[0].source} target="_blank" rel="noreferrer noopener">{site(p.team[0].source)} ↗</a></span>
          </section>
        )}

        {p && p.portfolio.length > 0 && (
          <section className="is-sec">
            <h3>Portfolio{p.portfolioCount > p.portfolio.length ? ` · ${p.portfolioCount} companies` : ""}</h3>
            <div className="is-chips">{p.portfolio.map((x) => <span key={x}>{x}</span>)}</div>
          </section>
        )}
        {p?.thesis && <section className="is-sec"><h3>In their words</h3><blockquote>{p.thesis}</blockquote></section>}

        <section className="is-sec is-pitch">
          <h3>Your pitch</h3>
          {r.locked ? (
            <div className="is-lock"><b>🔒 Their email and a personal pitch come with your full kit</b><span>Your top 5 have theirs ready now.</span><button className="btn primary sm" onClick={onUnlock}>Unlock full kit</button></div>
          ) : d ? (
            <>
              <div className="kc-tabs" role="tablist">
                <button role="tab" aria-selected={tab === "email"} className={tab === "email" ? "on" : ""} onClick={() => setTab("email")}>Email</button>
                <button role="tab" aria-selected={tab === "linkedin"} className={tab === "linkedin" ? "on" : ""} onClick={() => setTab("linkedin")}>LinkedIn note</button>
              </div>
              {tab === "email" ? (
                <div className="kc-msg"><span className="muted small">To {r.email ?? (applyOnly ? "their application form" : "no email on record")}</span><b style={{ display: "block", marginTop: 4 }}>{d.subject}</b><p>{d.body}</p></div>
              ) : (
                <div className="kc-msg">{d.linkedin ? <p>{d.linkedin}</p> : <p className="muted">No LinkedIn note for this one yet.</p>}</div>
              )}
              {d.warnings.map((w) => <div className="warn" key={w}>⚠ {w}</div>)}
            </>
          ) : (
            <div className="is-lock"><b>No pitch written yet</b><span>We write it from their record and your facts, in about 10 seconds.</span><button className="btn primary sm" disabled={writing} onClick={write}>{writing ? "Writing…" : "Write my pitch"}</button></div>
          )}
        </section>

        {r.sourceUrls.length > 0 && <p className="is-src">Sources: {r.sourceUrls.slice(0, 3).map((u) => <a key={u} href={u} target="_blank" rel="noreferrer noopener">{site(u)} ↗</a>)}{r.lastChecked ? ` · checked ${r.lastChecked}` : ""}</p>}

        {!r.locked && (
          <footer className="is-foot">
            <StatusMenu r={r} token={token} onToast={onToast} />
            {d && tab === "linkedin" && d.linkedin
              ? <button className="btn primary" onClick={() => copyOut(d.linkedin ?? "", onToast, "Copied. On LinkedIn, tap Connect, then Add a note, and paste.")}>Copy note</button>
              : <button className="btn primary" disabled={!d || (!r.email && !applyOnly) || r.status !== "new"} onClick={send}>{r.status !== "new" ? "✓ Sent" : applyOnly ? "Apply on their form" : "Send from Gmail"}</button>}
            {d && <button className="btn ghost sm" onClick={() => onCard(r)}>Edit</button>}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
