// Áudio da TV de chamadas: bip sintetizado (Web Audio API) + voz em português
// (Web Speech API). Nenhum arquivo externo, nenhum CDN.

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

export function playChime(): void {
  try {
    const ac = ctx();
    const t0 = ac.currentTime;
    const notes: Array<[number, number]> = [
      [880, 0],
      [1174.66, 0.28],
    ];
    for (const [freq, offset] of notes) {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t0 + offset);
      gain.gain.exponentialRampToValueAtTime(0.35, t0 + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.55);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t0 + offset);
      osc.stop(t0 + offset + 0.6);
    }
  } catch {
    // Sem áudio disponível — o alerta visual da TV continua funcionando.
  }
}

function roomForSpeech(roomLabel: string): string {
  // "Consultório 03" soa melhor falado como "Consultório 3".
  return roomLabel.replace(/0+(\d)/g, "$1");
}

export interface AnnouncePayload {
  ticket: string;
  patientName?: string | null;
  roomLabel: string;
}

export function speakCall(payload: AnnouncePayload): void {
  if (!("speechSynthesis" in window)) return;
  const parts = [`Senha ${payload.ticket}`];
  if (payload.patientName) parts.push(payload.patientName);
  parts.push(`dirija-se ao ${roomForSpeech(payload.roomLabel)}`);
  const utterance = new SpeechSynthesisUtterance(`${parts.join(", ")}.`);
  utterance.lang = "pt-BR";
  utterance.rate = 0.92;
  const voices = window.speechSynthesis.getVoices();
  const ptVoice = voices.find((v) => v.lang.toLowerCase().startsWith("pt"));
  if (ptVoice) utterance.voice = ptVoice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
