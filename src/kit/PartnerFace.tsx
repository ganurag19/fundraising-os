import { useState } from "react";
import InvLogo from "./InvLogo";

// The person she'll pitch at a fund: their photo from the fund's own team page, else the fund's logo.

const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

export function PartnerFace({ face, logo, name, kind, size = 40 }: { face: { name: string; photo: string | null } | null; logo: string | null; name: string; kind: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (face?.photo && !broken) return (
    <span className="pf" style={{ width: size, height: size }}>
      <img src={face.photo} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
      {logo && <InvLogo src={logo} name={name} kind={kind} size={Math.round(size * 0.42)} />}
    </span>
  );
  if (face && !logo) return <span className="pf none" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(face.name)}</span>;
  return <InvLogo src={logo} name={name} kind={kind} size={size} />;
}
