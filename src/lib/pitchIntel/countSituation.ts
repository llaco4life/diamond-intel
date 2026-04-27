import type { CountSituation } from "./types";

export function classifyCount(balls: number, strikes: number): CountSituation {
  if (balls === 3 && strikes === 2) return "full";
  if (strikes === 2) return "two_strike";
  if (balls === strikes) return "even";
  if (balls > strikes) return "behind";
  return "ahead";
}

export const SITUATION_LABEL: Record<CountSituation, string> = {
  even: "Even count",
  ahead: "Ahead in count",
  behind: "Behind in count",
  full: "Full count",
  two_strike: "Two strikes",
};

export function sameSituation(a: CountSituation, b: CountSituation): boolean {
  return a === b;
}
