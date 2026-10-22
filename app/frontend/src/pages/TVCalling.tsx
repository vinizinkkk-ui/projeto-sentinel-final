import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Maximize, Volume2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { playChime, speakCall } from "@/lib/audioAnnounce";
import { formatTime } from "@/lib/format";
import type { AppSettings, Call } from "@/lib/types";
import HMVLogo from "@/components/HMVLogo";
import { Button } from "@/components/ui/button";

// Rota pública: roda em monitor próprio (saguão), sem login.
// Atualiza por polling a cada 2,5s — nenhuma recarga manual é necessária.
export default function TVCalling() {
  const [audioOn, setAudioOn] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [flashKey, setFlashKey] = useState(0);
  const announcedRef = useRef("");

  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const currentQuery = useQuery({
    queryKey: ["calls", "current"],
    queryFn: () => apiGet<Call | null>("/calls/current"),
    refetchInterval: 2500,
    retry: 1,
  });
  const recentQuery = useQuery({
    queryKey: ["calls", "recent"],
    queryFn: () => apiGet<Call[]>("/calls/recent?limit=6"),
    refetchInterval: 2500,
    retry: 1,
  });
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<AppSettings>("/settings"),
    staleTime: 60_000,
  });

  const current = currentQuery.data ?? null;
  const recent = recentQuery.data ?? [];
  const settings = settingsQuery.data;

  const announce = (call: Call) => {
    if (settings?.sound_enabled !== false) playChime();
    if (settings?.voice_enabled !== false) {
      speakCall({
        ticket: call.ticket,
        patientName: settings?.show_patient_name_on_tv === false ? null : call.patient_name,
        roomLabel: call.room_label ?? "a recepção",
      });
    }
  };

  // Anuncia quando uma nova chamada aparece (ou quando a chamada ativa é repetida).
  useEffect(() => {
    if (!current) return;
    const key = `${current.id}:${current.repeat_count}`;
    if (announcedRef.current === key) return;
    announcedRef.current = key;
    setFlashKey((k) => k + 1);
    if (audioOn) announce(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, audioOn, settings]);

  const enableAudio = () => {
    setAudioOn(true);
    playChime();
    if (current) announce(current);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const timeStr = clock.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const dateStr = clock.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });

  const showName = settings?.show_patient_name_on_tv !== false;

  return (
    <div
      className="relative flex h-screen select-none flex-col overflow-hidden bg-slate-950 text-slate-50"
      data-testid="tv-screen"
    >
      {/* Cabeçalho institucional */}
      <header className="flex h-20 shrink-0 items-center justify-between border-b-4 border-cyan-400 bg-[#0F766E] px-6 shadow-md lg:px-8">
        <div className="flex items-center gap-4">
          <HMVLogo inverted markClassName="h-14 w-14 rounded-2xl" className="gap-4" />
          <div className="hidden leading-tight md:block">
            <p className="font-heading text-2xl font-extrabold tracking-tight lg:text-3xl">
              HMV — Hospital Municipal Valparaíso
            </p>
            <p className="text-sm font-medium text-cyan-100 lg:text-base">
              Painel de chamada de pacientes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="text-right">
            <p className="font-mono text-3xl font-bold tabular-nums lg:text-4xl" data-testid="tv-clock">
              {timeStr}
            </p>
            <p className="text-xs capitalize text-cyan-100 lg:text-sm" data-testid="tv-date">
              {dateStr}
            </p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            data-testid="tv-fullscreen-button"
            aria-label="Alternar tela cheia"
            className="border-cyan-200/60 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Corpo */}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-5 p-5 lg:grid-cols-12">
        {/* Chamada atual */}
        <section
          className="relative flex min-h-0 flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-cyan-500 bg-white p-8 text-center text-slate-900 shadow-2xl lg:col-span-8"
          aria-live="assertive"
          data-testid="tv-current-call"
        >
          {current ? (
            <div key={flashKey} className="animate-hmv-flash flex flex-col items-center gap-4">
              <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-[0.3em] text-slate-500 md:text-base">
                <span className="h-3 w-3 animate-hmv-blink rounded-full bg-[#DC2626]" aria-hidden="true" />
                Chamada atual
              </p>
              <p
                className="rounded-3xl bg-[#0284C7] px-10 py-5 font-mono text-7xl font-black leading-none tracking-tight text-white md:text-8xl lg:text-9xl"
                data-testid="tv-current-ticket"
              >
                {current.ticket}
              </p>
              {showName && (
                <p className="font-heading text-3xl font-bold text-slate-900 md:text-5xl" data-testid="tv-current-patient">
                  {current.patient_name}
                </p>
              )}
              <p className="font-heading text-2xl font-extrabold uppercase tracking-wide text-[#0F766E] md:text-4xl" data-testid="tv-current-room">
                {current.room_label ?? "Recepção"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5" data-testid="tv-idle">
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400 md:text-base">
                Chamada atual
              </p>
              <p className="font-heading text-4xl font-bold text-slate-300 md:text-6xl">
                Aguardando chamada...
              </p>
              <p className="max-w-md text-lg text-slate-400 md:text-xl">
                Aguarde no saguão — sua senha será chamada neste painel.
              </p>
            </div>
          )}
        </section>

        {/* Últimas chamadas */}
        <aside className="flex min-h-0 flex-col rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-xl lg:col-span-4">
          <h2 className="flex items-center gap-3 text-lg font-bold uppercase tracking-wider text-cyan-300 lg:text-xl">
            <span className="h-2.5 w-2.5 animate-hmv-blink rounded-full bg-cyan-400" aria-hidden="true" />
            Últimas chamadas
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2 border-b border-slate-700 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Senha</span>
            <span>Consultório</span>
            <span className="text-right">Horário</span>
          </div>
          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-slate-500" data-testid="tv-recent-empty">
                Nenhuma chamada ainda hoje.
              </p>
            ) : (
              recent.map((call, index) => (
                <div
                  key={call.id}
                  data-testid={`tv-recent-row-${index}`}
                  className="grid grid-cols-3 items-center gap-2 rounded-xl bg-slate-800/70 px-4 py-3"
                >
                  <span className="font-mono text-xl font-bold text-white md:text-2xl">{call.ticket}</span>
                  <span className="truncate text-sm font-semibold text-slate-300 md:text-base">
                    {call.room_label ?? "—"}
                  </span>
                  <span className="text-right font-mono text-sm text-slate-400 md:text-base">
                    {formatTime(call.called_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>
      </main>

      {/* Rodapé com letreiro */}
      <footer className="flex h-14 shrink-0 items-center overflow-hidden border-t border-slate-800 bg-slate-900 px-6">
        <div className="flex w-max animate-hmv-ticker gap-16 whitespace-nowrap text-sm font-medium text-cyan-300 md:text-base">
          {[0, 1].map((copy) => (
            <span key={copy} className="flex gap-16">
              <span>Bem-vindo ao HMV — Hospital Municipal Valparaíso</span>
              <span>Mantenha o silêncio no saguão de espera</span>
              <span>Acompanhe o painel — sua senha será chamada</span>
              <span>Higienize as mãos: sua saúde em primeiro lugar</span>
            </span>
          ))}
        </div>
        <a
          href="/login"
          className="ml-6 shrink-0 text-xs text-slate-500 underline-offset-4 hover:text-cyan-300 hover:underline"
          data-testid="tv-admin-link"
        >
          Área administrativa
        </a>
      </footer>

      {/* Portão de áudio — navegadores exigem interação para tocar som/voz */}
      {!audioOn && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-8 text-center shadow-2xl">
            <Volume2 className="mx-auto h-12 w-12 text-cyan-400" aria-hidden="true" />
            <h2 className="mt-4 font-heading text-2xl font-bold text-white">Som do painel</h2>
            <p className="mt-2 text-sm text-slate-400">
              Ative o áudio para ouvir a chamada das senhas em português, com alerta sonoro a cada novo
              paciente.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button size="lg" onClick={enableAudio} data-testid="tv-enable-audio-button">
                <Volume2 className="h-5 w-5" aria-hidden="true" /> ATIVAR ÁUDIO
              </Button>
              <Button
                variant="ghost"
                onClick={() => setAudioOn(true)}
                data-testid="tv-disable-audio-button"
                className="text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Continuar sem áudio
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
