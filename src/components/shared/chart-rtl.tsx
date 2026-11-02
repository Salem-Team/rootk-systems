"use client";

/** SVG tick that keeps Arabic letters shaped correctly inside LTR chart trees. */
export function ChartRtlTick({
  x = 0,
  y = 0,
  payload,
  fontSize = 10,
  angle = 0,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  fontSize?: number;
  angle?: number;
}) {
  const value = payload?.value == null ? "" : String(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={12}
        textAnchor="middle"
        fontSize={fontSize}
        fill="currentColor"
        className="fill-muted-foreground"
        transform={angle ? `rotate(${angle})` : undefined}
        style={{ direction: "rtl", unicodeBidi: "plaintext" }}
      >
        {value}
      </text>
    </g>
  );
}

/** Polar / radar angle tick with RTL-safe Arabic shaping. */
export function ChartRtlPolarTick({
  x = 0,
  y = 0,
  payload,
  cx = 0,
  cy = 0,
  fontSize = 10,
}: {
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  payload?: { value?: string | number };
  fontSize?: number;
}) {
  const value = payload?.value == null ? "" : String(payload.value);
  const dx = x - cx;
  const dy = y - cy;
  const anchor =
    Math.abs(dx) < 8 ? "middle" : dx > 0 ? "start" : "end";
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize={fontSize}
      fill="currentColor"
      className="fill-muted-foreground"
      style={{ direction: "rtl", unicodeBidi: "plaintext" }}
    >
      {value}
    </text>
  );
}

type LegendPayloadItem = {
  value?: string;
  color?: string;
  dataKey?: string | number;
  type?: string;
};

/** HTML legend — wraps on small screens and preserves Arabic shaping. */
export function ChartHtmlLegend({
  payload,
}: {
  payload?: LegendPayloadItem[];
}) {
  const items = (payload ?? []).filter(
    (item) => item && item.type !== "none" && item.value
  );
  if (items.length === 0) return null;

  return (
    <ul
      dir="auto"
      className="flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-1 pb-0.5 pt-1 text-[11px] leading-tight text-muted-foreground sm:gap-x-4 sm:text-xs"
    >
      {items.map((item) => (
        <li
          key={`${item.dataKey ?? item.value}`}
          className="inline-flex max-w-full items-center gap-1.5"
        >
          <span
            className="h-2 w-2 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color ?? "currentColor" }}
            aria-hidden
          />
          <span className="truncate font-medium text-foreground/85">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}

