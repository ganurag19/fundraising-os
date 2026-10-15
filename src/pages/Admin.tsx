import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Page } from "./Emails";

// The owner's private dashboard. Not linked from anywhere. The server checks her Google account and PIN on every read.

const KEY = "fos_admin_key";
const IST = 5.5 * 60 * 60 * 1000, DAY = 24 * 60 * 60 * 1000;
type Range = "today" | "7d" | "30d" | "all";
const RANGES: [Range, string][] = [["today", "Today"], ["7d", "7 days"], ["30d", "30 days"], ["all", "All time"]];
const sinceFor = (r: Range, now: number) => r === "all" ? 0 : r === "today" ? Math.floor((now + IST) / DAY) * DAY - IST : now - (r === "7d" ? 7 : 30) * DAY;
const when = (t: number) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const WANT_LABEL: Record<string, string> = { pain_deck: "Hardest: deck and documents", pain_find: "Hardest: which investors fit", pain_write: "Hardest: emails that get replies", pain_follow: "Hardest: following up", pain_intros: "Hardest: warm intros", pain_qa: "Hardest: investor questions and DD", teaser: "Two-page teaser", readiness: "Readiness check", terms: "Term sheet and SHA", competitors: "Competitors", trends: "Funding trends", deck: "Deck review", qa: "Investor questions", faq: "Raise FAQ", vip: "VIP mentors and intros", dataroom: "Data room", inbox: "Inbox", connect: "Founders connect",
  kit_qa: "Kit: Investor Q&A", kit_market: "Kit: Market & competition", kit_dataroom: "Kit: Data room", kit_pitchroom: "Kit: Pitch room", kit_intros: "Kit: Warm intros", kit_company: "Kit: Add another company" };

const PLAN_LABEL: Record<string, string> = { raise_kit: "Raise Kit", raise_kit_advisors: "Raise Kit + Advisors", done_for_you: "Done for you" };

const CLICKS: [string, string][] = [
  ["visit_draft_a", "Draft A (simple): visits"], ["click_go_draft_a", "Draft A: Find my investors"], ["visit_draft_b", "Draft B (full stack): visits"], ["click_go_draft_b", "Draft B: Find my investors"],
  ["visit_compare", "Opened the consultant comparison"], ["click_go", "Find my investors"], ["click_code", "I have a code"], ["click_request", "Request invite"],
  ["click_unlock", "Unlock all (Google)"], ["click_gmail", "Open in Gmail"], ["click_copy", "Copy email"],
  ["click_write", "Write email"], ["click_linkedin", "Open / find on LinkedIn"], ["click_copy_note", "Copy LinkedIn note"], ["click_write_note", "Write LinkedIn note"], ["click_upgrade", "Upgrade: Request access / call"], ["click_feedback", "Opened Send feedback"],
  ["visit_kit", "Raise Kit page: visits"], ["visit_build", "Build: started"], ["visit_app", "Kit dashboard: visits"], ["click_swipe_send", "Kit: Send (swipe or button)"], ["click_swipe_skip", "Kit: Later"], ["click_upgrade_kit", "Kit: Request full access sent"],
  ["soon_competitors", "Soon card: competitors"], ["soon_trends", "Soon card: funding trends"], ["soon_deck", "Soon card: deck review"], ["soon_qa", "Soon card: investor questions"], ["soon_faq", "Soon card: raise FAQ"], ["soon_vip", "Soon card: VIP mentors and intros"], ["soon_dataroom", "Interested: Data room"], ["soon_inbox", "Interested: Inbox"], ["soon_connect", "Interested: Founders connect"],
  ["soon_tab_competition", "Soon page: Competition"], ["soon_tab_qa", "Soon page: Investor Q&A"], ["soon_tab_dataroom", "Soon page: Data room"], ["soon_tab_inbox", "Soon page: Inbox"], ["soon_tab_connect", "Soon page: Founders connect"],
];

const sinceNow = (r: Range) => sinceFor(r, Date.now());
const todayStart = () => sinceNow("today");
function readKey() { try { return sessionStorage.getItem(KEY) ?? ""; } catch { return ""; } }

