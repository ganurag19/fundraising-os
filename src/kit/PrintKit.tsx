import { useEffect } from "react";
import { createPortal } from "react-dom";
import { BrandSlide, BrandTeaser } from "./BrandDeck";
import type { KitView } from "./kitTypes";

// "Download PDF": her deck or teaser at full size in a hidden sheet, then the browser's print dialog
// (Save as PDF on a laptop, Share → Save to Files on a phone). Nothing leaves her browser.

export function PrintKit({ k, what, made, onDone }: { k: KitView; what: "deck" | "teaser"; made: boolean; onDone: () => void }) {
  useEffect(() => {
    const css = document.createElement("style");
    css.textContent = what === "deck" ? "@page{size:960px 540px;margin:0}" : "@page{size:A4;margin:0}";
    document.head.appendChild(css);
    const title = document.title;
    document.title = `${k.company} · ${what === "deck" ? "investor deck" : "teaser"}`;
    let done = false;
    const finish = () => { if (done) return; done = true; css.remove(); document.title = title; onDone(); };
    window.addEventListener("afterprint", finish);
    // Let the pages scale to full size and the brand font load before printing.
    const t = window.setTimeout(() => { void document.fonts.ready.then(() => { window.print(); window.setTimeout(finish, 500); }); }, 700);
    return () => { window.clearTimeout(t); window.removeEventListener("afterprint", finish); css.remove(); document.title = title; };
  }, [k.company, what, onDone]);
  const w = what === "deck" ? 960 : 794;
  return createPortal(
    <div className="kp-print" style={{ width: w }} aria-hidden="true">
      {what === "deck"
        ? k.slides.map((s, i) => <div className="kp-page" key={s.key} style={{ width: 960, height: 540 }}><BrandSlide k={k} i={i} />{made && <span className="kp-made">Made with FirstCheq</span>}</div>)
        : ([1, 2] as const).map((p) => <div className="kp-page" key={p} style={{ width: 794, height: 1123 }}><BrandTeaser k={k} page={p} />{made && <span className="kp-made">Made with FirstCheq</span>}</div>)}
    </div>,
    document.body,
  );
}
