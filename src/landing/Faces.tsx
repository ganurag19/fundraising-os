import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

// "Who you'll pitch": real partners at funds in our research, with the photo and role from each fund's own team page.

function Card({ f }: { f: { name: string; role: string; photo: string; fund: string } }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  return (
    <figure className="fc-card">
      <img src={f.photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      <figcaption><b>{f.name}</b><span>{f.role}</span><em>{f.fund}</em></figcaption>
    </figure>
  );
}

export function Faces() {
  const faces = useQuery(api.landing.faces, {});
  if (!faces || faces.length < 6) return null;
  const row = [...faces, ...faces]; // doubled for a seamless loop
  return (
    <section className="k2-wide fc">
      <span className="k2-k">Who you'll pitch</span>
      <h2>Real partners at real funds,<br /><em>matched to your startup.</em></h2>
      <p className="k2-sub">Every investor on your list comes with the people to pitch, their role, their recent deals and why they fit you.</p>
      <div className="fc-strip" aria-label="Partners at funds in our research"><div className="fc-track">{row.map((f, i) => <Card key={`${f.name}-${i}`} f={f} />)}</div></div>
      <p className="fc-note">Names, roles and photos as published on each fund's own website. FirstCheq isn't affiliated with these investors.</p>
    </section>
  );
}
