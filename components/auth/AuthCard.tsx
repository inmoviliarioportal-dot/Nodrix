import type { ReactNode } from "react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"

interface AuthCardProps {
  title: string
  description?: string
  children: ReactNode
}

/**
 * Card contenedora compartida por las páginas de registro y login.
 * Centra el formulario en la pantalla con el tema dark premium.
 */
function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{children}</CardContent>
      </Card>
    </div>
  )
}

export { AuthCard }
