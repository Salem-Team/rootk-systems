import type { TechnicalProposalDocument } from "@/types/crm";

export const TECHNICAL_PROPOSAL_NOTE =
  "يتم تنفيذ الخصائص الموضحة أعلاه وفقًا لنطاق العمل المتفق عليه بين الطرفين، وأي خصائص أو تكاملات أو متطلبات إضافية غير مذكورة صراحةً في هذا الملحق يتم الاتفاق عليها وتحديد تكلفتها ومدة تنفيذها بشكل منفصل.";

function sectionId(): string {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(16).slice(2, 14);
  return `sec_${uuid}`;
}

export function emptyTechnicalProposal(): TechnicalProposalDocument {
  return {
    title: "الملحق الفني",
    subtitle: "",
    intro: "",
    sections: [
      {
        id: sectionId(),
        title: "",
        intro: "",
        bullets: [""],
      },
    ],
    noteTitle: "ملاحظة",
    note: TECHNICAL_PROPOSAL_NOTE,
  };
}

export function newProposalSection() {
  return {
    id: sectionId(),
    title: "",
    intro: "",
    bullets: [""],
  };
}

export function isTechnicalProposalReady(
  doc: TechnicalProposalDocument | null | undefined
): boolean {
  if (!doc) return false;
  return (
    doc.title.trim().length >= 2 &&
    doc.sections.some((section) => section.title.trim().length >= 2)
  );
}
