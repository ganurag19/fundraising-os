import { useState } from "react";
import { inAppBrowser } from "../lib/inApp";

/** Shown next to Google sign-in when the page is open inside another app's browser. */
export default function InAppHint() {
  const [show] = useState(inAppBrowser);
  if (!show) return null;
  return <p className="inapp-hint" role="note">Opened from LinkedIn, WhatsApp or Instagram? Google sign-in works best in your browser: tap <b>⋯</b> and choose <b>Open in browser</b> (Chrome or Safari).</p>;
}
