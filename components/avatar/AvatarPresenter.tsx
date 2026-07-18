"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export interface AvatarPresenterProps {
  /** Texto en español que el avatar "dice" (narrado + mostrado como caption). */
  script: string;
  /** Título opcional arriba del avatar. */
  heading?: string;
  /**
   * FUTURO: si se provee, renderiza un <video> real (servicio de avatar IA
   * tipo HeyGen/D-ID) en vez del avatar SVG animado + Web Speech API. Mismo
   * contrato de props para poder enchufarlo sin tocar los call sites.
   */
  videoUrl?: string;
  /** Callback al terminar (botón "Continuar" o fin del video). */
  onDone: () => void;
  continueLabel?: string;
}

/** Busca la mejor voz en español disponible, priorizando variantes chilenas/latam. */
function pickSpanishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  const byLang = (lang: string) =>
    voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase());

  return (
    byLang("es-CL") ??
    byLang("es-MX") ??
    byLang("es-ES") ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("es")) ??
    voices[0] ??
    null
  );
}

export function AvatarPresenter({
  script,
  heading,
  videoUrl,
  onDone,
  continueLabel = "Continuar",
}: AvatarPresenterProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const hasStartedRef = useRef(false);

  // Narración por voz sintética (Web Speech API). No aplica si hay videoUrl:
  // en ese caso el audio viene del video mismo.
  useEffect(() => {
    if (videoUrl) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const synth = window.speechSynthesis;

    function speak() {
      const utterance = new SpeechSynthesisUtterance(script);
      const voice = pickSpanishVoice(synth.getVoices());
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-CL";
      }
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      synth.speak(utterance);
    }

    // getVoices() puede devolver [] al inicio en algunos navegadores (Chrome
    // carga la lista de voces async) -- si pasa, esperamos voiceschanged.
    const voicesNow = synth.getVoices();
    if (voicesNow.length > 0) {
      speak();
    } else {
      const handleVoicesChanged = () => {
        synth.removeEventListener("voiceschanged", handleVoicesChanged);
        speak();
      };
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    }

    // Cancelamos al desmontar para no dejar narraciones huérfanas si el
    // usuario navega rápido (ej. hace click en Continuar o vuelve atrás).
    return () => {
      synth.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script, videoUrl]);

  // Parpadeo periódico de los ojos del avatar ilustrado (solo estético).
  useEffect(() => {
    if (videoUrl) return;
    const interval = window.setInterval(() => {
      setIsBlinking(true);
      window.setTimeout(() => setIsBlinking(false), 180);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [videoUrl]);

  function handleContinue() {
    // El cliente no debe quedar bloqueado esperando la narración -- si
    // todavía está hablando, la cancelamos antes de avanzar.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    onDone();
  }

  return (
    <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <div className="glass-card flex w-full max-w-md flex-col items-center gap-6 rounded-2xl p-8 text-center">
        {heading && (
          <h1 className="text-2xl font-semibold text-[--text-primary]">{heading}</h1>
        )}

        {videoUrl ? (
          <video
            src={videoUrl}
            className="w-full rounded-xl"
            autoPlay
            muted
            controls
            onEnded={handleContinue}
          />
        ) : (
          <IllustratedAvatar isSpeaking={isSpeaking} isBlinking={isBlinking} />
        )}

        {/* Caption siempre visible (accesibilidad + audio silenciado). */}
        <p className="text-base leading-relaxed text-[--text-secondary]">{script}</p>

        <Button className="glow-cyan w-full" onClick={handleContinue}>
          {continueLabel}
        </Button>
      </div>
    </main>
  );
}

function IllustratedAvatar({
  isSpeaking,
  isBlinking,
}: {
  isSpeaking: boolean;
  isBlinking: boolean;
}) {
  return (
    <div className="glow-cyan flex items-center justify-center rounded-full">
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="76" fill="none" stroke="var(--neon-purple)" strokeWidth="2" />
        <circle cx="80" cy="80" r="66" fill="var(--glass-bg, rgba(255,255,255,0.03))" />

        {/* Ojos: parpadeo cada pocos segundos */}
        <ellipse
          cx="58"
          cy="72"
          rx="6"
          ry={isBlinking ? 0.5 : 6}
          fill="var(--neon-cyan)"
          style={{ transition: "ry 120ms ease-out" }}
        />
        <ellipse
          cx="102"
          cy="72"
          rx="6"
          ry={isBlinking ? 0.5 : 6}
          fill="var(--neon-cyan)"
          style={{ transition: "ry 120ms ease-out" }}
        />

        {/* Boca: cambia de forma en loop mientras isSpeaking es true */}
        <path
          d={isSpeaking ? "M 55 100 Q 80 122 105 100" : "M 55 102 Q 80 108 105 102"}
          fill="none"
          stroke="var(--neon-purple)"
          strokeWidth="5"
          strokeLinecap="round"
          className={isSpeaking ? "avatar-mouth-talking" : undefined}
        />
      </svg>
      <style>{`
        @keyframes avatar-mouth-pulse {
          0%, 100% { d: path("M 55 100 Q 80 122 105 100"); }
          50% { d: path("M 60 104 Q 80 112 100 104"); }
        }
        .avatar-mouth-talking {
          animation: avatar-mouth-pulse 420ms ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
