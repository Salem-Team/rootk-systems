import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Latin tokens (words, emails, urls). Pure numbers stay with the surrounding sentence. */
const LTR_TOKEN = /[A-Za-z0-9+._:@/#&?=%~-]*[A-Za-z][A-Za-z0-9+._:@/#&?=%~-]*/g;

/** Keep English words from pulling the Arabic around them out of reading order. */
export function bidiNodes(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const re = new RegExp(LTR_TOKEN.source, "g");
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

/** User text that may mix Arabic and English. */
export function BidiText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span dir="auto" className={cn("bidi-plain", className)}>
      {bidiNodes(text)}
    </span>
  );
}
