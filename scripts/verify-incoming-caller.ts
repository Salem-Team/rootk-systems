/**
 * Incoming caller match: name + budget for 010 / +20 / 0020 / extra contacts.
 * Run: npx tsx scripts/verify-incoming-caller.ts
 */
import {
  buildIncomingCallerIndex,
  incomingPhoneKeys,
  matchIncomingCaller,
  type IncomingCallerLabels,
} from "../src/lib/crm/incoming-caller";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
  } else {
    console.log(`✓ ${msg}`);
  }
}

const labels: IncomingCallerLabels = {
  rtl: true,
  title: "مكالمة واردة",
  request: "محتاج إيه",
  budget: "البادجت",
  empty: "مش متسجل",
  open: "فتح العميل",
  hide: "إخفاء",
};

function show(phone: string) {
  return phone;
}

assert(incomingPhoneKeys("123").length === 0, "short numbers are ignored");
assert(
  incomingPhoneKeys("01012345678").includes("012345678"),
  "local Egyptian mobile keeps last 9"
);
assert(
  incomingPhoneKeys("+20 101 234 5678").includes("012345678"),
  "+20 shares the local last 9"
);
assert(
  incomingPhoneKeys("00201012345678").includes("012345678"),
  "0020 shares the local last 9"
);

const index = buildIncomingCallerIndex(
  [
    {
      id: "lead-1",
      name: "أحمد علي",
      phone: "01012345678",
      phoneNormalized: "+201012345678",
      companyName: "روت تك",
      request: "موقع تعريفي",
      budget: "50 ألف",
      contacts: [{ phone: "01155556666", phoneNormalized: null }],
    },
    {
      id: "lead-2",
      name: "منى",
      phone: "01200000000",
      phoneNormalized: null,
      companyName: "",
      request: "",
      budget: "",
    },
  ],
  labels,
  show
);

const fromIntl = matchIncomingCaller(index, "00201012345678");
assert(fromIntl?.id === "lead-1", "international dial matches the saved client");
assert(fromIntl?.name === "أحمد علي", "card carries the client name");
assert(fromIntl?.budget === "50 ألف", "card carries the budget");
assert(fromIntl?.request === "موقع تعريفي", "card carries the request");
assert(fromIntl?.company === "روت تك", "card carries the company");

const fromExtra = matchIncomingCaller(index, "+20 115 555 6666");
assert(fromExtra?.id === "lead-1", "extra contact number matches the same client");

const emptyBudget = matchIncomingCaller(index, "01200000000");
assert(emptyBudget?.name === "منى", "client without a budget still matches");
assert(emptyBudget?.budget === "مش متسجل", "missing budget uses the empty label");
assert(emptyBudget?.request === "مش متسجل", "missing request uses the empty label");

assert(matchIncomingCaller(index, "01099999999") === null, "unknown numbers do not match");
assert(matchIncomingCaller(index, "12345") === null, "too-short ringing numbers do not match");

const firstWins = buildIncomingCallerIndex(
  [
    { id: "a", name: "أول", phone: "01012345678", budget: "10" },
    { id: "b", name: "تاني", phone: "01012345678", budget: "20" },
  ],
  labels,
  show
);
assert(
  matchIncomingCaller(firstWins, "+201012345678")?.id === "a",
  "the first saved client keeps a shared number"
);

if (failed > 0) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nincoming caller checks passed");
