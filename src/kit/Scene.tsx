// A slow, living landscape drawn in code (no video file): sky, sun, three ridges of hills and pines drifting at
// different speeds, mist and a few birds. Sits behind the upgrade and profile cards. Still for reduced motion.

const ridge = (h: number, rough: number, seed: number) => {
  // a wide wavy ridge, 2 screens wide so it can loop
  let d = `M0 ${200 - h}`;
  for (let x = 0; x <= 2000; x += 50) {
    const y = 200 - h + Math.sin((x + seed) / 140) * rough + Math.sin((x + seed * 3) / 57) * rough * 0.45;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return d + " L2000 200 L0 200 Z";
};

const pines = (n: number, base: number, size: number, seed: number) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = ((i * 2000) / n + ((seed * (i + 3)) % 37)) % 2000, h = size * (0.7 + ((i * seed) % 7) / 10);
    d += `M${x.toFixed(0)} ${base} l${(h * 0.28).toFixed(1)} 0 l${(-h * 0.28).toFixed(1)} ${(-h).toFixed(1)} l${(-h * 0.28).toFixed(1)} ${h.toFixed(1)} Z `;
  }
  return d;
};

/** Our own backdrop (16 Oct): a slow aurora in the logo's blue, violet and pink, with drifting light and faint stars. */
function Aurora({ className }: { className: string }) {
  return (
    <div className={`scene aurora ${className}`} aria-hidden="true">
      <div className="au-blob b1" /><div className="au-blob b2" /><div className="au-blob b3" /><div className="au-blob b4" />
      <div className="au-stars">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.6}s` }} />)}</div>
      <div className="au-grid" />
      <div className="au-sweep" />
      <div className="scene-shade au-shade" />
    </div>
  );
}

export default function Scene({ className = "", kind = "aurora" }: { className?: string; kind?: "aurora" | "forest" }) {
  if (kind === "aurora") return <Aurora className={className} />;
  return (
    <div className={`scene ${className}`} aria-hidden="true">
      <div className="scene-sky" />
      <div className="scene-sun" />
      <svg className="scene-layer l1" viewBox="0 0 2000 200" preserveAspectRatio="none"><path d={ridge(120, 18, 40)} /></svg>
      <div className="scene-mist m1" />
      <svg className="scene-layer l2" viewBox="0 0 2000 200" preserveAspectRatio="none"><path d={ridge(90, 14, 310)} /><path d={pines(46, 120, 30, 11)} /></svg>
      <div className="scene-mist m2" />
      <svg className="scene-layer l3" viewBox="0 0 2000 200" preserveAspectRatio="none"><path d={ridge(60, 10, 777)} /><path d={pines(34, 150, 62, 7)} /></svg>
      <div className="scene-birds">{[0, 1, 2].map((i) => <svg key={i} className={`bird b${i}`} viewBox="0 0 24 10"><path d="M1 7 Q6 1 12 6 Q18 1 23 7" /></svg>)}</div>
      <div className="scene-shade" />
    </div>
  );
}
