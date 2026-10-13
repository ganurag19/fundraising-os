import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { LogoMark, Wordmark } from "../components/Brand";
import { FollowupBox, Head, InvestorRow, Pipeline, SoonCards, StatusMenu } from "../components/Investor";
import type { Me, Row } from "../components/Investor";
import { visitorToken } from "../lib/token";
import { Page } from "./Emails";

type Tab = "today" | "investors" | "pipeline";
const TABS: [Tab, string, string][] = [["today", "Today", "◉"], ["investors", "Investors", "▤"], ["pipeline", "Pipeline", "↻"]];

const remember = (k: string, v?: string): string | null => {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* private mode */ }
  return null;
};

// After Google sign-in: her raise. Today (next moves), Investors (the ranked list) and Pipeline.
export default function Dashboard() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const claim = useMutation(api.founders.claim);
  const explainRest = useAction(api.write.explainRest);
  const claimed = useRef(false);
  const explained = useRef(false);
  const [toast, setToast] = useState("");
  const [claimError, setClaimError] = useState("");
  const [tab, setTab] = useState<Tab>(() => (remember("fos_tab") as Tab | null) ?? "today");
  const [welcome, setWelcome] = useState(() => !remember("fos_welcomed"));

  // Back from Google: move her visitor list to her account (once).
  useEffect(() => {
    if (!isAuthenticated || !me || me.unlocked || claimed.current) return;
    claimed.current = true;
    claim({ token }).then((r) => { if (!r.ok) setClaimError(r.error); });
  }, [isAuthenticated, me, claim, token]);
  // Older lists have no one-line reasons for ranks 4–20; ask once.
  useEffect(() => {
    if (!me?.unlocked || explained.current || !me.rows.some((r) => r.rank >= 3 && !r.reason)) return;
    explained.current = true;
    void explainRest({ token });
  }, [me, explainRest, token]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2400); return () => clearTimeout(t); }, [toast]);

  // Dev build only: ?preview shows the layout without Google sign-in (names beyond the top 3 stay hidden). Not in the live build.
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has("preview");
  if (isLoading || me === undefined) return <Page><div className="spinner" /></Page>;
  if ((!isAuthenticated && !preview) || !me) return <Navigate to="/emails" replace />;
  if (claimError) return <Page><div className="step center" style={{ margin: "60px auto" }}><h1>{claimError}</h1><p className="help">Sign in with the Google account you used first, or start a new list.</p><button className="btn primary" onClick={() => void signOut()}>Sign out</button></div></Page>;
  if (!me.unlocked && !preview) return <Page><div className="spinner" /></Page>;

  const go = (t: Tab) => { setTab(t); remember("fos_tab", t); window.scrollTo(0, 0); };
  const due = me.rows.filter((r) => r.status === "sent" && r.followups.some((f) => f.state === "ready")).length;
  const sent = me.rows.filter((r) => r.status !== "new").length;
  const replies = me.rows.filter((r) => r.status === "replied" || r.status === "meeting").length;
  const ready = me.rows.filter((r) => r.draft && r.status === "new").length;

  return (
    <div className="dash">
      <aside className="dash-nav" aria-label="Sections">
        <Link className="logo dash-logo" to="/"><LogoMark /><Wordmark /></Link>
        {TABS.map(([k, label, icon]) => (
          <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
            <span className="ic" aria-hidden="true">{icon}</span>{label}
            {k === "today" && due > 0 && <span className="dot">{due}</span>}
          </button>
        ))}
        <button className="signout" onClick={() => void signOut()}>Sign out</button>
      </aside>

      <main className="dash-main">
        <div className="dash-top"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link><button className="btn ghost sm" onClick={() => void signOut()}>Sign out</button></div>
        <header className="reveal-head">
          <span className="kicker">Your raise · {me.company} · {me.stage} · {me.ask}</span>
          <h1>{tab === "today" ? <>Today's <span className="it">moves.</span></> : tab === "investors" ? <>Your <span className="it">investors.</span></> : <>Your <span className="it">pipeline.</span></>}</h1>
        </header>
        <div className="stats four">
          <div><b>{me.matchCount}</b><span>fit {me.company}</span></div>
          <div><b>{ready}</b><span>emails ready</span></div>
          <div><b>{sent}</b><span>sent</span></div>
          <div><b>{replies}</b><span>replies</span></div>
        </div>

        {welcome && tab === "today" && (
          <div className="welcome rise">
            <div><b>You're in. Here's your raise.</b><span>All {me.matchCount} investors who fit {me.company} are unlocked. Start with today's moves; your pipeline fills as you send.</span></div>
            <button className="xbtn" aria-label="Dismiss" onClick={() => { setWelcome(false); remember("fos_welcomed", "1"); }}>✕</button>
          </div>
        )}

        {tab === "today" && <Today me={me} token={token} onToast={setToast} go={go} />}
        {tab === "investors" && <Investors me={me} token={token} onToast={setToast} />}
        {tab === "pipeline" && (me.rows.some((r) => r.status !== "new")
          ? <Pipeline rows={me.rows} token={token} onToast={setToast} account={me.gmail} />
          : <div className="empty"><b>Nothing sent yet.</b><span>Tap "I sent it" after you send an email. It shows up here with its follow-ups.</span><button className="btn primary sm" onClick={() => go("today")}>See today's moves</button></div>)}

        <h2 className="dash-h">Coming soon</h2>
        <SoonCards onToast={setToast} />
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

/** Next moves, most urgent first: follow-ups due, top picks not sent, then the next best email to write. */
function Today({ me, token, onToast, go }: { me: Me; token: string; onToast: (s: string) => void; go: (t: Tab) => void }) {
  const [now] = useState(() => Date.now());
  const followups = me.rows.filter((r) => r.status === "sent" && r.followups.some((f) => f.state === "ready"));
  const picks = me.rows.filter((r) => r.rank < 3 && r.status === "new");
  const nextBest = me.rows.find((r) => r.rank >= 3 && r.status === "new");
  const nextDue = me.rows.flatMap((r) => r.followups.filter((f) => f.state === "scheduled" && f.dueAt > now).map((f) => f.dueAt)).sort((a, b) => a - b)[0];
  return (
    <>
      {followups.length > 0 && <>
        <h2 className="dash-h">Follow-ups due <span className="due today">{followups.length}</span></h2>
        <div className="rows">{followups.map((r) => { const fu = r.followups.find((f) => f.state === "ready")!; return (
          <div className="row-card" key={r.rank}>
            <div className="row-main"><Head r={r} /><StatusMenu r={r} token={token} onToast={onToast} /></div>
            <div className="row-email"><p className="fg2 small">No reply yet. Here's a short nudge (follow-up {fu.n} of 2).</p><FollowupBox r={r} fu={fu} token={token} onToast={onToast} account={me.gmail} /></div>
          </div>
        ); })}</div>
      </>}

      {picks.length > 0 && <>
        <h2 className="dash-h">Send your top picks</h2>
        <div className="rows">{picks.map((r, i) => <InvestorRow key={r.rank} r={r} token={token} onToast={onToast} account={me.gmail} startOpen={i === 0 && !followups.length} />)}</div>
      </>}

      {!picks.length && nextBest && <>
        <h2 className="dash-h">Your next best investor</h2>
        <div className="rows"><InvestorRow r={nextBest} token={token} onToast={onToast} account={me.gmail} /></div>
      </>}

      {!followups.length && !picks.length && (
        <p className="muted small" style={{ marginTop: 14 }}>
          {nextDue ? `No follow-ups due today. The next one is on ${new Date(nextDue).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. ` : "All caught up. "}
          <button className="why-link" onClick={() => go("investors")}>See all your investors</button>
        </p>
      )}
    </>
  );
}

/** The ranked list with quick filters. */
function Investors({ me, token, onToast }: { me: Me; token: string; onToast: (s: string) => void }) {
  const [kind, setKind] = useState("all");
  const [city, setCity] = useState("");
  const [year] = useState(() => new Date().getFullYear());
  const kinds: [string, string, (r: Row) => boolean][] = [
    ["all", "All", () => true],
    ["funds", "Funds", (r) => r.kind === "vc" || r.kind === "corporate_vc"],
    ["angels", "Angels", (r) => r.kind === "angel" || r.kind === "angel_network"],
    ["leads", "Leads rounds", (r) => r.leadsRounds],
    ["recent", "Invested lately", (r) => (r.lastDealYear ?? 0) >= year - 1],
  ];
  const cities = [...new Set(me.rows.map((r) => r.city).filter((c): c is string => !!c))].sort();
  const test = kinds.find((k) => k[0] === kind)![2];
  const rows = me.rows.filter((r) => test(r) && (!city || r.city === city));
  return (
    <>
      <div className="filters">
        <div className="pick">{kinds.map(([k, label]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{label}</button>)}</div>
        {cities.length > 1 && <select className="status-menu" aria-label="City" value={city} onChange={(e) => setCity(e.target.value)}><option value="">Any city</option>{cities.map((c) => <option key={c}>{c}</option>)}</select>}
      </div>
      <p className="muted small">{rows.length} of your best {me.rows.length}{me.matchCount > me.rows.length ? ` (out of ${me.matchCount} who fit)` : ""}. Tap a score to see how it's worked out.</p>
      <div className="rows">{rows.map((r) => <InvestorRow key={r.rank} r={r} token={token} onToast={onToast} account={me.gmail} />)}</div>
      {!rows.length && <div className="empty"><b>No investors match these filters.</b><button className="btn ghost sm" onClick={() => { setKind("all"); setCity(""); }}>Clear filters</button></div>}
    </>
  );
}
