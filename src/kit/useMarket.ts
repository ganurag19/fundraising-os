import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/** Starts her research the first time she lands here (it also runs after her first build). */
export function useMarket(token: string) {
  const m = useQuery(api.market.mine, { token });
  const run = useAction(api.kitAi.research);
  const asked = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (m?.status !== "none" || asked.current) return;
    asked.current = true;
    void run({ token }).then((r) => { if (!r.ok) setError(r.error); }).catch(() => setError("Busy right now. Try again in a few minutes."));
  }, [m?.status, run, token]);
  const retry = () => { setError(""); void run({ token }).then((r) => { if (!r.ok) setError(r.error); }).catch(() => setError("Busy right now. Try again in a few minutes.")); };
  return { m, error, retry };
}

