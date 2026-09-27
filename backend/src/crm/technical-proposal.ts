import { BadRequestException } from "@nestjs/common";

export type TechnicalProposalSection = {
  id: string;
  title: string;
  intro: string;
  bullets: string[];
};

export type TechnicalProposalDocument = {
  title: string;
  subtitle: string;
  intro: string;
  sections: TechnicalProposalSection[];
  noteTitle: string;
  note: string;
};

function clip(value: unknown, max: number): string {
  return String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

export function readTechnicalProposal(
  metadata: unknown
): TechnicalProposalDocument | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as { proposal?: unknown }).proposal;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const doc = raw as Record<string, unknown>;
  if (typeof doc.title !== "string" || !doc.title.trim()) return null;
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  return {
    title: doc.title,
    subtitle: String(doc.subtitle ?? ""),
    intro: String(doc.intro ?? ""),
    noteTitle: String(doc.noteTitle ?? ""),
    note: String(doc.note ?? ""),
    sections: sections
      .filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row)
      )
      .map((row, index) => ({
        id: String(row.id || `sec-${index + 1}`),
        title: String(row.title ?? ""),
        intro: String(row.intro ?? ""),
        bullets: Array.isArray(row.bullets)
          ? row.bullets.map((bullet) => String(bullet ?? ""))
          : [],
      })),
  };
}

export function sanitizeTechnicalProposal(
  body: unknown
): TechnicalProposalDocument {
  const raw =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  if (!raw) throw new BadRequestException("Proposal document is required");

  const title = clip(raw.title, 160);
  if (title.length < 2) {
    throw new BadRequestException("Proposal title is required");
  }

  const source = Array.isArray(raw.sections) ? raw.sections : [];
  const sections: TechnicalProposalSection[] = [];
  for (const item of source.slice(0, 40)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const sectionTitle = clip(row.title, 180);
    const intro = clip(row.intro, 4000);
    const bullets = (Array.isArray(row.bullets) ? row.bullets : [])
      .map((bullet) => clip(bullet, 500))
      .filter((bullet) => bullet.length > 0)
      .slice(0, 40);
    if (!sectionTitle && !intro && bullets.length === 0) continue;
    if (sectionTitle.length < 2) {
      throw new BadRequestException("Each section needs a title");
    }
    sections.push({
      id: clip(row.id, 40) || `sec-${sections.length + 1}`,
      title: sectionTitle,
      intro,
      bullets,
    });
  }
  if (sections.length === 0) {
    throw new BadRequestException("Add at least one section");
  }

  return {
    title,
    subtitle: clip(raw.subtitle, 240),
    intro: clip(raw.intro, 4000),
    sections,
    noteTitle: clip(raw.noteTitle, 80),
    note: clip(raw.note, 4000),
  };
}
