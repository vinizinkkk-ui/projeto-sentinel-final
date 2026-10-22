import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "danger";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: Tone;
  testid?: string;
}

const TONES: Record<Tone, string> = {
  primary: "bg-[#E0F2FE] text-[#155E75]",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
};

export default function StatCard({ label, value, icon: Icon, hint, tone = "primary", testid }: StatCardProps) {
  return (
    <div
      data-testid={testid}
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p
            data-testid={testid ? `${testid}-value` : undefined}
            className="mt-1 font-heading text-3xl font-bold text-slate-900"
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
