import { cn } from "@/lib/utils";

interface HMVLogoProps {
  inverted?: boolean; // para fundos escuros (sidebar, TV, painel de login)
  compact?: boolean; // oculta o subtítulo "Hospital Municipal Valparaíso"
  markClassName?: string;
  className?: string;
}

export default function HMVLogo({
  inverted = false,
  compact = false,
  markClassName,
  className,
}: HMVLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-md",
          inverted ? "bg-white text-[#155E75]" : "bg-[#155E75] text-white",
          markClassName,
        )}
        data-testid="hmv-logo-mark"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M9.5 3h5a1 1 0 0 1 1 1v4.5H20a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4.5H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4.5V4a1 1 0 0 1 1-1z" />
        </svg>
      </div>
      <div className="leading-tight">
        <p
          className={cn(
            "font-heading text-2xl font-extrabold tracking-tight",
            inverted ? "text-white" : "text-[#155E75]",
          )}
        >
          HMV
        </p>
        {!compact && (
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wide",
              inverted ? "text-sky-200" : "text-slate-500",
            )}
          >
            Hospital Municipal Valparaíso
          </p>
        )}
      </div>
    </div>
  );
}
