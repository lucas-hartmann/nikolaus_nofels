/* Sign-up window. Vienna is UTC+1 (CET) in November/December. */
export const OPEN_AT = Date.parse("2026-11-09T00:00:00+01:00");
export const CLOSE_AT = Date.parse("2026-12-01T18:00:00+01:00");

export type Phase = "loading" | "before" | "open" | "closed";

/* Open from OPEN_AT (inclusive) up to CLOSE_AT (exclusive). */
export function getPhase(now: number): Exclude<Phase, "loading"> {
  if (now < OPEN_AT) return "before";
  if (now >= CLOSE_AT) return "closed";
  return "open";
}
