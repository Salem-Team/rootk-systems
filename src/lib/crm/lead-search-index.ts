import type {
  CrmBusinessType,
  CrmFeedbackType,
  CrmLead,
  CrmLeadActivity,
  CrmLeadFeedback,
  CrmStage,
  CrmSubStage,
} from "@/types/crm";

type Named = { id: string; name: string };

/** Extra search text (feedback, stage, owner, business type) keyed by lead id. */
export function indexLeadSearchText(input: {
  leads: CrmLead[];
  feedback: CrmLeadFeedback[];
  activities?: CrmLeadActivity[];
  feedbackTypes: CrmFeedbackType[];
  stages: CrmStage[];
  subStages: CrmSubStage[];
  businessTypes: CrmBusinessType[];
  employees: Named[];
}): Map<string, string> {
  const typeName = new Map(input.feedbackTypes.map((row) => [row.id, row.name]));
  const stageName = new Map(input.stages.map((row) => [row.id, row.name]));
  const subName = new Map(input.subStages.map((row) => [row.id, row.name]));
  const businessName = new Map(
    input.businessTypes.map((row) => [row.id, row.name])
  );
  const ownerName = new Map(input.employees.map((row) => [row.id, row.name]));

  const extraByLead = new Map<string, string[]>();
  for (const row of input.feedback) {
    const parts = [
      typeName.get(row.feedbackTypeId) ?? "",
      row.customerFeedback,
      row.notes,
    ].filter(Boolean);
    if (parts.length === 0) continue;
    const bucket = extraByLead.get(row.leadId) ?? [];
    bucket.push(parts.join(" "));
    extraByLead.set(row.leadId, bucket);
  }
  for (const row of input.activities ?? []) {
    const parts = [row.title, row.description].filter(Boolean);
    if (parts.length === 0) continue;
    const bucket = extraByLead.get(row.leadId) ?? [];
    bucket.push(parts.join(" "));
    extraByLead.set(row.leadId, bucket);
  }

  const out = new Map<string, string>();
  for (const lead of input.leads) {
    const text = [
      stageName.get(lead.stageId) ?? "",
      lead.subStageId ? subName.get(lead.subStageId) ?? "" : "",
      lead.businessTypeId ? businessName.get(lead.businessTypeId) ?? "" : "",
      lead.ownerEmployeeId ? ownerName.get(lead.ownerEmployeeId) ?? "" : "",
      ...(extraByLead.get(lead.id) ?? []),
    ]
      .filter(Boolean)
      .join(" \n ");
    if (text) out.set(lead.id, text);
  }
  return out;
}
