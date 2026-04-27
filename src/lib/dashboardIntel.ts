// War Room intel engine for the Coach Dashboard.
// Transforms raw scout_observations + pitchers into actionable signals.

import {
  getCoachPhrase,
  getPitcherAction,
  isOurTeamTag,
  type CoachPhrase,
} from "./coachLanguage";

export interface RawObs {
  id: string;
  player_id: string;
  inning: number;
  is_team_level: boolean;
  jersey_number: string | null;
  tags: string[] | null;
  key_play: string | null;
  steal_it: string | null;
  pitcher_id: string | null;
  applies_to_team: string | null;
  created_at: string;
}

export interface PinnedItem {
  id: string;
  pin_key: string;
  label: string;
  detail: string | null;
  observation_id: string | null;
}

export type Confidence = "High" | "Medium";

export interface MustKnowItem {
  key: string;                 // stable identity used for pinning
  tag: string;
  /** Coach-language sentence; falls back to tag when no mapping exists. */
  headline: string;
  /** 1 = curiosity, 5 = changes a coaching decision. */
  actionability: number;
  /** "scout" = about the scouted team. "ours" = about our own team. */
  side: "scout" | "ours";
  appliesTo: string | null;    // team it applies to
  jersey: string | null;       // null for team-level
  count: number;
  innings: number[];
  observers: Set<string>;
  sampleNote: string | null;
  observationIds: string[];
  score: number;
  confidence: Confidence;
  pinned: boolean;
  pinId?: string;
}

export type AttackBucket =
  | "Offense"
  | "Defense"
  | "Our Pitching Plan"
  | "Baserunning";

export interface AttackAction {
  tag: string;
  action: string;
  appliesTo: string | null;
  count: number;
}

// Tags that, when seen, signal a high-leverage opportunity.
const HIGH_VALUE_TAGS = new Set<string>([
  "Tipping pitches",
  "Slow to plate",
  "Weak first move",
  "Lost command",
  "Wild pitch",
  "Fastball heavy",
  "Weak arm in left",
  "Weak arm in center",
  "Weak arm in right",
  "Slow corners",
  "Missed assignment",
  // job-tab chip equivalents
  "weak arm",
  "slow exchange",
  "weak arm LF",
  "weak arm CF",
  "weak arm RF",
  "bunt defense weak",
  "auto-take first pitch",
  "leadoff aggressive",
  "sign-stealing chatter",
]);

