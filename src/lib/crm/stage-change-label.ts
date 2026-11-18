/**
 * Resolve timeline/history stage-change text.
 * Older records stored raw stage IDs (`cuid → cuid`); newer ones store names.
 */
export function resolveStageChangeDescription(
  description: string,
  stageNameById: Map<string, string>
): { from: string; to: string } | null {
  const raw = description.trim();
  if (!raw) return null;
  const parts = raw.split(/\s*→\s*/);
  if (parts.length !== 2) return null;
  const fromToken = parts[0]?.trim() ?? "";
  const toToken = parts[1]?.trim() ?? "";
  if (!fromToken || !toToken) return null;
  return {
    from: stageNameById.get(fromToken)?.trim() || fromToken,
    to: stageNameById.get(toToken)?.trim() || toToken,
  };
}

export function formatStageChangeDescription(
  description: string,
  stageNameById: Map<string, string>,
  format: (from: string, to: string) => string
): string {
  const parsed = resolveStageChangeDescription(description, stageNameById);
  if (!parsed) return description;
  return format(parsed.from, parsed.to);
}
