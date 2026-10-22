import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { apiErrorMessage, getInitials } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User } from "@/lib/types";
import { cn } from "@/lib/utils";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLE_BADGE: Record<Role, string> = {
  admin: "border-[#155E75]/30 bg-[#E0F2FE] text-[#155E75]",
  recepcao: "border-sky-200 bg-sky-50 text-sky-700",
  enfermagem: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medico: "border-cyan-200 bg-cyan-50 text-cyan-700",
};

function Restricted() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm" data-testid="restricted-card">
      <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
      <h2 className="mt-3 font-heading text-xl font-bold text-slate-900">Acesso restrito</h2>
      <p className="mt-1 text-sm text-slate-500">Esta área é exclusiva do administrador.</p>
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("recepcao");
  const [specialty, setSpecialty] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () =>
      apiPost<User>("/users", {
        name,
        username,
        password,
        role,
        specialty: specialty.trim() || null,
      }),
    onSuccess: (user) => {
      onSaved();
      setName("");
      setUsername("");
      setPassword("");
      setSpecialty("");
      toast.success(`${user.name} adicionado à equipe`);
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading" data-testid="professionals-dialog-title">
            Novo usuário
          </DialogTitle>
          <DialogDescription>Crie o acesso de um profissional da equipe HMV.</DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError("");
            create.mutate();
          }}
          noValidate
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="user-name">Nome completo *</Label>
            <Input
              id="user-name"
              data-testid="professionals-form-name"
              placeholder="Ex.: Dra. Helena Castro"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-username">Usuário de acesso *</Label>
            <Input
              id="user-username"
              data-testid="professionals-form-username"
              placeholder="ex.: helena.castro"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Senha *</Label>
            <Input
              id="user-password"
              data-testid="professionals-form-password"
              type="password"
              placeholder="mínimo 4 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Perfil de acesso *</Label>
            <Select value={role} onValueChange={(value: string) => setRole(value as Role)}>
              <SelectTrigger data-testid="professionals-form-role" className="w-full">
                <SelectValue>{ROLE_LABELS[role]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-specialty">Especialidade</Label>
            <Input
              id="user-specialty"
              data-testid="professionals-form-specialty"
              placeholder="Ex.: Clínico Geral"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-[#DC2626] sm:col-span-2"
            >
              {error}
            </p>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="professionals-form-submit"
              disabled={create.isPending || !name.trim() || !username.trim() || password.length < 4}
            >
              {create.isPending ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Professionals() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => apiGet<User[]>("/users"),
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<User | null>(null);

  const deleteMutation = useMutation({
    mutationFn: () => apiDelete(`/users/${deleting?.id ?? ""}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("Usuário removido");
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const me = meQuery.data;
  const users = usersQuery.data ?? [];

  if (meQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;
  }
  if (!me || me.role !== "admin") return <Restricted />;

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="professionals-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Profissionais</h2>
          <p className="text-sm text-slate-500">
            {users.length} usuário(s) ativos · corpo clínico e equipe do HMV
          </p>
        </div>
        <Button data-testid="professionals-new-button" className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo usuário
        </Button>
      </div>

      {usersQuery.data === undefined ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <div
              key={user.id}
              data-testid={`professional-card-${user.username}`}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#155E75] font-heading text-sm font-bold text-white">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                </div>
                {user.id !== me.id && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remover ${user.name}`}
                    data-testid={`professionals-delete-${user.username}`}
                    className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => setDeleting(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                    ROLE_BADGE[user.role],
                  )}
                  data-testid={`professional-role-${user.username}`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
                {user.specialty && (
                  <span className="rounded-full border border-slate-200 bg-[#F1F5F9] px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {user.specialty}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => {
          setCreateOpen(false);
          qc.invalidateQueries({ queryKey: ["users"] });
        }}
      />

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Remover usuário</DialogTitle>
            <DialogDescription data-testid="professionals-delete-description">
              Remover <strong>{deleting?.name}</strong>? O acesso dele ao sistema será desativado
              imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              data-testid="professionals-delete-confirm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
