"use client";

import { PageTransition } from "@/components/shared/page-transition";
import { PayrollWorkspace } from "@/components/payroll/payroll-workspace";

export default function PayrollPage() {
  return (
    <PageTransition cascade={false}>
      <PayrollWorkspace />
    </PageTransition>
  );
}
