"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getLocations } from "@/services/org.service";
import { getWorkSchedule } from "@/services/schedule.service";
import { fadeInUp } from "@/lib/animations";
import type { CompanySettings } from "@/types";
import type { OfficeLocation } from "@/types/org";
import { CompanyIdentitySection } from "./company-identity-section";
import { CompanyBranchesSection } from "./company-branches-section";

export function CompanyProfilePanel({
  form,
  onChange,
  onNavigate,
}: {
  form: CompanySettings;
  onChange: <K extends keyof CompanySettings>(
    key: K,
    value: CompanySettings[K]
  ) => void;
  onNavigate?: (section: "policies" | "locations") => void;
}) {
  const [branches, setBranches] = useState<OfficeLocation[]>([]);
  const [hoursLabel, setHoursLabel] = useState("09:00 – 18:00");
  const [loadingMeta, setLoadingMeta] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [locs, schedule] = await Promise.all([
        getLocations(),
        getWorkSchedule(),
      ]);
      if (!mounted) return;
      if (locs.success) setBranches(locs.data.filter((l) => l.active));
      if (schedule.success) {
        setHoursLabel(
          `${schedule.data.fromTime || "09:00"} – ${schedule.data.toTime || "18:00"}`
        );
      }
      setLoadingMeta(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div variants={fadeInUp} className="space-y-5">
      <CompanyIdentitySection form={form} onChange={onChange} />
      <CompanyBranchesSection
        timezone={form.timezone}
        hoursLabel={hoursLabel}
        loadingMeta={loadingMeta}
        branches={branches}
        onNavigate={onNavigate}
      />
    </motion.div>
  );
}
