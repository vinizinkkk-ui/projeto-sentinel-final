import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BellRing,
  Building2,
  CheckCircle2,
  MonitorPlay,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatTime, waitingMinutes } from "@/lib/format";
import type { Call, DashboardStats, Room, RoomStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { CallStatusPill, RoomStatusPill, TicketBadge } from "@/components/pills";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function roomBox(status: RoomStatus): string {
  if (status === "disponivel") return "border-emerald-200 bg-emerald-50/50";
  if (status === "em_atendimento") return "border-rose-200 bg-rose-50/50";
  return "border-amber-200 bg-amber-50/50";
}

export default function Dashboard() {
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const statsQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiGet<DashboardStats>("/stats/dashboard"),
    refetchInterval: 5000,
  });
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiGet<Room[]>("/rooms"),
    refetchInterval: 5000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const stats = statsQuery.data;
  const rooms = roomsQuery.data ?? [];
  const me = meQuery.data;
  const canManagePatients = me?.role === "admin" || me?.role === "recepcao";
  const active: Call | null = stats?.recent.find((c) => c.status === "chamado") ?? null;

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="dashboard-page">
      {/* Ações rápidas */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/chamada"
          data-testid="dashboard-quick-call"
          className={cn(buttonVariants({ size: "sm" }), "gap-2")}
        >
          <BellRing className="h-4 w-4" aria-hidden="true" /> Nova chamada
        </Link>
        {canManagePatients && (
          <Link
            to="/pacientes"
            data-testid="dashboard-quick-patients"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
          >
            <Users className="h-4 w-4" aria-hidden="true" /> Novo paciente
          </Link>
        )}
        <a
          href="/tv"
          target="_blank"
          rel="noreferrer"
          data-testid="dashboard-quick-tv"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
        >
          <MonitorPlay className="h-4 w-4" aria-hidden="true" /> Abrir TV
        </a>
      </div>

      {/* Cards de indicadores */}
      {!stats ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Pacientes aguardando"
            value={stats.waiting}
            icon={Users}
            tone="primary"
            testid="dashboard-stat-waiting"
            hint="Fila de espera atual"
          />
          <StatCard
            label="Em atendimento"
            value={stats.in_service}
            icon={UserCheck}
            tone="warning"
            testid="dashboard-stat-in-service"
            hint="Chamadas ativas agora"
          />
          <StatCard
            label="Atendimentos hoje"
            value={stats.finished_today}
            icon={CheckCircle2}
            tone="success"
            testid="dashboard-stat-finished"
            hint="Finalizados nesta data"
          />
          <StatCard
            label="Consultórios ocupados"
            value={`${stats.occupied_rooms}/${stats.total_rooms}`}
            icon={Building2}
            tone="danger"
            testid="dashboard-stat-rooms"
            hint="Capacidade em uso"
          />
        </div>
      )}

      {/* Chamada atual + consultórios */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Chamada atual
            </CardDescription>
            <CardTitle className="font-heading text-lg">Painel ao vivo</CardTitle>
          </CardHeader>
          <CardContent>
            {active ? (
              <div
                className="animate-hmv-pulse rounded-2xl border-2 border-sky-300 bg-[#E0F2FE] p-5 text-center"
                data-testid="dashboard-active-call"
                aria-live="assertive"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Senha chamada
                </p>
                <p className="mt-1 font-mono text-5xl font-black text-[#155E75]">{active.ticket}</p>
                <p className="mt-3 font-heading text-lg font-bold text-slate-900">{active.patient_name}</p>
                <p className="mt-1 text-sm font-semibold text-[#0E7490]">{active.room_label}</p>
                {active.professional_name && (
                  <p className="mt-1 text-xs text-slate-500">com {active.professional_name}</p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center" data-testid="dashboard-no-active-call">
                <p className="text-sm font-medium text-slate-500">Nenhuma chamada ativa agora</p>
                <p className="mt-1 text-xs text-slate-400">
                  {stats ? `${stats.waiting} paciente(s) na fila de espera` : "Aguardando dados..."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Consultórios
            </CardDescription>
            <CardTitle className="font-heading text-lg">Status das salas</CardTitle>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Nenhum consultório cadastrado.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    data-testid={`dashboard-room-${room.number}`}
                    className={cn("rounded-xl border p-4", roomBox(room.status))}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-heading text-sm font-bold text-slate-900">{room.label}</p>
                      <RoomStatusPill status={room.status} />
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {room.status === "em_atendimento" ? (
                        <p className="truncate">
                          <span className="font-mono font-bold text-[#155E75]">{room.current_ticket}</span>
                          {" · "}
                          {room.current_patient}
                        </p>
                      ) : room.status === "manutencao" ? (
                        <p>Indisponível — manutenção</p>
                      ) : (
                        <p>Livre para atendimentos</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fila de espera + últimas chamadas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Fila de espera
            </CardDescription>
            <CardTitle className="font-heading text-lg">Próximos a serem chamados</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.queue.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500" data-testid="queue-empty">
                Nenhuma paciente aguardando. Cadastre um paciente para emitir a senha.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Pos.</TableHead>
                    <TableHead>Senha</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Espera</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.queue.map((call, index) => (
                    <TableRow key={call.id} data-testid={`queue-row-${call.ticket}`}>
                      <TableCell className="font-semibold text-slate-400">{index + 1}º</TableCell>
                      <TableCell>
                        <TicketBadge ticket={call.ticket} />
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{call.patient_name}</TableCell>
                      <TableCell className="text-slate-500">{call.service_type}</TableCell>
                      <TableCell className="text-right text-slate-500">
                        {waitingMinutes(call, now)} min
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Últimas chamadas
            </CardDescription>
            <CardTitle className="font-heading text-lg">Histórico recente</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats || stats.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500" data-testid="recent-empty">
                Nenhuma chamada registrada ainda.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Senha</TableHead>
                    <TableHead>Consultório</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recent.map((call) => (
                    <TableRow key={call.id} data-testid={`recent-row-${call.ticket}`}>
                      <TableCell>
                        <TicketBadge ticket={call.ticket} />
                      </TableCell>
                      <TableCell className="text-slate-600">{call.room_label ?? "—"}</TableCell>
                      <TableCell className="font-mono text-slate-600">{formatTime(call.called_at)}</TableCell>
                      <TableCell>
                        <CallStatusPill status={call.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
        HMV — Hospital Municipal Valparaíso · dados atualizados automaticamente a cada 5 segundos
      </p>
    </div>
  );
}
