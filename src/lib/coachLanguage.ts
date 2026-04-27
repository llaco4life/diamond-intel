// Tag → coach-language headline + bucket + actionability + side.
// Renders sentences a head coach would actually say in the dugout.

import type { AttackBucket } from "./dashboardIntel";

export interface CoachPhrase {
  headline: string;
  bucket: AttackBucket;
  /** 1 = curiosity, 5 = changes a coaching decision. */
  actionability: 1 | 2 | 3 | 4 | 5;
  /** "scout" = applies to whichever team is being scouted.
   *  "ours"  = internal/development read about our own team. */
  side: "scout" | "ours";
}

const k = (s: string) => s.trim().toLowerCase();

const RAW: Record<string, CoachPhrase> = {
  // Pitching reads
  "strong command":     { headline: "Attack early — do not hit from behind", bucket: "Offense", actionability: 4, side: "scout" },
  "lost command":       { headline: "Make her throw strikes — take until strike one", bucket: "Offense", actionability: 5, side: "scout" },
  "wild pitch":         { headline: "Aggressive secondary — score on PB/WP", bucket: "Baserunning", actionability: 5, side: "scout" },
  "tipping pitches":    { headline: "Call pitches from the dugout — they're tipping", bucket: "Offense", actionability: 5, side: "scout" },
  "fastball heavy":     { headline: "Sit fastball first pitch", bucket: "Offense", actionability: 4, side: "scout" },
  "off-speed used":     { headline: "Stay back — hunt off-speed in fastball counts", bucket: "Offense", actionability: 3, side: "scout" },
  "works high":         { headline: "Lay off elevated pitches — hunt down in zone", bucket: "Offense", actionability: 3, side: "scout" },
  "works low":          { headline: "Look down — drive low pitches", bucket: "Offense", actionability: 3, side: "scout" },
  "slow to plate":      { headline: "Green light speed runners — pressure the running game", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak first move":    { headline: "Big primary — pressure the pickoff", bucket: "Baserunning", actionability: 4, side: "scout" },
  "same motion all pitches": { headline: "Look fastball — she can't disguise off-speed", bucket: "Offense", actionability: 3, side: "scout" },

  // Defense reads
  "weak arm in left":   { headline: "First-to-third on any ball to LF — take the extra base", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm in center": { headline: "Tag from second on flies to CF", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm in right":  { headline: "Score from second on singles to RF", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm lf":        { headline: "First-to-third on any ball to LF", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm cf":        { headline: "Tag from second on flies to CF", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm rf":        { headline: "Score from second on singles to RF", bucket: "Baserunning", actionability: 5, side: "scout" },
  "weak arm":           { headline: "Run on the catcher — weak arm", bucket: "Baserunning", actionability: 5, side: "scout" },
  "slow exchange":      { headline: "Steal on first move — slow catcher exchange", bucket: "Baserunning", actionability: 5, side: "scout" },
  "slow corners":       { headline: "Bunt pressure available — corners are slow to charge", bucket: "Offense", actionability: 4, side: "scout" },
  "smart shift":        { headline: "Beat the shift — go opposite field", bucket: "Offense", actionability: 3, side: "scout" },
  "bunt defense weak":  { headline: "Drop bunts early in counts", bucket: "Offense", actionability: 4, side: "scout" },

  // Hitting reads
  "first pitch hacker":      { headline: "Start them off-speed or off the plate", bucket: "Our Pitching Plan", actionability: 4, side: "scout" },
  "patient at-bat":          { headline: "Strike one early — don't nibble", bucket: "Our Pitching Plan", actionability: 3, side: "scout" },
  "free swinger":            { headline: "Expand late — hitters chase with two strikes", bucket: "Our Pitching Plan", actionability: 4, side: "scout" },
  "good two-strike approach":{ headline: "Bury the putaway — don't give in", bucket: "Our Pitching Plan", actionability: 3, side: "scout" },
  "k looking":               { headline: "Strike three over the plate — locked up", bucket: "Our Pitching Plan", actionability: 3, side: "scout" },
  "pulls everything":        { headline: "Shift toward pull side", bucket: "Defense", actionability: 3, side: "scout" },
  "goes oppo":               { headline: "Stay honest — straight up or oppo shade", bucket: "Defense", actionability: 2, side: "scout" },
  "bunt threat":             { headline: "Corners crash — anticipate bunt with runners on", bucket: "Defense", actionability: 4, side: "scout" },
  "slapper":                 { headline: "Pinch in — charge the ball", bucket: "Defense", actionability: 4, side: "scout" },

  // Baserunning
  "aggressive jumps":        { headline: "Control the run game — runners push first to third", bucket: "Defense", actionability: 4, side: "scout" },
  "conservative baserunner": { headline: "Play tight — they won't take extra bases", bucket: "Defense", actionability: 2, side: "scout" },
  "great reads":             { headline: "Hold them — sharp reads, don't bait", bucket: "Defense", actionability: 3, side: "scout" },
  "scores on wild pitches":  { headline: "Block every ball in the dirt with runners on third", bucket: "Defense", actionability: 4, side: "scout" },

  // Coaching tendencies
  "bunt-heavy coach": { headline: "Bunt defense ready with runner on", bucket: "Defense", actionability: 4, side: "scout" },
  "steal-happy":      { headline: "Pitchouts and slide step in counts", bucket: "Defense", actionability: 4, side: "scout" },
  "hit-and-run":      { headline: "Pitch out on hitter's count", bucket: "Defense", actionability: 4, side: "scout" },

  // Job-tab chips
  "leadoff aggressive":    { headline: "First-pitch strike to leadoff — quiet them early", bucket: "Our Pitching Plan", actionability: 4, side: "scout" },
  "auto-take first pitch": { headline: "Free strike one — fastball middle", bucket: "Our Pitching Plan", actionability: 4, side: "scout" },
  "power pocket 3-5":      { headline: "Pitch around 3-4-5 — attack 6-7-8", bucket: "Our Pitching Plan", actionability: 4, side: "scout" },
  "bottom weak":           { headline: "Attack bottom of order — get out of the inning", bucket: "Our Pitching Plan", actionability: 3, side: "scout" },
  "steal sign":            { headline: "Pitchout / slide step on next pitch", bucket: "Defense", actionability: 5, side: "scout" },
  "bunt sign":             { headline: "Corners crash — bunt coverage", bucket: "Defense", actionability: 5, side: "scout" },
  "squeeze":               { headline: "Pitch up and away — sell out for the squeeze", bucket: "Defense", actionability: 5, side: "scout" },
  "hit and run":           { headline: "Pitchout — middle infielder cover", bucket: "Defense", actionability: 5, side: "scout" },
  "delayed steal":         { headline: "Catcher fakes throw — watch the runner", bucket: "Defense", actionability: 5, side: "scout" },
  "fake bunt":             { headline: "Hold position — don't crash on first move", bucket: "Defense", actionability: 4, side: "scout" },
  "sign-stealing chatter": { headline: "Switch signs with runner on second", bucket: "Our Pitching Plan", actionability: 5, side: "scout" },

  // OUR TEAM (Upcoming Opponent mode only)
  "missed assignment":     { headline: "Cut-off coverage breakdown — drill in practice", bucket: "Defense", actionability: 4, side: "ours" },
  "cut-off perfect":       { headline: "Reinforce — clean cut-off execution", bucket: "Defense", actionability: 2, side: "ours" },
  "great communication":   { headline: "Reinforce — keep talking on every fly ball", bucket: "Defense", actionability: 2, side: "ours" },
  "covered the gap":       { headline: "Reinforce — strong gap coverage", bucket: "Defense", actionability: 2, side: "ours" },
  "diving stop":           { headline: "Reinforce — competitive defense", bucket: "Defense", actionability: 2, side: "ours" },
  "picked off":            { headline: "Tighten secondary leads — clean up baserunning", bucket: "Baserunning", actionability: 4, side: "ours" },
  "overran base":          { headline: "Slow into the bag — work bag-running drills", bucket: "Baserunning", actionability: 3, side: "ours" },
  "soft on contact reads": { headline: "Sharper reads off the bat — work jump drills", bucket: "Baserunning", actionability: 4, side: "ours" },
  "tagged up correctly":   { headline: "Reinforce — disciplined tag-ups", bucket: "Baserunning", actionability: 1, side: "ours" },
};

export function getCoachPhrase(tag: string | null | undefined): CoachPhrase | null {
  if (!tag) return null;
  return RAW[k(tag)] ?? null;
}

export const OUR_TEAM_TAG_KEYS = new Set(
  Object.entries(RAW).filter(([, v]) => v.side === "ours").map(([key]) => key),
);

export function isOurTeamTag(tag: string | null | undefined): boolean {
  if (!tag) return false;
  return OUR_TEAM_TAG_KEYS.has(k(tag));
}

export interface PitcherActionPhrase {
  phrase: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

export const PITCHER_COACH_ACTIONS: Record<string, PitcherActionPhrase> = {
  "strong command":          { phrase: "attack early — don't hit from behind", priority: 4 },
  "lost command":            { phrase: "make her throw strikes — take until strike one", priority: 5 },
  "wild pitch":              { phrase: "aggressive secondary — score on PB/WP", priority: 5 },
  "tipping pitches":         { phrase: "call pitches from the dugout", priority: 5 },
  "fastball heavy":          { phrase: "sit fastball first pitch", priority: 4 },
  "off-speed used":          { phrase: "stay back — hunt off-speed in fastball counts", priority: 3 },
  "works high":              { phrase: "lay off elevated pitches", priority: 3 },
  "works low":               { phrase: "look down — drive low pitches", priority: 3 },
  "slow to plate":           { phrase: "green light speed runners", priority: 5 },
  "weak first move":         { phrase: "big primary — pressure the pickoff", priority: 4 },
  "same motion all pitches": { phrase: "look fastball — she can't disguise it", priority: 3 },
  "free swinger":            { phrase: "expand late with two strikes", priority: 4 },
  "first pitch hacker":      { phrase: "start them off-speed or off the plate", priority: 4 },
};

export function getPitcherAction(tag: string | null | undefined): PitcherActionPhrase | null {
  if (!tag) return null;
  return PITCHER_COACH_ACTIONS[k(tag)] ?? null;
}
