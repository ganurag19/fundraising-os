import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Dial, Face, Logo } from "../components/Art";
import { visitorToken } from "../lib/token";

// Milestone 1: read your first 3 emails. Editing and "Open in Gmail" come in milestone 3.
export default function Emails() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });

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

  return (
    <Page>
      <div style={{ marginBottom: 20 }}>
        <span className="kicker">{me.company} · {me.sectors.join(", ")} · {me.stage} · {me.ask}</span>
        <h1 style={{ fontFamily: "var(--display)", fontSize: "clamp(28px,5vw,40px)", letterSpacing: "-.03em", margin: "10px 0 6px" }}>Your top 3 investors, <span className="it">with emails ready.</span></h1>
        <p className="fg2" style={{ margin: 0 }}>Read each one and ask yourself: would I send this today? Editing and "Open in Gmail" come next.</p>
      </div>
      <div className="picks">
        {me.picks.map((p) => (
          <article className="pick-card rise" key={p.rank}>
            <span className="rank">TOP PICK #{p.rank + 1}</span>
            <div className="pick-head">
              {p.kind === "angel" ? <Face name={p.person ?? p.displayName} size={48} /> : <Logo name={p.displayName} size={48} />}
              <div style={{ minWidth: 0 }}><b>{p.displayName}</b><span>{[p.person && p.person !== p.displayName ? p.person : null, p.city].filter(Boolean).join(" · ")}</span></div>
            </div>
            {p.draft ? (
              <>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}><Dial score={p.score} /><div className="why2">{p.draft.reason}</div></div>
                <span className="sub-h gold">Why they fit</span><ul className="rat">{p.draft.whyFit.map((w) => <li key={w}>{w}</li>)}</ul>
                <span className="sub-h" style={{ color: "var(--amber)" }}>Watch out</span><ul className="rat risk">{p.draft.watchOut.map((w) => <li key={w}>{w}</li>)}</ul>
                <span className="sub-h">The email · to {p.email}</span>
                <div className="email"><div className="subj">{p.draft.subject}</div>{p.draft.body}</div>
                {p.draft.warnings.map((w) => <div className="warn" key={w}>⚠ {w}</div>)}
                <span className="src">Sources: {p.sourceUrls.length ? p.sourceUrls.slice(0, 2).map((u) => u.replace(/^https?:\/\//, "").replace(/\/$/, "")).join(" · ") : "researched list"}{p.lastChecked ? ` · checked ${p.lastChecked}` : ""}</span>
              </>
            ) : (
              <div className="warn">We couldn't write this one. Try again in a few minutes.</div>
            )}
          </article>
        ))}
      </div>
    </Page>
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
