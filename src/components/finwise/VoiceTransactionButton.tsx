import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseVoiceCommand } from "@/lib/finwise/voice-parse";

type Props = {
  onParsed: (prefill: {
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

export function VoiceTransactionButton({ onParsed }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setSupported(!!getSR());
    return () => { recRef.current?.abort(); };
  }, []);

  if (!supported) return null;

  const start = () => {
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
      onParsed({
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
    try { rec.start(); } catch { setListening(false); }
  };

  const stop = () => { recRef.current?.stop(); };

  return (
    <Button
      onClick={listening ? stop : start}
      variant="secondary"
      className={`w-full sm:w-auto ${listening ? "bg-primary/20 text-primary animate-pulse" : "bg-sky-500/15 text-sky-300 hover:bg-sky-500/25"}`}
      aria-label={listening ? "Parar gravação" : "Cadastrar por voz"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {listening ? "Ouvindo..." : "Por voz"}
    </Button>
  );
}
