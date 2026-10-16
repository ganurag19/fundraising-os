import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { LogoMark, Wordmark } from "../components/Brand";
import { Face } from "../components/Art";
import { FeedbackButton } from "../components/Feedback";
import { WantButton } from "../components/Investor";
import { copyOut } from "../lib/send";
import type { Id } from "../../convex/_generated/dataModel";
import type { Me } from "../components/Investor";
import { applyTheme } from "../lib/theme";
import type { Theme } from "../lib/theme";
import { adoptToken, freshVisitorToken, visitorToken } from "../lib/token";
import { QADoc, MarketDoc, DataRoomDoc } from "../landing/SampleDocs";
import { BrandSlide, BrandTeaser } from "./BrandDeck";
import { SLIDE_TITLES } from "./kitTypes";
import type { KitView } from "./kitTypes";
import { useKitView } from "./useKitView";
import { PrintKit } from "./PrintKit";
import { missingFacts } from "./deckSample";
import { MarketTab } from "./Market";
import { useMarket } from "./useMarket";
import InvLogo from "./InvLogo";
import { DeckReview } from "./Review";
import { COMPARE, PLANS } from "../landing/plans";
import { Outreach } from "./Outreach";
import { QuickRate, RateSheet, UpgradeSheet } from "./Upgrade";
import "./kit.css";

// /app: the Raise Kit dashboard, after Google sign-in. Home (her round at a glance, with what's still locked), Outreach,
// Raise plan, Deck, Teaser, what's coming (Investor Q&A, Market & competition, Data room, Founders circle) and Profile.
// Free shows part of the kit; every locked piece asks for full access.

type Tab = "home" | "outreach" | "plan" | "review" | "deck" | "teaser" | "qa" | "market" | "dataroom" | "circle" | "profile" | "plans" | "settings";
type Nav = [Tab, string, string, boolean];
const RAISE: Nav[] = [["home", "Home", "◎", false], ["outreach", "Investors", "★", false], ["plan", "Game plan", "➚", false]];
const KIT: Nav[] = [["review", "Deck review", "✓", false], ["deck", "Deck", "▭", false], ["teaser", "Teaser", "▤", false], ["qa", "Investor Q&A", "❝", true], ["market", "Market & competition", "⚔", false], ["dataroom", "Data room", "▦", true]];
const PEOPLE: Nav[] = [["circle", "Founders circle", "✦", true], ["profile", "Pitch profile", "◐", false], ["plans", "Plans and upgrade", "◆", false]];
const ALL: Nav[] = [...RAISE, ...KIT, ...PEOPLE, ["settings", "Settings", "⚙", false]];
const TITLES: Record<Tab, [string, string]> = {
  home: ["Your round,", "at a glance."], outreach: ["Your investors", "and outreach."], plan: ["Your", "game plan."], review: ["Your deck,", "reviewed like an investor would."], deck: ["Your deck,", "in your brand."], teaser: ["Your", "teaser."],
  qa: ["They will ask.", "Be ready."], market: ["Know your", "market."], dataroom: ["Your", "data room."], circle: ["Founders who've", "been there."], profile: ["Your", "pitch profile."], plans: ["Pick how much help", "you want."], settings: ["Your", "settings."],
};
const nowMs = () => Date.now();
const remember = (k: string, v?: string): string | null => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { /* private mode */ } return null; };

