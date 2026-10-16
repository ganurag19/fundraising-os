import { api } from "../../convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import InvLogo from "./InvLogo";
import { useMarket } from "./useMarket";

// Market & competition (16 Oct): who else is building in her space, recent rounds in India and abroad, and who on her
// list funded companies like hers. Every line from the web carries the page it came from.

export type MarketData = NonNullable<FunctionReturnType<typeof api.market.mine>>;
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const Src = ({ u }: { u: string }) => <a className="km-src" href={u} target="_blank" rel="noreferrer noopener">{host(u)} ↗</a>;

export function MarketTab({ token, company, sector, onUnlock }: { token: string; company: string; sector: string; onUnlock: () => void }) {
  const { m, error, retry } = useMarket(token);
  if (m === undefined) return <div className="spinner" />;
  if (m === null) return <div className="empty"><b>Sign in to see your market.</b></div>;
  const running = m.status === "running" || (m.status === "none" && !error);
  if (running) return (
    <div className="km-run" role="status">
      <span className="km-radar" aria-hidden="true"><i /><i /><i /></span>
      <h3>Searching the web for who else is building in {sector}</h3>
      <p>Competitors in India and abroad, the rounds they raised and who led them, each with its source. About a minute; this page fills in by itself.</p>
    </div>
  );
  if (m.status === "failed" || error) return (
    <div className="empty"><b>{error || "We couldn't finish your market research this time."}</b><span>Your details are safe. Try again in a few minutes.</span>{!error.includes("tomorrow") && <button className="btn primary sm" onClick={retry}>Try again</button>}</div>
  );
  const locked = m.locked.competitors + m.locked.deals + m.locked.trends;
  return (
    <div className="km">
      {m.summary && <section className="km-sum"><span className="kb-kicker">What it means for {company}</span><p>{m.summary}</p></section>}

      <section className="km-sec">
        <header><h3>Who else is building</h3><span className="kb-dim">India first, then global</span></header>
        <div className="km-comps">
          {m.competitors.map((c) => (
            <article key={c.name} className="km-comp">
              <div className="km-comp-h"><InvLogo src={c.logo ?? null} name={c.name} kind="company" size={40} /><div><b>{c.name}</b><span className={`km-where ${c.where}`}>{c.where === "india" ? "India" : "Global"}</span></div></div>
              <p>{c.what}</p>
              {c.funding && <span className="km-fund">💰 {c.funding}</span>}
              <div className="km-links">{c.website && <a href={c.website} target="_blank" rel="noreferrer noopener">{host(c.website)}</a>}<Src u={c.source} /></div>
            </article>
          ))}
          {m.locked.competitors > 0 && <button className="km-comp km-more" onClick={onUnlock}><b>🔒 {m.locked.competitors} more competitors</b><span>With their funding, investors and how {company} is different</span><em>Unlock</em></button>}
        </div>
        {!m.competitors.length && <p className="kb-help">We didn't find close competitors with a source we trust. That can be good news; investors will still ask, so name the alternatives your customers use today.</p>}
      </section>

      <section className="km-sec">
        <header><h3>Recent rounds in your space</h3><span className="kb-dim">Comps for your raise, newest first</span></header>
        <div className="km-deals">
          {m.deals.map((d) => (
            <div key={d.company + d.date} className={`km-deal${d.atStage ? " stage" : ""}`}>
              <div className="km-deal-a"><b>{d.amount}</b><span>{d.round}</span></div>
              <div className="km-deal-m"><b>{d.company} <span className={`km-where ${d.where}`}>{d.where === "india" ? "India" : "Global"}</span>{d.atStage && <span className="km-comp-tag">Comp at your stage</span>}</b>{d.what && <span>{d.what}</span>}<span className="km-inv">{d.investors.length ? `Led by ${d.investors.join(", ")}` : "Investors not named"} · {d.date}</span></div>
              <Src u={d.source} />
            </div>
          ))}
          {m.locked.deals > 0 && <button className="rv-locked" onClick={onUnlock}><span>🔒 {m.locked.deals} more rounds, with who led them</span><em>Unlock</em></button>}
        </div>
      </section>

      {m.ours.length > 0 && (
        <section className="km-sec">
          <header><h3>Who funded companies like yours</h3><span className="kb-dim">From our investor records</span></header>
          <div className="km-ours">{m.ours.map((o) => <div key={o.company}><b>{o.company}</b><span>{[o.round, o.year].filter(Boolean).join(" · ") || "Recent"}</span><em>{o.investors.join(", ")}</em></div>)}</div>
          <p className="kb-dim">Each of these investors is on your list. Open Investors to see their Fit Score.</p>
        </section>
      )}

      {(m.trends.length > 0 || m.locked.trends > 0) && (
        <section className="km-sec">
          <header><h3>Money moving in your space</h3></header>
          <ul className="km-trends">{m.trends.map((t) => <li key={t.line}>{t.line} <Src u={t.source} /></li>)}</ul>
          {m.locked.trends > 0 && <button className="rv-locked" onClick={onUnlock}><span>🔒 {m.locked.trends} more trends</span><em>Unlock</em></button>}
        </section>
      )}

      {locked > 0 && <div className="rv-cta"><b>See your full market report</b><span>Every competitor and round we found, with sources, and your market size laid out on your deck.</span><button className="btn primary" onClick={onUnlock}>Unlock full kit</button></div>}
      <p className="kb-dim">Found on the web for {company}. Funding figures are as reported by each source; check the source before you quote it to an investor.</p>
    </div>
  );
}
