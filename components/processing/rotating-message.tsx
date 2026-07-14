"use client";

import { useEffect, useState } from "react";

const DEFAULT_MESSAGES = [
  "Analizando tu perfil financiero...",
  "Calculando rentabilidad...",
  "Cruzando con inventario de propiedades...",
  "Preparando tu propuesta personalizada...",
];

export function RotatingMessage({
  messages = DEFAULT_MESSAGES,
  intervalMs = 1300,
}: {
  messages?: string[];
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const fadeOut = setTimeout(() => setVisible(false), intervalMs - 250);
    const advance = setTimeout(() => {
      setIndex((i) => (i + 1) % messages.length);
      setVisible(true);
    }, intervalMs);

    return () => {
      clearTimeout(fadeOut);
      clearTimeout(advance);
    };
  }, [index, intervalMs, messages.length]);

  return (
    <p
      className="text-base text-[--text-secondary] transition-opacity duration-300 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
    >
      {messages[index]}
    </p>
  );
}