// Tag → concrete coaching action + which Attack Plan bucket it lives in.
export const TAG_TO_ACTION: Record<string, { bucket: AttackBucket; action: string }> = {
  // Pitching reads → things WE do at the plate / on the bases
  "Fastball heavy": { bucket: "Offense", action: "Sit fastball, hunt early count" },
  "Off-speed used": { bucket: "Offense", action: "Stay back, look off-speed in counts" },
  "Tipping pitches": { bucket: "Offense", action: "Pick the tell — call pitches from dugout" },
  "Lost command": { bucket: "Offense", action: "Take until strike — make him throw it" },
  "Strong command": { bucket: "Offense", action: "Be aggressive early, don't dig holes" },
  "Works high": { bucket: "Offense", action: "Lay off high heat, hunt down in zone" },
  "Works low": { bucket: "Offense", action: "Look down, drive low pitches" },
  "Slow to plate": { bucket: "Baserunning", action: "Green light — go on first move" },
  "Weak first move": { bucket: "Baserunning", action: "Big primary — pressure the pickoff" },
  "Wild pitch": { bucket: "Baserunning", action: "Aggressive secondary — score on PB/WP" },
  // Defense reads
  "Weak arm in left": { bucket: "Baserunning", action: "First-to-third on any ball to LF" },
  "Weak arm in center": { bucket: "Baserunning", action: "Tag from second on flies to CF" },
  "Weak arm in right": { bucket: "Baserunning", action: "Score from second on singles to RF" },
  "Slow corners": { bucket: "Offense", action: "Drop a bunt — corners can't get there" },
  "Smart shift": { bucket: "Offense", action: "Beat the shift — go opposite field" },
  "Missed assignment": { bucket: "Baserunning", action: "Push the extra base — they don't communicate" },
  // Hitting reads → defensive plan
  "Pulls everything": { bucket: "Defense", action: "Shift toward pull side" },
  "Goes oppo": { bucket: "Defense", action: "Stay honest — straight up or oppo shade" },
  "Bunt threat": { bucket: "Defense", action: "Corners crash, anticipate bunt" },
  "Slapper": { bucket: "Defense", action: "Pinch in, charge the ball" },
  "First pitch hacker": { bucket: "Our Pitching Plan", action: "Start them off-speed or off the plate" },
  "Patient at-bat": { bucket: "Our Pitching Plan", action: "Strike one early — don't nibble" },
  "Free swinger": { bucket: "Our Pitching Plan", action: "Expand the zone with two strikes" },
  "Good two-strike approach": { bucket: "Our Pitching Plan", action: "Bury the putaway — don't give in" },
  "K looking": { bucket: "Our Pitching Plan", action: "Strike three over the plate, he's locked up" },
  // Coaching tendencies
  "Bunt-heavy coach": { bucket: "Defense", action: "Bunt defense ready w/ runner on" },
  "Steal-happy": { bucket: "Defense", action: "Pitchouts + slide step in counts" },
  "Hit-and-run": { bucket: "Defense", action: "Pitch out on hitter's count" },
  // My Job chips
  "weak arm": { bucket: "Baserunning", action: "Run on the catcher" },
  "slow exchange": { bucket: "Baserunning", action: "Steal on first move" },
  "weak arm LF": { bucket: "Baserunning", action: "First-to-third on any LF ball" },
  "weak arm CF": { bucket: "Baserunning", action: "Tag from second on flies to CF" },
  "weak arm RF": { bucket: "Baserunning", action: "Score from second on singles to RF" },
  "bunt defense weak": { bucket: "Offense", action: "Drop bunts early in counts" },
  "leadoff aggressive": { bucket: "Our Pitching Plan", action: "First-pitch strike to leadoff" },
  "auto-take first pitch": { bucket: "Our Pitching Plan", action: "Free strike one — fastball middle" },
  "free swinger": { bucket: "Our Pitching Plan", action: "Expand with two strikes" },
  "power pocket 3-5": { bucket: "Our Pitching Plan", action: "Pitch around 3-4-5, attack 6-7-8" },
  "bottom weak": { bucket: "Our Pitching Plan", action: "Attack bottom of order — get out of inning" },
  "steal sign": { bucket: "Defense", action: "Pitchout / slide step on next pitch" },
  "bunt sign": { bucket: "Defense", action: "Corners crash — bunt coverage" },
  "squeeze": { bucket: "Defense", action: "Pitch up + away, sell out for the squeeze" },
  "hit and run": { bucket: "Defense", action: "Pitchout — middle infielder cover" },
  "delayed steal": { bucket: "Defense", action: "Catcher fakes throw, watch runner" },
  "sign-stealing chatter": { bucket: "Our Pitching Plan", action: "Switch signs w/ runner on second" },
};

function obsKey(o: RawObs, tag: string): string {
  // Stable identity for pinning across reloads, even if we synthesize Top 5.
  const j = o.jersey_number ?? "team";
  const team = o.applies_to_team ?? "team";
  return `${tag}::${team}::${j}`;
}

const POSITION_LABEL_SET = new Set([
  "batter", "runner", "pitcher", "catcher",
  "p", "c", "1b", "2b", "3b", "ss",
  "lf", "cf", "rf", "if", "of", "dh",
  "first base", "second base", "third base", "shortstop",
  "left field", "center field", "right field",
  "first baseman", "second baseman", "third baseman",
  "1 baseman", "2 baseman", "3 baseman",
  "1 basemen", "2 basemen", "3 basemen",
  "na", "n/a", "none", "",
]);

function isNoiseTag(tag: string | null | undefined): boolean {
  if (!tag) return true;
  const t = tag.trim().toLowerCase();
  if (t.length === 0) return true;
  return POSITION_LABEL_SET.has(t);
}

/** Resolve which "side" of the report an observation belongs to.
 *  - "upcoming_opponent" mode: { opponent, ours, unknown }
 *  - "neutral" mode:           { teamA, teamB, unknown }
 *  Job-tab observations are excluded — they have their own roll-up. */
export type ScoutKind = "upcoming_opponent" | "neutral";

export interface ScoutSidesUpcoming {
  kind: "upcoming_opponent";
  ourTeam: string;
  opponent: string;
}
export interface ScoutSidesNeutral {
  kind: "neutral";
  teamA: string;
  teamB: string;
}
export type ScoutSides = ScoutSidesUpcoming | ScoutSidesNeutral;

export interface UpcomingSplit {
  kind: "upcoming_opponent";
  opponent: RawObs[];
  ours: RawObs[];
  unknown: RawObs[];
}
export interface NeutralSplit {
  kind: "neutral";
  teamA: RawObs[];
  teamB: RawObs[];
  unknown: RawObs[];
}
export type SideSplit = UpcomingSplit | NeutralSplit;

const norm = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase();

