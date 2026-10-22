import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, History } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatTime, minutesBetween } from "@/lib/format";
import type { Call } from "@/lib/types";
import StatCard from "@/components/StatCard";
import { TicketBadge } from "@/components/pills";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Attendances() {
  const callsQuery = useQuery({
    queryKey: ["calls", "finalizado"],
    queryFn: () => apiGet<Call[]>("/calls?status=finalizado&limit=200"),
  });
  const calls = callsQuery.data ?? [];

  const todayStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const finishedToday = calls.filter(
    (call) =>
      call.finished_at &&
      new Date(call.finished_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === todayStr,
  ).length;

  const waits = calls
    .map((call) => minutesBetween(call.created_at, call.called_at))
    .filter((value): value is number => value !== null);
  const avgWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="attendances-page">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">Atendimentos</h2>
        <p className="text-sm text-slate-500">Histórico dos atendimentos finalizados no hospital.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          label="Atendimentos realizados"
          value={calls.length}
          icon={CheckCircle2}
          tone="success"
          testid="attendances-stat-total"
          hint="Histórico completo"
        />
        <StatCard
          label="Finalizados hoje"
          value={finishedToday}
          icon={History}
          tone="primary"
          testid="attendances-stat-today"
          hint="Nesta data"
        />
        <StatCard
          label="Tempo médio de espera"
          value={`${avgWait} min`}
          icon={Clock3}
          tone="warning"
          testid="attendances-stat-wait"
          hint="Da emissão da senha à chamada"
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        {callsQuery.data === undefined ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/70" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Senha</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Consultório</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-right">Espera</TableHead>
                <TableHead className="text-right">Duração</TableHead>
                <TableHead className="text-right">Finalizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-slate-500" data-testid="attendances-empty">
                    Nenhum atendimento finalizado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call) => (
                  <TableRow key={call.id} data-testid={`attendances-row-${call.ticket}`}>
                    <TableCell>
                      <TicketBadge ticket={call.ticket} />
                    </TableCell>
                    <TableCell className="font-medium text-slate-800">{call.patient_name}</TableCell>
                    <TableCell className="text-slate-500">{call.service_type}</TableCell>
                    <TableCell className="text-slate-600">{call.room_label ?? "—"}</TableCell>
                    <TableCell className="text-slate-600">{call.professional_name ?? "—"}</TableCell>
                    <TableCell className="text-right text-slate-500">
                      {minutesBetween(call.created_at, call.called_at) ?? "—"} min
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {minutesBetween(call.called_at, call.finished_at) ?? "—"} min
                    </TableCell>
                    <TableCell className="text-right font-mono text-slate-600">
                      {formatTime(call.finished_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
