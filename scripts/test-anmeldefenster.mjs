/*
 * Boundary test for the sign-up window.
 * Run:  node --experimental-strip-types scripts/test-anmeldefenster.mjs
 */
import { getPhase, OPEN_AT, CLOSE_AT } from "../app/anmeldefenster.ts";

let failed = 0;
const eq = (actual, expected, msg) => {
  const pass = actual === expected;
  console.log(`${pass ? "  ok  " : " FAIL "} ${msg} -> ${actual}`);
  if (!pass) failed++;
};
const at = (iso) => getPhase(Date.parse(iso));

eq(at("2026-10-07T12:00:00+02:00"), "before", "7 Oct (today)");
eq(at("2026-11-08T23:59:59+01:00"), "before", "8 Nov 23:59:59 Vienna");
eq(at("2026-11-09T00:00:00+01:00"), "open", "9 Nov 00:00:00 Vienna (start)");
eq(at("2026-11-08T23:00:00Z"), "open", "same instant given in UTC");
eq(at("2026-11-20T12:00:00+01:00"), "open", "20 Nov");
eq(at("2026-12-01T17:59:59+01:00"), "open", "1 Dec 17:59:59 Vienna");
eq(at("2026-12-01T18:00:00+01:00"), "closed", "1 Dec 18:00:00 Vienna (cutoff)");
eq(at("2026-12-01T17:00:00Z"), "closed", "same instant given in UTC");
eq(at("2026-12-05T16:30:00+01:00"), "closed", "5 Dec (first visit day)");
eq(OPEN_AT < CLOSE_AT, true, "OPEN_AT < CLOSE_AT");
eq(new Date(CLOSE_AT).toLocaleString("de-AT", { timeZone: "Europe/Vienna", weekday: "long", hour: "2-digit", minute: "2-digit" }), "Dienstag, 18:00", "cutoff is Tuesday 18:00 in Vienna");

console.log(failed ? `\n${failed} FAILED\n` : "\nALL PASSED\n");
process.exit(failed ? 1 : 0);