export function resolveScoutSides(
  homeTeam: string,
  awayTeam: string,
  ourTeamName: string | null | undefined,
  override?: ScoutKind | null,
): ScoutSides {
  const our = norm(ourTeamName);
  const home = norm(homeTeam);
  const away = norm(awayTeam);
  const detected: ScoutKind =
    our && (our === home || our === away) ? "upcoming_opponent" : "neutral";
  const kind = override ?? detected;

  if (kind === "upcoming_opponent") {
    const ourMatch =
      our === home ? homeTeam : our === away ? awayTeam : (ourTeamName ?? homeTeam);
    const oppMatch = ourMatch === homeTeam ? awayTeam : homeTeam;
    return { kind: "upcoming_opponent", ourTeam: ourMatch, opponent: oppMatch };
  }
  return { kind: "neutral", teamA: homeTeam, teamB: awayTeam };
}

export function splitByTeamSide(obs: RawObs[], sides: ScoutSides): SideSplit {
  // Job-tab obs handled elsewhere.
  const teamObs = obs.filter((o) => !(o.applies_to_team ?? "").startsWith("job:"));

  if (sides.kind === "upcoming_opponent") {
    const out: UpcomingSplit = { kind: "upcoming_opponent", opponent: [], ours: [], unknown: [] };
    const ours = norm(sides.ourTeam);
    const opp = norm(sides.opponent);
    for (const o of teamObs) {
      const t = norm(o.applies_to_team);
      if (t === ours) out.ours.push(o);
      else if (t === opp) out.opponent.push(o);
      else if (!t) {
        const tags = o.tags ?? [];
        if (tags.some((tag) => isOurTeamTag(tag))) out.ours.push(o);
        else out.opponent.push(o);
      } else {
        out.unknown.push(o);
      }
    }
    return out;
  }

  const out: NeutralSplit = { kind: "neutral", teamA: [], teamB: [], unknown: [] };
  const a = norm(sides.teamA);
  const b = norm(sides.teamB);
  for (const o of teamObs) {
    const t = norm(o.applies_to_team);
    if (t === a) out.teamA.push(o);
    else if (t === b) out.teamB.push(o);
    else out.unknown.push(o);
  }
  return out;
}

export function computeMustKnow(
  obs: RawObs[],
  pinned: PinnedItem[],
  limit = 5,
): MustKnowItem[] {
  const buckets = new Map<string, MustKnowItem>();
  for (const o of obs) {
    if (!o.tags || o.tags.length === 0) continue;
    for (const tag of o.tags) {
      if (isNoiseTag(tag)) continue;
      const key = obsKey(o, tag);
      let b = buckets.get(key);
      if (!b) {
        const phrase: CoachPhrase | null = getCoachPhrase(tag);
        b = {
          key,
          tag,
          headline: phrase?.headline ?? tag,
          actionability: phrase?.actionability ?? 1,
          side: phrase?.side ?? "scout",
          appliesTo: o.applies_to_team,
          jersey: o.jersey_number,
          count: 0,
          innings: [],
          observers: new Set<string>(),
          sampleNote: null,
          observationIds: [],
          score: 0,
          confidence: "Medium",
          pinned: false,
        };
        buckets.set(key, b);
      }
      b.count += 1;
      if (!b.innings.includes(o.inning)) b.innings.push(o.inning);
      b.observers.add(o.player_id);
      b.observationIds.push(o.id);
      if (!b.sampleNote && o.key_play) b.sampleNote = o.key_play;
    }
  }

  // Score: actionability is dominant; observers add trust; HIGH_VALUE_TAGS legacy bonus retained.
  const items = Array.from(buckets.values()).map((b) => {
    const highValue = HIGH_VALUE_TAGS.has(b.tag) ? 2 : 0;
    const observerBonus = b.observers.size > 1 ? b.observers.size + 1 : 0;
    b.score = b.count + b.actionability * 3 + observerBonus + highValue;
    b.confidence = b.actionability >= 4 || b.score >= 8 ? "High" : "Medium";
    b.innings.sort((a, b2) => a - b2);
    return b;
  });
  items.sort((a, b) => {
    if (b.actionability !== a.actionability) return b.actionability - a.actionability;
    return b.score - a.score;
  });

  const pinByKey = new Map(pinned.map((p) => [p.pin_key, p]));
  const pinnedItems: MustKnowItem[] = [];
  const seen = new Set<string>();
  for (const p of pinned) {
    const found = items.find((i) => i.key === p.pin_key);
    if (found) {
      found.pinned = true;
      found.pinId = p.id;
      pinnedItems.push(found);
      seen.add(found.key);
    } else {
      const phrase = getCoachPhrase(p.label);
      pinnedItems.push({
        key: p.pin_key,
        tag: p.label,
        headline: phrase?.headline ?? p.label,
        actionability: phrase?.actionability ?? 3,
        side: phrase?.side ?? "scout",
        appliesTo: null,
        jersey: null,
        count: 0,
        innings: [],
        observers: new Set(),
        sampleNote: p.detail,
        observationIds: [],
        score: 99,
        confidence: "High",
        pinned: true,
        pinId: p.id,
      });
      seen.add(p.pin_key);
    }
  }
  const rest = items.filter((i) => !seen.has(i.key));
  for (const i of rest) {
    const p = pinByKey.get(i.key);
    if (p) {
      i.pinned = true;
      i.pinId = p.id;
    }
  }
  return [...pinnedItems, ...rest].slice(0, Math.max(limit, pinnedItems.length));
}

