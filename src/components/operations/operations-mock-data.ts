import type { TranslationPath } from "@/i18n";
import type { AttendanceRecord, Employee, LeaveRequest } from "@/types";

export type TaskStatus = "todo" | "in_progress" | "completed";
export type TaskPriority = "high" | "medium" | "low";

export interface OpsTaskSubItem {
  id: string;
  labelKey: TranslationPath;
  done: boolean;
}

export interface OpsTaskUpdate {
  at: string;
  bodyKey: TranslationPath;
}

export interface OpsTask {
  id: string;
  titleKey: TranslationPath;
  descriptionKey: TranslationPath;
  status: TaskStatus;
  priority: TaskPriority;
  due: "today" | "overdue" | "upcoming";
  tagKey: TranslationPath;
  estimateMin: number;
  owner: string;
  relatedMeetingId?: string;
  subItems: OpsTaskSubItem[];
  updates: OpsTaskUpdate[];
}

export interface OpsMeeting {
  id: string;
  titleKey: TranslationPath;
  time: string;
  end: string;
  locationKey: TranslationPath;
  participants: string[];
  when: "today" | "upcoming";
  organizer: string;
  dateLabelKey: TranslationPath;
  agendaKeys: TranslationPath[];
  notesKey: TranslationPath;
  joinHintKey: TranslationPath;
}

export interface OpsNotification {
  id: string;
  category:
    | "unread"
    | "mention"
    | "approval"
    | "attendance"
    | "leave"
    | "announcement"
    | "document";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
  unread: boolean;
}

export interface OpsActivity {
  id: string;
  kind: "attendance" | "leave" | "request" | "announcement" | "document" | "training";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
  at: string;
}

export interface OpsChecklistItem {
  id: string;
  labelKey: TranslationPath;
  done: boolean;
}

export interface OpsGoal {
  id: string;
  labelKey: TranslationPath;
  progress: number;
}

export interface OpsDocument {
  id: string;
  titleKey: TranslationPath;
  at: string;
}

export interface OpsAlert {
  id: string;
  severity: "info" | "warn" | "critical";
  titleKey: TranslationPath;
  bodyKey: TranslationPath;
}

export function buildOpsTasks(): OpsTask[] {
  return [
    {
      id: "t1",
      titleKey: "ops.taskSubmitTimesheet",
      descriptionKey: "workHub.taskDescTimesheet",
      status: "todo",
      priority: "high",
      due: "today",
      tagKey: "ops.tagAdmin",
      estimateMin: 25,
      owner: "You",
      subItems: [
        { id: "t1a", labelKey: "workHub.subCollectHours", done: true },
        { id: "t1b", labelKey: "workHub.subAddNotes", done: false },
        { id: "t1c", labelKey: "workHub.subSubmitForm", done: false },
      ],
      updates: [
        { at: "08:10", bodyKey: "workHub.updTimesheetRemind" },
      ],
    },
    {
      id: "t2",
      titleKey: "ops.taskReviewPr",
      descriptionKey: "workHub.taskDescReviewPr",
      status: "in_progress",
      priority: "medium",
      due: "today",
      tagKey: "ops.tagEngineering",
      estimateMin: 45,
      owner: "You",
      relatedMeetingId: "m2",
      subItems: [
        { id: "t2a", labelKey: "workHub.subOpenFigma", done: true },
        { id: "t2b", labelKey: "workHub.subCheckSpacing", done: true },
        { id: "t2c", labelKey: "workHub.subLeaveComments", done: false },
      ],
      updates: [
        { at: "09:40", bodyKey: "workHub.updReviewStarted" },
        { at: "10:15", bodyKey: "workHub.updReviewHalf" },
      ],
    },
    {
      id: "t3",
      titleKey: "ops.task1on1Notes",
      descriptionKey: "workHub.taskDesc1on1",
      status: "todo",
      priority: "medium",
      due: "upcoming",
      tagKey: "ops.tagPeople",
      estimateMin: 20,
      owner: "You",
      relatedMeetingId: "m3",
      subItems: [
        { id: "t3a", labelKey: "workHub.subWins", done: false },
        { id: "t3b", labelKey: "workHub.subBlockers", done: false },
        { id: "t3c", labelKey: "workHub.subAskSupport", done: false },
      ],
      updates: [],
    },
    {
      id: "t4",
      titleKey: "ops.taskSecurityTraining",
      descriptionKey: "workHub.taskDescSecurity",
      status: "completed",
      priority: "low",
      due: "today",
      tagKey: "ops.tagLearning",
      estimateMin: 30,
      owner: "You",
      subItems: [
        { id: "t4a", labelKey: "workHub.subWatchModule", done: true },
        { id: "t4b", labelKey: "workHub.subQuiz", done: true },
      ],
      updates: [
        { at: "Yesterday", bodyKey: "workHub.updSecurityDone" },
      ],
    },
    {
      id: "t5",
      titleKey: "ops.taskExpenseReport",
      descriptionKey: "workHub.taskDescExpense",
      status: "todo",
      priority: "high",
      due: "overdue",
      tagKey: "ops.tagFinance",
      estimateMin: 35,
      owner: "You",
      subItems: [
        { id: "t5a", labelKey: "workHub.subAttachReceipts", done: true },
        { id: "t5b", labelKey: "workHub.subFillAmounts", done: false },
        { id: "t5c", labelKey: "workHub.subSendFinance", done: false },
      ],
      updates: [
        { at: "Fri", bodyKey: "workHub.updExpenseOverdue" },
      ],
    },
    {
      id: "t6",
      titleKey: "ops.taskUpdateProfile",
      descriptionKey: "workHub.taskDescProfile",
      status: "in_progress",
      priority: "low",
      due: "upcoming",
      tagKey: "ops.tagSelf",
      estimateMin: 10,
      owner: "You",
      subItems: [
        { id: "t6a", labelKey: "workHub.subOpenProfile", done: true },
        { id: "t6b", labelKey: "workHub.subSaveContact", done: false },
      ],
      updates: [],
    },
  ];
}

