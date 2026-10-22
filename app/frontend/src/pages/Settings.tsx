import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MonitorPlay, ShieldAlert, UserCog } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import type { AppSettings, User } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEMO_ACCOUNTS = [
  { role: "Administrador", username: "admin", password: "admin123" },
  { role: "Recepção", username: "recepcao", password: "123456" },
  { role: "Enfermagem", username: "enfermagem", password: "123456" },
  { role: "Médico", username: "medico", password: "123456" },
];

function Restricted() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm" data-testid="settings-restricted">
      <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
      <h2 className="mt-3 font-heading text-xl font-bold text-slate-900">Acesso restrito</h2>
      <p className="mt-1 text-sm text-slate-500">Esta área é exclusiva do administrador.</p>
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onToggle,
  testid,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
  testid: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-[#F1F5F9] p-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <Checkbox
        checked={checked}
        onCheckedChange={(checked) => onToggle(checked === true)}
        data-testid={testid}
        aria-label={title}
      />
    </div>
  );
}

export default function Settings() {
  const qc = useQueryClient();
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<AppSettings>("/settings"),
  });
  const settings = settingsQuery.data;

  const save = useMutation({
    mutationFn: (next: AppSettings) => apiPut<AppSettings>("/settings", next),
    onSuccess: (saved) => {
      qc.setQueryData(["settings"], saved);
      toast.success("Configurações salvas — a TV aplica em segundos");
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const me = meQuery.data;
  if (meQuery.isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />;
  }
  if (!me || me.role !== "admin") return <Restricted />;

  const toggle = (key: keyof AppSettings) => (checked: boolean) => {
    if (!settings) return;
    save.mutate({ ...settings, [key]: checked });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6" data-testid="settings-page">
      <div>
        <h2 className="font-heading text-2xl font-bold text-slate-900">Configurações</h2>
        <p className="text-sm text-slate-500">Preferências do painel da TV e do sistema.</p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <MonitorPlay className="h-4 w-4" aria-hidden="true" /> TV de chamadas
          </CardDescription>
          <CardTitle className="font-heading text-lg">Exibição no saguão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <SettingToggle
            title="Exibir nome do paciente na TV"
            description="Por privacidade (LGPD), desative para mostrar apenas a senha e o consultório."
            checked={settings?.show_patient_name_on_tv ?? true}
            onToggle={toggle("show_patient_name_on_tv")}
            testid="settings-toggle-show-name"
          />
          <SettingToggle
            title="Anunciar por voz (português)"
            description="O painel fala a senha e o consultório usando a síntese de voz do navegador."
            checked={settings?.voice_enabled ?? true}
            onToggle={toggle("voice_enabled")}
            testid="settings-toggle-voice"
          />
          <SettingToggle
            title="Alerta sonoro ao chamar"
            description="Emite um bip ao iniciar cada nova chamada na TV."
            checked={settings?.sound_enabled ?? true}
            onToggle={toggle("sound_enabled")}
            testid="settings-toggle-sound"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
            <UserCog className="h-4 w-4" aria-hidden="true" /> Usuários e acessos
          </CardDescription>
          <CardTitle className="font-heading text-lg">Gestão da equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            A criação e remoção de usuários é feita na página <strong>Profissionais</strong>.
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-[#F1F5F9] text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Perfil</th>
                  <th className="px-4 py-2">Usuário</th>
                  <th className="px-4 py-2">Senha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEMO_ACCOUNTS.map((account) => (
                  <tr key={account.username} data-testid={`settings-account-${account.username}`}>
                    <td className="px-4 py-2 font-medium text-slate-700">{account.role}</td>
                    <td className="px-4 py-2 font-mono text-slate-600">{account.username}</td>
                    <td className="px-4 py-2 font-mono text-slate-600">{account.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link to="/profissionais" className={buttonVariants({ variant: "outline", size: "sm" })} data-testid="settings-go-professionals">
            Abrir Profissionais
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Sobre o sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-500">
          <p className="font-semibold text-slate-700">HMV — Hospital Municipal Valparaíso</p>
          <p>Sistema de gestão e chamada de pacientes · dados de demonstração (fictícios).</p>
          <p>A TV de chamadas funciona em /tv, sem login, em tela cheia, atualizando automaticamente.</p>
        </CardContent>
      </Card>
    </div>
  );
}
