import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getAiCoachCall,
  type PitcherCoachCallInput,
  type PitcherCoachCallResult,
} from "@/server/pitcherCoachCall.functions";
import { toast } from "sonner";

interface State {
  loading: boolean;
  result: PitcherCoachCallResult | null;
}

// Module-level cache so we don't re-fetch the same pitcher snapshot during a session.
const cache = new Map<string, PitcherCoachCallResult>();
let warnedRateLimit = false;
let warnedPayment = false;

function makeKey(input: PitcherCoachCallInput, pitcherId: string): string {
  const tagsKey = input.tag_counts
    .map((t) => `${t.tag}:${t.count}`)
    .sort()
    .join("|");
  return `${pitcherId}::${input.last_inning_seen}::${input.status}::${tagsKey}`;
}

export function useAiCoachCall(
  pitcherId: string,
  input: PitcherCoachCallInput | null,
) {
  const [state, setState] = useState<State>({ loading: false, result: null });
  const callFn = useServerFn(getAiCoachCall);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!input) return;
    const key = makeKey(input, pitcherId);
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    const cached = cache.get(key);
    if (cached) {
      setState({ loading: false, result: cached });
      return;
    }

    let cancelled = false;
    setState({ loading: true, result: null });
    callFn({ data: input })
      .then((result) => {
        if (cancelled) return;
        cache.set(key, result);
        if (result.error === "rate_limited" && !warnedRateLimit) {
          warnedRateLimit = true;
          toast.error("AI rate limited — using rule-based call.");
        } else if (result.error === "payment_required" && !warnedPayment) {
          warnedPayment = true;
          toast.error("AI credits exhausted — using rule-based call.");
        }
        setState({ loading: false, result });
      })
      .catch((e) => {
        if (cancelled) return;
        console.error("[useAiCoachCall] failed", e);
        setState({
          loading: false,
          result: {
            coach_call: "",
            confidence: "low",
            source: "fallback",
            error: "exception",
          },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [pitcherId, input, callFn]);

  return state;
}
