import type { Holiday, WorkSchedule } from "@/types";
import type { SeedOf } from "@/types/seed";

type HolidaySeed = SeedOf<Holiday>;
type WorkScheduleSeed = Omit<SeedOf<WorkSchedule>, "holidays"> & {
  holidays: HolidaySeed[];
};

/**
 * Egypt-oriented schedule:
 * Sun–Thu working week (common in Egyptian tech / private sector),
 * Fri–Sat weekend, WFH mid-week.
 */
export const workScheduleSeed: WorkScheduleSeed = {
  id: "schedule_rootk_001",
  workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
  weekendDays: ["friday", "saturday"],
  wfhDays: ["sunday", "wednesday"],
  fromTime: "09:00",
  toTime: "18:00",
  gracePeriodMinutes: 15,
  breakMinutes: 60,
  holidays: [
    {
      id: "hol-001",
      name: "New Year's Day",
      date: "2026-01-01",
      type: "holiday",
      description: "رأس السنة الميلادية — إجازة رسمية",
    },
    {
      id: "hol-002",
      name: "Coptic Christmas",
      date: "2026-01-07",
      type: "holiday",
      description: "عيد الميلاد المجيد (الأقباط) — إجازة رسمية",
    },
    {
      id: "hol-003",
      name: "Revolution Day 25 January",
      date: "2026-01-25",
      type: "holiday",
      description: "عيد ثورة 25 يناير — إجازة رسمية",
    },
    {
      id: "hol-004",
      name: "Eid al-Fitr",
      date: "2026-03-20",
      type: "holiday",
      description: "عيد الفطر المبارك (تقريبي — حسب الرؤية الشرعية)",
    },
    {
      id: "hol-005",
      name: "Eid al-Fitr Holiday",
      date: "2026-03-21",
      type: "holiday",
      description: "إجازة عيد الفطر الممتدة",
    },
    {
      id: "hol-006",
      name: "Eid al-Fitr Holiday",
      date: "2026-03-22",
      type: "holiday",
      description: "إجازة عيد الفطر الممتدة",
    },
    {
      id: "hol-007",
      name: "Sinai Liberation Day",
      date: "2026-04-25",
      type: "holiday",
      description: "عيد تحرير سيناء — إجازة رسمية",
    },
    {
      id: "hol-008",
      name: "Labour Day",
      date: "2026-05-01",
      type: "holiday",
      description: "عيد العمال — إجازة رسمية",
    },
    {
      id: "hol-009",
      name: "Eid al-Adha",
      date: "2026-05-27",
      type: "holiday",
      description: "عيد الأضحى المبارك (تقريبي — حسب الرؤية الشرعية)",
    },
    {
      id: "hol-010",
      name: "Eid al-Adha Holiday",
      date: "2026-05-28",
      type: "holiday",
      description: "إجازة عيد الأضحى الممتدة",
    },
    {
      id: "hol-011",
      name: "Eid al-Adha Holiday",
      date: "2026-05-29",
      type: "holiday",
      description: "إجازة عيد الأضحى الممتدة",
    },
    {
      id: "hol-012",
      name: "June 30 Revolution",
      date: "2026-06-30",
      type: "holiday",
      description: "عيد ثورة 30 يونيو — إجازة رسمية",
    },
    {
      id: "hol-013",
      name: "Revolution Day 23 July",
      date: "2026-07-23",
      type: "holiday",
      description: "عيد ثورة 23 يوليو — إجازة رسمية",
    },
    {
      id: "hol-014",
      name: "Armed Forces Day",
      date: "2026-10-06",
      type: "holiday",
      description: "عيد القوات المسلحة — إجازة رسمية",
    },
    {
      id: "evt-001",
      name: "ROOTK Town Hall Q1",
      date: "2026-01-15",
      type: "event",
      description: "لقاء ربع سنوي — مقر القاهرة الجديدة + بث مباشر",
    },
    {
      id: "evt-002",
      name: "Ramadan Working Hours Start",
      date: "2026-02-18",
      type: "event",
      description: "ساعات عمل رمضان: 10:00–15:00",
    },
    {
      id: "evt-003",
      name: "ROOTK Hackathon 2026",
      date: "2026-04-12",
      type: "event",
      description: "هاكاثون داخلي للهندسة والتصميم — 48 ساعة",
    },
    {
      id: "evt-004",
      name: "Team Offsite — North Coast",
      date: "2026-06-18",
      type: "event",
      description: "أوفسايت الشركة — الساحل الشمالي",
    },
    {
      id: "evt-005",
      name: "ROOTK Town Hall Q3",
      date: "2026-07-16",
      type: "event",
      description: "لقاء منتصف العام ومراجعة خارطة المنتجات",
    },
    {
      id: "evt-006",
      name: "Onboarding Bootcamp",
      date: "2026-08-10",
      type: "event",
      description: "معسكر تهيئة الموظفين الجدد — مقر التجمع الخامس",
    },
    {
      id: "evt-007",
      name: "ROOTK Annual Day",
      date: "2026-10-08",
      type: "event",
      description: "يوم الشركة السنوي وحفل التكريم",
    },
    {
      id: "evt-008",
      name: "Year-End Retrospective",
      date: "2026-12-17",
      type: "event",
      description: "مراجعة سنوية والتخطيط لعام 2027",
    },
  ],
};