export default function Admin() {
  const who = useQuery(api.admin.whoAmI, {});
  const { signIn, signOut } = useAuthActions();
  const [key, setKey] = useState(readKey);
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  // Dev build only: ?preview shows the layout with made-up data. Not in the live build.
  if (import.meta.env.DEV && new URLSearchParams(location.search).has("preview")) return <Page><Overview adminKey="" onExpired={() => {}} demo={DEMO} /></Page>;
  if (who === undefined) return <Page><div className="spinner" /></Page>;
  if (who === "signed_out") {
    return <Page><div className="step center admin-gate"><h1>Owner only</h1><button className="btn white" onClick={() => void signIn("google", { redirectTo: "/admin" })}>Sign in with Google</button></div></Page>;
  }
  if (who === "not_owner") {
    return <Page><div className="step center admin-gate"><h1>This page isn't for this account.</h1><button className="btn ghost" onClick={() => void signOut()}>Sign out</button></div></Page>;
  }
  if (!key) return <Page><Pin onKey={(k) => { try { sessionStorage.setItem(KEY, k); localStorage.setItem("fos_no_track", "1"); } catch { /* still works this visit */ } setKey(k); }} /></Page>;
  return <Page right={<button className="btn ghost sm" onClick={() => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } setKey(""); }}>Lock</button>}><Overview adminKey={key} onExpired={() => setKey("")} /></Page>;
}

function Pin({ onKey }: { onKey: (k: string) => void }) {
  const unlock = useMutation(api.admin.unlock);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await unlock({ pin });
      if (r.ok) onKey(r.key); else { setErr(r.error); setPin(""); }
    } catch { setErr("Couldn't check it. Try again."); }
    setBusy(false);
  };
  return (
    <form className="step center admin-gate" onSubmit={submit}>
      <h1>Enter your PIN</h1>
      <input className="field" type="password" inputMode="numeric" autoComplete="off" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} aria-label="PIN" />
      {err && <p className="err">{err}</p>}
      <button className="btn primary" disabled={busy || pin.length < 4}>{busy ? "Checking…" : "Unlock"}</button>
    </form>
  );
}

type Demo = { funnel: typeof api.admin.funnel._returnType; people: typeof api.admin.people._returnType; forms: typeof api.admin.forms._returnType; activity: typeof api.admin.activity._returnType };

