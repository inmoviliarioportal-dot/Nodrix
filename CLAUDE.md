# Plataforma Inmobiliaria Inteligente — Instrucciones para Agentes

@AGENTS.md

## ⚠️ CRÍTICO: Next.js 16 (breaking changes vs. conocimiento de entrenamiento)

Este proyecto usa **Next.js 16.2.10 + React 19.2.4**, versiones posteriores al conocimiento de
entrenamiento de muchos modelos. **Antes de escribir cualquier código de Next.js**, lee la
documentación real instalada en `node_modules/next/dist/docs/` — no asumas APIs de versiones
anteriores (app router, route handlers, config, etc. pueden diferir).

## Stack del Proyecto

- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime), vía Route Handlers de Next.js
- **Hosting MVP:** Vercel (free) + Supabase (free tier)
- **Diseño:** Dark mode premium minimalista — ver paleta abajo
- **Arquitectura de datos:** Multi-tenant ready desde el schema (org_id en todas las tablas),
  pero **single-tenant operativo en el MVP** (org_id fijo, RLS preparado pero deshabilitado)

## Paleta de Diseño (Dark Mode Premium)

```
dark.primary:    #0F0F1E   (fondo principal, casi negro)
dark.secondary:  #1A1A2E   (cards, superficies)
dark.tertiary:   #252540   (hover states)
accent.gold:     #D4AF37   (highlight premium — NO amarillo puro)
accent.blue:     #4F46E5   (energía, secundario)
status.success:  #10B981
status.warning:  #F59E0B
status.error:    #EF4444
text.primary:    #F3F4F6
text.secondary:  #D1D5DB
text.tertiary:   #9CA3AF
border:          #374151   (bordes finos, sin sombras)
```

Principios: minimalista (cero gradientes/sombras complejas), tipografía clara (Inter),
transiciones de 200ms, contraste mínimo 4.5:1.

## Releases del Proyecto (contexto para todos los agentes)

- **Release 1 (Día 14):** Portal Cliente + pseudo-admin manual
- **Release 2 (Día 19):** Backoffice Asesor (automatiza lo manual)
- **Release 3 (Día 28):** Admin/Gerencia (dashboards, escrituración, cierre)

Este documento cubre **Capa 0 (Fundaciones, Días 1-4)**: schema, stack, design system,
scoring engine y devops. Los agentes de releases posteriores construyen sobre estas fundaciones.

## Reglas de Integración Multi-Agente (OBLIGATORIO)

1. **Cada agente trabaja SOLO en su scope de archivos** (definido en su propio archivo
   `.claude/agents/*.md`). No edites archivos fuera de tu scope — si necesitas algo de otro
   dominio (ej. un tipo de la DB), consúmelo, no lo modifiques.
2. **Cada agente hace commit al terminar** con mensaje claro (`feat(db): schema inicial`,
   `feat(scoring): motor de reglas`, etc.). No dejes cambios sin commitear.
3. **No sobreescribas trabajo de otro agente.** Si dos agentes necesitan tocar el mismo
   archivo (raro en Capa 0, ya que los scopes están separados), para y reporta el conflicto
   en vez de forzar el cambio.
4. **Idioma:** Código y comentarios en inglés (convención técnica estándar); textos de UI
   visibles al usuario en español (Chile).
5. **No inventes infraestructura de bancos reales** — todo lo financiero/bancario es mock
   en el MVP (no hay integración bancaria disponible aún).
6. **Base de datos:** todas las tablas de negocio llevan `org_id UUID` desde el día 1
   (aunque en MVP se use un valor fijo). No omitas esta columna "para simplificar".

## Estructura de Directorios Objetivo

```
app/                    # Next.js App Router
  auth/                 # register, login (Release 1)
  dashboard/             # Portal cliente (Release 1)
  backoffice/            # Asesor (Release 2)
  admin/                 # Gerencia (Release 3)
  api/                   # Route handlers (auth, leads, applications, documents, scoring, ...)
components/ui/          # shadcn/ui dark-themed
lib/                    # supabase client, scoring engine, constants
database/
  schema.sql             # Schema completo multi-tenant ready
  migrations/
  functions/              # scoring_fn.sql, audit_fn.sql
scripts/                 # seeding, utilidades
tests/e2e/               # Playwright
docker-compose.yml        # Supabase local + servicios
```

## Definition of Done (Capa 0)

- `docker-compose up` levanta Postgres local + servicios sin error
- `npm run build` compila sin errores
- Tailwind con dark mode + paleta del proyecto configurada y verificable
- `schema.sql` aplica sin errores contra Postgres limpio
- Scoring engine ejecuta con tests unitarios pasando
- `.env.example` documenta todas las variables necesarias
