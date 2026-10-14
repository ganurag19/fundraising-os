import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { LogoMark, Wordmark } from "../components/Brand";
import { Face, Logo } from "../components/Art";
import { FollowupBox, Head, InvestorHead, InvestorRow, Pipeline, SoonCards, StatusMenu, UpgradeCard } from "../components/Investor";
import JoinSheet from "../components/JoinSheet";
import { applyTheme, savedTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import type { Me, Row } from "../components/Investor";
import { adoptToken, freshVisitorToken, visitorToken } from "../lib/token";
import { Page } from "./Emails";

type Tab = "today" | "investors" | "pipeline" | "competition" | "qa" | "dataroom" | "inbox" | "connect" | "profile" | "settings";
const RAISE: [Tab, string, string][] = [["today", "Today", "◎"], ["investors", "Investors", "★"], ["pipeline", "Pipeline", "▦"]];
const PREPARE: [Tab, string, string][] = [["competition", "Competition", "⚔"], ["qa", "Investor Q&A", "❝"], ["dataroom", "Data room", "▤"], ["inbox", "Inbox", "✉"], ["connect", "Founders connect", "★"]];
const TITLES: Record<Tab, [string, string]> = {
  today: ["Today's", "moves."], investors: ["Your", "investors."], pipeline: ["Your", "pipeline."],
  competition: ["Know your", "competition."], qa: ["They will ask.", "Be ready."], dataroom: ["Your", "data room."], inbox: ["Replies,", "in one place."], connect: ["Founders who've", "been there."],
  profile: ["How you", "come across."], settings: ["Your", "settings."],
};

const remember = (k: string, v?: string): string | null => {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* private mode */ }
  return null;
};

