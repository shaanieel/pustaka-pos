import { clsx } from "clsx";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  variant?: "default" | "success" | "warning";
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: StatsCardProps) {
  const iconBg = {
    default: "bg-brand-100 text-brand-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="card p-5 animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-500">{title}</p>
          <p className="text-2xl font-bold text-brand-950 tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-brand-400">{subtitle}</p>
          )}
          {trend && (
            <span
              className={clsx(
                "inline-flex items-center gap-1 text-xs font-semibold",
                trend.positive ? "text-emerald-600" : "text-red-500"
              )}
            >
              {trend.positive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
        <div
          className={clsx(
            "w-11 h-11 rounded-xl flex items-center justify-center",
            iconBg[variant]
          )}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
