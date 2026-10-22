import { useDeferredValue, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { ageFrom, apiErrorMessage, formatDateOnly, maskCpf, maskPhone } from "@/lib/format";
import { SERVICE_TYPES } from "@/lib/types";
import type { QueryClient } from "@tanstack/react-query";
import type { Patient as PatientModel, ServiceType } from "@/lib/types";
import { TicketBadge } from "@/components/pills";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

interface FormState {
  name: string;
  birth_date: string;
  cpf: string;
  phone: string;
  card_number: string;
  service_type: ServiceType;
  notes: string;
  issue_ticket: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  birth_date: "",
  cpf: "",
  phone: "",
  card_number: "",
  service_type: "Consulta",
  notes: "",
  issue_ticket: true,
};

function patientToForm(patient: PatientModel): FormState {
  return {
    name: patient.name,
    birth_date: patient.birth_date,
    cpf: patient.cpf,
    phone: patient.phone,
    card_number: patient.card_number,
    service_type: patient.service_type,
    notes: patient.notes,
    issue_ticket: false,
  };
}

function invalidatePatientData(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["patients"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["calls"] });
}

function PatientFormDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PatientModel | null;
  onSaved: (patient: PatientModel, created: boolean) => void;
}) {
  const [form, setForm] = useState<FormState>(initial ? patientToForm(initial) : EMPTY_FORM);
  const [error, setError] = useState("");
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const save = useMutation({
    mutationFn: () => {
      if (initial) return apiPut<PatientModel>(`/patients/${initial.id}`, form);
      return apiPost<PatientModel>("/patients", form);
    },
    onSuccess: (patient) => onSaved(patient, !initial),
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.birth_date) {
      setError("Nome e data de nascimento são obrigatórios.");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading" data-testid="patients-dialog-title">
            {initial ? "Editar paciente" : "Novo paciente"}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? "Atualize os dados do cadastro."
              : "Ao salvar, o paciente recebe uma senha e entra na fila de espera."}
          </DialogDescription>
        </DialogHeader>
        <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="patient-name">Nome completo *</Label>
            <Input
              id="patient-name"
              data-testid="patients-form-name"
              placeholder="Ex.: Maria Aparecida Silva"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-birth">Data de nascimento *</Label>
            <Input
              id="patient-birth"
              data-testid="patients-form-birth"
              type="date"
              value={form.birth_date}
              onChange={(e) => set({ birth_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-cpf">CPF</Label>
            <Input
              id="patient-cpf"
              data-testid="patients-form-cpf"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => set({ cpf: maskCpf(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-phone">Telefone</Label>
            <Input
              id="patient-phone"
              data-testid="patients-form-phone"
              placeholder="(61) 90000-0000"
              value={form.phone}
              onChange={(e) => set({ phone: maskPhone(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="patient-card">Nº do cartão / prontuário</Label>
            <Input
              id="patient-card"
              data-testid="patients-form-card"
              placeholder="SUS 700 2890 ..."
              value={form.card_number}
              onChange={(e) => set({ card_number: e.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Tipo de atendimento *</Label>
            <Select
              value={form.service_type}
              onValueChange={(value: string) => set({ service_type: value as ServiceType })}
            >
              <SelectTrigger data-testid="patients-form-service-type" className="w-full">
                <SelectValue>{form.service_type}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SERVICE_TYPES.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="patient-notes">Observações</Label>
            <Textarea
              id="patient-notes"
              data-testid="patients-form-notes"
              rows={2}
              placeholder="Alergias, mobilidade reduzida, acompanhante..."
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </div>
          {!initial && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <Checkbox
                id="patient-issue-ticket"
                data-testid="patients-form-issue-ticket"
                checked={form.issue_ticket}
                onCheckedChange={(checked) => set({ issue_ticket: checked === true })}
              />
              <Label htmlFor="patient-issue-ticket" className="font-normal">
                Emitir senha de atendimento agora (entrar na fila)
              </Label>
            </div>
          )}

          {error && (
            <p
              role="alert"
              data-testid="patients-form-error"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-[#DC2626] sm:col-span-2"
            >
              {error}
            </p>
          )}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="patients-form-cancel">
              Cancelar
            </Button>
            <Button
              type="submit"
              data-testid="patients-form-submit"
              disabled={save.isPending || !form.name.trim() || !form.birth_date}
            >
              {save.isPending ? "Salvando..." : initial ? "Salvar alterações" : "Cadastrar paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  patient,
  onClose,
}: {
  patient: PatientModel | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const del = useMutation({
    mutationFn: () => apiDelete(`/patients/${patient?.id ?? ""}`),
    onSuccess: () => {
      invalidatePatientData(qc);
      toast.success("Paciente excluído");
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <Dialog open={patient !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Excluir paciente</DialogTitle>
          <DialogDescription data-testid="patients-delete-description">
            Remover <strong>{patient?.name}</strong> do cadastro? A senha aguardando atendimento (se houver)
            também sai da fila. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="patients-delete-cancel">
            Cancelar
          </Button>
          <Button
            variant="destructive"
            data-testid="patients-delete-confirm"
            disabled={del.isPending}
            onClick={() => del.mutate()}
          >
            {del.isPending ? "Excluindo..." : "Excluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Patients() {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const search = useDeferredValue(searchInput);
  const [serviceFilter, setServiceFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PatientModel | null>(null);
  const [deleting, setDeleting] = useState<PatientModel | null>(null);

  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  if (serviceFilter !== "all") params.set("service_type", serviceFilter);
  const qs = params.toString();

  const patientsQuery = useQuery({
    queryKey: ["patients", search, serviceFilter],
    queryFn: () => apiGet<PatientModel[]>(`/patients${qs ? `?${qs}` : ""}`),
  });
  const patients = patientsQuery.data ?? [];

  const handleSaved = (patient: PatientModel, created: boolean) => {
    invalidatePatientData(qc);
    if (created && patient.active_ticket) {
      toast.success(`Paciente cadastrado — senha ${patient.active_ticket} emitida`);
    } else {
      toast.success(created ? "Paciente cadastrado" : "Paciente atualizado");
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6" data-testid="patients-page">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-2xl font-bold text-slate-900">Pacientes</h2>
          <p className="text-sm text-slate-500">
            {patients.length} paciente(s) cadastrados · cadastro emite a senha de atendimento
          </p>
        </div>
        <Button
          data-testid="patients-new-button"
          className="gap-2"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo paciente
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            data-testid="patients-search-input"
            placeholder="Pesquisar por nome, CPF, cartão ou telefone..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select value={serviceFilter} onValueChange={(value: string) => setServiceFilter(value)}>
          <SelectTrigger data-testid="patients-filter-service" className="sm:w-56">
            <SelectValue>
              {serviceFilter === "all" ? "Todos os tipos" : serviceFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {SERVICE_TYPES.map((service) => (
              <SelectItem key={service} value={service}>
                {service}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
        {!patientsQuery.data ? (
          <div className="space-y-3 p-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200/70" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Senha ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-slate-500" data-testid="patients-empty">
                    Nenhum paciente encontrado para a busca atual.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => (
                  <TableRow key={patient.id} data-testid={`patients-row-${patient.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E0F2FE] text-[#155E75]">
                          <UserRound className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{patient.name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDateOnly(patient.birth_date)}
                            {ageFrom(patient.birth_date) !== null ? ` · ${ageFrom(patient.birth_date)} anos` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{patient.cpf || "—"}</TableCell>
                    <TableCell className="text-slate-600">{patient.phone || "—"}</TableCell>
                    <TableCell className="max-w-40 truncate font-mono text-xs text-slate-600">
                      {patient.card_number || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="rounded-full border border-slate-200 bg-[#F1F5F9] px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {patient.service_type}
                      </span>
                    </TableCell>
                    <TableCell>
                      {patient.active_ticket ? (
                        <TicketBadge ticket={patient.active_ticket} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-testid={`patients-edit-${patient.id}`}
                          aria-label={`Editar ${patient.name}`}
                          onClick={() => {
                            setEditing(patient);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          data-testid={`patients-delete-${patient.id}`}
                          aria-label={`Excluir ${patient.name}`}
                          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={() => setDeleting(patient)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <PatientFormDialog
        key={editing ? editing.id : "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        onSaved={handleSaved}
      />
      <DeleteDialog patient={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
