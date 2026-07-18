"use client";

import { useRouter } from "next/navigation";
import { AvatarPresenter } from "@/components/avatar/AvatarPresenter";

/**
 * Pantalla de bienvenida post-registro, antes del wizard de perfilamiento.
 * Usa el avatar animado + narración para que la experiencia se sienta
 * acompañada apenas el cliente termina de registrarse.
 */
export default function WelcomePage() {
  const router = useRouter();

  return (
    <AvatarPresenter
      heading="¡Qué bueno tenerte aquí!"
      script="¡Hola! Qué bueno que te registraste. Ahora vamos a hacerte algunas preguntas rápidas sobre tu situación financiera para hacer una pre-evaluación de cuántas UF podrías optar para tu compra. Solo te tomará un par de minutos."
      continueLabel="Comenzar"
      onDone={() => router.push("/onboarding/wizard")}
    />
  );
}