// After Google sign-in: her raise. Today (next moves), Investors (the ranked list) and Pipeline.
export default function Dashboard() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut: authSignOut } = useAuthActions();
  // Signing out leaves this browser as a new visitor; her list stays with her account.
  const signOut = () => authSignOut().finally(() => { freshVisitorToken(); location.assign("/"); });
  // Signed in on a browser that doesn't hold her list: find it from her account.
  const mine = useQuery(api.founders.myToken, isAuthenticated ? {} : "skip");
  const switching = isAuthenticated && !!mine && mine !== token && (me === null || (!!me && !me.unlocked));
  useEffect(() => { if (switching && mine) { adoptToken(mine); location.reload(); } }, [switching, mine]);
  const claim = useMutation(api.founders.claim);
  const explainRest = useAction(api.write.explainRest);
  const claimed = useRef(false);
  const explained = useRef(false);
  const [toast, setToast] = useState("");
  const [claimError, setClaimError] = useState("");
  const [tab, setTab] = useState<Tab>(() => (remember("fos_tab") as Tab | null) ?? "today");
  const [welcome, setWelcome] = useState(() => !remember("fos_welcomed"));
  const [more, setMore] = useState(false);
  const [join, setJoin] = useState<"round_pass" | "custom" | null>(null);
  const [theme, setThemeState] = useState<Theme>(savedTheme);
  const setTheme = (t: Theme) => { applyTheme(t, true); setThemeState(t); };
  // The dashboard has its own theme (light by default); leaving it returns to the dark public pages.
  useEffect(() => { applyTheme(theme); return () => applyTheme("dark"); }, [theme]);

  // Back from Google: move her visitor list to her account (once).
  useEffect(() => {
    if (!isAuthenticated || !me || me.unlocked || claimed.current || mine === undefined || switching) return;
    claimed.current = true;
    claim({ token }).then((r) => { if (!r.ok) setClaimError(r.error); });
  }, [isAuthenticated, me, claim, token, mine, switching]);
  // Older lists have no one-line reasons for ranks 4–20; ask once.
  useEffect(() => {
    if (!me?.unlocked || explained.current || !me.rows.some((r) => r.rank >= 3 && !r.reason)) return;
    explained.current = true;
    void explainRest({ token });
  }, [me, explainRest, token]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2400); return () => clearTimeout(t); }, [toast]);

  // Dev build only: ?preview shows the layout without Google sign-in (names beyond the top 3 stay hidden). Not in the live build.
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has("preview");
  if (isLoading || me === undefined || switching || (isAuthenticated && !me && mine === undefined)) return <Page><div className="spinner" /></Page>;
  if ((!isAuthenticated && !preview) || !me) return <Navigate to="/emails" replace />;
  if (claimError) return <Page><div className="step center" style={{ margin: "60px auto" }}><h1>{claimError}</h1><p className="help">Sign in with the Google account you used first, or start a new list.</p><button className="btn primary" onClick={() => void signOut()}>Sign out</button></div></Page>;
  if (!me.unlocked && !preview) return <Page><div className="spinner" /></Page>;

  const go = (t: Tab) => { setTab(t); setMore(false); if (RAISE.some(([k]) => k === t)) remember("fos_tab", t); window.scrollTo(0, 0); };
  const waiting = me.rows.filter((r) => r.status === "sent").length;
  const due = me.rows.filter((r) => r.status === "sent" && r.followups.some((f) => f.state === "ready")).length;
  const sent = me.rows.filter((r) => r.status !== "new").length;
  const replies = me.rows.filter((r) => r.status === "replied" || r.status === "meeting").length;
  const ready = me.rows.filter((r) => r.draft && r.status === "new").length;

  const navItem = ([k, label, icon]: [Tab, string, string], badge?: number, soon?: boolean) => (
    <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} onClick={() => go(k)}>
      <span className="ic" aria-hidden="true">{icon}</span><span className="lb">{label}</span>
      {soon ? <span className="soon-tag">SOON</span> : badge ? <span className={`dot${k === "today" ? "" : " quiet"}`}>{badge}</span> : null}
    </button>
  );
  const [h1a, h1b] = TITLES[tab];

  return (
    <div className="dash">
      <aside className="dash-nav" aria-label="Sections">
        <Link className="logo dash-logo" to="/"><LogoMark /><Wordmark /></Link>
        <div className="ws"><Logo name={me.company} size={30} /><div><b>{me.company}</b><span>{me.stage} · {me.ask}</span></div></div>
        <span className="nlbl">Your raise</span>
        {navItem(RAISE[0], due)}{navItem(RAISE[1], me.matchCount)}{navItem(RAISE[2], waiting)}
        <span className="nlbl">Prepare</span>
        {PREPARE.map((p) => navItem(p, undefined, true))}
        <div className="side-foot">
          <button className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}</button>
          <button className={`me-btn${tab === "profile" || tab === "settings" ? " on" : ""}`} onClick={() => go("profile")}>
            <Face name={me.name} size={30} /><div><b>{me.name}</b><span>{me.gmail ?? "Profile and settings"}</span></div>
          </button>
          <div className="foot-links"><button onClick={() => go("settings")}>Settings</button><button onClick={() => void signOut()}>Sign out</button></div>
        </div>
      </aside>

      <nav className="tabbar" aria-label="Sections">
        {RAISE.map(([k, label, icon]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}><span className="ic" aria-hidden="true">{icon}</span>{k === "investors" ? "Investors" : label}{k === "today" && due > 0 && <span className="dot">{due}</span>}</button>
        ))}
        <button className={more || !RAISE.some(([k]) => k === tab) ? "on" : ""} onClick={() => setMore(true)}><span className="ic" aria-hidden="true">☰</span>More</button>
      </nav>
      {more && (
        <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="sheet more-sheet rise" role="dialog" aria-label="More">
            <div className="ws"><Logo name={me.company} size={30} /><div><b>{me.company}</b><span>{me.stage} · {me.ask}</span></div><button className="xbtn" aria-label="Close" onClick={() => setMore(false)}>✕</button></div>
            {[...PREPARE.map((p) => [...p, true] as const), ["profile", "Profile", "◐", false] as const, ["settings", "Settings", "⚙", false] as const].map(([k, label, icon, soon]) => (
              <button key={k} className="more-item" onClick={() => go(k as Tab)}><span className="ic" aria-hidden="true">{icon}</span>{label}{soon && <span className="soon-tag">SOON</span>}</button>
            ))}
            <button className="more-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span className="ic" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
            <button className="more-item muted" onClick={() => void signOut()}><span className="ic" aria-hidden="true">⎋</span>Sign out</button>
          </div>
        </div>
      )}

      <main className="dash-main">
        <div className="dash-top"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link><button className="theme-btn sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀" : "☾"}</button></div>
        <header className="reveal-head">
          <span className="kicker">Your raise · {me.company} · {me.stage} · {me.ask}</span>
          <h1>{h1a} <span className="it">{h1b}</span></h1>
        </header>
        {RAISE.some(([k]) => k === tab) && (
          <div className="stats four">
            <div><b>{me.matchCount}</b><span>fit {me.company}</span></div>
            <div><b>{ready}</b><span>emails ready</span></div>
            <div><b>{sent}</b><span>sent</span></div>
            <div><b>{replies}</b><span>replies</span></div>
          </div>
        )}

        {welcome && tab === "today" && (
          <div className="welcome rise">
            <div><b>You're in. Here's your raise.</b><span>All {me.matchCount} investors who fit {me.company} are unlocked. Start with today's moves; your pipeline fills as you send.</span></div>
            <button className="xbtn" aria-label="Dismiss" onClick={() => { setWelcome(false); remember("fos_welcomed", "1"); }}>✕</button>
          </div>
        )}

        {tab === "today" && <Today me={me} token={token} onToast={setToast} go={go} />}
        {tab === "investors" && <Investors me={preview && location.search.includes("retired") ? { ...me, rows: me.rows.map((r) => r.rank === 1 ? { ...r, retired: true, website: null, linkedin: null } : r) } : me} token={token} onToast={setToast} />}
        {tab === "pipeline" && (me.rows.some((r) => r.status !== "new")
          ? <Pipeline rows={me.rows} token={token} onToast={setToast} account={me.gmail} />
          : <div className="empty"><b>Nothing sent yet.</b><span>Tap "I sent it" after you send an email. It shows up here with its follow-ups.</span><button className="btn primary sm" onClick={() => go("today")}>See today's moves</button></div>)}
        {(tab === "competition" || tab === "qa" || tab === "dataroom" || tab === "inbox" || tab === "connect") && <SoonPage tab={tab} company={me.company} />}
        {tab === "profile" && <Profile me={me} token={token} onToast={setToast} />}
        {tab === "settings" && <Settings me={me} token={token} theme={theme} setTheme={setTheme} signOut={() => void signOut()} />}

        {RAISE.some(([k]) => k === tab) && <><h2 className="dash-h">Coming soon for {me.company}</h2><SoonCards onToast={setToast} company={me.company} sector={me.sectors[0]} stage={me.stage} /></>}
        {(tab === "today" || tab === "settings") && me.plan !== "round_pass" && <><h2 className="dash-h">Go further</h2><UpgradeCard onRequest={setJoin} /></>}
      </main>
      {toast && <div className="toast" role="status">{toast}</div>}
      {join && <JoinSheet plan={join} onClose={() => setJoin(null)} />}
    </div>
  );
}

