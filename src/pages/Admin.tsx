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

const CLICKS: [string, string][] = [
  ["click_go", "Find my investors"], ["click_code", "I have a code"], ["click_request", "Request invite"],
  ["click_unlock", "Unlock all (Google)"], ["click_gmail", "Open in Gmail"], ["click_copy", "Copy email"],
  ["click_write", "Write email"], ["click_upgrade", "Upgrade: Request access / call"], ["click_soon", "Coming-soon cards"],
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

type Demo = { funnel: typeof api.admin.funnel._returnType; people: typeof api.admin.people._returnType; forms: typeof api.admin.forms._returnType };

function Overview({ adminKey, onExpired, demo }: { adminKey: string; onExpired: () => void; demo?: Demo }) {
  const [range, setRange] = useState<Range>("today");
  const [since, setSince] = useState(todayStart);
  const args = demo ? "skip" : { key: adminKey, since };
  const qFunnel = useQuery(api.admin.funnel, args), qPeople = useQuery(api.admin.people, args), qForms = useQuery(api.admin.forms, args);
  const funnel = demo ? demo.funnel : qFunnel, people = demo ? demo.people : qPeople, forms = demo ? demo.forms : qForms;
  const expired = funnel === null || people === null || forms === null;
  useEffect(() => {
    if (!expired) return;
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    onExpired();
  }, [expired, onExpired]);

  const pick = (r: Range) => { setRange(r); setSince(sinceNow(r)); };
  const ev = (k: string) => funnel?.events[k] ?? { n: 0, people: 0 };
  const st = (k: string) => funnel?.steps[k] ?? 0;
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

      <h2 className="dash-h">Funnel</h2>
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
              {p.signedIn && <span className="small">{p.signedIn}</span>}
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
        <h3 className="admin-h3">Upgrade / know more ({forms.interest.length})</h3>
        {forms.interest.length === 0 ? <p className="muted small">None yet.</p> : (
          <div className="admin-table">{forms.interest.map((p) => <div className="admin-tr wide" key={p.at + p.email}><span><b>{p.name}</b> · {p.plan === "round_pass" ? "Round Pass" : "Custom call"}{p.note ? ` · ${p.note}` : ""}</span><a href={`mailto:${p.email}`}>{p.email}</a><span className="muted small">{when(p.at)}</span></div>)}</div>
        )}

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
    { at: T, company: "Kiln Labs", name: "Arjun Rao", sectors: ["Climate & Energy"], stage: "Seed", ask: "₹1–3 Cr", website: "kilnlabs.example.in", linkedin: null, code: "TEST-ONE", emails: "ready", signedIn: "arjun@kilnlabs.example.in", sent: 3, plan: false },
    { at: T - 3600000, company: "Ledgerly", name: "Nisha Kulkarni", sectors: ["AI", "Fintech"], stage: "Pre-seed", ask: "₹50L–1 Cr", website: "ledgerly.example.in", linkedin: "https://linkedin.com/in/example", code: "TEST-ONE", emails: "ready", signedIn: "nisha@example.test", sent: 0, plan: false },
    { at: T - 7200000, company: "Paniwala Labs", name: "Priya Menon", sectors: ["Agritech"], stage: "Pre-seed", ask: "₹25–50L", website: null, linkedin: null, code: "TEST-TWO", emails: "writing", signedIn: null, sent: 0, plan: false },
  ],
  forms: {
    invites: [{ at: T, name: "Kabir Shah", email: "kabir@example.test", company: "Stackwise", stage: "Seed", status: "waiting" }],
    interest: [{ at: T - 5000000, name: "Arjun Rao", email: "arjun@kilnlabs.example.in", plan: "round_pass", note: null }],
    codes: [{ code: "TEST-ONE", label: "colleagues", uses: 6, maxUses: 20 }, { code: "TEST-TWO", label: "GrowthX", uses: 2, maxUses: 50 }],
    ai: { calls: 37, failed: 1, byPurpose: { match: 9, draft: 24, followup: 4 }, lastErrors: [{ at: T, purpose: "draft", error: "overloaded" }] },
  },
};
