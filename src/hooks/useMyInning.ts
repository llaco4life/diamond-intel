import { useCallback, useEffect, useState } from "react";

export function useMyInning(gameId: string | null, userId: string | null, fallback: number) {
  const key = gameId && userId ? `inning:${gameId}:${userId}` : null;
  const [inning, setInningState] = useState<number>(fallback);

  useEffect(() => {
    if (!key) return;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (stored) {
      const n = parseInt(stored, 10);
      if (!isNaN(n) && n > 0) setInningState(n);
      else setInningState(fallback);
    } else {
      setInningState(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setInning = useCallback(
    (n: number) => {
      const safe = Math.max(1, n);
      setInningState(safe);
      if (key && typeof window !== "undefined") {
        window.localStorage.setItem(key, String(safe));
      }
    },
    [key],
  );

  return [inning, setInning] as const;
}
