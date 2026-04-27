import { useCallback, useEffect, useState } from "react";

function key(gameId: string, team: string) {
  return `pitch-current-batter:${gameId}:${team}`;
}

export function useCurrentBatter(
  gameId: string | undefined,
  team: string | undefined,
  lineupLength: number,
) {
  const [index, setIndexState] = useState(0);

  useEffect(() => {
    if (!gameId || !team) return;
    const raw = localStorage.getItem(key(gameId, team));
    const n = raw ? Number(raw) : 0;
    setIndexState(Number.isFinite(n) ? n : 0);
  }, [gameId, team]);

  const setIndex = useCallback(
    (i: number) => {
      if (!gameId || !team) return;
      const safe = lineupLength > 0 ? ((i % lineupLength) + lineupLength) % lineupLength : 0;
      setIndexState(safe);
      try {
        localStorage.setItem(key(gameId, team), String(safe));
      } catch {
        // ignore
      }
    },
    [gameId, team, lineupLength],
  );

  const advance = useCallback(() => {
    setIndex(index + 1);
  }, [index, setIndex]);

  return { index, setIndex, advance };
}
