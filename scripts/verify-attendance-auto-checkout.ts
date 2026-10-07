import assert from "node:assert/strict";
import {
  cairoDateKey,
  resolveAutoCheckOutAt,
} from "../backend/src/lib/attendance-auto-checkout";

function atCairo(dateKey: string, hhmmss: string): Date {
  return new Date(`${dateKey}T${hhmmss}+03:00`);
}

const day = "2026-10-07";
const end = atCairo(day, "17:00:00");

// Before 17:00 → still open
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    toTime: "17:00",
    now: atCairo(day, "16:59:00"),
  }),
  null,
  "before shift end stays open"
);

// After 17:00 with morning check-in → checkout at 17:00
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "09:10:00"),
    toTime: "17:00",
    now: atCairo(day, "17:01:00"),
  })?.getTime(),
  end.getTime(),
  "forgot checkout closes at 17:00"
);

// Same-day late check-in after 17:00 → keep open until day rolls over
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: atCairo(day, "17:46:00"),
    toTime: "17:00",
    now: atCairo(day, "20:00:00"),
  }),
  null,
  "same-day late check-in stays open"
);

// Next Cairo day → close stale late check-in at check-in time
const lateIn = atCairo(day, "17:46:00");
assert.equal(
  resolveAutoCheckOutAt({
    dateKey: day,
    checkIn: lateIn,
    toTime: "17:00",
    now: atCairo("2026-10-08", "00:05:00"),
  })?.getTime(),
  lateIn.getTime(),
  "stale late check-in closes next day"
);

assert.match(cairoDateKey(atCairo(day, "23:30:00")), /^\d{4}-\d{2}-\d{2}$/);

console.log("verify-attendance-auto-checkout: ok");
