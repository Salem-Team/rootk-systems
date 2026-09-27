"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CrmClientRequestsPanel } from "@/components/crm/crm-client-requests-panel";
import { PageHeader } from "@/components/shared/page-header";
import { PageTransition } from "@/components/shared/page-transition";
import { useTranslation } from "@/hooks/use-translation";
import { isProtectedAdminAccount } from "@/lib/protected-accounts";
import { getWorkforceEmployees } from "@/services/employees.service";
import { useSessionStore } from "@/stores/session-store";
import type { Employee } from "@/types";

export default function ClientRequestsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const allowed = isProtectedAdminAccount({
    userId: user.id,
    employeeId: user.employeeId,
    email: user.email,
  });
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    if (!allowed) router.replace("/dashboard");
  }, [allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    void getWorkforceEmployees().then((res) => {
      if (res.success) setEmployees(res.data);
    });
  }, [allowed]);

  if (!allowed) return null;

  return (
    <PageTransition>
      <PageHeader
        title={t("nav.clientRequests")}
        description={t("crm.clientRequests.inboxDesc")}
      />
      <CrmClientRequestsPanel
        variant="inbox"
        hideIntro
        employees={employees}
        onOpenLead={(id) => router.push(`/crm?lead=${id}&sheet=requests`)}
      />
    </PageTransition>
  );
}
