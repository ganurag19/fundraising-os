import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { visitorToken } from "./token";

const PAGES: Record<string, string> = { "/": "landing", "/start": "start", "/emails": "emails", "/dashboard": "dashboard", "/compare/fundraising-consultant": "compare" };

/** The owner's own browser isn't counted once she has opened /admin. */
function noTrack() {
  try { return localStorage.getItem("fos_no_track") === "1"; } catch { return false; }
}

/** Counts a page visit once per browser session, and every click on a [data-track] button. Names only, never what she typed. */
export default function Tracker() {
  const hit = useMutation(api.track.hit);
  const { pathname } = useLocation();
  useEffect(() => {
    const page = PAGES[pathname];
    if (!page || noTrack()) return;
    try {
      const k = "fos_seen_" + page;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* private mode: count it anyway */ }
    hit({ token: visitorToken(), name: "visit_" + page }).catch(() => {});
  }, [pathname, hit]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const name = (e.target as HTMLElement | null)?.closest?.("[data-track]")?.getAttribute("data-track");
      if (name && !noTrack() && location.pathname !== "/draft") hit({ token: visitorToken(), name }).catch(() => {});
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hit]);
  return null;
}
