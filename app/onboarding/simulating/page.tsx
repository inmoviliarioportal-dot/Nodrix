"use client";

import { useRouter } from "next/navigation";
import { AvatarPresenter } from "@/components/avatar/AvatarPresenter";

/**
 * Pantalla puente entre el fin del wizard y el inicio de la animación de
 * "AI Processing" -- gancho con el avatar antes de mostrar la simulación.
 */
export default function SimulatingPage() {
  const router = useRouter();

  return (
    <AvatarPresenter
      heading="¡Excelente, ya tenemos tus datos!"
      script="¡Muy bien! Ya completaste tus datos financieros. Ahora vamos a simular cuántas UF podrías optar para comprar tu inmueble. Recuerda que esto es una pre-evaluación aproximada, no es la aprobación final del banco, pero se acerca bastante a una evaluación real."
      continueLabel="Ver mi simulación"
      onDone={() => router.push("/onboarding/processing")}
    />
  );
}
