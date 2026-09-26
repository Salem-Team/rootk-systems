import { AppRole } from "../common/roles";
import type { PrismaService } from "../prisma/prisma.service";

type AccountLink = {
  role: string;
  employeeId: string | null;
  email: string;
};

type EmployeeLink = {
  id: string;
  email: string;
};

/** Employee logins stay visible only while a live employee row still matches. */
export function isLiveEmployeeAccount(
  user: AccountLink,
  employees: EmployeeLink[]
): boolean {
  if (user.role !== AppRole.employee) return true;
  const email = user.email.trim().toLowerCase();
  return employees.some(
    (employee) =>
      (user.employeeId && employee.id === user.employeeId) ||
      (email.length > 0 && employee.email.trim().toLowerCase() === email)
  );
}

/** True for admins, and for employees who still have a non-deleted employee row. */
export async function employeeLoginStillExists(
  prisma: PrismaService,
  user: AccountLink & { companyId: string }
): Promise<boolean> {
  if (user.role !== AppRole.employee) return true;
  const email = user.email.trim();
  const or: Array<{ id: string } | { email: { equals: string; mode: "insensitive" } }> =
    [];
  if (user.employeeId) or.push({ id: user.employeeId });
  if (email) or.push({ email: { equals: email, mode: "insensitive" } });
  if (or.length === 0) return false;
  const employee = await prisma.employee.findFirst({
    where: { companyId: user.companyId, deletedAt: null, OR: or },
    select: { id: true },
  });
  return Boolean(employee);
}
