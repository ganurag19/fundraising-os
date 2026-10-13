import { useMemo } from "react";
import { dialSvg, faceSvg, logoSvg } from "../lib/art";
import { BADGES, type BadgeKey } from "../lib/badges";

// The SVG strings come only from our own generators in lib/art.ts (names are escaped), never from user input.
export function Face({ name, size = 40 }: { name: string; size?: number }) {
  const html = useMemo(() => faceSvg(name, size), [name, size]);
  return <span style={{ display: "inline-flex", flex: "none" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Logo({ name, size = 40 }: { name: string; size?: number }) {
  const html = useMemo(() => logoSvg(name, size), [name, size]);
  return <span style={{ display: "inline-flex", flex: "none" }} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Dial({ score, size = 64 }: { score: number; size?: number }) {
  const html = useMemo(() => dialSvg(score, size), [score, size]);
  return (
    <div className="dial" style={{ width: size, height: size }} aria-label={`FirstCheq Fit Score ${score} out of 100`}>
      <span dangerouslySetInnerHTML={{ __html: html }} />
      <b style={{ fontSize: Math.round(size / 3.1) }}>{score}</b>
    </div>
  );
}



export function Badges({ keys, max = 3 }: { keys: readonly BadgeKey[]; max?: number }) {
  return (
    <span className="badge-row">
      {keys.slice(0, max).map((k) => (
        <span className="bdg" key={k}>
          <i style={{ background: BADGES[k][2] }}>{BADGES[k][0]}</i>
          {BADGES[k][1]}
        </span>
      ))}
    </span>
  );
}

export function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  const full = Math.round(rating);
  return (
    <span className="stars" title={`${rating} out of 5${reviews ? ` from ${reviews} founders` : ""}`}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
      <small>{rating}{reviews ? ` (${reviews})` : ""}</small>
    </span>
  );
}

export function Medal({ rank }: { rank: number }) {
  return <span className={`medal ${rank < 3 ? "m" + (rank + 1) : "mx"}`}>{rank + 1}</span>;
}
