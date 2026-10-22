import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Activity, Eye, EyeOff, HeartPulse, LogIn, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { apiErrorMessage } from "@/lib/format";
import { beginSession } from "@/lib/session";
import { ROLE_LABELS } from "@/lib/types";
import type { Role, User } from "@/lib/types";
import HMVLogo from "@/components/HMVLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_USERS: Array<{ role: Role; username: string; password: string }> = [
  { role: "admin", username: "admin", password: "admin123" },
  { role: "recepcao", username: "recepcao", password: "123456" },
  { role: "enfermagem", username: "enfermagem", password: "123456" },
  { role: "medico", username: "medico", password: "123456" },
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?crop=entropy&cs=srgb&fm=jpg&q=85";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: () => apiPost<User>("/auth/login", { username, password }),
    onSuccess: (user) => {
      beginSession();
      toast.success(`Bem-vindo(a), ${user.name}!`);
      navigate("/dashboard", { replace: true });
    },
    onError: (err) => setError(apiErrorMessage(err)),
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!username.trim() || !password) {
      setError("Informe usuário e senha.");
      return;
    }
    loginMutation.mutate();
  };

  return (
    <div className="flex min-h-screen bg-[#F1F5F9]" data-testid="login-page">
      {/* Painel institucional (desktop) */}
      <div className="relative hidden flex-1 overflow-hidden bg-[#155E75] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#155E75] via-[#155E75]/80 to-[#0C4A6E]" aria-hidden="true" />
        <div className="relative">
          <HMVLogo inverted />
        </div>
        <div className="relative max-w-lg space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="font-heading text-4xl font-extrabold leading-tight xl:text-5xl"
          >
            Cuidar de pessoas com tecnologia e confiança.
          </motion.h2>
          <p className="text-lg text-[#E0F2FE]">
            Gestão de pacientes, consultórios e chamadas em tempo real do Hospital Municipal Valparaíso.
          </p>
          <ul className="space-y-3 text-[#E0F2FE]">
            <li className="flex items-center gap-3">
              <HeartPulse className="h-5 w-5 shrink-0" aria-hidden="true" />
              Chamada de pacientes com voz e painel na TV
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
              Perfis de acesso: administração, recepção, enfermagem e corpo médico
            </li>
            <li className="flex items-center gap-3">
              <Activity className="h-5 w-5 shrink-0" aria-hidden="true" />
              Indicadores e relatórios do hospital em tempo real
            </li>
          </ul>
        </div>
        <p className="relative text-sm text-white/70">
          © {new Date().getFullYear()} HMV — Hospital Municipal Valparaíso · Uso interno
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex justify-center lg:justify-start">
            <HMVLogo />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.08)] sm:p-8">
            <h1 className="font-heading text-2xl font-bold text-slate-900" data-testid="login-title">
              Acessar o sistema
            </h1>
            <p className="mt-1 text-sm text-slate-500">Entre com suas credenciais institucionais.</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  data-testid="login-input-username"
                  autoComplete="username"
                  placeholder="ex.: recepcao"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="login-input-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    data-testid="login-password-toggle"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  data-testid="login-error-message"
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-[#DC2626]"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2"
                data-testid="login-submit-button"
                disabled={loginMutation.isPending}
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {loginMutation.isPending ? "Entrando..." : "ENTRAR"}
              </Button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Acesso de demonstração — clique para preencher
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    data-testid={`login-demo-${demo.role}`}
                    onClick={() => {
                      setUsername(demo.username);
                      setPassword(demo.password);
                      setError("");
                    }}
                    className="rounded-lg border border-slate-200 bg-[#F1F5F9] px-3 py-2 text-left text-xs transition-colors duration-150 hover:border-[#155E75] hover:bg-[#E0F2FE]"
                  >
                    <span className="block font-semibold text-slate-700">{ROLE_LABELS[demo.role]}</span>
                    <span className="text-slate-500">
                      {demo.username} / {demo.password}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
