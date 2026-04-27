// Shared types for the Pitch Intel module.

export type PitchResult =
  | "ball"
  | "called_strike"
  | "swinging_strike"
  | "foul"
  | "foul_tip_caught"
  | "in_play"
  | "hbp"
  | "caught_foul";

export type ContactQuality = "weak" | "hard" | "barrel";

export type SprayZone =
  | "LF"
  | "CF"
  | "RF"
  | "SS"
  | "3B"
  | "2B"
  | "1B"
  | "P"
  | "C";

export type AbResult =
  | "K"
  | "BB"
  | "HBP"
  | "1B"
  | "2B"
  | "3B"
  | "HR"
  | "GO"
  | "FO"
  | "LO"
  | "PO"
  | "SF"
  | "E";

export type CountSituation = "even" | "ahead" | "behind" | "full" | "two_strike";

export interface PitchTypeRow {
  id: string;
  org_id: string;
  code: string;
  label: string;
  sort_order: number;
}

export interface PitchCodeMapRow {
  id: string;
  org_id: string;
  pitcher_id: string;
  numeric_code: string;
  pitch_type_id: string;
}

export interface PitchEntryRow {
  id: string;
  game_id: string;
  inning: number;
  pitcher_id: string;
  batter_key: string;
  batter_team: string;
  batter_number: string;
  at_bat_seq: number;
  pitch_seq: number;
  numeric_code: string | null;
  pitch_type_id: string | null;
  result: PitchResult;
  balls_before: number;
  strikes_before: number;
  balls_after: number;
  strikes_after: number;
  spray_zone: SprayZone | null;
  contact_quality: ContactQuality | null;
  ab_result: AbResult | null;
  logged_by: string;
  created_at: string;
}

export const DEFAULT_PITCH_TYPES: { code: string; label: string; sort_order: number }[] = [
  { code: "FBAWY", label: "Fastball Away", sort_order: 10 },
  { code: "FBINS", label: "Fastball Inside", sort_order: 20 },
  { code: "FBAUP", label: "Fastball Up", sort_order: 30 },
  { code: "CHUPA", label: "Change Up Away", sort_order: 40 },
  { code: "CURVE", label: "Curveball Away", sort_order: 50 },
  { code: "DROPC", label: "Drop Curve Away", sort_order: 60 },
  { code: "SCREW", label: "Screwball Away", sort_order: 70 },
  { code: "RISEB", label: "Riseball Away", sort_order: 80 },
  { code: "DRPAW", label: "Dropball Away", sort_order: 90 },
  { code: "KNUCK", label: "Knuckle Ball", sort_order: 100 },
];

export function makeBatterKey(team: string, jersey: string): string {
  return `${team.trim().toLowerCase()}:${jersey.trim()}`;
}
