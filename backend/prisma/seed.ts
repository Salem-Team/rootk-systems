import { PrismaClient, UserRole, EmployeeStatus } from "@prisma/client";
import { hashDemoPassword } from "../src/auth/password.util";
import { DEFAULT_COMPANY_NOTIFICATIONS } from "../src/lib/notification-policy";
import {
  DEFAULT_PAYROLL_RULES,
  policyJson,
} from "../src/lib/payroll-defaults";

const prisma = new PrismaClient();

const COMPANY_ID = process.env.DEFAULT_COMPANY_ID ?? "cmp_rootk_001";

async function main() {
  console.log(`Seeding company ${COMPANY_ID}…`);

  await prisma.company.upsert({
    where: { id: COMPANY_ID },
    create: { id: COMPANY_ID, name: "ROOTK Systems" },
    update: { name: "ROOTK Systems" },
  });

  await prisma.companySettings.upsert({
    where: { companyId: COMPANY_ID },
    create: {
      companyId: COMPANY_ID,
      companyName: "ROOTK Systems",
      legalName: "ROOTK Systems LLC",
      email: "hr@rootk.systems",
      phone: "+20 2 0000 0000",
      address: "New Cairo, Egypt",
      website: "https://rootk.systems",
      timezone: "Africa/Cairo",
      currency: "EGP",
      language: "ar",
      appearance: "system",
      notifications: DEFAULT_COMPANY_NOTIFICATIONS,
      createdBy: "system",
      updatedBy: "system",
    },
    update: {
      companyName: "ROOTK Systems",
      legalName: "ROOTK Systems LLC",
      email: "hr@rootk.systems",
      notifications: DEFAULT_COMPANY_NOTIFICATIONS,
      updatedBy: "system",
    },
  });

  await prisma.workSchedule.upsert({
    where: { companyId: COMPANY_ID },
    create: {
      companyId: COMPANY_ID,
      config: {
        workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
        weekendDays: ["friday", "saturday"],
        wfhDays: ["sunday", "wednesday"],
        fromTime: "09:00",
        toTime: "18:00",
        gracePeriodMinutes: 15,
        breakMinutes: 60,
      },
      metadata: {
        wfhPolicy: {
          enabled: true,
          allowedDepartments: [
            "Engineering",
            "Design",
            "Product",
            "Operations",
          ],
          requiresApproval: false,
          monthlyQuota: 8,
          hybridOfficeDays: 3,
        },
        attendancePolicy: { halfDayHours: 4 },
      },
      createdBy: "system",
      updatedBy: "system",
    },
    update: {
      config: {
        workingDays: ["sunday", "monday", "tuesday", "wednesday", "thursday"],
        weekendDays: ["friday", "saturday"],
        wfhDays: ["sunday", "wednesday"],
        fromTime: "09:00",
        toTime: "18:00",
        gracePeriodMinutes: 15,
        breakMinutes: 60,
      },
      metadata: {
        wfhPolicy: {
          enabled: true,
          allowedDepartments: [
            "Engineering",
            "Design",
            "Product",
            "Operations",
          ],
          requiresApproval: false,
          monthlyQuota: 8,
          hybridOfficeDays: 3,
        },
        attendancePolicy: { halfDayHours: 4 },
      },
      updatedBy: "system",
    },
  });

  const employees = [
    {
      id: "emp_admin_001",
      employeeCode: "RK-000",
      name: "Nour Al-Admin",
      email: "admin@rootk.systems",
      department: "Operations",
      position: "HR Director",
      location: "Cairo",
      phone: "+20 100 000 0000",
      managerName: null as string | null,
      status: EmployeeStatus.active,
      salary: 28000,
    },
    {
      id: "emp_001",
      employeeCode: "RK-001",
      name: "Salem Employee",
      email: "employee@rootk.systems",
      department: "Engineering",
      position: "Software Engineer",
      location: "Cairo",
      phone: "+20 100 000 0001",
      managerName: "Nour Al-Admin",
      status: EmployeeStatus.active,
      salary: 22000,
    },
    {
      id: "emp_002",
      employeeCode: "RK-002",
      name: "Amira Hassan",
      email: "amira@rootk.systems",
      department: "Design",
      position: "Product Designer",
      location: "Cairo",
      phone: "+20 100 000 0002",
      managerName: "Nour Al-Admin",
      status: EmployeeStatus.active,
      salary: 18000,
    },
    {
      id: "emp_003",
      employeeCode: "RK-003",
      name: "Karim Farouk",
      email: "karim@rootk.systems",
      department: "Product",
      position: "Product Manager",
      location: "Remote",
      phone: "+20 100 000 0003",
      managerName: "Nour Al-Admin",
      status: EmployeeStatus.active,
      salary: 20000,
    },
  ];

  for (const e of employees) {
    await prisma.employee.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        companyId: COMPANY_ID,
        employeeCode: e.employeeCode,
        name: e.name,
        email: e.email,
        department: e.department,
        position: e.position,
        location: e.location,
        phone: e.phone,
        managerName: e.managerName,
        joinDate: new Date("2024-01-15"),
        status: e.status,
        createdBy: "system",
        updatedBy: "system",
      },
      update: {
        name: e.name,
        department: e.department,
        position: e.position,
        location: e.location,
        phone: e.phone,
        managerName: e.managerName,
        status: e.status,
        updatedBy: "system",
      },
    });

    // Salary profiles are created by admins via Payroll — do not seed mock pay.
  }

  const passwordHash = hashDemoPassword();

  const users = [
    {
      id: "usr_admin_001",
      employeeId: "emp_admin_001",
      email: "admin@rootk.systems",
      role: UserRole.admin,
      initials: "NA",
      displayName: "Nour Al-Admin",
      firstName: "Nour",
      lastName: "Al-Admin",
      passwordHash,
      metadata: {
        nameKey: "user.adminFullName",
        firstNameKey: "user.adminFirstName",
        protected: true,
      },
    },
    {
      id: "usr_employee_001",
      employeeId: "emp_001",
      email: "employee@rootk.systems",
      role: UserRole.employee,
      initials: "SE",
      displayName: "Salem Employee",
      firstName: "Salem",
      lastName: "Employee",
      passwordHash,
      metadata: {
        nameKey: "user.employeeFullName",
        firstNameKey: "user.employeeFirstName",
      },
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: {
        id: u.id,
        companyId: COMPANY_ID,
        employeeId: u.employeeId,
        email: u.email,
        role: u.role,
        initials: u.initials,
        displayName: u.displayName,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash: u.passwordHash,
        isActive: true,
        metadata: u.metadata,
        createdBy: "system",
        updatedBy: "system",
      },
      update: {
        email: u.email,
        role: u.role,
        employeeId: u.employeeId,
        displayName: u.displayName,
        passwordHash: u.passwordHash,
        metadata: u.metadata,
        updatedBy: "system",
      },
    });

    await prisma.userPreferences.upsert({
      where: { userId: u.id },
      create: {
        companyId: COMPANY_ID,
        userId: u.id,
        language: "ar",
        appearance: "system",
        notifications: {
          ...DEFAULT_COMPANY_NOTIFICATIONS,
          sound: true,
        },
        createdBy: "system",
        updatedBy: "system",
      },
      update: {},
    });
  }

  await prisma.payrollPoliciesDoc.upsert({
    where: { companyId: COMPANY_ID },
    create: {
      companyId: COMPANY_ID,
      payload: policyJson(),
    },
    update: {
      payload: policyJson(),
    },
  });

  for (const rule of DEFAULT_PAYROLL_RULES) {
    await prisma.payrollRule.upsert({
      where: {
        companyId_code: { companyId: COMPANY_ID, code: rule.code },
      },
      create: {
        companyId: COMPANY_ID,
        code: rule.code,
        labelKey: rule.name,
        enabled: rule.enabled,
        payload: {
          name: rule.name,
          priority: rule.priority,
          when: rule.when,
          then: rule.then,
          description: rule.description,
        },
      },
      update: {
        labelKey: rule.name,
        enabled: rule.enabled,
        payload: {
          name: rule.name,
          priority: rule.priority,
          when: rule.when,
          then: rule.then,
          description: rule.description,
        },
      },
    });
  }

  // legacy short codes — remove if present from older seeds
  await prisma.payrollRule.deleteMany({
    where: {
      companyId: COMPANY_ID,
      code: { in: ["late_tier"] },
    },
  });

  const schedule = await prisma.workSchedule.findUnique({
    where: { companyId: COMPANY_ID },
  });
  if (schedule) {
    const existing = await prisma.holiday.count({
      where: { companyId: COMPANY_ID, deletedAt: null },
    });
    if (existing === 0) {
      await prisma.holiday.createMany({
        data: [
          {
            companyId: COMPANY_ID,
            scheduleId: schedule.id,
            name: "Revolution Day",
            description: "National holiday",
            date: new Date("2026-01-25"),
            type: "holiday",
            createdBy: "system",
            updatedBy: "system",
          },
          {
            companyId: COMPANY_ID,
            scheduleId: schedule.id,
            name: "Sinai Liberation",
            description: "National holiday",
            date: new Date("2026-04-25"),
            type: "holiday",
            createdBy: "system",
            updatedBy: "system",
          },
        ],
      });
    }
  }

  // Backfill geofence pins for offices created before lat/lng existed.
  await prisma.officeLocation.updateMany({
    where: {
      companyId: COMPANY_ID,
      deletedAt: null,
      OR: [{ latitude: null }, { longitude: null }],
    },
    data: {
      latitude: 30.0075,
      longitude: 31.4913,
      radiusMeters: 250,
    },
  });

  // Sample org data
  const deptCount = await prisma.department.count({
    where: { companyId: COMPANY_ID, deletedAt: null },
  });
  if (deptCount === 0) {
    const seedDepartments = [
      { name: "Engineering", nameAr: "الهندسة", code: "ENG", color: "#082868" },
      { name: "Design", nameAr: "التصميم", code: "DES", color: "#0ea5e9" },
      { name: "Product", nameAr: "المنتج", code: "PRD", color: "#14b8a6" },
      { name: "HR", nameAr: "الموارد البشرية", code: "HR", color: "#f59e0b" },
      { name: "Finance", nameAr: "المالية", code: "FIN", color: "#64748b" },
      { name: "Marketing", nameAr: "التسويق", code: "MKT", color: "#f43f5e" },
      { name: "Operations", nameAr: "العمليات", code: "OPS", color: "#f97316" },
      { name: "Sales", nameAr: "المبيعات", code: "SAL", color: "#10b981" },
    ];
    await prisma.department.createMany({
      data: seedDepartments.map((d) => ({
        companyId: COMPANY_ID,
        name: d.name,
        nameAr: d.nameAr,
        code: d.code,
        color: d.color,
        active: true,
        createdBy: "system",
        updatedBy: "system",
      })),
    });
  }

  const locCount = await prisma.officeLocation.count({
    where: { companyId: COMPANY_ID, deletedAt: null },
  });
  if (locCount === 0) {
    await prisma.officeLocation.create({
      data: {
        companyId: COMPANY_ID,
        name: "Cairo HQ",
        city: "Cairo",
        address: "New Cairo",
        timezone: "Africa/Cairo",
        capacity: 120,
        workingDays: "sun-thu",
        // Approx. New Cairo business district — adjust in admin to the real pin.
        latitude: 30.0075,
        longitude: 31.4913,
        radiusMeters: 250,
        createdBy: "system",
        updatedBy: "system",
      },
    });
    await prisma.jobPosition.createMany({
      data: [
        {
          companyId: COMPANY_ID,
          title: "Software Engineer",
          department: "Engineering",
          grade: "G3",
          reportsTo: "Engineering Manager",
          createdBy: "system",
          updatedBy: "system",
        },
        {
          companyId: COMPANY_ID,
          title: "Product Designer",
          department: "Design",
          grade: "G3",
          reportsTo: "Design Lead",
          createdBy: "system",
          updatedBy: "system",
        },
      ],
    });
    await prisma.shiftDefinition.create({
      data: {
        companyId: COMPANY_ID,
        name: "Standard Day",
        nameKey: "shifts.standard",
        type: "fixed",
        start: "09:00",
        end: "18:00",
        color: "#082868",
        createdBy: "system",
        updatedBy: "system",
      },
    });
  }

  // Sample announcements + weekly stats
  const annCount = await prisma.announcement.count({
    where: { companyId: COMPANY_ID, deletedAt: null },
  });
  if (annCount === 0) {
    await prisma.announcement.create({
      data: {
        companyId: COMPANY_ID,
        title: "Welcome to ROOTK HR",
        body: "PostgreSQL-backed Nest API is live. Use demo login to explore.",
        author: "Nour Al-Admin",
        priority: "medium",
        createdBy: "system",
        updatedBy: "system",
      },
    });
  }

  const weekCount = await prisma.weeklyStat.count({
    where: { companyId: COMPANY_ID },
  });
  if (weekCount === 0) {
    await prisma.weeklyStat.createMany({
      data: ["Sun", "Mon", "Tue", "Wed", "Thu"].map((day, i) => ({
        companyId: COMPANY_ID,
        day,
        present: 3 + (i % 2),
        late: i === 1 ? 1 : 0,
        absent: i === 3 ? 1 : 0,
        wfh: i === 0 || i === 2 ? 1 : 0,
      })),
    });
    await prisma.monthlyStat.create({
      data: {
        companyId: COMPANY_ID,
        month: "2026-08",
        attendanceRate: 92.5,
        lateCount: 4,
        absentCount: 2,
        avgHours: 7.6,
      },
    });
  }

  // Sample attendance for today (UTC)
  const today = new Date();
  const day = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  for (const emp of employees.slice(0, 3)) {
    const existing = await prisma.attendanceRecord.findFirst({
      where: {
        companyId: COMPANY_ID,
        employeeId: emp.id,
        date: day,
        deletedAt: null,
      },
    });
    if (!existing) {
      await prisma.attendanceRecord.create({
        data: {
          companyId: COMPANY_ID,
          employeeId: emp.id,
          date: day,
          checkIn: new Date(`${day.toISOString().slice(0, 10)}T06:15:00.000Z`),
          status: emp.id === "emp_001" ? "late" : "present",
          isLate: emp.id === "emp_001",
          lateMinutes: emp.id === "emp_001" ? 20 : 0,
          createdBy: "system",
          updatedBy: "system",
        },
      });
    }
  }

  // Sample activities for dashboard feed
  const actCount = await prisma.activity.count({
    where: { companyId: COMPANY_ID, deletedAt: null },
  });
  if (actCount === 0) {
    await prisma.activity.createMany({
      data: [
        {
          companyId: COMPANY_ID,
          type: "check_in",
          employeeId: "emp_001",
          title: "Check-in",
          description: "Salem Employee",
          timestamp: new Date(),
          createdBy: "system",
          updatedBy: "system",
        },
        {
          companyId: COMPANY_ID,
          type: "announcement",
          title: "System ready",
          description: "Nest + Prisma + PostgreSQL backend is live",
          timestamp: new Date(),
          createdBy: "system",
          updatedBy: "system",
        },
        {
          companyId: COMPANY_ID,
          type: "late",
          employeeId: "emp_001",
          title: "Late check-in",
          description: "Salem Employee · 20m",
          timestamp: new Date(Date.now() - 3600_000),
          createdBy: "system",
          updatedBy: "system",
        },
      ],
    });
  }

  console.log("Seed complete.");
  console.log("Bootstrap password (seed accounts only): Rootk@2026");
  console.log("Accounts: admin@rootk.systems / employee@rootk.systems");
  console.log(
    "New employees must receive an admin-assigned password — demo-login is disabled."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
