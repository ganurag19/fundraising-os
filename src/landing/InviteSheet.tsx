import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { rememberInviteCode, visitorToken } from "../lib/token";

export type SheetMode = "request" | "code";
const STAGES = ["Idea", "Pre-seed", "Seed", "Pre-Series A", "Series A"];

export default function InviteSheet({ mode, onMode, onClose }: { mode: SheetMode; onMode: (m: SheetMode) => void; onClose: () => void }) {
  const requestInvite = useMutation(api.invites.requestInvite);
  const checkCode = useMutation(api.invites.checkCode);
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", email: "", company: "", stage: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<null | "new" | "already">(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await requestInvite({ name: f.name, email: f.email, company: f.company, stage: f.stage });
      if (r.ok) setDone(r.alreadyOnList ? "already" : "new"); else setError(r.error);
    } catch { setError("Couldn't save that. Check your connection and try again."); }
    setBusy(false);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const r = await checkCode({ code: f.code, token: visitorToken() });
      if (r.valid) { rememberInviteCode(f.code.trim().toUpperCase()); navigate("/start"); }
      else setError(r.error ?? "That code doesn't work. Check it, or request an invite.");
    } catch { setError("Couldn't check that code. Check your connection and try again."); }
    setBusy(false);
  }

  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rise" role="dialog" aria-modal="true" aria-label={mode === "request" ? "Request an invite" : "Enter your invite code"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span className="tag gold">Invite-only beta</span>
          <button className="xbtn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {mode === "request" && done && (
          <>
            <h2>{done === "new" ? <>You're on the list. <span className="it">We'll be in touch.</span></> : <>You're already on the list.</>}</h2>
            <p className="fg2" style={{ margin: 0 }}>We let founders in every week. Your invite comes to <b>{f.email.trim().toLowerCase()}</b>.</p>
            <div className="row"><button className="btn primary" onClick={onClose}>Back to the page</button></div>
          </>
        )}

        {mode === "request" && !done && (
          <form onSubmit={submitRequest} style={{ display: "contents" }}>
            <h2>Request an <span className="it">invite</span></h2>
            <p className="fg2" style={{ margin: 0 }}>We let first-time founders in every week. Takes 30 seconds.</p>
            <label>Your name<input className="field" value={f.name} onChange={set("name")} autoComplete="name" required maxLength={100} /></label>
            <label>Email<input className="field" type="email" value={f.email} onChange={set("email")} autoComplete="email" required maxLength={200} /></label>
            <label>Startup name<input className="field" value={f.company} onChange={set("company")} autoComplete="organization" required maxLength={100} /></label>
            <label>Stage<select className="field" value={f.stage} onChange={set("stage")} required><option value="" disabled>Choose your stage</option>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
            {error && <p className="err" role="alert">{error}</p>}
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>For Indian startups. We only use this to send your invite.</p>
            <div className="row"><button className="btn primary" disabled={busy} type="submit">{busy ? "Saving…" : "Request my invite"}</button></div>
            <button type="button" className="btn ghost sm" style={{ alignSelf: "center" }} onClick={() => { setError(""); onMode("code"); }}>I have a code</button>
          </form>
        )}

        {mode === "code" && (
          <form onSubmit={submitCode} style={{ display: "contents" }}>
            <h2>Enter your <span className="it">invite code</span></h2>
            <p className="fg2" style={{ margin: 0 }}>From your incubator, community or a founder who's already in.</p>
            <label>Invite code<input className="field" value={f.code} onChange={set("code")} placeholder="e.g. FIRSTCHEQ" autoCapitalize="characters" required maxLength={40} style={{ textTransform: "uppercase", letterSpacing: ".06em" }} /></label>
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row"><button className="btn primary" disabled={busy} type="submit">{busy ? "Checking…" : "Continue"}</button></div>
            <button type="button" className="btn ghost sm" style={{ alignSelf: "center" }} onClick={() => { setError(""); onMode("request"); }}>No code? Request an invite</button>
          </form>
        )}
      </div>
    </div>
  );
}
