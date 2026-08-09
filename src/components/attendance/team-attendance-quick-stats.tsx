import { motion } from "framer-motion";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { fadeInUp, staggerContainer } from "@/lib/animations";

type BoardFilter = "all" | "present" | "late" | "wfh" | "absent" | "on_leave";

export function TeamAttendanceQuickStats({
  stats,
  filter,
  onFilterChange,
  reduceMotion,
}: {
  stats: { key: BoardFilter; label: string; value: number; tone: string }[];
  filter: BoardFilter;
  onFilterChange: (filter: BoardFilter) => void;
  reduceMotion: boolean | null;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial={reduceMotion ? false : "hidden"}
      animate="visible"
      className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {stats.map((stat) => (
        <motion.button
          key={stat.key}
          type="button"
          variants={fadeInUp}
          onClick={() => onFilterChange(stat.key)}
          className={`rounded-xl border px-3.5 py-3 text-start transition-all hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${stat.tone} ${
            filter === stat.key ? "ring-2 ring-primary/30" : ""
          }`}
          aria-pressed={filter === stat.key}
          aria-label={`${stat.label}: ${stat.value}`}
        >
          <p className="section-label">{stat.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            <AnimatedCounter value={stat.value} />
          </p>
        </motion.button>
      ))}
    </motion.div>
  );
}
