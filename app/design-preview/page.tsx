"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Layout } from "@/components/Layout"
import { Timeline, DEFAULT_TIMELINE_STAGES } from "@/components/Timeline"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScoringBadge, type ScoringCategory } from "@/components/ui/scoring-badge"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import { Toaster } from "@/components/ui/sonner"

const SCORING_CATEGORIES: ScoringCategory[] = ["BRONCE", "PLATA", "ORO", "PLATINO"]

/**
 * Página temporal de preview visual del design system. NO es una página de
 * negocio — solo sirve para verificar tokens de color, tipografía y
 * componentes base en dark mode. Se puede eliminar una vez validado.
 */
export default function DesignPreviewPage() {
  const [currentStage, setCurrentStage] = useState<string>(
    DEFAULT_TIMELINE_STAGES[3]
  )

  return (
    <Layout>
      <Toaster />
      <div className="flex flex-col gap-12">
        <section>
          <h1 className="text-2xl font-semibold text-text-primary">
            Design System Preview
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Dark mode premium minimalista — Nodrix (Plataforma Inmobiliaria Inteligente)
          </p>
        </section>

        {/* Paleta */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-text-primary">Paleta</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {[
              ["dark-primary", "bg-dark-primary"],
              ["dark-secondary", "bg-dark-secondary"],
              ["dark-tertiary", "bg-dark-tertiary"],
              ["gold", "bg-gold"],
              ["blue-accent", "bg-blue-accent"],
              ["success", "bg-success"],
              ["warning", "bg-warning"],
              ["error", "bg-error"],
            ].map(([name, cls]) => (
              <div key={name} className="flex flex-col gap-2">
                <div className={`h-16 rounded-lg border border-border ${cls}`} />
                <span className="text-xs text-text-tertiary">{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Botones */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-text-primary">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button
              onClick={() =>
                toast.success("Solicitud enviada correctamente")
              }
            >
              Trigger toast
            </Button>
          </div>
        </section>

        {/* Badges de scoring */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium text-text-primary">
            Badges de Scoring
          </h2>
          <div className="flex flex-wrap gap-3">
            {SCORING_CATEGORIES.map((cat) => (
              <ScoringBadge key={cat} category={cat} />
            ))}
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </section>

        {/* Timeline */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium text-text-primary">
            Timeline (9 estados)
          </h2>
          <Card>
            <CardContent className="pt-2">
              <Timeline currentStage={currentStage} />
            </CardContent>
            <CardFooter className="justify-start gap-2 bg-transparent border-0 px-4">
              {DEFAULT_TIMELINE_STAGES.map((stage) => (
                <button
                  key={stage}
                  onClick={() => setCurrentStage(stage)}
                  className="text-xs text-text-tertiary underline-offset-2 hover:text-gold hover:underline"
                >
                  {stage}
                </button>
              ))}
            </CardFooter>
          </Card>
        </section>

        {/* Card + Form */}
        <section className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Nueva solicitud</CardTitle>
              <CardDescription>
                Ejemplo de formulario con Field + Input
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field>
                <FieldLabel htmlFor="nombre">Nombre completo</FieldLabel>
                <Input id="nombre" placeholder="Juan Pérez" />
                <FieldDescription>
                  Tal como aparece en tu cédula de identidad.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Correo</FieldLabel>
                <Input id="email" type="email" placeholder="juan@correo.cl" />
              </Field>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Enviar</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dialog de ejemplo</CardTitle>
              <CardDescription>Modal con tema dark aplicado</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger render={<Button variant="outline" />}>
                  Abrir modal
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirmar acción</DialogTitle>
                    <DialogDescription>
                      Esta es una ventana modal de ejemplo del design system.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter showCloseButton>
                    <Button>Confirmar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </section>
      </div>
    </Layout>
  )
}
