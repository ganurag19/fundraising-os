import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { visitorToken } from "../lib/token";

// "What's hardest about raising your first round?" Up to 2 picks, each recorded once per visitor (wants table, pain_* keys).
const OPTIONS: [string, string][] = [
  ["pain_deck", "Getting my deck and documents ready"],
  ["pain_find", "Knowing which investors fit"],
  ["pain_write", "Writing emails that get replies"],
  ["pain_follow", "Following up without dropping the ball"],
  ["pain_intros", "Getting warm intros"],
  ["pain_qa", "Answering investor questions and due diligence"],
];

export default function PainPoll() {
  const want = useMutation(api.track.want);
  const [picked, setPicked] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : p.length < 2 ? [...p, k] : p));
  const submit = () => {
    const token = visitorToken();
    for (const k of picked) want({ token, key: k }).catch(() => {});
    setSent(true);
  };
  return (
    <section className="pain-poll" aria-label="What's hardest about raising your first round?">
      <h2 className="lp2-h2">What's hardest about raising your first round?</h2>
      <p className="lp2-sub">Pick up to two. It tells us what to build next.</p>
      {sent ? <p className="want-done" style={{ fontSize: 15 }}>✓ Thank you. That helps us decide what to build first.</p> : <>
        <div className="pain-opts" role="group">
          {OPTIONS.map(([k, label]) => <button key={k} type="button" aria-pressed={picked.includes(k)} className={picked.includes(k) ? "on" : ""} onClick={() => toggle(k)}>{label}</button>)}
        </div>
        <button className="btn primary sm" disabled={!picked.length} onClick={submit} style={{ marginTop: 12 }}>Send</button>
      </>}
    </section>
  );
}
