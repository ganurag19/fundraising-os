import { useId } from "react";

// FirstCheq mark: a tick that rises into an arrow, over a cheque's signature line. Blue to violet (DESIGN.md tokens).
export function LogoMark({ size = 28 }: { size?: number }) {
  const id = useId();
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3D7BFF" />
          <stop offset="1" stopColor="#7B5CFF" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <path d="M15 33.5 25.5 44 47.5 20" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M37.5 19.5h10.5V30" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 52h34" stroke="#fff" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** "First" light, "Cheq" bold: reads as one word, stresses the cheque. */
export function Wordmark({ hideOnSmall = false }: { hideOnSmall?: boolean }) {
  return <span className={`wordmark${hideOnSmall ? " logo-text" : ""}`}><span className="wm-first">First</span><span className="wm-cheq">Cheq</span></span>;
}
