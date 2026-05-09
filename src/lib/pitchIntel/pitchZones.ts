// 3x3 pitch location grid, numbered top-left → bottom-right.
//
//   1 | 2 | 3      (high)
//   4 | 5 | 6      (middle)
//   7 | 8 | 9      (low)
//
// From the catcher's view: column 1 (zones 1,4,7) is on the batter's side that
// depends on handedness — for a RHH it's "inside", for a LHH it's "outside".

export type BatterHand = "R" | "L" | "S";

const HEIGHT: Record<number, "high" | "middle" | "low"> = {
  1: "high", 2: "high", 3: "high",
  4: "middle", 5: "middle", 6: "middle",
  7: "low", 8: "low", 9: "low",
};

const COLUMN: Record<number, "left" | "center" | "right"> = {
  1: "left", 4: "left", 7: "left",
  2: "center", 5: "center", 8: "center",
  3: "right", 6: "right", 9: "right",
};

/**
 * Returns a human-readable label for a 1–9 zone, mirrored by batter handedness.
 * Examples (RHH): 1 = "high inside", 3 = "high away", 5 = "middle middle".
 * Examples (LHH): 1 = "high away",   3 = "high inside".
 * Switch hitters use neutral wording (left / right of plate).
 */
export function zoneLabel(zone: number, hand: BatterHand): string {
  const h = HEIGHT[zone];
  const c = COLUMN[zone];
  if (!h || !c) return "";
  let side: string;
  if (c === "center") {
    side = "middle";
  } else if (hand === "S") {
    side = c === "left" ? "left" : "right";
  } else {
    // RHH stands on the catcher's right → catcher's left column = inside to RHH.
    const insideOnLeft = hand === "R";
    const isInside = (insideOnLeft && c === "left") || (!insideOnLeft && c === "right");
    side = isInside ? "inside" : "away";
  }
  return `${h} ${side}`;
}

export const ZONE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
