"use client";

import type { LucideIcon } from "lucide-react";

/** Sparkle decorativo (✦) -- puramente visual, acompaña títulos y mensajes
 * motivacionales del wizard (ver referencias en Rediseño/rediseño/*.png). No
 * es iconografía funcional, por eso es un SVG simple en vez de lucide-react. */
export function Sparkle({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--gold)"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0c.6 4.6 1.4 7.6 2.9 9.1S19.4 11.4 24 12c-4.6.6-7.6 1.4-9.1 2.9S12.6 19.4 12 24c-.6-4.6-1.4-7.6-2.9-9.1S4.6 12.6 0 12c4.6-.6 7.6-1.4 9.1-2.9S11.4.6 12 0z" />
    </svg>
  );
}

/** Ilustración geométrica simple de edificios (esquina superior derecha del
 * wizard) con un badge tipo "corazón" -- decorativa, reutilizada en los 3
 * pasos. Se oculta en mobile para no competir con el título. */
export function BuildingsIllustration() {
  return (
    <svg
      width={140}
      height={90}
      viewBox="0 0 140 90"
      fill="none"
      aria-hidden="true"
      className="hidden shrink-0 lg:block"
    >
      <rect x="10" y="10" width="8" height="8" rx="2" fill="var(--dark-tertiary)" />
      <path d="M18 30h34v50H18z" fill="#dbe3fb" />
      <path d="M52 14h40v66H52z" fill="#c7d2f8" />
      <path d="M92 34h30v46H92z" fill="#eef1fe" stroke="var(--glass-border)" />
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 2 }).map((_, col) => (
          <rect key={`a-${row}-${col}`} x={24 + col * 14} y={38 + row * 14} width={8} height={8} rx={1.5} fill="#ffffff" fillOpacity={0.7} />
        ))
      )}
      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 2 }).map((_, col) => (
          <rect key={`b-${row}-${col}`} x={58 + col * 16} y={22 + row * 12} width={9} height={8} rx={1.5} fill="#ffffff" fillOpacity={0.7} />
        ))
      )}
      <circle cx="123" cy="30" r="12" fill="#ffffff" stroke="var(--glass-border)" />
      <path
        d="M123 35.5s-5.5-3.3-5.5-7.1a3.4 3.4 0 0 1 5.5-2.6 3.4 3.4 0 0 1 5.5 2.6c0 3.8-5.5 7.1-5.5 7.1z"
        fill="#f38ba0"
      />
    </svg>
  );
}

/** Header simple con logo Nodrix a la izquierda + ilustración decorativa a la
 * derecha, común a los 3 pasos del wizard. */
export function WizardHeader() {
  return (
    <header className="mb-6 flex items-start justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--text-primary)" }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 16 10 9l4 4 6-8" stroke="var(--gold)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="font-heading text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          Nodrix
        </span>
      </div>
      <BuildingsIllustration />
    </header>
  );
}

/** Título serif grande centrado con sparkles decorativos a los lados. */
export function WizardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="font-heading flex items-center justify-center gap-3 text-center text-[26px] font-bold sm:text-3xl"
      style={{ color: "var(--text-primary)" }}
    >
      <Sparkle size={18} className="hidden shrink-0 sm:block" />
      {children}
      <Sparkle size={18} className="hidden shrink-0 sm:block" />
    </h1>
  );
}

/** Badge pill informativo centrado -- usado para los mensajes de contexto
 * bajo el subtítulo de cada paso (privacidad, tip, estado de avance). */
export function InfoBadge({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: "neutral" | "success";
}) {
  const bg = tone === "success" ? "rgba(34,197,94,0.1)" : "var(--dark-tertiary)";
  const border = tone === "success" ? "rgba(34,197,94,0.35)" : "var(--glass-border)";
  const color = tone === "success" ? "var(--success)" : "var(--neon-cyan)";
  return (
    <div className="flex justify-center">
      <span
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium"
        style={{ backgroundColor: bg, border: `1px solid ${border}`, color }}
      >
        <Icon size={14} strokeWidth={2.25} />
        {children}
      </span>
    </div>
  );
}
