import { useState, useEffect, useRef } from "react";
import { Plus, ArrowUpCircle, ArrowDownCircle, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { parseVoiceCommand } from "@/lib/finwise/voice-parse";

type Props = {
  onIncome: () => void;
  onExpense: () => void;
  onVoiceParsed: (prefill: {
    type?: "entrada" | "despesa";
    description?: string;
    amount?: number;
  }) => void;
};

type SRConstructor = new () => SpeechRecognition;
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: { results: { 0: { transcript: string } }[] & { length: number } }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function getSR(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function FloatingActionMenu({ onIncome, onExpense, onVoiceParsed }: Props) {
  const [open, setOpen] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(!!getSR());
    return () => { recRef.current?.abort(); };
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const startVoice = () => {
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const transcript = ev.results[0][0].transcript;
      const parsed = parseVoiceCommand(transcript);
      if (parsed.type === null || parsed.amount === null) {
        toast.error("Não consegui entender, tente novamente ou cadastre manualmente");
      } else {
        toast.success(`Ouvi: "${transcript}"`);
      }
      onVoiceParsed({
        type: parsed.type ?? undefined,
        description: parsed.description || undefined,
        amount: parsed.amount ?? undefined,
      });
    };
    rec.onerror = (ev) => {
      if (ev.error !== "aborted" && ev.error !== "no-speech") {
        toast.error(`Erro no microfone: ${ev.error}`);
      }
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    setListening(true);
    setOpen(false);
    try { rec.start(); } catch { setListening(false); }
  };

  const stopVoice = () => { recRef.current?.stop(); };

  return (
    <div ref={menuRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <div
        className={`flex flex-col items-end gap-3 transition-all duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}
      >
        <button
          onClick={() => { setOpen(false); onIncome(); }}
          className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-emerald-400/50 backdrop-blur-sm transition hover:scale-105 hover:bg-emerald-500"
        >
          <ArrowUpCircle className="h-4 w-4" /> Nova Entrada
        </button>
        <button
          onClick={() => { setOpen(false); onExpense(); }}
          className="flex items-center gap-2 rounded-full bg-rose-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg ring-1 ring-rose-400/50 backdrop-blur-sm transition hover:scale-105 hover:bg-rose-500"
        >
          <ArrowDownCircle className="h-4 w-4" /> Nova Despesa
        </button>
        {voiceSupported && (
          <button
            onClick={listening ? stopVoice : startVoice}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ring-1 backdrop-blur-sm transition hover:scale-105 ${listening ? "bg-primary/90 text-white ring-primary/50 animate-pulse" : "bg-sky-500/90 text-white ring-sky-400/50 hover:bg-sky-500"}`}
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? "Ouvindo..." : "Por voz"}
          </button>
        )}
      </div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-xl ring-1 backdrop-blur-sm transition-all duration-300 ${open ? "bg-rose-500/90 text-white rotate-45 ring-rose-400/50 hover:bg-rose-500" : "bg-primary/90 text-white rotate-0 ring-primary/50 hover:bg-primary"}`}
        aria-label="Menu de ações"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}
