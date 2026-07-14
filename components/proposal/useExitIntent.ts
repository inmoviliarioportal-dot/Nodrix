"use client"

import { useEffect, useState, useCallback } from "react"

/**
 * Detección de "intento de salida" para la Rama de Rescate.
 *
 * - Desktop (puntero fino, ej. mouse): patrón estándar `mouseleave` en
 *   `document` cuando `clientY <= 0` (el cursor sale por el borde superior de
 *   la ventana, típico antes de cerrar la pestaña o cambiar de URL).
 * - Mobile: no existe un evento de exit-intent confiable en mobile web (no hay
 *   "borde superior" al que el dedo pueda salir). Como alternativa razonable
 *   usamos `popstate` (usuario presiona "atrás" del navegador/gesto de
 *   sistema) — es una señal nativa real, no una heurística de swipe inventada.
 *   Para habilitar esto empujamos una entrada extra al historial al montar.
 *
 * Se dispara UNA sola vez por sesión de página (no se vuelve a mostrar tras
 * cerrarse), para no ser invasivo.
 */
export function useExitIntent() {
  const [triggered, setTriggered] = useState(false)
  const [hasFired, setHasFired] = useState(false)

  const dismiss = useCallback(() => setTriggered(false), [])

  useEffect(() => {
    if (hasFired) return

    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false

    const fire = () => {
      if (hasFired) return
      setTriggered(true)
      setHasFired(true)
    }

    if (!isCoarsePointer) {
      // Desktop: mouseleave por el borde superior de la ventana.
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) fire()
      }
      document.addEventListener("mouseleave", handleMouseLeave)
      return () => document.removeEventListener("mouseleave", handleMouseLeave)
    }

    // Mobile: interceptar el primer "atrás" con una entrada de historial extra.
    window.history.pushState({ exitIntentGuard: true }, "")
    const handlePopState = () => {
      fire()
      // Re-empujamos para no bloquear la navegación real del usuario si decide
      // volver a intentarlo tras cerrar el modal.
      window.history.pushState({ exitIntentGuard: true }, "")
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [hasFired])

  return { showRetentionModal: triggered, dismiss }
}