function Overview({ adminKey, onExpired, demo }: { adminKey: string; onExpired: () => void; demo?: Demo }) {
  const [range, setRange] = useState<Range>("today");
  const [since, setSince] = useState(todayStart);
  const args = demo ? "skip" : { key: adminKey, since };
  const qFunnel = useQuery(api.admin.funnel, args), qPeople = useQuery(api.admin.people, args), qForms = useQuery(api.admin.forms, args), qActivity = useQuery(api.admin.activity, args);
  const funnel = demo ? demo.funnel : qFunnel, people = demo ? demo.people : qPeople, forms = demo ? demo.forms : qForms, activity = demo ? demo.activity : qActivity;
  const expired = funnel === null || people === null || forms === null;
  useEffect(() => {
    if (!expired) return;
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    onExpired();
  }, [expired, onExpired]);

  const pick = (r: Range) => { setRange(r); setSince(sinceNow(r)); };
  const ev = (k: string) => funnel?.events[k] ?? { n: 0, people: 0 };
  const st = (k: string) => funnel?.steps[k] ?? 0;
  // The Raise Kit path (main page since 16 Oct): visit → website read → facts → kit ready → Google → full-access request.
  const kitSteps: [number | undefined, string][] = [
    [funnel?.visitors, "visitors"],
    [funnel ? ev("visit_landing").people : undefined, "saw the main page"],
    [funnel ? ev("visit_build").people : undefined, "started a kit"],
    [funnel ? st("kit_site_read") : undefined, "website read"],
    [funnel ? st("kit_enriched") : undefined, "added a deck or CV"],
    [funnel ? st("kit_facts_confirmed") : undefined, "confirmed their facts"],
    [funnel ? st("kit_ready") : undefined, "got their kit"],
    [funnel ? st("signed_in") : undefined, "signed in with Google"],
    [funnel ? ev("click_swipe_send").people : undefined, "sent a pitch"],
    [funnel ? st("kit_upgrade_requested") : undefined, "asked for full access"],
    [funnel ? st("room_access_requested") : undefined, "investors asked to see a room"],
    [funnel ? st("room_access_approved") : undefined, "room requests approved"],
  ];
  const kitPeople = people?.filter((p) => p.kit) ?? [];
  const wouldPay = forms ? forms.upgrades.filter((u) => u.wouldPay === "yes").length : 0;
  const avg = (k: "solves" | "valuable") => forms && forms.upgrades.length ? (forms.upgrades.reduce((a, u) => a + u[k], 0) / forms.upgrades.length).toFixed(1) : "–";
  const steps: [number | undefined, string][] = [
    [funnel?.visitors, "visitors"],
    [funnel ? ev("visit_landing").people : undefined, "saw the landing page"],
    [funnel ? ev("click_go").people : undefined, "tapped Find my investors"],
    [funnel ? st("signup_done") : undefined, "finished sign-up"],
    [funnel ? st("emails_ready") : undefined, "got their emails"],
    [funnel ? st("signed_in") : undefined, "signed in with Google"],
    [funnel ? st("sent") : undefined, "emails marked sent"],
  ];

  return (
    <div className="admin">
      <header className="admin-head">
        <span className="kicker">Owner dashboard · only you can see this</span>
        <div className="admin-ranges" role="tablist">
          {RANGES.map(([r, label]) => <button key={r} role="tab" aria-selected={range === r} className={range === r ? "on" : ""} onClick={() => pick(r)}>{label}</button>)}
        </div>
      </header>

      <h2 className="dash-h">At a glance</h2>
      <div className="admin-funnel small-funnel">
        <div><b>{funnel?.visitors ?? "·"}</b><span>visitors</span></div>
        <div><b>{kitPeople.length}</b><span>kits built</span></div>
        <div><b>{people?.filter((p) => p.signedIn).length ?? "·"}</b><span>signed in</span></div>
        <div><b>{people?.reduce((a, p) => a + p.sent, 0) ?? "·"}</b><span>pitches sent</span></div>
        <div><b>{people?.reduce((a, p) => a + p.replied + p.meetings, 0) ?? "·"}</b><span>replies and meetings</span></div>
        <div><b>{forms?.upgrades.length ?? "·"}</b><span>asked for full access</span></div>
        <div><b>{wouldPay}</b><span>would pay: yes</span></div>
        <div><b>{avg("solves")}</b><span>avg "solves my problem" /5</span></div>
        <div><b>{avg("valuable")}</b><span>avg "valuable" /5</span></div>
      </div>

      <h2 className="dash-h">Raise Kit funnel</h2>
      <div className="admin-funnel">
        {kitSteps.map(([n, label], i) => <div key={label}><b>{n ?? "·"}</b><span>{label}</span>{i > 0 && n !== undefined && kitSteps[0][0] ? <i>{Math.round((n / (kitSteps[0][0] || 1)) * 100)}%</i> : null}</div>)}
      </div>

      <h2 className="dash-h">Classic funnel</h2>
      <div className="admin-funnel">
        {steps.map(([n, label], i) => <div key={label}><b>{n ?? "·"}</b><span>{label}</span>{i > 0 && n !== undefined && steps[0][0] ? <i>{Math.round((n / (steps[0][0] || 1)) * 100)}%</i> : null}</div>)}
      </div>
      {funnel?.capped && <p className="muted small">Showing the latest 6,000 events; pick a shorter range for exact counts.</p>}
      <p className="muted small">Visits and clicks are counted from tonight's release onwards; sign-up steps go back further.</p>

      <h2 className="dash-h">Clicks</h2>
      <div className="admin-table">
        <div className="admin-tr head"><span>Button</span><span>Clicks</span><span>People</span></div>
        {CLICKS.map(([k, label]) => <div className="admin-tr" key={k}><span>{label}</span><b>{ev(k).n}</b><b>{ev(k).people}</b></div>)}
      </div>

      <h2 className="dash-h">Who's trying it {people && <span className="muted small">({people.length}{people.length === 60 ? "+" : ""})</span>}</h2>
      {people == null ? <div className="spinner" /> : people.length === 0 ? <p className="muted">No one in this range yet.</p> : (
        <div className="admin-people">
          {people.map((p) => (
            <div className="admin-card" key={p.at + p.company}>
              <div className="admin-card-top"><b>{p.company}</b><Reached p={p} /></div>
              <span>{p.name} · {p.sectors.join(", ")} · {p.stage} · {p.ask}</span>
              <span className="muted small">
                {when(p.at)} · code {p.code}
                {p.website && <> · <a href={/^https?:/.test(p.website) ? p.website : `https://${p.website}`} target="_blank" rel="noreferrer noopener">{p.website.replace(/^https?:\/\//, "")}</a></>}
                {p.linkedin && <> · <a href={p.linkedin} target="_blank" rel="noreferrer noopener">LinkedIn</a></>}
              </span>
              {p.signedIn && <span className="small"><a href={`mailto:${p.signedIn}`}>{p.signedIn}</a>{p.welcome === true ? " · welcome email sent" : p.welcome === false ? " · welcome email failed" : ""}</span>}
              <span className="admin-chips">
                {p.kit ? <span className={`tag ${p.kit.deck ? "green" : p.kit.status === "failed" ? "red" : ""}`}><i className="admin-sw" style={{ background: p.kit.brand }} />Kit {p.kit.deck ? "ready" : p.kit.status}{p.kit.uploads ? ` · ${p.kit.uploads} file${p.kit.uploads > 1 ? "s" : ""}` : ""}</span> : <span className="tag">Classic list</span>}
                <span className="tag">{p.drafts} pitches written</span>
                {p.sent > 0 && <span className="tag green">{p.sent} sent</span>}
                {p.replied + p.meetings > 0 && <span className="tag gold">{p.replied} replied · {p.meetings} meetings</span>}
                {p.request && <span className="tag violet">Wants {PLAN_LABEL[p.request.plan] ?? p.request.plan} · would pay {p.request.wouldPay} · {p.request.solves}/5 · {p.request.valuable}/5</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="dash-h">Forms</h2>
      {forms == null ? <div className="spinner" /> : <>
        <h3 className="admin-h3">Request invite ({forms.invites.length})</h3>
        {forms.invites.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-table">{forms.invites.map((w) => <div className="admin-tr wide" key={w.at + w.email}><span><b>{w.name}</b> · {w.company} · {w.stage}</span><a href={`mailto:${w.email}`}>{w.email}</a><span className="muted small">{when(w.at)}</span></div>)}</div>
        )}
        <h3 className="admin-h3">Raise Kit: full access requests ({forms.upgrades.length})</h3>
        {forms.upgrades.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-table">{forms.upgrades.map((u) => (
            <div className="admin-tr wide" key={u.at}>
              <span><b>{u.company}</b> · {PLAN_LABEL[u.plan] ?? u.plan} · would pay: <b>{u.wouldPay}</b>{u.price ? ` (${u.price})` : ""} · solves {u.solves}/5 · valuable {u.valuable}/5{u.raisingWhen ? ` · raising ${u.raisingWhen.toLowerCase()}` : ""}
                {u.liked && <><br /><span className="muted small">Liked: {u.liked}</span></>}{u.missing && <><br /><span className="muted small">Missing: {u.missing}</span></>}</span>
              <span>{u.email ? <a href={`mailto:${u.email}`}>{u.email}</a> : null}{u.phone ? <span className="muted small"> · {u.phone}</span> : null}</span>
              <span className="muted small">{when(u.at)}</span>
            </div>
          ))}</div>
        )}
        <h3 className="admin-h3">Upgrade / know more ({forms.interest.length})</h3>
        {forms.interest.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-table">{forms.interest.map((p) => <div className="admin-tr wide" key={p.at + p.email}><span><b>{p.name}</b> · {p.plan === "round_pass" ? "Round Pass" : "Custom call"}{p.note ? ` · ${p.note}` : ""}</span><a href={`mailto:${p.email}`}>{p.email}</a><span className="muted small">{when(p.at)}</span></div>)}</div>
        )}

        <h2 className="dash-h">"I'm interested" (all time)</h2>
        {forms.wants.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-table">
            <div className="admin-tr head"><span>Idea</span><span>People</span><span /></div>
            {forms.wants.map((w) => <div className="admin-tr" key={w.key}><span><b>{WANT_LABEL[w.key] ?? w.key}</b>{w.companies.length > 0 && <span className="muted small"> · {w.companies.join(", ")}</span>}</span><b>{w.n}</b><span /></div>)}
          </div>
        )}

        <h2 className="dash-h">Fit question (all time)</h2>
        {(() => { const t = forms.pmf.very + forms.pmf.somewhat + forms.pmf.not; return (
          <div className="admin-funnel small-funnel">
            <div className={t >= 30 && forms.pmf.very / t >= 0.4 ? "" : ""}><b>{t ? Math.round((forms.pmf.very / t) * 100) : 0}%</b><span>very disappointed (aim 40%+, {t} answers{t < 30 ? "; need 30+" : ""})</span></div>
            <div><b>{forms.pmf.very}</b><span>very</span></div><div><b>{forms.pmf.somewhat}</b><span>somewhat</span></div><div><b>{forms.pmf.not}</b><span>not</span></div>
          </div>
        ); })()}
        {forms.pmf.benefits.map((b, i) => <p className="small" key={i}><span className="tag">{b.answer}</span> <b>{b.company}</b>: {b.text}</p>)}

        <h2 className="dash-h">Feedback ({forms.feedback.length})</h2>
        {forms.feedback.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-people">{forms.feedback.map((n) => (
            <div className="admin-card" key={n.at}>
              <div className="admin-card-top"><b>{n.company ?? "Visitor"}</b><span className="tag">{n.page}</span></div>
              <span style={{ whiteSpace: "pre-wrap" }}>{n.text}</span>
              <span className="muted small">{when(n.at)}{n.email && <> · <a href={`mailto:${n.email}`}>{n.email}</a></>}</span>
            </div>
          ))}</div>
        )}

        <h2 className="dash-h">Websites we read ({activity?.sites.length ?? 0})</h2>
        {!activity?.sites.length ? <p className="muted small">None in this range.</p> : (
          <div className="admin-table">{activity.sites.map((x) => <div className="admin-tr wide" key={x.at}><span><a href={`https://${x.site}`} target="_blank" rel="noreferrer noopener">{x.site}</a></span><span className={`tag ${x.ok ? "green" : "red"}`}>{x.ok ? "read" : "couldn't read"}</span><span className="muted small">{when(x.at)}</span></div>)}</div>
        )}

        <h2 className="dash-h">Google accounts ({activity?.users.length ?? 0})</h2>
        {!activity?.users.length ? <p className="muted small">None in this range.</p> : (
          <div className="admin-table">{activity.users.map((u) => <div className="admin-tr wide" key={u.at}><a href={`mailto:${u.email}`}>{u.email}</a><span>{u.company ?? <span className="muted small">no startup yet</span>}</span><span className="muted small">{when(u.at)}</span></div>)}</div>
        )}

        <h2 className="dash-h">Emails we sent founders ({activity?.emails.length ?? 0})</h2>
        {!activity?.emails.length ? <p className="muted small">None in this range.</p> : (
          <div className="admin-table">{activity.emails.map((e) => <div className="admin-tr wide" key={e.at}><span><b>{e.company}</b> · {e.kind === "welcome" ? "Welcome" : "Follow-up reminder"}</span><span className={`tag ${e.ok ? "green" : "red"}`}>{e.ok ? "sent" : `failed${e.error ? `: ${e.error.slice(0, 60)}` : ""}`}</span><span className="muted small">{when(e.at)}</span></div>)}</div>
        )}

        <h2 className="dash-h">AI use by model</h2>
        <div className="admin-table">
          <div className="admin-tr head"><span>Model</span><span>Calls</span><span>Tokens in / out</span></div>
          {(activity?.models ?? []).map((m) => <div className="admin-tr" key={m.model}><span>{m.model}</span><b>{m.calls}</b><span>{Math.round(m.inputTokens / 1000)}k / {Math.round(m.outputTokens / 1000)}k</span></div>)}
        </div>

        <h2 className="dash-h">Invite codes</h2>
        <div className="admin-table">
          <div className="admin-tr head"><span>Code</span><span>Used</span><span>Of</span></div>
          {forms.codes.map((c) => <div className="admin-tr" key={c.code}><span><b>{c.code}</b> <span className="muted small">{c.label}</span></span><b>{c.uses}</b><span>{c.maxUses}</span></div>)}
        </div>

        <h2 className="dash-h">AI calls</h2>
        <div className="admin-funnel small-funnel">
          <div><b>{forms.ai.calls}</b><span>calls</span></div>
          <div className={forms.ai.failed ? "bad" : ""}><b>{forms.ai.failed}</b><span>failed</span></div>
          {Object.entries(forms.ai.byPurpose).map(([k, n]) => <div key={k}><b>{n}</b><span>{k}</span></div>)}
        </div>
        {forms.ai.lastErrors.map((e) => <p className="err small" key={e.at}>{when(e.at)} · {e.purpose}: {e.error}</p>)}
      </>}
    </div>
  );
}

