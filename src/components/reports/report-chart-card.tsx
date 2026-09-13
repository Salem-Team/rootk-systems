import type { ReactNode } from "react";
import { SectionPanel } from "@/components/shared/section-panel";

export const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
};

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <SectionPanel title={title} description={description} interactive={false}>
      {children}
    </SectionPanel>
  );
}