const SOON_PAGES: Record<"competition" | "qa" | "dataroom" | "inbox" | "connect", { line: string; points: string[] }> = {
  competition: { line: "Who else is raising in your space, and how you stand apart.", points: ["Startups like yours that raised in the last 2 years, and who backed them", "What investors will compare you on", "One line on your edge, for your email and your deck"] },
  qa: { line: "The questions Indian seed investors ask, with answers drafted from your profile.", points: ["The 20 questions you'll hear in a first meeting", "Answers drafted from your one-liner and traction, for you to edit", "What a weak answer sounds like, so you avoid it"] },
  dataroom: { line: "One link with everything an investor asks for.", points: ["A checklist of what to have ready before the first meeting", "Upload once, share one link", "See who opened what"] },
  inbox: { line: "Investor replies next to your pipeline, so nothing slips.", points: ["Replies from your investors only, nothing else from your inbox", "Marks Replied for you, which stops the follow-ups", "Needs your permission to read investor emails in Gmail"] },
  connect: { line: "A community of Indian founders raising their first round, and those who already have.", points: ["Ask anything in the founders' forum: terms, decks, which investors reply", "Mentors and advisors who've raised a first cheque", "Warm intros from funded founders, when they think you're ready"] },
};

function SoonPage({ tab, company }: { tab: keyof typeof SOON_PAGES; company: string }) {
  const p = SOON_PAGES[tab];
  return (
    <div className="soon-page">
      <span className="soon-tag">SOON</span>
      <p className="lede-sm">{p.line}</p>
      <ul className="rat">{p.points.map((x) => <li key={x}>{x}</li>)}</ul>
      <p className="muted small">We're building this for founders like you at {company}. It'll appear here when it's ready.</p>
    </div>
  );
}

