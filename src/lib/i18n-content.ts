import type { TranslationPath } from "@/i18n";

const POSITION_KEY: Record<string, TranslationPath> = {
  "Senior Software Engineer": "positions.seniorSoftwareEngineer",
  "Engineering Manager": "positions.engineeringManager",
  "Product Designer": "positions.productDesigner",
  "Design Lead": "positions.designLead",
  "Product Manager": "positions.productManager",
  "Head of Product": "positions.headOfProduct",
  "HR Business Partner": "positions.hrBusinessPartner",
  "Financial Analyst": "positions.financialAnalyst",
  "Finance Director": "positions.financeDirector",
  "Growth Marketer": "positions.growthMarketer",
  "Marketing Manager": "positions.marketingManager",
  "Operations Specialist": "positions.operationsSpecialist",
  "Account Executive": "positions.accountExecutive",
  "Frontend Engineer": "positions.frontendEngineer",
  "Backend Engineer": "positions.backendEngineer",
  "UX Researcher": "positions.uxResearcher",
};

const LOCATION_KEY: Record<string, TranslationPath> = {
  Cairo: "locations.cairo",
  Giza: "locations.giza",
  Alexandria: "locations.alexandria",
  Mansoura: "locations.mansoura",
  "New Cairo": "locations.newCairo",
  Remote: "locations.remote",
};

/** Known API/seed announcement English titles → mockContent slug. */
const ANNOUNCEMENT_TITLE_SLUG: Record<string, string> = {
  "Welcome to ROOTK HR": "apiWelcome",
};

type TranslateFn = (
  path: TranslationPath,
  vars?: Record<string, string | number>
) => string;

export function positionKey(position: string): TranslationPath | null {
  return POSITION_KEY[position] ?? null;
}

export function locationKey(location: string): TranslationPath | null {
  return LOCATION_KEY[location] ?? null;
}

export function leaveReasonKey(id: string): TranslationPath {
  return `mockContent.leaves.${id}.reason` as TranslationPath;
}

export function leaveNoteKey(id: string): TranslationPath {
  return `mockContent.leaves.${id}.note` as TranslationPath;
}

export function holidayNameKey(id: string): TranslationPath {
  return `mockContent.holidays.${id}.name` as TranslationPath;
}

export function holidayDescKey(id: string): TranslationPath {
  return `mockContent.holidays.${id}.description` as TranslationPath;
}

/** Return translation if key resolves; otherwise fallback. */
export function translateOrFallback(
  t: TranslateFn,
  path: TranslationPath | null,
  fallback: string,
  vars?: Record<string, string | number>
): string {
  if (!path) return fallback;
  const value = t(path, vars);
  return value === path ? fallback : value;
}

export function localizedAnnouncement(
  item: { id: string; title: string; body: string },
  t: TranslateFn
): { title: string; body: string } {
  const slug = ANNOUNCEMENT_TITLE_SLUG[item.title] ?? item.id;
  return {
    title: translateOrFallback(
      t,
      `mockContent.announcements.${slug}.title` as TranslationPath,
      item.title
    ),
    body: translateOrFallback(
      t,
      `mockContent.announcements.${slug}.body` as TranslationPath,
      item.body
    ),
  };
}

export function localizedActivity(
  item: { id: string; title: string; description: string },
  t: TranslateFn
): { title: string; description: string } {
  return {
    title: translateOrFallback(
      t,
      `mockContent.activities.${item.id}.title` as TranslationPath,
      item.title
    ),
    description: translateOrFallback(
      t,
      `mockContent.activities.${item.id}.description` as TranslationPath,
      item.description
    ),
  };
}
