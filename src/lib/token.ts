// The visitor token: a long random string kept in her browser until she signs in (AGENTS.md section 4).
// Every backend call sends it; the backend finds her record from it.
const KEY = "fos_token";

export function visitorToken(): string {
  let t: string | null = null;
  try { t = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (t && /^[a-f0-9]{48}$/.test(t)) return t;
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  t = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  try { localStorage.setItem(KEY, t); } catch { /* the session still works without storage */ }
  return t;
}

/** Use a list's token on this browser (after sign-in on another device, or after signing out and back in). */
export function adoptToken(t: string) {
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
}

/** A brand-new visitor: after signing out, or when she starts a list for a different company. Her old list stays with her account. */
export function freshVisitorToken() {
  try {
    localStorage.removeItem(KEY);
    for (const k of ["fos_nudged", "fos_tab", "fos_welcomed"]) { sessionStorage.removeItem(k); localStorage.removeItem(k); }
  } catch { /* ignore */ }
  return visitorToken();
}

export function savedInviteCode(): string | null {
  try { return sessionStorage.getItem("inviteCode") ?? localStorage.getItem("inviteCode"); } catch { return null; }
}
export function rememberInviteCode(code: string) {
  try { sessionStorage.setItem("inviteCode", code); localStorage.setItem("inviteCode", code); } catch { /* ignore */ }
}

/** The landing page's "Start here" card hands its answers to sign-up, so she doesn't answer twice. */
export type Prefill = { first: string; sectors: string[]; stage: string; ask: string };
export function savePrefill(p: Prefill) {
  try { sessionStorage.setItem("fos_prefill", JSON.stringify(p)); } catch { /* private mode: she just answers again */ }
}
export function takePrefill(): Prefill | null {
  try { const v = sessionStorage.getItem("fos_prefill"); sessionStorage.removeItem("fos_prefill"); return v ? JSON.parse(v) : null; } catch { return null; }
}
