import { useEffect, useRef, useState } from "react";

// A sample investor deck for a made-up startup (Kiln Labs), drawn at real slide size (960×540) and scaled to fit.
// Every number is part of the made-up example; slides say "Sample".

const O = "#7B5CFF", D = "#1C1442", R = "#5B3FD6";


function Head({ n, label, dark = false }: { n: number; label: string; dark?: boolean }) {
  return (
    <div className="sd-head" style={{ color: dark ? "rgba(255,255,255,.75)" : "#6B6390" }}>
      <span className="sd-logo" style={{ background: dark ? "#fff" : O, color: dark ? O : "#fff" }}>K</span>
      <span>Kiln Labs · {label}</span>
      <span className="sd-sample">Sample</span>
      <span>{String(n).padStart(2, "0")}</span>
    </div>
  );
}
const Foot = ({ children }: { children: React.ReactNode }) => <div className="sd-foot">{children}</div>;

function Cover() {
  return (
    <div className="sd s-cover">
      <Head n={1} label="Investor presentation" dark />
      <div className="sd-cover-body">
        <div>
          <span className="sd-eyebrow">Seed round · ₹3 Cr · October 2026</span>
          <h1>Kiln Labs</h1>
          <p>Cutting coal use in India's 1,40,000 brick kilns, with a retrofit burner and a fuel app that pays for itself in 9 weeks.</p>
          <div className="sd-chips"><span>62 paying kilns</span><span>18% less coal</span><span>+47% MoM</span></div>
        </div>
        <svg viewBox="0 0 300 300" className="sd-kiln" aria-hidden="true">
          <defs><linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#FBCFE8" /><stop offset="1" stopColor="#F4F1FF" /></linearGradient></defs>
          <circle cx="150" cy="150" r="140" fill="rgba(255,255,255,.08)" />
          <rect x="60" y="150" width="180" height="90" rx="10" fill="#4C2C9E" /><rect x="60" y="150" width="180" height="16" fill="#5B3FD6" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={76 + i * 32} y="180" width="22" height="34" rx="11" fill="#F0ABFC" opacity={0.9 - i * 0.1} />)}
          <rect x="190" y="60" width="26" height="90" fill="#3A2380" />
          <circle cx="203" cy="44" r="14" fill="rgba(255,255,255,.35)" /><circle cx="222" cy="26" r="10" fill="rgba(255,255,255,.22)" /><circle cx="240" cy="12" r="7" fill="rgba(255,255,255,.14)" />
          <path d="M120 150 C110 125 132 118 128 96 C146 112 150 128 140 150 Z" fill="url(#fl)" />
        </svg>
      </div>
      <Foot><span>Arjun Rao, founder · arjun@kilnlabs.example</span><span>Confidential</span></Foot>
    </div>
  );
}

function Problem() {
  return (
    <div className="sd">
      <Head n={2} label="The problem" />
      <h2>Brick kilns burn coal by guesswork, and fuel eats 40% of every rupee they earn.</h2>
      <div className="sd-row3">
        {[["1,40,000", "brick kilns in India", "M4 20h16M6 20V10l6-4 6 4v10"], ["40%", "of a kiln's cost is coal", "M12 3v18M5 8h14M7 14h10"], ["0", "kilns measure fuel per batch", "M4 12h16M12 4v16"]].map(([n, t, d]) => (
          <div className="sd-stat" key={t}><svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} stroke={O} strokeWidth="2" fill="none" strokeLinecap="round" /></svg><b>{n}</b><span>{t}</span></div>
        ))}
      </div>
      <div className="sd-cost">
        <span className="muted-sd">Where a kiln's ₹100 goes</span>
        <div className="sd-cost-bar">{([["Coal", 40, "#7B5CFF"], ["Labour", 25, "#A78BFA"], ["Clay", 15, "#C4B5FD"], ["Transport", 10, "#DDD6FE"], ["Margin", 10, "#EDE9FE"]] as const).map(([t, p, c]) => <span key={t} style={{ width: `${p}%`, background: c }}><b>{t}</b>₹{p}</span>)}</div>
      </div>
      <blockquote className="sd-quote">"We buy coal on credit and pray the batch comes out right. Half of it goes up the chimney."<cite>Kiln owner, Moradabad (customer interview)</cite></blockquote>
      <Foot><span>Sources: [industry census, 2024]; [CSE brick kiln study, 2023]; 40 customer interviews</span></Foot>
    </div>
  );
}