/** Profile: fix her name, company or lines. New emails and follow-ups use the new version. */
function Profile({ me, token, onToast }: { me: Me; token: string; onToast: (s: string) => void }) {
  const update = useMutation(api.founders.updateProfile);
  const [p, setP] = useState({ company: me.company, name: me.name, website: me.website ?? "", linkedin: me.profile.linkedin, oneLiner: me.profile.oneLiner, founderLine: me.profile.founderLine, traction: me.profile.traction });
  const [busy, setBusy] = useState(false);
  const field = (k: keyof typeof p, label: string, area = false, max = 200) => (
    <label key={k}>{label}{area
      ? <textarea className="field" maxLength={max} value={p[k]} onChange={(e) => setP((o) => ({ ...o, [k]: e.target.value }))} />
      : <input className="field" maxLength={max} value={p[k]} onChange={(e) => setP((o) => ({ ...o, [k]: e.target.value }))} />}</label>
  );
  const save = async () => {
    setBusy(true);
    const r = await update({ token, ...p }).catch(() => ({ ok: false as const, error: "Couldn't save. Check your connection." }));
    setBusy(false);
    onToast(r.ok ? "Saved. New emails and follow-ups use this." : r.error);
  };
  return (
    <div className="profile-form settings-card">
      {field("company", "Startup name", false, 80)}
      {field("name", "Your name", false, 80)}
      {field("oneLiner", "What your startup does", true)}
      {field("founderLine", "About you", true, 220)}
      {field("traction", "Traction (optional)", true)}
      {field("website", "Website")}
      {field("linkedin", "Your LinkedIn (optional)")}
      <p className="muted small">Sector, stage and raise ({me.sectors.join(", ")} · {me.stage} · {me.ask}) set your matches, so they stay as they are. Emails already written keep their words; edit them on each card.</p>
      <div className="step-actions"><button className="btn primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save profile"}</button></div>
    </div>
  );
}

function Settings({ me, token, theme, setTheme, signOut }: { me: Me; token: string; theme: Theme; setTheme: (t: Theme) => void; signOut: () => void }) {
  const setReminders = useMutation(api.notify.setReminders);
  return (
    <div className="settings">
      <section className="settings-card">
        <h2>Emails to you</h2>
        <p className="fg2">A short email on mornings when a follow-up is ready to send. Only to you, never to investors.</p>
        <div className="pick">{([true, false] as const).map((on) => <button key={String(on)} aria-pressed={me.emailReminders === on} onClick={() => void setReminders({ token, on })}>{on ? "On" : "Off"}</button>)}</div>
      </section>
      <section className="settings-card">
        <h2>Appearance</h2>
        <div className="pick">{(["dark", "light"] as const).map((t) => <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === "dark" ? "☾ Dark" : "☀ Light"}</button>)}</div>
      </section>
      <section className="settings-card">
        <h2>Account</h2>
        <p className="fg2">Signed in as <b>{me.gmail ?? me.name}</b>. Open in Gmail uses this account on a laptop.</p>
        <button className="btn ghost sm" onClick={signOut}>Sign out</button>
      </section>
      <section className="settings-card">
        <h2>Your data</h2>
        <p className="fg2">Nothing is ever sent for you. To see or delete your data, write to <a href="mailto:hello@firstcheq.ai">hello@firstcheq.ai</a>.</p>
        <p className="small"><Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms</Link></p>
      </section>
    </div>
  );
}