export function computeAttackPlan(obs: RawObs[]): Record<AttackBucket, AttackAction[]> {
  const counts = new Map<string, AttackAction & { actionability: number }>();
  for (const o of obs) {
    if (!o.tags) continue;
    for (const tag of o.tags) {
      const phrase = getCoachPhrase(tag);
      const map = TAG_TO_ACTION[tag];
      const bucket = phrase?.bucket ?? map?.bucket;
      const action = phrase?.headline ?? map?.action;
      if (!bucket || !action) continue;
      const key = `${tag}::${o.applies_to_team ?? ""}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          tag,
          action,
          appliesTo: o.applies_to_team,
          count: 1,
          actionability: phrase?.actionability ?? 2,
        });
      }
    }
  }

  const buckets: Record<AttackBucket, AttackAction[]> = {
    Offense: [],
    Defense: [],
    "Our Pitching Plan": [],
    Baserunning: [],
  };
  for (const action of counts.values()) {
    const phrase = getCoachPhrase(action.tag);
    const bucket = phrase?.bucket ?? TAG_TO_ACTION[action.tag]?.bucket;
    if (!bucket) continue;
    buckets[bucket].push(action);
  }
  for (const k of Object.keys(buckets) as AttackBucket[]) {
    buckets[k].sort((a, b) => {
      const aw = (counts.get(`${a.tag}::${a.appliesTo ?? ""}`)?.actionability ?? 2);
      const bw = (counts.get(`${b.tag}::${b.appliesTo ?? ""}`)?.actionability ?? 2);
      if (bw !== aw) return bw - aw;
      return b.count - a.count;
    });
  }
  return buckets;
}

export interface PitcherCall {
  pitcherId: string;
  call: string;
  topReads: { tag: string; count: number }[];
}

export function computePitcherCall(
  pitcherId: string,
  obs: RawObs[],
): PitcherCall {
  const tagCounts = new Map<string, number>();
  for (const o of obs) {
    if (o.pitcher_id !== pitcherId) continue;
    for (const t of o.tags ?? []) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const top = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  // Compose action phrases by priority. Never emit "watch …".
  const actions: { phrase: string; priority: number; count: number }[] = [];
  const seen = new Set<string>();
  for (const [tag, count] of tagCounts.entries()) {
    const a = getPitcherAction(tag);
    if (!a || seen.has(a.phrase)) continue;
    seen.add(a.phrase);
    actions.push({ phrase: a.phrase, priority: a.priority, count });
  }
  actions.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.count - a.count;
  });

  let call: string;
  if (actions.length === 0) {
    call = tagCounts.size === 0
      ? "No reads yet — gather more intel."
      : "Make her throw strikes — gather more intel";
  } else {
    call = actions.slice(0, 3).map((a) => a.phrase).join(" · ");
  }
  return { pitcherId, call, topReads: top };
}

export interface RoleIntelGroup {
  assignment: string;
  tagCounts: { tag: string; count: number }[];
  notes: { id: string; text: string; inning: number }[];
}

export function computeRoleIntel(obs: RawObs[]): RoleIntelGroup[] {
  const groups = new Map<string, RoleIntelGroup>();
  for (const o of obs) {
    const t = o.applies_to_team;
    if (!t || !t.startsWith("job:")) continue;
    const assignment = t.slice(4);
    let g = groups.get(assignment);
    if (!g) {
      g = { assignment, tagCounts: [], notes: [] };
      groups.set(assignment, g);
    }
    for (const tag of o.tags ?? []) {
      const existing = g.tagCounts.find((x) => x.tag === tag);
      if (existing) existing.count += 1;
      else g.tagCounts.push({ tag, count: 1 });
    }
    if (o.key_play) {
      g.notes.push({ id: o.id, text: o.key_play, inning: o.inning });
    }
  }
  for (const g of groups.values()) {
    g.tagCounts.sort((a, b) => b.count - a.count);
    g.notes.sort((a, b) => a.inning - b.inning);
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.assignment.localeCompare(b.assignment),
  );
}
