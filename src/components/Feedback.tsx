import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { visitorToken } from "../lib/token";

/** "Send feedback": a button that opens a short note to the owner. Signed in, her account email goes with it. */
export function FeedbackButton({ page, signedIn = false, className = "btn ghost sm" }: { page: string; signedIn?: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} data-track="click_feedback" onClick={() => setOpen(true)}>Send feedback</button>
      {open && <FeedbackSheet page={page} signedIn={signedIn} onClose={() => setOpen(false)} />}
    </>
  );
}

function FeedbackSheet({ page, signedIn, onClose }: { page: string; signedIn: boolean; onClose: () => void }) {
  const send = useMutation(api.feedback.send);
  const [text, setText] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("sending"); setError("");
    const r = await send({ token: visitorToken(), page, text, email: signedIn ? undefined : email || undefined }).catch(() => ({ ok: false as const, error: "Couldn't send. Check your connection." }));
    if (r.ok) setState("sent"); else { setState("idle"); setError(r.error); }
  };
  // On the page body, so no card or sidebar can sit above it.
  return createPortal(
    <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet rise" role="dialog" aria-modal="true" aria-label="Send feedback">
        <button className="xbtn" style={{ alignSelf: "flex-end" }} onClick={onClose} aria-label="Close">✕</button>
        {state === "sent" ? (
          <>
            <h2>Thank you.</h2>
            <p className="fg2" style={{ margin: 0 }}>The founder of FirstCheq reads every note.</p>
            <button className="btn primary" onClick={onClose}>Close</button>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 style={{ margin: 0 }}>What should we <span className="it">fix or add?</span></h2>
            <p className="fg2" style={{ margin: 0 }}>Anything that confused you, felt wrong, or you wish it did. Short is fine.</p>
            <textarea className="field" rows={5} maxLength={1500} autoFocus value={text} onChange={(e) => setText(e.target.value)} aria-label="Your feedback" placeholder="e.g. I didn't know what to do after the first email" />
            {!signedIn && <label className="muted small" style={{ display: "flex", flexDirection: "column", gap: 6 }}>Your email, if you'd like a reply (optional)<input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" /></label>}
            {error && <p className="err">{error}</p>}
            <button className="btn primary" disabled={state === "sending" || text.trim().length < 3}>{state === "sending" ? "Sending…" : "Send"}</button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
