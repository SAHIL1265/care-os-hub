import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  tone?: "primary" | "emerald" | "warning" | "info" | "destructive";
  className?: string;
}

const toneMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "from-primary/20 to-primary/0 text-primary",
  emerald: "from-emerald/20 to-emerald/0 text-emerald",
  warning: "from-warning/20 to-warning/0 text-warning",
  info: "from-info/20 to-info/0 text-info",
  destructive: "from-destructive/20 to-destructive/0 text-destructive",
};

export function StatCard({ icon: Icon, label, value, unit, delta, tone = "primary", className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className={cn("absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-70", toneMap[tone])} />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
          </div>
          {delta && <div className="mt-1 text-[11px] font-medium text-emerald">{delta}</div>}
        </div>
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
