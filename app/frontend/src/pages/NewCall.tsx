import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, FastForward, RotateCcw, Stethoscope, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage, formatTime, waitingMinutes } from "@/lib/format";
import type { Call, Room, User } from "@/lib/types";
import { TicketBadge } from "@/components/pills";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewCall() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [professionalId, setProfessionalId] = useState("");

  const waitingQuery = useQuery({
    queryKey: ["calls", "aguardando"],
    queryFn: () => apiGet<Call[]>("/calls?status=aguardando"),
    refetchInterval: 5000,
  });
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiGet<Room[]>("/rooms"),
    refetchInterval: 5000,
  });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/users"),
  });
  const currentQuery = useQuery({
    queryKey: ["calls", "current"],
    queryFn: () => apiGet<Call | null>("/calls/current"),
    refetchInterval: 3000,
  });

  const waiting = waitingQuery.data ?? [];
  const freeRooms = (roomsQuery.data ?? []).filter((room) => room.status === "disponivel");
  const doctors = (usersQuery.data ?? []).filter((user) => user.role === "medico");
  const current = currentQuery.data ?? null;

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["calls"] });
    qc.invalidateQueries({ queryKey: ["rooms"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["patients"] });
  };

  const callMutation = useMutation({
    mutationFn: (vars: { callId?: string }) => {
      const body = { room_id: roomId, professional_id: professionalId || null };
      if (vars.callId) return apiPost<Call>(`/calls/${vars.callId}/call`, body);
      return apiPost<Call>("/calls/next", body);
    },
    onSuccess: (call) => {
      invalidateAll();
      setPatientId("");
      toast.success(`Paciente chamado — senha ${call.ticket}, ${call.room_label}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const repeatMutation = useMutation({
    mutationFn: () => apiPost<Call>(`/calls/${current?.id ?? ""}/repeat`),
    onSuccess: () => {
      invalidateAll();
      toast.success("Chamada repetida na TV");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const finishMutation = useMutation({
    mutationFn: () => apiPost<Call>(`/calls/${current?.id ?? ""}/finish`),
    onSuccess: (call) => {
      invalidateAll();
      toast.success(`Atendimento finalizado — senha ${call.ticket}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const selectedPatient = waiting.find((call) => call.id === patientId) ?? null;

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-2" data-testid="new-call-page">
      {/* Formulário de chamada */}
      <Card className="self-start">
        <CardHeader>
          <CardDescription className="text-xs font-semibold uppercase tracking-wider">
            Sistema de chamada
          </CardDescription>
          <CardTitle className="font-heading text-xl">Chamar paciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Paciente na fila *</Label>
            <Select value={patientId} onValueChange={(value: string) => setPatientId(value)}>
              <SelectTrigger data-testid="call-select-patient" className="w-full">
                <SelectValue>
                  {selectedPatient
                    ? `${selectedPatient.ticket} — ${selectedPatient.patient_name}`
                    : waiting.length > 0
                      ? "Selecione o paciente"
                      : "Nenhum paciente aguardando"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {waiting.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Fila vazia neste momento.</div>
                ) : (
                  waiting.map((call) => (
                    <SelectItem key={call.id} value={call.id}>
                      {call.ticket} — {call.patient_name} ({call.service_type})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Consultório *</Label>
            <Select value={roomId} onValueChange={(value: string) => setRoomId(value)}>
              <SelectTrigger data-testid="call-select-room" className="w-full">
                <SelectValue>
                  {freeRooms.find((room) => room.id === roomId)?.label ?? "Selecione o consultório"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {freeRooms.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    Nenhum consultório disponível — finalize um atendimento.
                  </div>
                ) : (
                  freeRooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={professionalId} onValueChange={(value: string) => setProfessionalId(value)}>
              <SelectTrigger data-testid="call-select-professional" className="w-full">
                <SelectValue>
                  {doctors.find((doctor) => doctor.id === professionalId)?.name ?? "Opcional"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem-profissional">Sem profissional definido</SelectItem>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                    {doctor.specialty ? ` — ${doctor.specialty}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            data-testid="call-submit-button"
            disabled={!patientId || !roomId || callMutation.isPending}
            onClick={() => callMutation.mutate({ callId: patientId })}
          >
            <BellRing className="h-5 w-5" aria-hidden="true" />
            {callMutation.isPending ? "Chamando..." : "CHAMAR PACIENTE"}
          </Button>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-3">
            <Button
              variant="outline"
              data-testid="call-next-button"
              className="gap-2"
              disabled={!roomId || callMutation.isPending}
              onClick={() => callMutation.mutate({})}
            >
              <FastForward className="h-4 w-4" aria-hidden="true" /> Chamar próximo
            </Button>
            <Button
              variant="outline"
              data-testid="call-repeat-button"
              className="gap-2"
              disabled={!current || repeatMutation.isPending}
              onClick={() => repeatMutation.mutate()}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Repetir chamada
            </Button>
            <Button
              variant="outline"
              data-testid="call-finish-button"
              className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
              disabled={!current || finishMutation.isPending}
              onClick={() => finishMutation.mutate()}
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" /> Finalizar atendimento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Painel lateral */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Chamada atual na TV
            </CardDescription>
            <CardTitle className="font-heading text-xl">Em exibição agora</CardTitle>
          </CardHeader>
          <CardContent>
            {current ? (
              <div
                className="animate-hmv-pulse rounded-2xl border-2 border-sky-300 bg-[#E0F2FE] p-6 text-center"
                data-testid="newcall-current"
                aria-live="assertive"
              >
                <p className="font-mono text-6xl font-black text-[#155E75]">{current.ticket}</p>
                <p className="mt-3 font-heading text-xl font-bold text-slate-900">{current.patient_name}</p>
                <p className="mt-1 text-sm font-semibold text-[#0E7490]">{current.room_label}</p>
                {current.professional_name && (
                  <p className="mt-1 text-xs text-slate-500">com {current.professional_name}</p>
                )}
                <p className="mt-2 text-xs text-slate-400">Chamado às {formatTime(current.called_at)}</p>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500" data-testid="newcall-current-empty">
                Nenhuma chamada em exibição. Chame um paciente para aparecer na TV.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Fila de espera
            </CardDescription>
            <CardTitle className="font-heading text-xl">
              {waiting.length} paciente(s) aguardando
            </CardTitle>
          </CardHeader>
          <CardContent>
            {waiting.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500" data-testid="newcall-queue-empty">
                A fila está vazia. Cadastre um paciente em Pacientes para emitir a senha.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="newcall-queue-list">
                {waiting.map((call, index) => (
                  <li
                    key={call.id}
                    data-testid={`newcall-queue-item-${call.ticket}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-[#F1F5F9] px-4 py-3"
                  >
                    <span className="text-sm font-bold text-slate-400">{index + 1}º</span>
                    <TicketBadge ticket={call.ticket} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">{call.patient_name}</p>
                      <p className="text-xs text-slate-500">{call.service_type}</p>
                    </div>
                    <span className="text-xs text-slate-500">{waitingMinutes(call, Date.now())} min</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
              A TV de chamadas atualiza automaticamente — sem recarregar a página.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
