// Build searchable indexes of teams and games for the Coach Dashboard.
// Both Home and Away teams are surfaced — Lady Rebels appears even when
// she was the away team and never linked as an opponent_id.

export interface ScoutGameRow {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  opponent_id: string | null;
}

export interface TeamEntry {
  /** Lowercased trimmed dedupe key. */
  key: string;
  /** Display name (most recent occurrence's casing). */
  name: string;
  sessionCount: number;
  lastDate: string | null;
  lastTournament: string | null;
  /** Every scout game this team appeared in (home OR away). */
  gameIds: string[];
  /** Linked opponent_id, if any game tied this team to an opponent record. */
  opponentId: string | null;
}

export interface GameEntry {
  id: string;
  game_date: string;
  tournament_name: string | null;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  matchup: string; // "Home vs Away"
}

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase();

export function buildTeamIndex(
  games: ScoutGameRow[],
  opponents: Array<{ id: string; team_name: string }> = [],
): TeamEntry[] {
  const oppById = new Map(opponents.map((o) => [o.id, o.team_name]));
  const map = new Map<string, TeamEntry>();

  // Sort newest first so the first occurrence sets "lastDate" naturally.
  const sorted = [...games].sort((a, b) =>
    (b.game_date ?? "").localeCompare(a.game_date ?? ""),
  );

  const touch = (rawName: string, g: ScoutGameRow) => {
    const key = norm(rawName);
    if (!key) return;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        key,
        name: rawName.trim(),
        sessionCount: 0,
        lastDate: null,
        lastTournament: null,
        gameIds: [],
        opponentId: null,
      };
      map.set(key, entry);
    }
    if (!entry.gameIds.includes(g.id)) {
      entry.gameIds.push(g.id);
      entry.sessionCount += 1;
    }
    if (!entry.lastDate || (g.game_date && g.game_date > entry.lastDate)) {
      entry.lastDate = g.game_date;
      entry.lastTournament = g.tournament_name;
    }
    // Try to attach opponent_id when the linked opponent's name normalizes
    // to this team. Keeps back-compat with the legacy opponent grouping.
    if (!entry.opponentId && g.opponent_id) {
      const oppName = oppById.get(g.opponent_id);
      if (oppName && norm(oppName) === key) entry.opponentId = g.opponent_id;
    }
  };

  for (const g of sorted) {
    touch(g.home_team, g);
    touch(g.away_team, g);
  }

  return Array.from(map.values()).sort((a, b) => {
    const d = (b.lastDate ?? "").localeCompare(a.lastDate ?? "");
    if (d !== 0) return d;
    return a.name.localeCompare(b.name);
  });
}

export function buildGameIndex(games: ScoutGameRow[]): GameEntry[] {
  return [...games]
    .sort((a, b) => (b.game_date ?? "").localeCompare(a.game_date ?? ""))
    .map((g) => ({
      id: g.id,
      game_date: g.game_date,
      tournament_name: g.tournament_name,
      home_team: g.home_team,
      away_team: g.away_team,
      home_score: g.home_score,
      away_score: g.away_score,
      matchup: `${g.home_team} vs ${g.away_team}`,
    }));
}

export function filterTeams(teams: TeamEntry[], q: string): TeamEntry[] {
  const needle = norm(q);
  if (!needle) return teams;
  return teams.filter((t) => t.key.includes(needle));
}

export function filterGames(games: GameEntry[], q: string): GameEntry[] {
  const needle = norm(q);
  if (!needle) return games;
  return games.filter(
    (g) =>
      g.matchup.toLowerCase().includes(needle) ||
      (g.tournament_name ?? "").toLowerCase().includes(needle),
  );
}