function Solution() {
  return (
    <div className="sd">
      <Head n={3} label="Our solution" />
      <h2>A burner that fits any kiln in a day, and an app that shows the coal saved.</h2>
      <div className="sd-sol">
        <div className="sd-phone" aria-hidden="true">
          <div className="sd-phone-top"><b>Batch #214</b><span>Live</span></div>
          <div className="sd-gauge"><svg viewBox="0 0 120 66"><path d="M10 60 A50 50 0 0 1 110 60" stroke="#E4DCFA" strokeWidth="10" fill="none" /><path d="M10 60 A50 50 0 0 1 86 18" stroke={O} strokeWidth="10" fill="none" strokeLinecap="round" /></svg><b>18%</b><span>coal saved this batch</span></div>
          <div className="sd-mini-rows"><span><i style={{ width: "72%" }} />Kiln temperature</span><span><i style={{ width: "54%" }} />Coal per 1,000 bricks</span></div>
        </div>
        <div className="sd-feats">
          {[["Retrofit burner", "Fits existing kilns, no rebuild. Installed in 6 hours."], ["Fuel app", "Coal per batch, per brick, in Hindi. Alerts when a batch runs hot."], ["Pay monthly", "₹4,500 a month. The kiln saves that back in 9 weeks."]].map(([t, d], i) => (
            <div key={t} className="sd-feat"><span className="sd-num">{i + 1}</span><div><b>{t}</b><span>{d}</span></div></div>
          ))}
        </div>
      </div>
      <Foot><span>Patent filed (2026) · Pilot data from 9 kilns, Mar–Aug 2026</span></Foot>
    </div>
  );
}

function Traction() {
  const pts = [9, 14, 22, 31, 44, 62]; const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const x = (i: number) => 40 + i * 92, y = (v: number) => 210 - (v / 70) * 180;
  return (
    <div className="sd">
      <Head n={4} label="Traction" />
      <h2>62 kilns pay us every month, up from 9 in March.</h2>
      <div className="sd-trac">
        <svg viewBox="0 0 520 240" className="sd-chart" aria-hidden="true">
          {[0, 20, 40, 60].map((v) => <g key={v}><line x1="30" x2="510" y1={y(v)} y2={y(v)} stroke="#E8E2F7" /><text x="4" y={y(v) + 4} fontSize="11" fill="#6B6390">{v}</text></g>)}
          <path d={`M${pts.map((v, i) => `${x(i)} ${y(v)}`).join(" L")} L${x(5)} 210 L${x(0)} 210 Z`} fill="rgba(123,92,255,.14)" />
          <path d={`M${pts.map((v, i) => `${x(i)} ${y(v)}`).join(" L")}`} stroke={O} strokeWidth="4" fill="none" strokeLinejoin="round" />
          {pts.map((v, i) => <g key={i}><circle cx={x(i)} cy={y(v)} r="6" fill="#fff" stroke={O} strokeWidth="3" /><text x={x(i)} y={y(v) - 12} fontSize="12" fontWeight="700" fill={R} textAnchor="middle">{v}</text><text x={x(i)} y="230" fontSize="11" fill="#6B6390" textAnchor="middle">{months[i]}</text></g>)}
        </svg>
        <div className="sd-kpis">{[["₹2.8L", "monthly revenue"], ["+47%", "month-on-month"], ["3%", "monthly churn"], ["3 states", "UP, Bihar, Haryana"]].map(([n, t]) => <div key={t}><b>{n}</b><span>{t}</span></div>)}</div>
      </div>
      <Foot><span>Paying kilns at month end · Revenue = August 2026 billing</span></Foot>
    </div>
  );
}

function Market() {
  return (
    <div className="sd">
      <Head n={5} label="Market" />
      <h2>A ₹4,200 Cr opportunity in kilns we can reach by road from Delhi.</h2>
      <div className="sd-mkt">
        <svg viewBox="0 0 300 300" className="sd-rings" aria-hidden="true">
          <circle cx="150" cy="150" r="140" fill="#FFE6D6" /><circle cx="150" cy="185" r="95" fill="#C4B5FD" /><circle cx="150" cy="222" r="52" fill={O} />
          <text x="150" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill={R}>TAM</text><text x="150" y="118" textAnchor="middle" fontSize="13" fontWeight="700" fill={D}>SAM</text><text x="150" y="226" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">SOM</text>
        </svg>
        <div className="sd-mkt-list">
          {[["TAM", "₹30,000 Cr", "Coal bought by all Indian brick kilns a year"], ["SAM", "₹4,200 Cr", "Coal-fired kilns in UP, Bihar, Haryana, Punjab"], ["SOM", "₹180 Cr", "1,000 kilns in 3 years, at ₹4,500 a month"]].map(([k, v, d]) => <div key={k}><em>{k}</em><b>{v}</b><span>{d}</span></div>)}
        </div>
      </div>
      <Foot><span>Bottom-up: kilns × coal per kiln × price · Sources: [kiln census]; [state pollution boards]; our pilot data</span></Foot>
    </div>
  );
}

