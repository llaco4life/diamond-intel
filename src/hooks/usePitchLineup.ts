import { useCallback, useEffect, useState } from "react";

function key(gameId: string, team: string) {
  return `pitch-lineup:${gameId}:${team}`;
}

export function usePitchLineup(gameId: string | undefined, team: string | undefined) {
  const [lineup, setLineup] = useState<string[]>([]);

  useEffect(() => {
    if (!gameId || !team) return;
    try {
      const raw = localStorage.getItem(key(gameId, team));
      setLineup(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setLineup([]);
    }
  }, [gameId, team]);

  const persist = useCallback(
    (next: string[]) => {
      if (!gameId || !team) return;
      setLineup(next);
      try {
        localStorage.setItem(key(gameId, team), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [gameId, team],
  );

  const add = useCallback(
    (jersey: string) => {
      if (!jersey.trim()) return;
      if (lineup.includes(jersey.trim())) return;
      persist([...lineup, jersey.trim()]);
    },
    [lineup, persist],
  );

  const remove = useCallback(
    (jersey: string) => {
      persist(lineup.filter((j) => j !== jersey));
    },
    [lineup, persist],
  );

  return { lineup, add, remove, setLineup: persist };
}
