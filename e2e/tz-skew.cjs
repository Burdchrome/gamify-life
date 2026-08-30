// Regression harness for issue #8 (dual-clock bug): pins the dev server's
// clock to a timezone whose CALENDAR DAY differs from this machine's, so the
// server renders "today" against a different day than the browser writes.
// Loaded only via --require in playwright.tzskew.config.ts — never by the
// normal dev server.

// No single fixed zone differs from local at every hour, but these two are
// 25h apart, so at any moment at least one of them is on a different
// calendar day than the machine running the tests.
const candidateZones = ["Pacific/Kiritimati", "Pacific/Midway"];

function calendarDayIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// next dev re-runs this require in each child worker, where the inherited TZ
// already reflects the parent's pick — re-deciding there flips the zone back
// onto the browser's day. Decide once in the first process, hand the choice
// down through TZ_SKEW_ZONE.
let skewedZone = process.env.TZ_SKEW_ZONE;

if (!skewedZone) {
  const localDay = calendarDayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);
  skewedZone = candidateZones.find((zone) => calendarDayIn(zone) !== localDay);

  if (!skewedZone) {
    // Both candidates matching the local day should be impossible; refuse to
    // start rather than run the suite as a silent false-pass.
    throw new Error("tz-skew: no candidate zone differs from the local calendar day");
  }

  process.env.TZ_SKEW_ZONE = skewedZone;
  console.log(`tz-skew: server clock pinned to ${skewedZone} (local day ${localDay}, server day ${calendarDayIn(skewedZone)})`);
}

process.env.TZ = skewedZone;
