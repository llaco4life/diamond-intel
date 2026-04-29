import type { PitchEntryRow, PitchTypeRow, CountSituation } from "./types";
import { classifyCount, SITUATION_LABEL } from "./countSituation";

export interface PitchRec {
  pitchTypeId: string;
  label: string;
  score: number;
  samples: number;
}

export interface RecommendationSources {
  todayCount: number;
  historyCount: number;
  gameCount: number;
  oldestDays: number | null;
}

export interface RecommendationOutput {
  situation: CountSituation;
  situationLabel: string;
  recommended: PitchRec[];
  bestChase: PitchRec | null;
  avoid: PitchRec[];
  confidence: "low" | "medium" | "high";
  emptyMessage?: string;
  sources?: RecommendationSources;
  historyOnly?: boolean;
}

interface ScoredSample {
  weight: number;
  entry: PitchEntryRow;
}

function scoreEntry(e: PitchEntryRow): number {
  let s = 0;
  switch (e.result) {
    case "swinging_strike": s += 3; break;
    case "called_strike": s += 2; break;
    case "foul_tip_caught": s += 3; break;
    case "foul": s += 1; break;
    case "ball": s -= 1; break;
    case "hbp": s -= 2; break;
    default: break;
  }
  if (e.ab_result === "K") s += 2;
  if (e.ab_result === "BB") s -= 3;
  if (e.contact_quality === "weak") s += 2;
  if (e.contact_quality === "hard") s -= 3;
  if (e.contact_quality === "barrel") s -= 4;
  if (e.ab_result === "2B" || e.ab_result === "3B" || e.ab_result === "HR") s -= 5;
  return s;
}

function applyCountAdjustment(score: number, sit: CountSituation): number {
  if (sit === "full") return score * 1.0;
  if (sit === "two_strike") return score >= 0 ? score * 1.2 : score;
  if (sit === "behind") return score * 1.0;
  return score;
}

function recencyMultiplier(ageDays: number): number {
  if (ageDays <= 0) return 1.0;
  if (ageDays <= 14) return 0.7;
  if (ageDays <= 45) return 0.45;
  if (ageDays <= 120) return 0.25;
  return 0;
}

interface RecommendCtx {
  batterKey: string;
  batterTeam: string;
  pitcherId: string;
  balls: number;
  strikes: number;
  historicalEntries?: PitchEntryRow[];
  gameDateById?: Map<string, string>;
  historicalGameCount?: number;
}

export function recommend(
  pitchTypes: PitchTypeRow[],
  entries: PitchEntryRow[],
  ctx: RecommendCtx,
): RecommendationOutput {
  const situation = classifyCount(ctx.balls, ctx.strikes);
  const samples: ScoredSample[] = [];

  // Today's entries — full weight, base situational weighting.
  const collect = (e: PitchEntryRow, recency: number) => {
    if (!e.pitch_type_id) return;
    const sameBatter = e.batter_key === ctx.batterKey;
    const samePitcher = e.pitcher_id === ctx.pitcherId;
    const sameTeam = e.batter_team.toLowerCase() === ctx.batterTeam.toLowerCase();
    const sit = classifyCount(e.balls_before, e.strikes_before);
    const sameSit = sit === situation;

    let weight = 0;
    if (sameBatter && samePitcher && sameSit) weight = 4;
    else if (sameBatter && samePitcher) weight = 2;
    else if (sameBatter && sameSit) weight = 2;
    else if (sameTeam && sameSit) weight = 1;
    else if (sameBatter) weight = 1; // history: same batter even without sit match
    if (weight > 0) samples.push({ weight: weight * recency, entry: e });
  };

  for (const e of entries) collect(e, 1.0);

  const today = new Date();
  let oldestDays: number | null = null;
  const history = ctx.historicalEntries ?? [];
  const dateMap = ctx.gameDateById ?? new Map<string, string>();
  for (const e of history) {
    const dateStr = dateMap.get(e.game_id);
    if (!dateStr) continue;
    const ageDays = Math.max(
      0,
      Math.floor((today.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)),
    );
    const r = recencyMultiplier(ageDays);
    if (r === 0) continue;
    if (oldestDays === null || ageDays > oldestDays) oldestDays = ageDays;
    collect(e, r);
  }

  const todayCount = entries.length;
  const historyCount = history.length;
  const sources: RecommendationSources = {
    todayCount,
    historyCount,
    gameCount: ctx.historicalGameCount ?? 0,
    oldestDays,
  };

  const totalSamples = samples.length;

  if (totalSamples < 3) {
    return {
      situation,
      situationLabel: SITUATION_LABEL[situation],
      recommended: [],
      bestChase: null,
      avoid: [],
      confidence: "low",
      emptyMessage:
        "Not enough history yet — start with fastball away, see how she reacts.",
      sources,
    };
  }

  const agg = new Map<string, { score: number; samples: number }>();
  for (const { weight, entry } of samples) {
    const key = entry.pitch_type_id!;
    const cur = agg.get(key) ?? { score: 0, samples: 0 };
    const adj = applyCountAdjustment(scoreEntry(entry), situation);
    cur.score += adj * weight;
    cur.samples += 1;
    agg.set(key, cur);
  }

  const labelMap = new Map(pitchTypes.map((p) => [p.id, p.label]));
  const ranked: PitchRec[] = Array.from(agg.entries())
    .map(([pitchTypeId, v]) => ({
      pitchTypeId,
      label: labelMap.get(pitchTypeId) ?? "Unknown",
      score: Math.round(v.score * 10) / 10,
      samples: v.samples,
    }))
    .sort((a, b) => b.score - a.score);

  const recommended = ranked.filter((r) => r.score > 0).slice(0, 2);
  const avoid = ranked.filter((r) => r.score < 0).slice(-2).reverse();

  let bestChase: PitchRec | null = null;
  if (situation === "two_strike" || situation === "ahead") {
    const chaseAgg = new Map<string, { sw: number; total: number }>();
    for (const { entry } of samples) {
      if (!entry.pitch_type_id) continue;
      const c = chaseAgg.get(entry.pitch_type_id) ?? { sw: 0, total: 0 };
      c.total += 1;
      if (entry.result === "swinging_strike" || entry.result === "foul_tip_caught") c.sw += 1;
      chaseAgg.set(entry.pitch_type_id, c);
    }
    const chaseRanked = Array.from(chaseAgg.entries())
      .filter(([, v]) => v.total >= 2)
      .map(([id, v]) => ({
        pitchTypeId: id,
        label: labelMap.get(id) ?? "Unknown",
        score: Math.round((v.sw / v.total) * 100),
        samples: v.total,
      }))
      .sort((a, b) => b.score - a.score);
    bestChase = chaseRanked[0] ?? null;
  }

  const confidence: RecommendationOutput["confidence"] =
    totalSamples >= 12 ? "high" : totalSamples >= 6 ? "medium" : "low";

  return {
    situation,
    situationLabel: SITUATION_LABEL[situation],
    recommended,
    bestChase,
    avoid,
    confidence,
    sources,
    historyOnly: todayCount === 0 && historyCount > 0,
  };
}
