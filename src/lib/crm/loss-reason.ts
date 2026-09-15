/** Append optional free-text loss details to lead notes. */
export function appendLossReasonNote(
  existingNotes: string,
  reasonName: string,
  details: string
): string | undefined {
  const trimmed = details.trim();
  if (!trimmed) return undefined;
  const line = `Lost (${reasonName}): ${trimmed}`;
  const base = existingNotes.trim();
  return base ? `${base}\n${line}` : line;
}