/** Next moves, most urgent first: follow-ups due, top picks not sent, then the next best email to write. */
function Today({ me, token, onToast, go }: { me: Me; token: string; onToast: (s: string) => void; go: (t: Tab) => void }) {
  const [now] = useState(() => Date.now());
  const followups = me.rows.filter((r) => r.status === "sent" && r.followups.some((f) => f.state === "ready"));
  const picks = me.rows.filter((r) => r.rank < 3 && r.status === "new" && !r.retired);
  const nextBest = me.rows.find((r) => r.rank >= 3 && r.status === "new" && r.hasEmail && !r.retired);
  const nextDue = me.rows.flatMap((r) => r.followups.filter((f) => f.state === "scheduled" && f.dueAt > now).map((f) => f.dueAt)).sort((a, b) => a - b)[0];
  const sent = me.rows.filter((r) => r.status !== "new").length;
  const replied = me.rows.filter((r) => r.status === "replied" || r.status === "meeting").length;
  const meetings = me.rows.filter((r) => r.status === "meeting").length;
  const goal = Math.min(20, me.rows.length);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  const day = (t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  // The one thing to do next, in plain words.
  const hero = followups[0]
    ? { k: "Follow up", title: `Nudge ${followups[0].displayName}`, line: `No reply yet. Your follow-up is written; it takes 30 seconds to send.`, cta: "Open the follow-up", go: () => scrollTo(`fu-${followups[0].rank}`) }
    : picks[0]
    ? { k: "Send", title: `Email ${picks[0].displayName}`, line: picks[0].reason ?? "Your top pick. The email is ready.", cta: "Open the email", go: () => scrollTo(`inv-${picks[0].rank}`) }
    : nextBest
    ? { k: "Write", title: `Write to ${nextBest.displayName}`, line: nextBest.reason ?? "Your next best investor.", cta: "Write the email", go: () => scrollTo(`inv-${nextBest.rank}`) }
    : { k: "Wait", title: "You've written to everyone on your list", line: nextDue ? `Next follow-up on ${day(nextDue)}.` : "Mark replies as they come in.", cta: "See your pipeline", go: () => go("pipeline") };

  return (
    <>
      <section className="hero-move rise">
        <span className="kicker">Your next move · {hero.k}</span>
        <h2>{hero.title}</h2>
        <p>{hero.line}</p>
        <button className="btn primary" onClick={hero.go}>{hero.cta} →</button>
      </section>

      <section className="progress-strip" aria-label="Raise progress">
        <div className="ps-head"><b>Your raise so far</b><span className="muted small">{sent} of {goal} emails sent</span></div>
        <div className="ps-bar" aria-hidden="true"><i style={{ width: `${(Math.min(sent, goal) / goal) * 100}%` }} /></div>
        <div className="ps-steps">
          <div className={sent ? "done" : ""}><b>{sent}</b><span>sent</span></div><span className="arrow">→</span>
          <div className={replied ? "done" : ""}><b>{replied}</b><span>replied</span></div><span className="arrow">→</span>
          <div className={meetings ? "done" : ""}><b>{meetings}</b><span>meetings</span></div>
        </div>
      </section>

      {followups.length > 0 && <>
        <h2 className="dash-h">Follow-ups due <span className="due today">{followups.length}</span></h2>
        <div className="rows">{followups.map((r) => { const fu = r.followups.find((f) => f.state === "ready")!; return (
          <div className="row-card" key={r.rank} id={`fu-${r.rank}`}>
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
    ["programmes", "Programmes", (r) => r.kind === "accelerator" || r.kind === "incubator" || r.kind === "grant"],
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
      <p className="muted small">{rows.length} of your best {me.rows.length}{me.matchCount > me.rows.length ? ` (out of ${me.matchCount} who fit)` : ""}. Tap a Fit Score to see why they fit, with sources.</p>
      <InvestorHead />
      <div className="rows">{rows.map((r) => <InvestorRow key={r.rank} r={r} token={token} onToast={onToast} account={me.gmail} />)}</div>
      {!rows.length && <div className="empty"><b>No investors match these filters.</b><button className="btn ghost sm" onClick={() => { setKind("all"); setCity(""); }}>Clear filters</button></div>}
    </>
  );
}
