"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressCircle } from "@/components/processing/progress-circle";
import { RotatingMessage } from "@/components/processing/rotating-message";

/**
 * sessionStorage keys
 * -------------------
 * INPUT_KEY  ("wizard-progress"): written by the Wizard agent with the lead's
 *   financial profile. We are defensive about its exact shape — see
 *   `readWizardPayload()` below — since the Wizard runs in a parallel agent.
 * OUTPUT_KEY ("onboarding-result"): written by this screen with the API
 *   response (`{ customer, application }`) so the Proposal screen can render
 *   the scoring result without re-fetching.
 */
const INPUT_KEY = "wizard-progress";
const OUTPUT_KEY = "onboarding-result";

// Target duration for the "bridge" animation. If the API responds faster,
// we let the progress bar finish before navigating. If it's slower, we keep
// the bar at 99% and surface a "taking longer than expected" message instead
// of lying about completion.
const MIN_DURATION_MS = 3200;
const MAX_ANIMATED_DURATION_MS = 5000;
const SLOW_RESPONSE_NOTICE_MS = 6000;

type Status = "processing" | "error";

/**
 * The Wizard may store the raw financial-profile object directly under
 * `wizard-progress`, or nest it under a `data`/`profile`/`formData` key
 * depending on how it structures multi-step state. We accept all of these
 * shapes defensively and merge in `name`/`email` if present in any of them.
 */
function readWizardPayload(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;

  const candidates = [INPUT_KEY, "wizard-data", "onboarding-wizard"];
  for (const key of candidates) {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const nested =
          (parsed as Record<string, unknown>).data ??
          (parsed as Record<string, unknown>).profile ??
          (parsed as Record<string, unknown>).formData ??
          parsed;

        if (nested && typeof nested === "object") {
          return { ...(parsed as Record<string, unknown>), ...(nested as Record<string, unknown>) };
        }
      }
    } catch {
      // Not JSON — ignore and try the next candidate key.
      continue;
    }
  }

  return null;
}

export default function ProcessingPage() {
  const router = useRouter();
  const [percent, setPercent] = useState(0);
  const [status, setStatus] = useState<Status>("processing");
  const [showSlowNotice, setShowSlowNotice] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    // Guard against React 19 StrictMode / effect re-invocation firing the
    // real POST /api/leads call twice in dev.
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;
    const startedAt = Date.now();

    const progressTimer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / MAX_ANIMATED_DURATION_MS);
      // Ease toward 95% while waiting; the final jump to 100% happens once
      // the API call actually resolves (see `finish()` below).
      setPercent((prev) => {
        const target = ratio * 95;
        return target > prev ? target : prev;
      });
    }, 100);

    const slowNoticeTimer = window.setTimeout(() => {
      if (!cancelled) setShowSlowNotice(true);
    }, SLOW_RESPONSE_NOTICE_MS);

    async function run() {
      const payload = readWizardPayload();

      const requestBody = {
        name: (payload?.name as string) ?? "",
        email: (payload?.email as string) ?? "",
        phone: payload?.phone,
        rut: payload?.rut,
        monthlySalary: payload?.monthlySalary,
        savingsAmount: payload?.savingsAmount,
        employmentType: payload?.employmentType,
        employmentYears: payload?.employmentYears,
        hasExistingDebt: payload?.hasExistingDebt,
        monthlyDebtPayments: payload?.monthlyDebtPayments,
      };

      if (!requestBody.name || !requestBody.email) {
        if (!cancelled) {
          setErrorMessage(
            "No encontramos los datos de tu perfil. Vuelve a completar el formulario."
          );
          setStatus("error");
        }
        return;
      }

      try {
        const response = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        // 409 = duplicate lead. The endpoint still returns a usable
        // `customer` + `application` in that case, so we treat it as success.
        if (!response.ok && response.status !== 409) {
          throw new Error(`API respondió ${response.status}`);
        }

        const result = await response.json();

        if (!result?.application) {
          throw new Error("La respuesta no incluyó una solicitud (application) válida");
        }

        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(0, MIN_DURATION_MS - elapsed);

        window.setTimeout(() => {
          if (cancelled) return;
          setPercent(100);
          window.sessionStorage.setItem(
            OUTPUT_KEY,
            JSON.stringify({
              customer: result.customer,
              application: result.application,
              duplicate: Boolean(result.duplicate),
            })
          );
          window.setTimeout(() => {
            if (!cancelled) router.push("/onboarding/proposal");
          }, 350);
        }, remaining);
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Ocurrió un error inesperado."
          );
          setStatus("error");
        }
      }
    }

    run();

    return () => {
      cancelled = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(slowNoticeTimer);
    };
  }, [router]);

  function handleRetry() {
    startedRef.current = false;
    setStatus("processing");
    setErrorMessage(null);
    setShowSlowNotice(false);
    setPercent(0);
    // Re-mount the effect logic by forcing a fresh run.
    window.location.reload();
  }

  if (status === "error") {
    return (
      <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center px-6">
        <div className="glass-card flex max-w-md flex-col items-center gap-4 rounded-2xl p-8 text-center">
          <AlertTriangle className="size-10 text-[--neon-cyan]" />
          <h1 className="text-xl font-semibold text-[--text-primary]">
            No pudimos procesar tu perfil
          </h1>
          <p className="text-sm text-[--text-secondary]">
            {errorMessage ?? "Hubo un problema al calcular tu propuesta."}
          </p>
          <div className="mt-2 flex gap-3">
            <Button variant="outline" onClick={() => router.push("/onboarding/wizard")}>
              Volver al inicio
            </Button>
            <Button className="glow-cyan" onClick={handleRetry}>
              <Loader2 className="size-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-deep-ambient flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <ProgressCircle percent={percent} />
      <div className="flex min-h-[3rem] flex-col items-center gap-2 text-center">
        <RotatingMessage />
        {showSlowNotice && (
          <p className="text-xs text-[--text-tertiary]">
            Esto está tardando un poco más de lo esperado, gracias por tu paciencia...
          </p>
        )}
      </div>
    </main>
  );
}
