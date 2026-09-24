import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Arabic / Hebrew / other RTL letters. */
const RTL_LETTER =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Latin letter anywhere in the string. */
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/;

/**
 * LTR islands inside Arabic:
 * - ranges and compact amounts (50–100, 50–100k, <50k, 500k+)
 * - one phone (010 1234 5678, +20 …) so digit groups do not reverse
 * - Latin words / emails / urls / 90%
 * Bare list markers like "1." stay outside the island.
 */
const LTR_RUN =
  /(?:[<>+]?\s*)?\d[\d.,]*\s*[–—-]\s*\d[\d.,]*(?:\s*[kKmM])?|<\s*\d[\d.,]*(?:\s*[kKmM])?|\d[\d.,]*\s*[kKmM]\+|(?:\+\d{1,3}[\s-]?)?(?:\d{2,4}[\s.-]){1,4}\d{2,4}|\d{7,15}|(?:[A-Za-z\u00C0-\u024F][\w+._:@/#&?=%~'’-]*%?)(?:[ \t]+(?:[A-Za-z\u00C0-\u024F][\w+._:@/#&?=%~'’-]*%?|[0-9]+%)){0,10}|(?:[0-9]+%)/g;

/** Prefer RTL base when any Arabic is present — even if the line starts in English. */
export function resolveTextDir(text: string): "rtl" | "ltr" | "auto" {
  if (RTL_LETTER.test(text)) return "rtl";
  if (LATIN_LETTER.test(text)) return "ltr";
  return "auto";
}

/** Keep English words/phrases from pulling Arabic out of reading order. */
export function bidiNodes(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const re = new RegExp(LTR_RUN.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = re.exec(text))) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`t-${index}`}>{text.slice(last, match.index)}</Fragment>
      );
    }
    nodes.push(
      <bdi key={`l-${index}`} dir="ltr">
        {match[0]}
      </bdi>
    );
    index += 1;
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(<Fragment key={`t-${index}`}>{text.slice(last)}</Fragment>);
  }

  return nodes.length > 0 ? nodes : text;
}

/** Split long user text into readable blocks (newlines + numbered steps). */
export function splitBidiBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const byNewline = normalized
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (byNewline.length > 1) return byNewline;

  const single = byNewline[0] ?? normalized;
  const bySteps = single
    .split(/(?=(?:^|\s)\d{1,2}[.)]\s+\S)/u)
    .map((part) => part.trim())
    .filter(Boolean);

  return bySteps.length > 1 ? bySteps : [single];
}

/** One-line preview for tables/lists — never expands row height. */
export function flattenPreview(text: string, maxChars = 96): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  if (flat.length <= maxChars) return flat;
  return `${flat.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
}

/** User text that may mix Arabic and English. */
export function BidiText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const dir = resolveTextDir(text);
  return (
    <span dir={dir} className={cn("bidi-plain", className)}>
      {bidiNodes(text)}
    </span>
  );
}

/**
 * Longer mixed Arabic/English copy (task descriptions, notes).
 * Splits into blocks so numbered steps and paragraphs stay readable.
 */
export function BidiBlocks({
  text,
  className,
  blockClassName,
}: {
  text: string;
  className?: string;
  blockClassName?: string;
}) {
  const blocks = splitBidiBlocks(text);
  if (blocks.length === 0) return null;

  const dir = resolveTextDir(text);

  if (blocks.length === 1) {
    return (
      <p
        dir={dir}
        className={cn(
          "bidi-plain bidi-prose whitespace-pre-wrap text-start leading-relaxed",
          className,
          blockClassName
        )}
      >
        {bidiNodes(blocks[0])}
      </p>
    );
  }

  return (
    <div
      dir={dir}
      className={cn(
        "bidi-plain bidi-prose space-y-2.5 text-start",
        className
      )}
    >
      {blocks.map((block, index) => (
        <p
          key={`b-${index}`}
          dir={resolveTextDir(block)}
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            blockClassName
          )}
        >
          {bidiNodes(block)}
        </p>
      ))}
    </div>
  );
}