export function buildOpsMeetings(): OpsMeeting[] {
  return [
    {
      id: "m1",
      titleKey: "ops.meetStandup",
      time: "09:30",
      end: "09:45",
      locationKey: "ops.locTeams",
      participants: ["Sara", "Omar", "Nour", "You"],
      when: "today",
      organizer: "Sara",
      dateLabelKey: "workHub.dateToday",
      agendaKeys: [
        "workHub.agendaStandup1",
        "workHub.agendaStandup2",
        "workHub.agendaStandup3",
      ],
      notesKey: "workHub.notesStandup",
      joinHintKey: "workHub.joinOnline",
    },
    {
      id: "m2",
      titleKey: "ops.meetDesignReview",
      time: "11:00",
      end: "12:00",
      locationKey: "ops.locHq",
      participants: ["Nour", "Mona", "You"],
      when: "today",
      organizer: "Nour",
      dateLabelKey: "workHub.dateToday",
      agendaKeys: [
        "workHub.agendaDesign1",
        "workHub.agendaDesign2",
        "workHub.agendaDesign3",
      ],
      notesKey: "workHub.notesDesign",
      joinHintKey: "workHub.joinOnsite",
    },
    {
      id: "m3",
      titleKey: "ops.meet1on1",
      time: "15:00",
      end: "15:30",
      locationKey: "ops.locZoom",
      participants: ["Manager", "You"],
      when: "today",
      organizer: "Manager",
      dateLabelKey: "workHub.dateToday",
      agendaKeys: [
        "workHub.agenda1on11",
        "workHub.agenda1on12",
        "workHub.agenda1on13",
      ],
      notesKey: "workHub.notes1on1",
      joinHintKey: "workHub.joinOnline",
    },
    {
      id: "m4",
      titleKey: "ops.meetTownhall",
      time: "10:00",
      end: "11:00",
      locationKey: "ops.locHq",
      participants: ["All hands"],
      when: "upcoming",
      organizer: "ROOTK Leadership",
      dateLabelKey: "workHub.dateTue",
      agendaKeys: [
        "workHub.agendaTown1",
        "workHub.agendaTown2",
        "workHub.agendaTown3",
      ],
      notesKey: "workHub.notesTown",
      joinHintKey: "workHub.joinOnsite",
    },
  ];
}

export function buildOpsNotifications(): OpsNotification[] {
  return [
    {
      id: "n1",
      category: "approval",
      titleKey: "ops.nApprovalTitle",
      bodyKey: "ops.nApprovalBody",
      at: "08:42",
      unread: true,
    },
    {
      id: "n2",
      category: "mention",
      titleKey: "ops.nMentionTitle",
      bodyKey: "ops.nMentionBody",
      at: "09:05",
      unread: true,
    },
    {
      id: "n3",
      category: "attendance",
      titleKey: "ops.nAttendTitle",
      bodyKey: "ops.nAttendBody",
      at: "09:12",
      unread: true,
    },
    {
      id: "n4",
      category: "leave",
      titleKey: "ops.nLeaveTitle",
      bodyKey: "ops.nLeaveBody",
      at: "Yesterday",
      unread: false,
    },
    {
      id: "n5",
      category: "announcement",
      titleKey: "ops.nAnnounceTitle",
      bodyKey: "ops.nAnnounceBody",
      at: "Yesterday",
      unread: false,
    },
    {
      id: "n6",
      category: "document",
      titleKey: "ops.nDocTitle",
      bodyKey: "ops.nDocBody",
      at: "Mon",
      unread: false,
    },
  ];
}

