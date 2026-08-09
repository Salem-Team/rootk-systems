import type { AttendanceRecord } from "@/types";
import type { SeedOf } from "@/types/seed";

import { attendanceTodaySeed } from "./attendance/today";
import { attendanceEmp001HistorySeed } from "./attendance/emp001-history";
import { attendanceOthers0730Seed } from "./attendance/others-0730";
import { attendanceOthers0728Seed } from "./attendance/others-0728";
import { attendanceOthers0726Seed } from "./attendance/others-0726";
import { attendanceOthers0721Seed } from "./attendance/others-0721";

/** Raw seed — never mutate from UI; Storage Adapter owns persistence. */
export const attendanceRecordsSeed: SeedOf<AttendanceRecord>[] = [
  ...attendanceTodaySeed,
  ...attendanceEmp001HistorySeed,
  ...attendanceOthers0730Seed,
  ...attendanceOthers0728Seed,
  ...attendanceOthers0726Seed,
  ...attendanceOthers0721Seed,
];

export {
  attendanceTodaySeed,
  attendanceEmp001HistorySeed,
  attendanceOthers0730Seed,
  attendanceOthers0728Seed,
  attendanceOthers0726Seed,
  attendanceOthers0721Seed,
};
