"use client";

import { PageTransition } from "@/components/shared/page-transition";
import { TeamPage } from "@/components/team/team-page";

export default function TeamRoutePage() {
  return (
    <PageTransition>
      <TeamPage />
    </PageTransition>
  );
}