function Model() {
  return (
    <div className="sd">
      <Head n={6} label="Business model" />
      <h2>Kilns pay ₹4,500 a month and save it back in 9 weeks.</h2>
      <div className="sd-model">
        <table className="sd-table"><tbody>
          {[["Price", "₹4,500 / kiln / month"], ["Cost to acquire (CAC)", "₹9,000"], ["Gross margin", "68%"], ["Payback for us", "3 months"], ["Lifetime value", "₹1.1 L"], ["LTV : CAC", "12×"]].map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
        </tbody></table>
        <div className="sd-bars2">
          <span className="muted-sd">Where ₹4,500 goes</span>
          {[["Gross profit", 68, O], ["Hardware amortised", 18, "#C4B5FD"], ["Support & app", 14, "#FFE0CF"]].map(([t, p, c]) => <div key={t as string}><span>{t} · {p}%</span><i style={{ width: `${p}%`, background: c as string }} /></div>)}
        </div>
      </div>
      <Foot><span>Unit economics from 62 paying kilns, Aug 2026</span></Foot>
    </div>
  );
}

function Competition() {
  const dots: [string, number, number, boolean][] = [["Kiln Labs", 82, 22, true], ["Burner makers", 22, 30, false], ["Energy audits", 70, 72, false], ["Do nothing", 18, 78, false]];
  return (
    <div className="sd">
      <Head n={7} label="Competition" />
      <h2>Others sell hardware or advice. We sell measured savings.</h2>
      <div className="sd-comp">
        <div className="sd-matrix" aria-hidden="true">
          <span className="ax ax-y1">Measured, ongoing</span><span className="ax ax-y2">One-time</span><span className="ax ax-x1">Hardware</span><span className="ax ax-x2">Software + data</span>
          {dots.map(([t, x, y, us]) => <span key={t} className={`dot${us ? " us" : ""}`} style={{ left: `${x}%`, top: `${y}%` }}>{t}</span>)}
        </div>
        <ul className="sd-why">
          <li><b>Pays for itself</b>, shown on the first fuel bill</li>
          <li><b>Data no one else has:</b> coal per batch across 62 kilns</li>
          <li><b>Hindi-first app</b> built with kiln managers</li>
        </ul>
      </div>
      <Foot><span>Named competitors and sources appear here in your kit</span></Foot>
    </div>
  );
}

function Team() {
  return (
    <div className="sd">
      <Head n={8} label="Team" />
      <h2>We've run kilns, built hardware and shipped software.</h2>
      <div className="sd-team">
        {[["AR", "Arjun Rao", "Founder & CEO", "6 years running his family's kiln · IIT Kanpur"], ["MS", "Meghna Sen", "CTO", "Ex-embedded lead at an EV charging startup"], ["VK", "Vikram Kumar", "Head of field ops", "Installed 40+ industrial burners in UP"]].map(([i, n, r, d]) => (
          <div key={n}><span className="sd-av">{i}</span><b>{n}</b><em>{r}</em><span>{d}</span></div>
        ))}
      </div>
      <div className="sd-together">{[["20+ years", "in kilns, hardware and software"], ["40+", "industrial burners installed"], ["62", "kilns live, all installed by us"]].map(([n, t]) => <div key={t}><b>{n}</b><span>{t}</span></div>)}</div>
      <div className="sd-adv"><b>Advisors</b><span>A former state pollution board scientist · a founder who sold a manufacturing SaaS</span></div>
      <Foot><span>Hiring: 2 field engineers, 1 data analyst</span></Foot>
    </div>
  );
}

function Ask() {
  const parts: [string, number, string][] = [["Sales & installs", 45, O], ["Product", 35, "#C4B5FD"], ["Operations", 20, "#FFE0CF"]];
  let acc = 0;
  return (
    <div className="sd s-ask">
      <Head n={9} label="The ask" dark />
      <h2>Raising ₹3 Cr at seed to reach 400 kilns in 18 months.</h2>
      <div className="sd-askbody">
        <svg viewBox="0 0 42 42" className="sd-donut" aria-hidden="true">
          {parts.map(([t, p, c]) => { const el = <circle key={t} cx="21" cy="21" r="15.9" fill="none" stroke={c} strokeWidth="6" strokeDasharray={`${p} ${100 - p}`} strokeDashoffset={25 - acc} />; acc += p; return el; })}
          <text x="21" y="22" textAnchor="middle" fontSize="6" fontWeight="800" fill="#fff">₹3 Cr</text>
        </svg>
        <div className="sd-legend">{parts.map(([t, p, c]) => <span key={t}><i style={{ background: c }} />{t} · {p}%</span>)}</div>
        <ol className="sd-miles">{[["Month 6", "150 kilns, ₹7L monthly revenue"], ["Month 12", "Bihar and Punjab live"], ["Month 18", "400 kilns, Series A ready"]].map(([m, d]) => <li key={m}><b>{m}</b><span>{d}</span></li>)}</ol>
      </div>
      <Foot><span>arjun@kilnlabs.example · kilnlabs.example/deck</span></Foot>
    </div>
  );
}

const SLIDES = [Cover, Problem, Solution, Traction, Market, Model, Competition, Team, Ask];

/** One sample slide, drawn at 960×540 and scaled to the width it's given. */
export function SampleSlide({ i }: { i: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  useEffect(() => {
    const el = box.current;
    if (!el || !("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 960));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const S = SLIDES[i];
  return <div ref={box} className="sd-box"><div className="sd-scale" style={{ transform: `scale(${scale})` }}><S /></div></div>;
}
