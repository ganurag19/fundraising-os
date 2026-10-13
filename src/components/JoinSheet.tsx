import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

/** Founding list (Round Pass) or a call (Custom). Saves interest; no payment. */
export default function JoinSheet({ plan, onClose }: { plan: "round_pass" | "custom"; onClose: () => void }) {
  const joinList = useMutation(api.founders.joinList);
  const [f, setF] = useState({ name: "", email: "", note: "" });
  const [state, setState] = useState<"" | "busy" | "done">("");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("busy"); setError("");
    const r = await joinList({ plan, ...f }).catch(() => ({ ok: false as const, error: "Couldn't save that. Check your connection." }));
    if (r.ok) setState("done"); else { setState(""); setError(r.error); }
  };
  return (
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rise" role="dialog" aria-modal="true" aria-label={plan === "round_pass" ? "Join the founding list" : "Book a call"}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="tag gold">{plan === "round_pass" ? "Round Pass" : "Custom"}</span><button className="xbtn" onClick={onClose} aria-label="Close">✕</button></div>
        {state === "done" ? (
          <><h2>You're on the list.</h2><p className="fg2" style={{ margin: 0 }}>{plan === "round_pass" ? "We'll email you when Round Pass opens." : "We'll email you within a day to set up a call."}</p><div className="row"><button className="btn primary" onClick={onClose}>Done</button></div></>
        ) : (
          <form onSubmit={submit} style={{ display: "contents" }}>
            <h2>{plan === "round_pass" ? <>Join the <span className="it">founding list</span></> : <>Book a <span className="it">call</span></>}</h2>
            <label>Your name<input className="field" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required maxLength={100} autoComplete="name" /></label>
            <label>Email<input className="field" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required maxLength={200} autoComplete="email" /></label>
            {plan === "custom" && <label>What do you need help with? (optional)<textarea className="field" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={500} /></label>}
            {error && <p className="err" role="alert">{error}</p>}
            <div className="row"><button className="btn primary" disabled={state === "busy"} type="submit">{state === "busy" ? "Saving…" : plan === "round_pass" ? "Join the list" : "Request a call"}</button></div>
            <p className="muted small" style={{ margin: 0 }}>No payment now. We only use this to contact you.</p>
          </form>
        )}
      </div>
    </div>
  );
}