function Reached({ p }: { p: { emails: string; signedIn: string | null; sent: number; plan: boolean } }) {
  if (p.sent > 0) return <span className="tag green">Sent {p.sent}</span>;
  if (p.signedIn) return <span className="tag blue">Signed in</span>;
  if (p.emails === "ready") return <span className="tag gold">Emails ready</span>;
  if (p.emails === "failed") return <span className="tag red">Writing failed</span>;
  if (p.emails === "writing") return <span className="tag">Writing</span>;
  return <span className="tag">Signing up</span>;
}

// Made-up founders and requests for the dev preview.
const T = 1791900000000;
const DEMO: Demo = {
  funnel: { visitors: 42, capped: false, steps: { signup_done: 9, emails_ready: 8, signed_in: 5, sent: 11 },
    events: { visit_landing: { n: 51, people: 40 }, click_go: { n: 19, people: 14 }, click_code: { n: 12, people: 10 }, click_request: { n: 4, people: 4 }, click_unlock: { n: 6, people: 5 }, click_gmail: { n: 14, people: 4 }, click_copy: { n: 3, people: 2 }, click_write: { n: 7, people: 3 }, click_upgrade: { n: 2, people: 2 }, click_soon: { n: 5, people: 3 } } },
  people: [
    { at: T, company: "Kiln Labs", name: "Arjun Rao", sectors: ["Climate & Energy"], stage: "Seed", ask: "₹1–3 Cr", website: "kilnlabs.example.in", linkedin: null, code: "KIT", emails: "ready", signedIn: "arjun@kilnlabs.example.in", sent: 3, plan: false, replied: 1, meetings: 0, drafts: 5, kit: { status: "ready", deck: true, uploads: 1, brand: "#7B5CFF" }, request: { plan: "raise_kit", wouldPay: "yes", solves: 4, valuable: 5 }, welcome: true },
    { at: T - 3600000, company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI", "Fintech"], stage: "Pre-seed", ask: "₹50L–1 Cr", website: "ledgerly.example.in", linkedin: "https://linkedin.com/in/example", code: "TEST-ONE", emails: "ready", signedIn: "nisha@example.test", sent: 0, plan: false, replied: 0, meetings: 0, drafts: 3, kit: null, request: null, welcome: false },
    { at: T - 7200000, company: "Paniwala Labs", name: "Priya Menon", sectors: ["Agritech"], stage: "Pre-seed", ask: "₹25–50L", website: null, linkedin: null, code: "TEST-TWO", emails: "writing", signedIn: null, sent: 0, plan: false, replied: 0, meetings: 0, drafts: 0, kit: { status: "building", deck: false, uploads: 0, brand: "#2F6BFF" }, request: null, welcome: null },
  ],
  forms: {
    upgrades: [{ at: T - 2000000, company: "Kiln Labs", email: "arjun@kilnlabs.example.in", plan: "raise_kit", wouldPay: "yes", price: "₹15,000–25,000", solves: 4, valuable: 5, liked: "Pitches open on a real deal", missing: "Editable PowerPoint", raisingWhen: "Now", phone: null }],
    invites: [{ at: T, name: "Kabir Shah", email: "kabir@example.test", company: "Stackwise", stage: "Seed", status: "waiting" }],
    interest: [{ at: T - 5000000, name: "Arjun Rao", email: "arjun@kilnlabs.example.in", plan: "round_pass", note: null }],
    codes: [{ code: "TEST-ONE", label: "colleagues", uses: 6, maxUses: 20 }, { code: "TEST-TWO", label: "GrowthX", uses: 2, maxUses: 50 }],
    wants: [{ key: "qa", n: 7, companies: ["Kiln Labs", "Ledgerly"] }, { key: "deck", n: 5, companies: ["Paniwala Labs"] }],
    pmf: { very: 4, somewhat: 3, not: 1, benefits: [{ answer: "very", text: "I'd never have found Verdant Arc on my own.", company: "Kiln Labs" }] },
    feedback: [{ at: T, page: "dashboard", text: "I didn't know what to do after the first email.", email: "arjun@kilnlabs.example.in", company: "Kiln Labs" }],
    ai: { calls: 37, failed: 1, byPurpose: { match: 9, draft: 24, followup: 4 }, lastErrors: [{ at: T, purpose: "draft", error: "overloaded" }] },
  },
  activity: {
    sites: [{ at: T, site: "kilnlabs.example.in", ok: true }, { at: T - 9000, site: "parked.example", ok: false }],
    users: [{ at: T, email: "arjun@kilnlabs.example.in", company: "Kiln Labs" }],
    emails: [{ at: T, kind: "welcome", ok: true, error: null, company: "Kiln Labs" }],
    models: [{ model: "claude-sonnet-5-5", calls: 12, inputTokens: 48000, outputTokens: 9000 }, { model: "claude-haiku-4-5", calls: 20, inputTokens: 60000, outputTokens: 7000 }],
  },
};