export function buildOpsActivities(): OpsActivity[] {
  return [
    {
      id: "a1",
      kind: "attendance",
      titleKey: "ops.actCheckIn",
      bodyKey: "ops.actCheckInBody",
      at: "09:05",
    },
    {
      id: "a2",
      kind: "request",
      titleKey: "ops.actWfh",
      bodyKey: "ops.actWfhBody",
      at: "08:50",
    },
    {
      id: "a3",
      kind: "announcement",
      titleKey: "ops.actAnnounce",
      bodyKey: "ops.actAnnounceBody",
      at: "08:00",
    },
    {
      id: "a4",
      kind: "leave",
      titleKey: "ops.actLeave",
      bodyKey: "ops.actLeaveBody",
      at: "Yesterday",
    },
    {
      id: "a5",
      kind: "document",
      titleKey: "ops.actDoc",
      bodyKey: "ops.actDocBody",
      at: "Yesterday",
    },
    {
      id: "a6",
      kind: "training",
      titleKey: "ops.actTrain",
      bodyKey: "ops.actTrainBody",
      at: "Fri",
    },
  ];
}

export function buildOpsChecklist(): OpsChecklistItem[] {
  return [
    { id: "c1", labelKey: "ops.checkCheckIn", done: true },
    { id: "c2", labelKey: "ops.checkStandup", done: true },
    { id: "c3", labelKey: "ops.checkPriorities", done: false },
    { id: "c4", labelKey: "ops.checkInbox", done: false },
    { id: "c5", labelKey: "ops.checkCheckout", done: false },
  ];
}

export function buildOpsGoals(): OpsGoal[] {
  return [
    { id: "g1", labelKey: "ops.goalDeepWork", progress: 40 },
    { id: "g2", labelKey: "ops.goalReviews", progress: 70 },
    { id: "g3", labelKey: "ops.goalLearning", progress: 25 },
  ];
}

export function buildOpsDocuments(): OpsDocument[] {
  return [
    { id: "d1", titleKey: "ops.docHandbook", at: "Today" },
    { id: "d2", titleKey: "ops.docPayslip", at: "Jul 28" },
    { id: "d3", titleKey: "ops.docPolicy", at: "Jul 12" },
  ];
}

export function buildOpsAlerts(): OpsAlert[] {
  return [
    {
      id: "al1",
      severity: "warn",
      titleKey: "ops.alertLateTitle",
      bodyKey: "ops.alertLateBody",
    },
    {
      id: "al2",
      severity: "info",
      titleKey: "ops.alertSyncTitle",
      bodyKey: "ops.alertSyncBody",
    },
    {
      id: "al3",
      severity: "critical",
      titleKey: "ops.alertCoverageTitle",
      bodyKey: "ops.alertCoverageBody",
    },
  ];
}

export function deriveManagerOps(
  employees: Employee[],
  attendance: AttendanceRecord[],
  leaves: LeaveRequest[]
) {
  const late = attendance.filter((a) => a.isLate || a.status === "late").slice(0, 6);
  const absent = attendance.filter((a) => a.status === "absent").slice(0, 6);
  const onLeave = attendance.filter((a) => a.status === "on_leave").slice(0, 6);
  const pending = leaves.filter((l) => l.status === "pending").slice(0, 6);
  const map = new Map(employees.map((e) => [e.id, e]));
  return {
    late: late.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
      minutes: r.lateMinutes,
    })),
    absent: absent.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
    })),
    onLeave: onLeave.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
    })),
    pending: pending.map((r) => ({
      id: r.id,
      name: map.get(r.employeeId)?.name ?? r.employeeId,
      type: r.type,
      days: r.days,
    })),
  };
}

export function deriveHrOps(employees: Employee[], leaves: LeaveRequest[]) {
  const pendingLeave = leaves.filter((l) => l.status === "pending").length;
  const newHires = [...employees]
    .sort((a, b) => b.joinDate.localeCompare(a.joinDate))
    .slice(0, 4);
  return {
    pendingLeave,
    pendingCorrections: 3,
    probationReviews: 2,
    newHires,
  };
}
