"use client";

import { PageTransition } from "@/components/shared/page-transition";
import { DailyPlanPage } from "@/components/daily-plan/daily-plan-page";

export default function DailyPlanRoutePage() {
  return (
    <PageTransition>
      <DailyPlanPage />
    </PageTransition>
  );
}
