import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import type { Room, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { RoomStatusPill, TicketBadge } from "@/components/pills";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function roomBorder(status: Room["status"]): string {
  if (status === "disponivel") return "border-emerald-300";
  if (status === "em_atendimento") return "border-rose-300";
  return "border-amber-300";
}

export default function Rooms() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: () => apiGet<Room[]>("/rooms"),
    refetchInterval: 5000,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const rooms = roomsQuery.data ?? [];
  const me = meQuery.data;
  const canManage = me?.role === "admin" || me?.role === "recepcao";
  const isAdmin = me?.role === "admin";

  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "disponivel" | "manutencao" }) =>
      apiPut<Room>(`/rooms/${vars.id}`, { status: vars.status }),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${room.label} atualizado`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost<Room>("/rooms", {
        number: newNumber ? Number(newNumber) : undefined,
        label: newLabel.trim() || undefined,
      }),
    onSuccess: (room) => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      setCreateOpen(false);
      setNewNumber("");
      setNewLabel("");
      toast.success(`${room.label} criado`);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="rooms-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Consultórios</h2>
          <p className="text-sm text-slate-500">
            {rooms.filter((r) => r.status === "em_atendimento").length} em atendimento ·{" "}
            {rooms.filter((r) => r.status === "disponivel").length} disponíveis · {rooms.length} no total
          </p>
        </div>
        {isAdmin && (
          <Button data-testid="rooms-new-button" className="gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Novo consultório
          </Button>
        )}
      </div>

      {roomsQuery.data === undefined ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              data-testid={`room-card-${room.number}`}
              className={cn(
                "rounded-2xl border-2 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)] transition-shadow duration-200 hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]",
                roomBorder(room.status),
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#155E75]">
                    <Wrench className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="font-heading text-lg font-bold text-slate-900">{room.label}</p>
                </div>
                <RoomStatusPill status={room.status} />
              </div>

              <div className="mt-4 min-h-16 rounded-xl bg-[#F1F5F9] p-4">
                {room.status === "em_atendimento" ? (
                  <div data-testid={`room-current-${room.number}`}>
                    <div className="flex items-center gap-2">
                      <TicketBadge ticket={room.current_ticket ?? ""} />
                      <p className="truncate text-sm font-semibold text-slate-800">{room.current_patient}</p>
                    </div>
                    {room.professional_name && (
                      <p className="mt-1 text-xs text-slate-500">com {room.professional_name}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    {room.status === "manutencao"
                      ? "Sala indisponível para atendimentos."
                      : "Sala livre — pronto para receber o próximo paciente."}
                  </p>
                )}
              </div>

              {canManage && (
                <div className="mt-4 flex justify-end gap-2">
                  {room.status === "disponivel" && (
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`room-maintenance-${room.number}`}
                      onClick={() => statusMutation.mutate({ id: room.id, status: "manutencao" })}
                    >
                      Iniciar manutenção
                    </Button>
                  )}
                  {room.status === "manutencao" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      data-testid={`room-release-${room.number}`}
                      onClick={() => statusMutation.mutate({ id: room.id, status: "disponivel" })}
                    >
                      Disponibilizar
                    </Button>
                  )}
                  {room.status === "em_atendimento" && (
                    <p className="text-xs text-slate-400">
                      Finalize o atendimento na tela de chamada
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading" data-testid="rooms-dialog-title">
              Novo consultório
            </DialogTitle>
            <DialogDescription>
              O número é sugerido automaticamente — informe apenas se quiser personalizar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-number">Número</Label>
              <Input
                id="room-number"
                data-testid="rooms-form-number"
                type="number"
                min={1}
                placeholder={`Ex.: ${rooms.length + 1}`}
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-label">Nome de exibição</Label>
              <Input
                id="room-label"
                data-testid="rooms-form-label"
                placeholder="Deixe vazio para usar Consultório 0X"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="rooms-form-cancel">
              Cancelar
            </Button>
            <Button
              data-testid="rooms-form-submit"
              disabled={createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Criando..." : "Criar consultório"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
