import { useState } from "react";
import { Face, Logo } from "../components/Art";

/** The fund's own logo when we found one on its site; otherwise our drawn mark (a face for angels). */
export default function InvLogo({ src, name, kind, size = 40 }: { src: string | null; name: string; kind: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  if (src && !broken) return <img className="inv-logo" src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  return kind === "angel" ? <Face name={name} size={size} /> : <Logo name={name} size={size} />;
}
