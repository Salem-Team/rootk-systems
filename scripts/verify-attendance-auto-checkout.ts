import assert from "node:assert/strict";
import {
  attendanceDayMidnight,
  cairoDateKey,
  resolveAutoCheckOutAt,
} from "../backend/src/lib/attendance-auto-checkout";

function atCairo(dateKey: string, hhmmss: string): Date {
  return new Date(`${dateKey}T${hhmmss}+03:00`);
}

const day = "2026-10-07";
const midnight = attendanceDayMidnight(day);
assert.equal(midnight.getTime(), atCairo("2026-10-08", "00:00:00").getTime());

// Still open at shift end (17:00) — no forced checkout
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    now: atCairo(day, "17:01:00"),
  }),
  null,
  "after shift end stays open until midnight"
);

// Still open late evening
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    now: atCairo(day, "23:59:00"),
  }),
  null,
  "before midnight stays open"
);

// At/after midnight → checkout recorded at midnight
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    now: atCairo("2026-10-08", "00:00:00"),
  })?.getTime(),
  midnight.getTime(),
  "forgot checkout closes at midnight"
);

assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    now: atCairo("2026-10-08", "00:05:00"),
  })?.getTime(),
  midnight.getTime(),
  "after midnight still closes at midnight"
);

// Late evening check-in same day → still open until midnight
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "20:15:00"),
    now: atCairo(day, "22:00:00"),
  }),
  null,
  "same-day late check-in stays open until midnight"
);

assert.match(cairoDateKey(atCairo(day, "23:30:00")), /^\d{4}-\d{2}-\d{2}$/);

console.log("verify-attendance-auto-checkout: ok");
