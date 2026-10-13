import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { InvestorRow, Pipeline, SoonCards } from "../components/Investor";
import { visitorToken } from "../lib/token";
import { Page } from "./Emails";

// After Google sign-in: her whole list, her top picks first, and what's coming next.
export default function Dashboard() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const claim = useMutation(api.founders.claim);
  const claimed = useRef(false);
  const [toast, setToast] = useState("");
  const [claimError, setClaimError] = useState("");

  // Back from Google: move her visitor list to her account (once).
  useEffect(() => {
    if (!isAuthenticated || !me || me.unlocked || claimed.current) return;
    claimed.current = true;
    claim({ token }).then((r) => { if (!r.ok) setClaimError(r.error); });
  }, [isAuthenticated, me, claim, token]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);

  if (isLoading || me === undefined) return <Page><div className="spinner" /></Page>;
  if (!isAuthenticated || !me) return <Navigate to="/emails" replace />;
  if (claimError) return <Page><div className="step center" style={{ margin: "60px auto" }}><h1>{claimError}</h1><p className="help">Sign in with the Google account you used first, or start a new list.</p><button className="btn primary" onClick={() => void signOut()}>Sign out</button></div></Page>;
  if (!me.unlocked) return <Page><div className="spinner" /></Page>;

  const top = me.rows.filter((r) => r.rank < 3);
  const rest = me.rows.filter((r) => r.rank >= 3);
  const ready = me.rows.filter((r) => r.draft).length;
  const sent = me.rows.filter((r) => r.status !== "new").length;
  const notSent = (r: (typeof me.rows)[number]) => r.status === "new";

  return (
    <Page right={<button className="btn ghost sm" onClick={() => void signOut()}>Sign out</button>}>
      <header className="reveal-head">
        <span className="kicker">{me.company} · {me.stage} · {me.ask}</span>
        <h1>Your investors.</h1>
      </header>
      <div className="stats">
        <div><b>{me.matchCount}</b><span>fit {me.company}</span></div>
        <div><b>{ready}</b><span>emails ready</span></div>
        <div><b>{sent}</b><span>sent</span></div>
      </div>

      <Pipeline rows={me.rows} token={token} onToast={setToast} account={me.gmail} />

      {top.some(notSent) && <h2 className="dash-h">Top picks</h2>}
      <div className="rows">{top.filter(notSent).map((r) => <InvestorRow key={r.rank} r={r} token={token} onToast={setToast} account={me.gmail} startOpen={!r.sentAt && r.rank === 0} />)}</div>

      {rest.length > 0 && <>
        <h2 className="dash-h">Next best <span className="muted small">· tap Write email for any of them</span></h2>
        <div className="rows">{rest.filter(notSent).map((r) => <InvestorRow key={r.rank} r={r} token={token} onToast={setToast} account={me.gmail} />)}</div>
        {me.matchCount > me.rows.length && <p className="muted small" style={{ marginTop: 10 }}>Showing your best {me.rows.length} of {me.matchCount}. More as you send.</p>}
      </>}

      <h2 className="dash-h">Coming soon</h2>
      <SoonCards onToast={setToast} />
      {toast && <div className="toast" role="status">{toast}</div>}
    </Page>
  );
}