export default function KitApp() {
  const token = useMemo(() => visitorToken(), []);
  const me = useQuery(api.founders.me, { token });
  const kit = useQuery(api.kit.mine, { token });
  const view = useKitView(token);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut: authSignOut } = useAuthActions();
  const signOut = () => authSignOut().finally(() => { freshVisitorToken(); location.assign("/"); });
  const mine = useQuery(api.founders.myToken, isAuthenticated ? {} : "skip");
  const switching = isAuthenticated && !!mine && mine.token !== token && (me === null || (!!me && me.claimed && !me.unlocked));
  useEffect(() => { if (switching && mine) { adoptToken(mine.token); location.reload(); } }, [switching, mine]);
  const claim = useMutation(api.founders.claim);
  const claimed = useRef(false);
  const [claimError, setClaimError] = useState("");
  const [tab, setTab] = useState<Tab>(() => { const t = remember("fos_kit_tab2") as Tab | null; return t && ALL.some(([k]) => k === t) ? t : "home"; });
  const [more, setMore] = useState(false);
  const [upgrade, setUpgrade] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null); // the "Rate your kit" form, with her one-tap score
  const [qrOpen, setQrOpen] = useState(false); // the one-tap prompt is on screen: keep it until she closes it
  const [toast, setToast] = useState("");
  // Light by default, like the kit; her dark-mode choice is remembered (same switch as the classic dashboard).
  const [theme, setThemeState] = useState<Theme>(() => (remember("fos_kit_theme") === "dark" ? "dark" : "light"));
  const setTheme = (t: Theme) => { remember("fos_kit_theme", t); setThemeState(t); };
  useEffect(() => { applyTheme(theme); return () => applyTheme("dark"); }, [theme]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2600); return () => clearTimeout(t); }, [toast]);
  // Her top 5's logos, from their own sites (once; the server remembers what it found).
  const logos = useAction(api.kitAi.logos);
  const looked = useRef(false);
  useEffect(() => {
    if (looked.current || !me || !me.rows.some((r) => r.rank < 5 && !r.logo && r.website)) return;
    looked.current = true;
    void logos({ token }).catch(() => 0);
  }, [me, logos, token]);
  // Back from Google: move her kit and list to her account (once). One Google account holds one startup.
  const conflict = isAuthenticated && !!me && !me.unlocked && !!mine && mine.token !== token && !switching ? `This Google account already holds ${mine.company}'s list.` : "";
  useEffect(() => {
    if (!isAuthenticated || !me || me.unlocked || me.claimed || claimed.current || mine === undefined || switching || conflict) return;
    claimed.current = true;
    claim({ token }).then((r) => { if (!r.ok) setClaimError(r.error); });
  }, [isAuthenticated, me, claim, token, mine, switching, conflict]);

  // Dev build only: ?preview shows the layout without Google sign-in (names beyond the top 5 stay hidden). Not in the live build.
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).has("preview");
  // Signed in on a browser that doesn't hold her kit yet (a new phone, after signing out): wait for her account's
  // startup before deciding anything, or she'd be sent home while it loads.
  if (isLoading || me === undefined || kit === undefined || switching || (isAuthenticated && !me && mine === undefined)) return <Opening />;
  if (!isAuthenticated && !preview) return <Navigate to={me && kit ? "/build" : "/"} replace />;
  // One Google account holds one startup. Never lose the kit she just built: signing out here keeps this browser's kit,
  // so she can sign in with another account.
  if (claimError || conflict) {
    const keepAndSwitch = () => authSignOut().finally(() => location.assign("/build"));
    return (
      <Shell><div className="kb-step center">
        <span className="kb-kicker">One Google account, one startup</span>
        <h1>{claimError || conflict}</h1>
        <p className="kb-help">{me ? `${me.company}'s kit is safe in this browser.` : "Your new kit is safe in this browser."} Sign in with a different Google account to keep it; {mine ? `${mine.company} stays with this one` : "your other startup stays with this one"}.</p>
        <div className="kb-actions center" style={{ flexDirection: "column" }}>
          <button className="btn primary" onClick={() => void keepAndSwitch()}>Use a different Google account</button>
        </div>
      </div></Shell>
    );
  }
  // Signed in, and this account holds no startup: either nothing in this browser, or a startup saved to another
  // account. Offer a fresh start (a new browser code, so the other account's kit is left alone) or another account.
  if (isAuthenticated && mine === null && (!me || (me.claimed && !me.unlocked))) {
    return <Shell><div className="kb-step center"><span className="kb-kicker">Signed in</span><h1>No startup on this account <em>yet.</em></h1><p className="kb-help">Paste your website and we'll build your raise kit in about 5 minutes. If you used another Google account before, sign in with that one.</p><div className="kb-actions center" style={{ flexDirection: "column" }}><button className="btn primary" onClick={() => { if (me) freshVisitorToken(); location.assign("/build"); }}>Start my kit →</button><button className="btn ghost" onClick={() => void authSignOut().finally(() => location.assign("/"))}>Use another Google account</button></div></div></Shell>;
  }
  if (!me) return <Navigate to="/" replace />;
  if (!me.unlocked && !preview) return <Opening />;
  // A founder from the classic sign-up has a list but no kit yet: same dashboard, with "Create your deck" where the kit goes.
  const kk = kit ?? { status: "none", brand: { primary: "#3D7BFF" } as { primary: string; logo?: string }, requested: false, rated: false };

  const go = (t: Tab) => { setTab(t); setMore(false); remember("fos_kit_tab2", t); window.scrollTo(0, 0); };
  const sent = me.rows.filter((r) => r.status !== "new").length;
  const replies = me.rows.filter((r) => r.status === "replied" || r.status === "meeting").length;
  const ready = me.rows.filter((r) => r.draft && r.status === "new").length;
  const full = me.plan === "round_pass";
  const navItem = ([k, label, icon, soon]: Nav) => (
    <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined} data-track={soon ? `soon_tab_kit_${k}` : undefined} onClick={() => go(k)}>
      <span className="ic" aria-hidden="true">{icon}</span><span className="lb">{label}</span>
      {soon ? <span className="soon-tag">SOON</span> : k === "outreach" ? <span className="dot quiet">{me.matchCount}</span> : null}
    </button>
  );
  const [h1a, h1b] = TITLES[tab];
  const openUp = (plan = "raise_kit") => setUpgrade(plan);
  const themeBtn = <button className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀ Light mode" : "☾ Dark mode"}</button>;

  return (
    <div className="dash ka">
      <aside className="dash-nav" aria-label="Sections">
        <Link className="logo dash-logo" to="/"><LogoMark /><Wordmark /></Link>
        <CompanySwitch me={me} brand={kk.brand} onToast={setToast} />
        <Rings sent={sent} replies={replies} fit={me.matchCount} />
        <span className="nlbl">Your raise</span>
        {RAISE.map(navItem)}
        <span className="nlbl">Your kit</span>
        {KIT.map(navItem)}
        <span className="nlbl">People</span>
        {PEOPLE.map(navItem)}
        <div className="side-foot">
          {!full && <button className="ka-up" onClick={() => openUp()}>{kk.requested ? "✓ Founding access requested" : <><span>🔒 Unlock your full kit</span><small>2 minutes · founding price</small></>}</button>}
          {themeBtn}
          <button className={`ka-me${tab === "settings" ? " on" : ""}`} onClick={() => go("settings")} aria-label="Your settings"><Face name={me.name} size={36} /><span><b>{me.name}</b><em>{me.gmail ?? ""}</em></span><i aria-hidden="true">⚙</i></button>
          <div className="foot-links"><FeedbackButton page="app" signedIn className="" /><button onClick={() => go("settings")}>Settings</button><button onClick={() => void signOut()}>Sign out</button></div>
        </div>
      </aside>

      <nav className="tabbar" aria-label="Sections">
        {([["home", "Home", "◎"], ["outreach", "Investors", "★"], ["deck", "Deck", "▭"], ["plan", "Plan", "➚"]] as [Tab, string, string][]).map(([k, label, icon]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}><span className="ic" aria-hidden="true">{icon}</span>{label}</button>)}
        <button className={more || !["home", "outreach", "deck", "plan"].includes(tab) ? "on" : ""} onClick={() => setMore(true)}><span className="ic" aria-hidden="true">☰</span>More</button>
      </nav>
      {more && (
        <div className="sheet-scrim" onClick={(e) => e.target === e.currentTarget && setMore(false)}>
          <div className="sheet more-sheet rise" role="dialog" aria-label="More">
            <div className="ws"><div><b>{me.company}</b><span>{me.stage} · {me.ask}</span></div><button className="xbtn" aria-label="Close" onClick={() => setMore(false)}>✕</button></div>
            <CompanySwitch me={me} brand={kk.brand} onToast={setToast} compact />
            {[...KIT.slice(1), ...PEOPLE].map(([k, label, icon, soon]) => <button key={k} className="more-item" data-track={soon ? `soon_tab_kit_${k}` : undefined} onClick={() => go(k)}><span className="ic" aria-hidden="true">{icon}</span>{label}{soon && <span className="soon-tag">SOON</span>}</button>)}
            {!full && <button className="more-item" onClick={() => { setMore(false); openUp(); }}><span className="ic" aria-hidden="true">🔒</span>{kk.requested ? "Founding access requested" : "Unlock your full kit"}</button>}
            <button className="more-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}><span className="ic" aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
            <button className="more-item" onClick={() => go("settings")}><span className="ic" aria-hidden="true">⚙</span>Settings</button>
            <FeedbackButton page="app" signedIn className="more-item" />
            <button className="more-item muted" onClick={() => void signOut()}><span className="ic" aria-hidden="true">⎋</span>Sign out</button>
          </div>
        </div>
      )}

      <main className="dash-main">
        <div className="dash-top"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link><button className="theme-btn sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Switch theme">{theme === "dark" ? "☀" : "☾"}</button></div>
        {!full && (
          <div className={`ka-band${kk.requested ? " done" : ""}`}>
            {kk.status === "none"
              ? <><span>Your investors are here. <b>Create your deck and teaser</b> in your brand, in about 30 seconds.</span><Link className="ka-band-a" to="/build?edit=1">Create my deck →</Link></>
              : kk.requested
              ? <span>✓ Founding access requested. We'll be in touch about {me.company}'s full kit.</span>
              : <><span>Free: <b>pitches to your top 5</b>, <b>20 investors named</b>, your deck and teaser as PDF. <b>{Math.max(0, me.matchCount - 5)} more</b> wait for an email and pitch.</span><button onClick={() => openUp()}>Unlock your full kit → <small>2 min · founding price</small></button></>}
          </div>
        )}
        <header className="reveal-head">
          <span className="kicker">{me.company} · {me.stage} · {me.ask}</span>
          <h1>{h1a} <span className="it">{h1b}</span></h1>
        </header>
        {tab === "home" && <Home me={me} token={token} k={view ?? null} go={go} onUnlock={openUp} onRate={() => setRating(0)} rated={kk.rated} sent={sent} replies={replies} ready={ready} full={full} />}
        {tab === "outreach" && <Outreach me={me} token={token} onToast={setToast} onUnlock={() => openUp()} />}
        {tab === "plan" && <Plan me={me} go={go} />}
        {tab === "review" && <DeckReview token={token} onUnlock={() => openUp()} />}
        {tab === "deck" && (view ? <Deck k={view} full={full} /> : <Pending status={kk.status} />)}
        {tab === "teaser" && (view ? <TeaserTab k={view} full={full} /> : <Pending status={kk.status} />)}
        {tab === "market" && <MarketTab token={token} company={me.company} sector={sectorWord(me.sectors[0])} onUnlock={() => openUp()} />}
        {(tab === "qa" || tab === "dataroom" || tab === "circle") && <Soon tab={tab} company={me.company} onToast={setToast} />}
        {tab === "profile" && <Profile me={me} token={token} hasKit={!!kit} onToast={setToast} />}
        {tab === "plans" && <Plans onUnlock={openUp} requested={kk.requested} />}
        {tab === "settings" && <Settings me={me} token={token} theme={theme} setTheme={setTheme} signOut={() => void signOut()} />}
      </main>
      {upgrade && <UpgradeSheet token={token} company={me.company} start={upgrade} onClose={() => setUpgrade(null)} />}
      {rating !== null && <RateSheet token={token} company={me.company} start={rating} onClose={() => setRating(null)} />}
      {(!kk.rated || qrOpen) && rating === null && !upgrade && <QuickRate token={token} onShow={setQrOpen} onMore={(n) => { setQrOpen(false); setRating(n); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function UnlockBtn({ onUnlock, plan = "raise_kit", label = "Unlock" }: { onUnlock: (plan?: string) => void; plan?: string; label?: string }) {
  return <button className="btn primary sm" onClick={(e) => { e.stopPropagation(); onUnlock(plan); }}>🔒 {label}</button>;
}

/* ---------- Home: her round at a glance (17 Oct: calmer, fewer and smaller blocks) ---------- */
const sectorWord = (x?: string) => (!x ? "your space" : x.length <= 4 ? x : x.toLowerCase());
function Home({ me, token, k, go, onUnlock, onRate, rated, sent, replies, ready, full }: { me: Me; token: string; k: KitView | null; go: (t: Tab) => void; onUnlock: (plan?: string) => void; onRate: () => void; rated: boolean; sent: number; replies: number; ready: number; full: boolean }) {
  const top = me.rows.filter((r) => r.rank < 5);
  const named = me.rows.filter((r) => r.locked && r.rank < 20);
  const more = Math.max(0, me.matchCount - 5);
  const topSent = top.filter((r) => r.status !== "new").length;
  const sector = sectorWord(me.sectors[0]);
  return (
    <div className="kh calm">
      <div className="kh-strip">
        <div><b>{me.matchCount}</b><span>investors fit</span></div>
        <div><b>{me.activeCount}</b><span>invested recently</span></div>
        <div><b>{ready}</b><span>pitches ready</span></div>
        <div><b>{sent}</b><span>sent · {replies} replies</span></div>
      </div>

      <section className="kh-next">
        <div className="kh-next-t"><span className="kb-kicker">Do this next</span><h3>{topSent < top.length ? `Send your top ${top.length} pitches` : "Your top 5 are out. Unlock the rest of your list."}</h3><p>{topSent < top.length ? "Each opens on something that investor actually did. Send 3 to 5 a day." : `${more} more investors fit ${me.company}.`}</p></div>
        <div className="kh-five">{top.map((r) => <span key={r.rank} className={r.status !== "new" ? "sent" : ""} title={r.displayName ?? ""}><InvLogo src={r.logo} name={r.displayName ?? ""} kind={r.kind} size={34} /><em>{r.status !== "new" ? "✓ Sent" : (r.displayName ?? "").split(" ")[0]}</em></span>)}</div>
        <div className="kh-next-a">{topSent < top.length ? <button className="btn primary sm" onClick={() => go("outreach")}>Open my top 5 →</button> : <UnlockBtn onUnlock={onUnlock} label={`Unlock all ${me.matchCount}`} />}<span className="kb-dim">{topSent}/{top.length} sent</span></div>
      </section>

      <h2 className="kh-sec">Your kit</h2>
      <div className="kh-kit">
        <section className="kh-card" onClick={() => go("deck")} role="button" tabIndex={0}>
          {k && <div className="kh-thumb"><BrandSlide k={k} i={0} /></div>}
          <div className="kh-card-b"><div><b>Investor deck</b><span>9 slides in your brand</span></div>{k && <Downloads k={k} full={full} compact />}</div>
        </section>
        <section className="kh-card" onClick={() => go("teaser")} role="button" tabIndex={0}>
          {k && <div className="kh-thumb crop"><BrandTeaser k={k} page={1} /></div>}
          <div className="kh-card-b"><div><b>Two-page teaser</b><span>Send it before the deck</span></div>{k && <Downloads k={k} full={full} what="teaser" compact />}</div>
        </section>
        <MarketTile token={token} sector={sector} go={go} />
        <section className="kh-card kh-inv" onClick={() => go("outreach")} role="button" tabIndex={0}>
          <div className="kh-card-h"><b>Your next {named.length} investors</b><span>Named free, with Fit Score and reason</span></div>
          <div className="kh-inv-rows">{named.slice(0, 3).map((r) => <div key={r.rank}><InvLogo src={r.logo} name={r.displayName ?? ""} kind={r.kind} size={26} /><b>{r.displayName}</b><i className="kh-score">{r.score}</i></div>)}</div>
          <div className="kh-card-f"><span>{more > named.length ? `+${more - named.length} more with full access` : "Open your list"}</span><em>Open →</em></div>
        </section>
      </div>

      <button className="kh-slim" onClick={() => go("review")}>
        <span className="kh-slim-ic" aria-hidden="true">✓</span>
        <span><b>Get your own deck reviewed</b><em>Score, raise-now verdict and every fix, free</em></span>
        <span className="kh-slim-go">Review →</span>
      </button>
      <button className="kh-slim" onClick={() => go("profile")}>
        <span className="kh-slim-ic" aria-hidden="true">◐</span>
        <span><b>Your private pitch room</b><em>One link for your deck; see who opened it</em></span>
        <span className="kh-slim-go">Open →</span>
      </button>

      <h2 className="kh-sec">Coming soon</h2>
      <div className="kh-soon">
        {[["❝", "Investor Q&A", "20 questions, answers drafted", "raise_kit"], ["▦", "Data room", `Checklist for ${me.stage.toLowerCase()}`, "raise_kit"], ["✦", "Founders circle", "Founders who've raised", "raise_kit_advisors"]].map(([ic, t, d, plan]) => (
          <button key={t} onClick={() => onUnlock(plan)}><span aria-hidden="true">{ic}</span><b>{t}</b><em>{d}</em><i>Get it first</i></button>
        ))}
      </div>

      <section className="kh-help">
        <Interests />
        <button className="text-link" onClick={onRate}>{rated ? "★ Thanks! Add more feedback →" : "★ Rate your kit in 60 seconds →"}</button>
      </section>

      {!full && <button className="kh-plans" onClick={() => go("plans")}><span>Want every investor, every slide written with you, and the full market report?</span><b>See plans →</b></button>}
    </div>
  );
}

/** Home: her market research at a glance (it starts by itself the first time). */
function MarketTile({ token, sector, go }: { token: string; sector: string; go: (t: Tab) => void }) {
  const { m } = useMarket(token);
  const ready = m?.status === "ready";
  const priced = m?.deals.filter((d) => /\d/.test(d.amount)) ?? [];
  const deal = priced.find((d) => d.atStage) ?? priced[0];
  const found = ready ? m.competitors.length + m.locked.competitors : 0, rounds = ready ? m.deals.length + m.locked.deals : 0;
  return (
    <section className="kh-card kh-mkt2" onClick={() => go("market")} role="button" tabIndex={0}>
      <div className="kh-card-h"><b>Market & competition</b><span>{ready ? `${found} competitors · ${rounds} recent rounds · sources linked` : `Searching the web for who else is building in ${sector}…`}</span></div>
      {ready ? (
        <>
          <div className="kh-inv-rows">{m.competitors.slice(0, 3).map((c) => <div key={c.name}><InvLogo src={c.logo ?? null} name={c.name} kind="company" size={26} /><b>{c.name}</b><i className={`km-where ${c.where}`}>{c.where === "india" ? "India" : "Global"}</i></div>)}</div>
          {deal && <div className="kh-deal"><b>{deal.amount}</b><span><em>{deal.company}</em> · {deal.round} · {deal.date}{deal.atStage ? " · comp at your stage" : ""}</span></div>}
        </>
      ) : <div className="kh-wait"><span className="km-radar sm" aria-hidden="true"><i /><i /><i /></span><span>About a minute. This fills in by itself.</span></div>}
      <div className="kh-card-f"><span>{ready ? "Who funds your space, with links" : "India and global"}</span><em>Open →</em></div>
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="theme-light kbx"><header className="kb-top"><Link className="logo" to="/"><LogoMark /><Wordmark /></Link></header><div className="kb-main">{children}</div></main>;
}
function Opening() {
  return <Shell><div className="kb-step center" role="status"><div className="spinner" /><h1 style={{ fontSize: 24 }}>Opening your kit…</h1><p className="kb-help">Signing you in and moving your kit to your account.</p></div></Shell>;
}
function Pending({ status }: { status: string }) {
  if (status === "none") return <div className="empty"><b>Create your deck and teaser.</b><span>Check your facts once and we'll build your investor deck and two-page teaser in your brand, in about 30 seconds.</span><Link className="btn primary sm" to="/build?edit=1">Create my deck →</Link></div>;
  return <div className="empty"><b>{status === "failed" ? "We couldn't finish your deck." : "Your deck is still being written."}</b><span>{status === "failed" ? "Edit your facts and build it again from your Profile." : "This page updates by itself."}</span></div>;
}

/** Three small rings, like the top of her raise: sent, replies, and how many fit. */
function Rings({ sent, replies, fit }: { sent: number; replies: number; fit: number }) {
  const ring = (n: number, of: number, label: string) => {
    const p = of ? Math.min(1, n / of) : 0;
    return <div key={label}><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" /><circle cx="18" cy="18" r="15" className="on" strokeDasharray={`${(p * 94.2).toFixed(1)} 94.2`} /></svg><b>{n}</b><span>{label}</span></div>;
  };
  return <div className="ka-rings">{ring(sent, 20, "Sent")}{ring(replies, Math.max(1, sent), "Replies")}{ring(fit, fit, "Fit you")}</div>;
}

/* ---------- Raise plan: who to write to, in what order (from her real list) ---------- */
const PROGRAMMES = ["accelerator", "incubator", "grant"];
function Plan({ me, go }: { me: Me; go: (t: Tab) => void }) {
  const live = me.rows.filter((r) => !r.retired);
  const top = live.filter((r) => r.rank < 5);
  const next = live.filter((r) => r.rank >= 5 && !PROGRAMMES.includes(r.kind)).slice(0, 15);
  const progs = live.filter((r) => PROGRAMMES.includes(r.kind));
  const angels = live.filter((r) => r.kind === "angel" || r.kind === "angel_network").length;
  const sentOf = (rs: typeof live) => rs.filter((r) => r.status !== "new").length;
  const weeks: { w: string; title: string; line: string; rows: typeof live; cta?: string }[] = [
    { w: "This week", title: `Your top 5`, line: "Pitches written. Send all five; follow-ups come on day 3 and day 10.", rows: top, cta: "Send them" },
    { w: "Next week", title: `The next ${next.length}`, line: "Tap Write my pitch on each card; send 3 to 5 a day so you can keep up with replies.", rows: next, cta: "Open outreach" },
    ...(progs.length ? [{ w: "Alongside", title: `${progs.length} programmes and grants`, line: "Apply through their own forms. Check each one's dates.", rows: progs }] : []),
  ];
  return (
    <div className="kq">
      <div className="kb-plan">
        <div><b>{me.matchCount}</b><span>investors fit you</span></div>
        <div><b>{me.activeCount}</b><span>invested this year or last</span></div>
        <div><b>{me.leadCount}</b><span>lead rounds</span></div>
        <div><b>{angels}</b><span>angels and networks on your list</span></div>
      </div>
      {weeks.map((x) => (
        <section className="kq-week" key={x.w}>
          <header><span className="kb-kicker">{x.w}</span><h3>{x.title}</h3><span className="kq-done">{sentOf(x.rows)}/{x.rows.length} sent</span></header>
          <p className="kb-help">{x.line}</p>
          <div className="kq-names">{x.rows.slice(0, 15).map((r) => <span key={r.rank} className={r.status !== "new" ? "sent" : ""}>{r.status !== "new" ? "✓ " : ""}{r.displayName}{r.applyDeadline ? ` · closes ${r.applyDeadline}` : ""}</span>)}</div>
          {x.cta && <button className="btn ghost sm" onClick={() => go("outreach")}>{x.cta} →</button>}
        </section>
      ))}
      <p className="kb-dim">Order comes from your Fit Score: who backs your sector and stage, writes your size of cheque, and invested recently.</p>
    </div>
  );
}

/* ---------- Deck: every slide open; slides without her facts show marked samples ---------- */
const DlIc = () => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" /></svg>;
/** PDF and PowerPoint, one tap each. */
function Downloads({ k, full, what = "deck", compact = false }: { k: KitView; full: boolean; what?: "deck" | "teaser"; compact?: boolean }) {
  const [printing, setPrinting] = useState(false);
  const [ppt, setPpt] = useState(false);
  const done = useCallback(() => setPrinting(false), []);
  const pptx = () => { setPpt(true); void import("./pptx").then((x) => x.downloadPptx(k, !full)).catch(() => null).finally(() => setPpt(false)); };
  return (
    <div className={`kd-dl${compact ? " compact" : ""}`} onClick={(e) => e.stopPropagation()}>
      <button className="kd-btn" onClick={() => setPrinting(true)} disabled={printing} title="Download PDF"><DlIc /><span>{printing ? "…" : "PDF"}</span></button>
      {what === "deck" && <button className="kd-btn" onClick={pptx} disabled={ppt} title="Download PowerPoint"><DlIc /><span>{ppt ? "…" : compact ? "PPT" : "PowerPoint"}</span></button>}
      {printing && <PrintKit k={k} what={what} made={!full} onDone={done} />}
    </div>
  );
}
/** What she can share to turn the sample slides into hers. */
function MissingBlock({ k }: { k: KitView }) {
  const navigate = useNavigate();
  const miss = missingFacts(k);
  if (!miss.length) return null;
  return (
    <section className="kd-miss">
      <div><b>Share a few details and we'll make it investor-ready.</b><span>Slides marked <i className="kd-smp">Sample</i> show example content until you add yours. Investors notice placeholders, so replace them before you send.</span></div>
      <ul>{miss.map((m) => <li key={m.key}>{m.label}</li>)}</ul>
      <button className="btn primary sm" onClick={() => navigate("/build?edit=1")}>Add my details →</button>
    </section>
  );
}
function Deck({ k, full }: { k: KitView; full: boolean }) {
  const [cur, setCur] = useState(0);
  const samples = k.slides.filter((s) => s.sample).length;
  return (
    <div className="kz">
      <div className="kz-top"><span><b>{k.slides.length - samples} slides from your facts</b>{samples ? ` · ${samples} with sample content` : ""}</span><Downloads k={k} full={full} /></div>
      <div className="kz-main"><div className="kz-slide"><BrandSlide k={k} i={cur} /></div></div>
      <div className="kz-bar"><span>{cur + 1} / {k.slides.length} · {SLIDE_TITLES[k.slides[cur]?.key]}{k.slides[cur]?.sample ? " · sample" : ""}</span><div><button className="btn ghost sm" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>←</button><button className="btn ghost sm" disabled={cur === k.slides.length - 1} onClick={() => setCur((c) => c + 1)}>→</button></div></div>
      <div className="kz-thumbs">{k.slides.map((s, i) => <button key={s.key} className={`${i === cur ? "on" : ""}${s.sample ? " tp" : ""}`} onClick={() => setCur(i)} aria-label={`Slide ${i + 1}: ${SLIDE_TITLES[s.key]}`}><BrandSlide k={k} i={i} /><span>{SLIDE_TITLES[s.key]}{s.sample ? " · sample" : ""}</span></button>)}</div>
      <MissingBlock k={k} />
      <div className="kz-meta"><span>✓ In your colours{k.brand.font ? ` and ${k.brand.font}` : ""}</span><span>✓ Only your numbers on your slides</span><span>✓ PowerPoint opens in Google Slides and Keynote</span></div>
    </div>
  );
}
function TeaserTab({ k, full }: { k: KitView; full: boolean }) {
  return (
    <div className="kt">
      <div className="kz-top"><span><b>Your two-page teaser</b> · send it before the deck</span><Downloads k={k} full={full} what="teaser" /></div>
      <div className="kt-page"><BrandTeaser k={k} page={1} /></div>
      <div className="kt-page"><BrandTeaser k={k} page={2} /></div>
      <div className="kt-miss"><MissingBlock k={k} /></div>
    </div>
  );
}

/* ---------- Coming soon: a sample of what it will be ---------- */
const SOON: Record<"qa" | "market" | "dataroom" | "circle", { want: string; line: string; points: string[] }> = {
  circle: { want: "kit_intros", line: "A circle of founders who closed their first round, and investors who back first rounds. On the Advisors plan.", points: ["Calls with founders who've raised: what worked, what to skip", "Your deck and story pressure-tested before you send", "Warm connects through the circle, when you're ready"] },
  qa: { want: "kit_qa", line: "The 20 questions Indian seed investors ask, with answers drafted from your facts, and the gaps flagged before a call.", points: ["Answers in your words, from your numbers", "Flags what you haven't told us yet (burn, runway, CAC)", "A two-minute pitch and call prep"] },
  market: { want: "kit_market", line: "Your market size with sources, who else is building in your space, who funds them, and your answer when an investor asks.", points: ["Market sizing with every source linked", "Competitor table and positioning map", "Who funds your space, and your angle"] },
  dataroom: { want: "kit_dataroom", line: "One private link with your deck, teaser, numbers and documents, and a checklist of what investors ask for at your stage.", points: ["Checklist for your stage, with Add buttons", "Readiness score", "See who opened what"] },
};
function Soon({ tab, company, onToast }: { tab: "qa" | "market" | "dataroom" | "circle"; company: string; onToast: (s: string) => void }) {
  const s = SOON[tab];
  return (
    <div className="ks">
      <div className="ks-head"><span className="soon-tag">SOON</span><p>{s.line}</p><ul>{s.points.map((p) => <li key={p}>✓ {p}</li>)}</ul><WantButton k={s.want} label={`I want this for ${company}`} onToast={onToast} /></div>
      <details className="ks-sample">
        <summary><span>See a sample</span><em>For a made-up startup, built the way yours will be</em></summary>
        <div className="ks-sample-b">{tab === "qa" ? <QADoc /> : tab === "market" ? <MarketDoc /> : tab === "dataroom" ? <DataRoomDoc /> : <CircleSample />}</div>
      </details>
    </div>
  );
}

/* ---------- Profile: her private pitch room (coming), and her facts ---------- */
function Profile({ me, token, hasKit, onToast }: { me: Me; token: string; hasKit: boolean; onToast: (s: string) => void }) {
  const navigate = useNavigate();
  const room = useQuery(api.room.mine, hasKit ? { token } : "skip");
  const ensure = useMutation(api.room.ensureSlug);
  const decide = useMutation(api.room.decide);
  const asked = useRef(false);
  useEffect(() => { if (room && !room.slug && !asked.current) { asked.current = true; void ensure({ token }); } }, [room, ensure, token]);
  const link = room?.slug ? `${location.origin}/p/${room.slug}` : "";
  const copy = () => void copyOut(link, onToast, "Link copied. Paste it into your pitch emails and LinkedIn notes.");
  const [now] = useState(nowMs);
  const ago = (t: number) => { const m = Math.round((now - t) / 60000); return m < 60 ? `${Math.max(1, m)} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`; };
  const set = async (id: Id<"roomRequests">, status: "approved" | "declined") => {
    const r = await decide({ token, id, status }).catch(() => ({ ok: false as const, error: "Couldn't save that." }));
    onToast(r.ok ? (status === "approved" ? "Approved. They can open your room now." : "Declined.") : r.error);
  };
  return (
    <div className="kpr">
      {!hasKit ? <div className="empty"><b>Your pitch room opens with your kit.</b><span>Create your deck and teaser first; your room shares them privately.</span><Link className="btn primary sm" to="/build?edit=1">Create my deck →</Link></div> : (
        <>
          <section className="kpr-room">
            <div className="kpr-room-h"><span className="up-badge">● Live · Beta</span><h2>Your private pitch room</h2><p>Share one link instead of attaching files. Investors ask for access with their email; you approve. Then you see every view, slide by slide, and who asked to meet.</p></div>
            <div className="kpr-link"><span>{link ? link.replace(/^https?:\/\//, "") : "Making your link…"}</span><button className="btn white sm" disabled={!link} onClick={copy}>Copy link</button>{link && <a className="btn ghost-w sm" href={link} target="_blank" rel="noreferrer noopener">Open ↗</a>}</div>
            <div className="gp-stats">{([["👁", room?.stats.views ?? 0, "Views"], ["◎", room?.stats.viewers ?? 0, "Investors viewing"], ["▭", room?.stats.slides ?? 0, "Slides read"], ["✓", room?.stats.meets ?? 0, "Asked to meet"]] as const).map(([ic, n, l]) => <div key={l}><i aria-hidden="true">{ic}</i><b>{n}</b><span>{l}</span></div>)}</div>
          </section>
          <section className="kpr-reqs">
            <h2 className="dash-h">Access requests{room?.stats.pending ? ` · ${room.stats.pending} waiting for you` : ""}</h2>
            {!room ? <div className="spinner" /> : room.requests.length === 0 ? <div className="empty"><b>No requests yet.</b><span>Add your link to your pitch emails ("Here's our deck: {link.replace(/^https?:\/\//, "")}") and to your LinkedIn notes. Requests show up here, and we email you.</span></div> : (
              <div className="ko-rows">{room.requests.map((r) => (
                <div className={`ko-li kpr-req ${r.status}`} key={r.id}>
                  <div className="ko-li-main"><b>{r.name}{r.firm ? <span className="muted"> · {r.firm}</span> : null}</b><span><a href={`mailto:${r.email}`}>{r.email}</a> · asked {ago(r.at)}</span>
                    {r.status === "approved" && <span className="kpr-act">{r.views} views · {r.slidesSeen} slides read{r.teaser ? " · opened teaser" : ""}{r.lastSeen ? ` · last seen ${ago(r.lastSeen)}` : " · not opened yet"}{r.meet ? " · " : ""}{r.meet && <b className="kpr-meet">asked to meet</b>}</span>}</div>
                  <div className="ko-li-a">
                    {r.status === "pending" ? <><button className="btn primary sm" onClick={() => void set(r.id, "approved")}>Approve</button><button className="btn ghost sm" onClick={() => void set(r.id, "declined")}>Decline</button></>
                      : <><span className={`ko-li-tag${r.status === "approved" ? " ok" : ""}`}>{r.status === "approved" ? "Approved" : "Declined"}</span><button className="btn ghost sm" onClick={() => void set(r.id, r.status === "approved" ? "declined" : "approved")}>{r.status === "approved" ? "Remove access" : "Approve"}</button></>}
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        </>
      )}
      <section className="kpr-facts">
        <h2 className="dash-h">Your facts</h2>
        <p className="kb-help">Your deck, teaser and pitches use only these. Change them and rebuild your deck.</p>
        <dl>
          <div><dt>Startup</dt><dd>{me.company} · {me.stage} · raising {me.ask}</dd></div>
          <div><dt>What you do</dt><dd>{me.profile.oneLiner}</dd></div>
          <div><dt>About you</dt><dd>{me.profile.founderLine}</dd></div>
          {me.profile.traction && <div><dt>Traction</dt><dd>{me.profile.traction}</dd></div>}
        </dl>
        <button className="btn ghost sm" onClick={() => navigate("/build?edit=1")}>Edit my facts</button>
      </section>
    </div>
  );
}

/** What the founders circle will look like (made-up people). */
function CircleSample() {
  return (
    <div className="kc-circle">
      {[["Priya N.", "Raised ₹2 Cr seed, climate", "Deck review · 30 min"], ["Rahul K.", "Raised ₹75L pre-seed, fintech", "Mock investor Q&A"], ["Meera S.", "Angel, 14 first cheques", "Office hours"]].map(([n, a, b]) => (
        <div key={n}><Face name={n} size={44} /><b>{n}</b><span>{a}</span><em>{b}</em></div>
      ))}
    </div>
  );
}

/** The full plan breakdown inside the dashboard, each one opening the same "Request full access" popup. */
function Plans({ onUnlock, requested, compact = false }: { onUnlock: (plan?: string) => void; requested: boolean; compact?: boolean }) {
  return (
    <div className="kpl">
      {requested && <div className="ka-band done"><span>✓ You've requested founding access. You can change your plan or answers any time.</span></div>}
      <div className="k3-plans">
        {PLANS.map((p) => (
          <div key={p.name} className={`k3-plan${p.rec ? " rec" : ""}`}>
            {p.badge && <span className={`k3-badge${p.rec ? "" : " dark"}`}>{p.badge}</span>}
            <div className="k3-top"><span className="k3-ic" aria-hidden="true">{p.icon}</span><div><b>{p.name}</b><span>{p.line}</span></div></div>
            <span className={`k3-tag${p.rec ? " gold" : ""}`}>{p.key === "preview" ? "You're on this" : p.tag}</span>
            {p.groups.map(([g, items]) => <div key={g} className="k3-group"><em>{g}</em><ul>{items.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
            <span className="k3-best"><b>Best for:</b> {p.best}</span>
            {p.key === "preview" ? <button className="btn ghost" disabled>Your current plan</button> : <button className={`btn ${p.rec ? "primary" : "ghost"}`} onClick={() => onUnlock(p.key)}>{p.key === "raise_kit" ? "Get founding access" : "Request access"}</button>}
          </div>
        ))}
      </div>
      <div className="k3-dfy kpl-dfy">
        <div className="k3-dfy-h"><b>Done for you</b><p>A small team works on your round from day one to term sheet. You stay in every decision and send every email.</p><button className="btn white" onClick={() => onUnlock("done_for_you")}>Request a call</button></div>
      </div>
      {!compact && (
        <>
          <h3 className="k5-table-h">Compare plans</h3>
          <div className="k3-compare" role="table" aria-label="What each plan includes">
            <div className="k3-row head" role="row"><span /><span>Preview</span><span>Raise Kit</span><span>+ Advisors</span><span>Done for you</span></div>
            {COMPARE.map(([label, ...cells]) => <div className="k3-row" role="row" key={label}><span>{label}</span>{cells.map((c, i) => <span key={i} className={c === "✓" ? "y" : c === "–" ? "n" : ""}>{c}</span>)}</div>)}
          </div>
        </>
      )}
      <p className="k5-honest">No one can guarantee funding: a round depends on many things, from your traction to the market. Our job is to raise your odds and your speed.</p>
    </div>
  );
}

/** Settings: emails to her, appearance, account, her data. */
function Settings({ me, token, theme, setTheme, signOut }: { me: Me; token: string; theme: Theme; setTheme: (t: Theme) => void; signOut: () => void }) {
  const setReminders = useMutation(api.notify.setReminders);
  return (
    <div className="settings">
      <section className="settings-card">
        <h2>Account</h2>
        <div className="ka-me static"><Face name={me.name} size={44} /><span><b>{me.name}</b><em>{me.gmail ?? ""}</em></span></div>
        <p className="fg2">Open in Gmail uses this account on a laptop. One Google account holds one startup.</p>
        <button className="btn ghost sm" onClick={signOut}>Sign out</button>
      </section>
      <section className="settings-card">
        <h2>Emails to you</h2>
        <p className="fg2">A short email on mornings when a follow-up is ready to send. Only to you, never to investors.</p>
        <div className="pick">{([true, false] as const).map((on) => <button key={String(on)} aria-pressed={me.emailReminders === on} onClick={() => void setReminders({ token, on })}>{on ? "On" : "Off"}</button>)}</div>
      </section>
      <section className="settings-card">
        <h2>Appearance</h2>
        <div className="pick">{(["light", "dark"] as const).map((t) => <button key={t} aria-pressed={theme === t} onClick={() => setTheme(t)}>{t === "dark" ? "☾ Dark" : "☀ Light"}</button>)}</div>
      </section>
      <section className="settings-card">
        <h2>Your data</h2>
        <p className="fg2">Nothing is ever sent for you. Files you upload are read once, then deleted. To see or delete your data, write to <a href="mailto:hello@firstcheq.ai">hello@firstcheq.ai</a>.</p>
        <p className="small"><Link to="/privacy">Privacy Policy</Link> · <Link to="/terms">Terms</Link></p>
      </section>
    </div>
  );
}

/** Her company, with "Add another company" (coming soon: one plan per company, switch between them here). */
function CompanySwitch({ me, brand, onToast, compact = false }: { me: Me; brand: { primary: string; logo?: string }; onToast: (s: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const want = useMutation(api.track.want);
  const add = () => { setOpen(false); void want({ token: visitorToken(), key: "kit_company" }); onToast("Coming soon: more companies, one plan each. We've noted you want it."); };
  return (
    <div className={`ka-co${compact ? " compact" : ""}`}>
      {!compact && (
        <button className="ws ka-ws ka-co-btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="ka-mark" style={{ background: brand.primary }}>{brand.logo ? <img src={brand.logo} alt="" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : me.company.slice(0, 2).toUpperCase()}</span>
          <div><b>{me.company}</b><span>{me.stage} · {me.ask}</span></div>
          <i aria-hidden="true">{open ? "▴" : "▾"}</i>
        </button>
      )}
      {(open || compact) && (
        <div className="ka-co-menu" role="menu">
          {!compact && <div className="ka-co-row on" role="menuitem"><span className="ka-dot" style={{ background: brand.primary }} /><b>{me.company}</b><em>Current</em></div>}
          <button className="ka-co-row add" role="menuitem" onClick={add}><span>＋</span><b>Add another company</b><span className="soon-tag">SOON</span></button>
        </div>
      )}
    </div>
  );
}

/** "What would help you most?": a few ideas she can tick. Each tap is counted on /admin. */
const INTERESTS: [string, string][] = [
  ["kit_interview", "Investor interview prep"], ["kit_intros", "Warm intros to investors"], ["kit_profiles", "Richer investor profiles"],
  ["kit_deckfix", "An expert to fix my deck with me"], ["kit_global", "Global investors, beyond India"],
];
function Interests() {
  const want = useMutation(api.track.want);
  const [picked, setPicked] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem("fos_kit_interests") ?? "[]"); } catch { return []; } });
  const pick = (k: string) => {
    if (picked.includes(k)) return;
    const next = [...picked, k];
    setPicked(next);
    try { localStorage.setItem("fos_kit_interests", JSON.stringify(next)); } catch { /* ignore */ }
    void want({ token: visitorToken(), key: k }).catch(() => null);
  };
  return (
    <section className="kh-int">
      <div><b>What would help you most next?</b><span>Tap any. We build what founders ask for.</span></div>
      <div className="kh-int-chips">{INTERESTS.map(([k, l]) => <button key={k} aria-pressed={picked.includes(k)} onClick={() => pick(k)}>{picked.includes(k) ? "✓ " : "+ "}{l}</button>)}</div>
    </section>
  );
}
