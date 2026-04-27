import type { PitchResult } from "./types";

export interface CountState {
  balls: number;
  strikes: number;
}

export interface PitchOutcome {
  next: CountState;
  endsAtBat: boolean;
  suggestedAbResult?: "K" | "BB" | "HBP" | null;
  needsContact: boolean;
}

export function applyPitch(state: CountState, result: PitchResult): PitchOutcome {
  const { balls, strikes } = state;
  switch (result) {
    case "ball": {
      const b = balls + 1;
      if (b >= 4) {
        return { next: { balls: 4, strikes }, endsAtBat: true, suggestedAbResult: "BB", needsContact: false };
      }
      return { next: { balls: b, strikes }, endsAtBat: false, needsContact: false };
    }
    case "called_strike":
    case "swinging_strike": {
      const s = strikes + 1;
      if (s >= 3) {
        return { next: { balls, strikes: 3 }, endsAtBat: true, suggestedAbResult: "K", needsContact: false };
      }
      return { next: { balls, strikes: s }, endsAtBat: false, needsContact: false };
    }
    case "foul": {
      if (strikes < 2) {
        return { next: { balls, strikes: strikes + 1 }, endsAtBat: false, needsContact: false };
      }
      return { next: { balls, strikes }, endsAtBat: false, needsContact: false };
    }
    case "foul_tip_caught": {
      const s = strikes + 1;
      if (s >= 3) {
        return { next: { balls, strikes: 3 }, endsAtBat: true, suggestedAbResult: "K", needsContact: false };
      }
      return { next: { balls, strikes: s }, endsAtBat: false, needsContact: false };
    }
    case "caught_foul": {
      return { next: { balls, strikes }, endsAtBat: true, needsContact: false };
    }
    case "in_play": {
      return { next: { balls, strikes }, endsAtBat: true, needsContact: true };
    }
    case "hbp": {
      return { next: { balls, strikes }, endsAtBat: true, suggestedAbResult: "HBP", needsContact: false };
    }
  }
}

export const PITCH_RESULT_LABELS: Record<PitchResult, string> = {
  ball: "Ball",
  called_strike: "Called Str",
  swinging_strike: "Swing Str",
  foul: "Foul",
  foul_tip_caught: "Foul Tip K",
  in_play: "In Play",
  hbp: "HBP",
  caught_foul: "Caught Foul",
};
