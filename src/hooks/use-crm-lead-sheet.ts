import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";
import { formatMaybeDateTime } from "@/lib/crm/format";
import { ensureLeadFeedbackList, ensureLeadTimeline } from "@/lib/crm-normalize";
import {
  addCrmLeadActivity,
  getCrmFeedbackList,
  getCrmLead,
  getCrmLeadTimeline,
  updateCrmLead,
} from "@/services/crm.service";
import type { Employee } from "@/types";
import type {
  CrmActivityType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmStage,
} from "@/types/crm";

interface UseCrmLeadSheetArgs {
  leadId: string | null;
  open: boolean;
  stages: CrmStage[];
  employees: Employee[];
  feedbackTypes: CrmFeedbackType[];
  onChanged?: () => void;
}

export function useCrmLeadSheet({
  leadId,
  open,
  stages,
  employees,
  feedbackTypes,
  onChanged,
}: UseCrmLeadSheetArgs) {
  const { t } = useTranslation();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [timeline, setTimeline] = useState<CrmLeadActivity[]>([]);
  const [feedback, setFeedback] = useState<CrmLeadFeedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");
  const [activityOpen, setActivityOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const [actType, setActType] = useState<CrmActivityType>("note");
  const [actTitle, setActTitle] = useState("");
  const [actDesc, setActDesc] = useState("");
  const [followAt, setFollowAt] = useState("");
  const [saving, setSaving] = useState(false);

  const safeStages = useMemo(
    () => (Array.isArray(stages) ? stages : []),
    [stages]
  );
  const safeEmployees = useMemo(
    () => (Array.isArray(employees) ? employees : []),
    [employees]
  );
  const safeFeedbackTypes = useMemo(
    () => (Array.isArray(feedbackTypes) ? feedbackTypes : []),
    [feedbackTypes]
  );
  const stageMap = useMemo(
    () => new Map(safeStages.map((s) => [s.id, s])),
    [safeStages]
  );
  const employeeMap = useMemo(
    () => new Map(safeEmployees.map((e) => [e.id, e.name])),
    [safeEmployees]
  );
  const feedbackTypeMap = useMemo(
    () => new Map(safeFeedbackTypes.map((f) => [f.id, f.name])),
    [safeFeedbackTypes]
  );

  const reload = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const [leadRes, tlRes, fbRes] = await Promise.all([
      getCrmLead(leadId),
      getCrmLeadTimeline(leadId),
      getCrmFeedbackList({ leadId }),
    ]);
    if (leadRes.success) setLead(leadRes.data);
    if (tlRes.success) {
      setTimeline(ensureLeadTimeline(tlRes.data));
    } else {
      setTimeline([]);
    }
    if (fbRes.success) {
      setFeedback(ensureLeadFeedbackList(fbRes.data));
    } else {
      setFeedback([]);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    if (open && leadId) {
      setTab("overview");
      void reload();
    } else if (!open) {
      setLead(null);
      setTimeline([]);
      setFeedback([]);
    }
  }, [open, leadId, reload]);

  const stage = lead ? stageMap.get(lead.stageId) : undefined;
  const ownerName = lead?.ownerEmployeeId
    ? (employeeMap.get(lead.ownerEmployeeId) ?? t("crm.leads.unassigned"))
    : t("crm.leads.unassigned");

  async function changeStage(stageId: string) {
    if (!lead) return;
    setSaving(true);
    const res = await updateCrmLead(lead.id, { stageId });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.leadUpdated"));
    void reload();
    onChanged?.();
  }

  async function saveActivity() {
    if (!lead || !actTitle.trim()) return;
    setSaving(true);
    const res = await addCrmLeadActivity(lead.id, {
      type: actType,
      title: actTitle.trim(),
      description: actDesc,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.activityAdded"));
    setActivityOpen(false);
    setActTitle("");
    setActDesc("");
    void reload();
    onChanged?.();
  }

  async function saveFollowUp() {
    if (!lead || !followAt) return;
    setSaving(true);
    const iso = new Date(followAt).toISOString();
    const res = await updateCrmLead(lead.id, {
      nextFollowUpAt: iso,
      nextAction: lead.nextAction === "none" ? "follow_up" : lead.nextAction,
    });
    if (res.success) {
      await addCrmLeadActivity(lead.id, {
        type: "follow_up",
        title: t("crm.actions.scheduleFollowUp"),
        description: formatMaybeDateTime(iso),
      });
    }
    setSaving(false);
    if (!res.success) {
      toast.error(res.message ?? t("crm.errors.saveFailed"));
      return;
    }
    toast.success(t("crm.toast.leadUpdated"));
    setFollowOpen(false);
    void reload();
    onChanged?.();
  }

  return {
    t,
    lead,
    timeline,
    feedback,
    loading,
    tab,
    setTab,
    activityOpen,
    setActivityOpen,
    feedbackOpen,
    setFeedbackOpen,
    followOpen,
    setFollowOpen,
    actType,
    setActType,
    actTitle,
    setActTitle,
    actDesc,
    setActDesc,
    followAt,
    setFollowAt,
    saving,
    safeStages,
    feedbackTypeMap,
    reload,
    stage,
    ownerName,
    changeStage,
    saveActivity,
    saveFollowUp,
  };
}
