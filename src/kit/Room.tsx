import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { LogoMark, Wordmark } from "../components/Brand";
import { BrandSlide, BrandTeaser } from "./BrandDeck";
import { SLIDE_TITLES } from "./kitTypes";
import type { KitView } from "./kitTypes";
import { brandVars, loadBrandFont } from "./brand";
import "./kit.css";

// /p/<slug>: a founder's pitch room. Visitors ask for access with name and email; once she approves, this browser
// sees her deck and teaser, and she sees what they read. Nothing here is sent anywhere by us.

const KEY = "fos_room_viewer";
function viewerCode(): string {
  let t: string | null = null;
  try { t = localStorage.getItem(KEY); } catch { /* private mode */ }
  if (t && /^[a-f0-9]{48}$/.test(t)) return t;
  t = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  try { localStorage.setItem(KEY, t); } catch { /* still works for this visit */ }
  return t;
}
const site = (u: string) => u.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");

export default function Room() {
  const { slug = "" } = useParams();
  const [viewer] = useState(viewerCode);
  const room = useQuery(api.room.page, { slug, viewer });
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);
  useEffect(() => { if (room) document.title = `${room.company} · pitch room`; }, [room]);
  useEffect(() => loadBrandFont(room?.brand.font, room?.brand.fontCss), [room?.brand.font, room?.brand.fontCss]);

  if (room === undefined) return <Frame><div className="spinner" /></Frame>;
  if (room === null) return <Frame><div className="kr-card"><h1>This room doesn't exist.</h1><p className="kb-help">Check the link with the founder who shared it.</p></div></Frame>;
  return (
    <Frame>
      <header className="kr-head" style={brandVars(room.brand)}>
        <span className="kr-mark">{room.brand.logo ? <img src={room.brand.logo} alt="" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /> : room.company.slice(0, 2).toUpperCase()}</span>
        <div><span className="kr-k">Pitch room · private</span><h1>{room.company}</h1><p>{room.oneLiner}</p>
          <span className="kr-meta">{room.stage} · raising {room.ask}{room.website ? <> · <a href={/^https?:/.test(room.website) ? room.website : `https://${room.website}`} target="_blank" rel="noreferrer noopener">{site(room.website)} ↗</a></> : null}</span></div>
      </header>
      {room.state === "none" && <Ask slug={slug} viewer={viewer} founder={room.founder} company={room.company} />}
      {room.state === "pending" && <div className="kr-card kr-wait"><span className="kr-pulse" aria-hidden="true" /><h2>Request sent.</h2><p>{room.founder.split(" ")[0]} will approve you. This page opens by itself, so you can keep it open or come back to this link later.</p></div>}
      {room.state === "declined" && <div className="kr-card"><h2>Not available right now.</h2><p className="kb-help">{room.founder.split(" ")[0]} isn't sharing this room with you at the moment. You can write to them directly.</p></div>}
      {room.state === "approved" && room.content && <Open slug={slug} viewer={viewer} room={room} content={room.content} />}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <main className="theme-light kbx kr">
      <div className="kb-main">{children}</div>
      <footer className="kr-foot"><a className="logo" href="/" target="_blank" rel="noreferrer"><LogoMark /><Wordmark /></a><span>Shared privately with FirstCheq. Raising your first round? <a href="/">Build your own kit</a>.</span></footer>
    </main>
  );
}

function Ask({ slug, viewer, founder, company }: { slug: string; viewer: string; founder: string; company: string }) {
  const ask = useMutation(api.room.ask);
  const [f, setF] = useState({ name: "", email: "", firm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await ask({ slug, viewer, ...f }).catch(() => ({ ok: false as const, error: "Couldn't send that. Check your connection and try again." }));
    setBusy(false);
    if (!r.ok) setError(r.error);
  };
  return (
    <form className="kr-card kr-ask" onSubmit={go}>
      <h2>See {company}'s pitch</h2>
      <p className="kb-help">{founder.split(" ")[0]} shares this deck and teaser privately. Ask for access; they'll see your name and email and approve you.</p>
      <label className="kb-field"><span>Your name</span><input className="field" required maxLength={80} autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
      <label className="kb-field"><span>Work email</span><input className="field" required type="email" maxLength={200} autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
      <label className="kb-field"><span>Fund or firm <i className="opt">optional</i></span><input className="field" maxLength={100} autoComplete="organization" value={f.firm} onChange={(e) => setF({ ...f, firm: e.target.value })} /></label>
      {error && <p className="err" role="alert">{error}</p>}
      <button className="btn primary" disabled={busy || !f.name.trim() || !f.email.trim()}>{busy ? "Sending…" : "Request access"}</button>
      <span className="kb-dim">Only {founder.split(" ")[0]} sees your request. We never add you to a list.</span>
    </form>
  );
}

type RoomData = NonNullable<FunctionReturnType<typeof api.room.page>>;
function Open({ slug, viewer, room, content }: { slug: string; viewer: string; room: RoomData; content: NonNullable<RoomData["content"]> }) {
  const track = useMutation(api.room.track);
  const [cur, setCur] = useState(0);
  const [met, setMet] = useState(content.met);
  const seen = useRef(new Set<number>());
  const k: KitView = { company: room.company, founder: room.founder, stage: room.stage, ask: room.ask, website: room.website, brand: room.brand, slides: content.slides, teaser: content.teaser, facts: { team: content.team } };
  // One view per visit, and each slide the first time it's shown.
  useEffect(() => { void track({ slug, viewer, kind: "view" }); }, [track, slug, viewer]);
  useEffect(() => {
    if (!content.slides.length || seen.current.has(cur)) return;
    seen.current.add(cur);
    void track({ slug, viewer, kind: "slide", slide: cur });
  }, [cur, content.slides.length, track, slug, viewer]);
  const meet = () => { setMet(true); void track({ slug, viewer, kind: "meet" }); };
  return (
    <>
      {content.slides.length > 0 && (
        <section className="kr-card kr-deck">
          <div className="kr-row"><h2>Deck</h2><span className="kb-dim">{cur + 1} / {content.slides.length} · {SLIDE_TITLES[content.slides[cur]?.key] ?? ""}</span></div>
          <div className="kb-slide"><BrandSlide k={k} i={cur} /></div>
          <div className="kr-nav"><button className="btn ghost sm" disabled={cur === 0} onClick={() => setCur((c) => c - 1)}>← Previous</button><button className="btn ghost sm" disabled={cur >= content.slides.length - 1} onClick={() => setCur((c) => c + 1)}>Next →</button></div>
          <div className="kz-thumbs">{content.slides.map((s, i) => <button key={s.key} className={i === cur ? "on" : ""} onClick={() => setCur(i)} aria-label={`Slide ${i + 1}`}><BrandSlide k={k} i={i} /><span>{SLIDE_TITLES[s.key]}</span></button>)}</div>
        </section>
      )}
      {content.teaser && (
        <details className="kr-card kr-teaser" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) void track({ slug, viewer, kind: "teaser" }); }}>
          <summary><h2>Two-page teaser</h2><span>Open ▾</span></summary>
          <div className="kb-teaser"><BrandTeaser k={k} page={1} /></div>
        </details>
      )}
      <section className="kr-card kr-meet" style={brandVars(room.brand)}>
        {met ? <><h2>We've let {room.founder.split(" ")[0]} know.</h2><p>They'll write to you at the email you gave.</p></> : <><h2>Interested?</h2><p>Let {room.founder.split(" ")[0]} know you'd like to talk. They'll email you directly.</p><button className="btn primary" onClick={meet}>Ask to meet</button></>}
      </section>
    </>
  );
}
