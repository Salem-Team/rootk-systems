import type { AppUser } from "@/types";
import type { SeedOf } from "@/types/seed";

/** Demo principals for credential login — future JWT subjects. */
export const usersSeed: SeedOf<AppUser>[] = [
  {
    id: "emp-001",
    employeeId: "RK-1001",
    email: "salem@rootk.systems",
    role: "admin",
    initials: "SA",
    displayName: "Salem Ayman",
    firstName: "Salem",
    lastName: "Ayman",
    nameKey: "user.adminFullName",
    firstNameKey: "user.adminFirstName",
    isActive: true,
  },
  {
    id: "emp-003",
    employeeId: "RK-1003",
    email: "yousef@rootk.systems",
    role: "employee",
    initials: "YM",
    displayName: "Yousef Mansour",
    firstName: "Yousef",
    lastName: "Mansour",
    nameKey: "user.employeeFullName",
    firstNameKey: "user.employeeFirstName",
    isActive: true,
  },
];
