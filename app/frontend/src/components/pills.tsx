import type { CallStatus, RoomStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const PILL_BASE =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const CALL_PILL: Record<CallStatus, string> = {
  aguardando: "border-amber-200 bg-amber-100 text-amber-800",
  chamado: "border-sky-300 bg-sky-100 text-sky-900",
  finalizado: "border-emerald-200 bg-emerald-100 text-emerald-800",
  cancelado: "border-slate-200 bg-slate-100 text-slate-600",
};

const CALL_LABEL: Record<CallStatus, string> = {
  aguardando: "Aguardando",
  chamado: "Chamado",
  finalizado: "Atendido",
  cancelado: "Cancelado",
};

export function CallStatusPill({ status }: { status: CallStatus }) {
  return (
    <span className={cn(PILL_BASE, CALL_PILL[status])} data-testid={`call-status-${status}`}>
      {CALL_LABEL[status]}
    </span>
  );
}

const ROOM_PILL: Record<RoomStatus, string> = {
  disponivel: "border-emerald-200 bg-emerald-100 text-emerald-800",
  em_atendimento: "border-rose-200 bg-rose-100 text-rose-800",
  manutencao: "border-amber-200 bg-amber-100 text-amber-800",
};

const ROOM_LABEL: Record<RoomStatus, string> = {
  disponivel: "Disponível",
  em_atendimento: "Em atendimento",
  manutencao: "Manutenção",
};

const ROOM_DOT: Record<RoomStatus, string> = {
  disponivel: "bg-emerald-500",
  em_atendimento: "bg-rose-500",
  manutencao: "bg-amber-500",
};

export function RoomStatusPill({ status }: { status: RoomStatus }) {
  return (
    <span className={cn(PILL_BASE, ROOM_PILL[status])} data-testid={`room-status-${status}`}>
      <span className={cn("h-2 w-2 rounded-full", ROOM_DOT[status])} aria-hidden="true" />
      {ROOM_LABEL[status]}
    </span>
  );
}

export function TicketBadge({ ticket, className }: { ticket: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-100 px-2 py-0.5 font-mono text-xs font-bold text-cyan-900",
        className,
      )}
    >
      {ticket}
    </span>
  );
}
