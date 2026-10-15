// Getting a pitch out of FirstCheq: her own Gmail (compose window or app) or the clipboard. Nothing is sent for her.

type Mail = { subject: string; body: string };
type Toast = (s: string) => void;
const enc = encodeURIComponent;
const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = () => /Android/i.test(navigator.userAgent);
const mailto = (to: string, d: Mail) => `mailto:${to}?subject=${enc(d.subject)}&body=${enc(d.body)}`;
/** Laptop: Gmail's compose window in her signed-in account. Phones ignore that link, so they get the app instead. */
const gmailWeb = (to: string, d: Mail, account: string | null) =>
  `https://mail.google.com/mail/${account ? `?authuser=${enc(account)}&` : "?"}view=cm&fs=1&to=${enc(to)}&su=${enc(d.subject)}&body=${enc(d.body)}`;

export function openInGmail(to: string, d: Mail, account: string | null) {
  if (isIOS()) {
    // Gmail app if it's installed; if the page is still showing a moment later, her default mail app
    const fallback = setTimeout(() => { if (!document.hidden) window.location.href = mailto(to, d); }, 1200);
    document.addEventListener("visibilitychange", () => clearTimeout(fallback), { once: true });
    window.location.href = `googlegmail:///co?to=${enc(to)}&subject=${enc(d.subject)}&body=${enc(d.body)}`;
  } else if (isAndroid()) {
    window.location.href = mailto(to, d); // opens Gmail, the default mail app on most Android phones
  } else {
    window.open(gmailWeb(to, d, account), "_blank", "noopener");
  }
}

function copyText(text: string): boolean {
  // navigator.clipboard only exists on https and localhost; the hidden-textarea copy works everywhere else
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

export async function copyOut(text: string, onToast: Toast, done: string) {
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else if (!copyText(text)) throw new Error("copy failed");
    onToast(done);
  } catch { onToast("Couldn't copy. Select the text and copy it."); }
}

