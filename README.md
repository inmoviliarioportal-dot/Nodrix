# Nodrix — Plataforma Inmobiliaria Inteligente

Plataforma para gestionar el ciclo completo de inversión/adquisición inmobiliaria con crédito
hipotecario: desde el lead inicial y el scoring crediticio, hasta la escrituración y cierre,
pasando por validación documental (OCR), evaluación de riesgo por bandas, propuestas del asesor
y seguimiento en tiempo real para el cliente.

**Stack:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4 · Supabase
(Postgres + Auth + Storage + Realtime) · Diseño dark-mode premium minimalista.

> ⚠️ Todo lo financiero/bancario en este MVP es **simulado (mock)** — no existe integración real
> con bancos todavía. Cualquier "% de aprobación" o "propuesta" mostrada al cliente está
> explícitamente etiquetada como simulación sujeta a confirmación real.

---

## Estado actual: Fase MVP (Releases 1–3 completados en desarrollo)

El proyecto se construyó en 3 releases incrementales, más una capa de fundaciones. **Las tres
están implementadas y funcionando en el entorno de desarrollo local** (Next.js + Supabase local
vía Docker). Aún no se ha desplegado a producción (Vercel + Supabase Cloud).

| Release | Contenido | Estado |
|---|---|---|
| Capa 0 — Fundaciones | Schema multi-tenant ready, stack, design system, scoring engine, devops local | ✅ Completo |
| Release 1 — Portal Cliente | Registro, login, wizard, scoring automático, subida de documentos, dashboard cliente | ✅ Completo |
| Release 2 — Backoffice Asesor | Bandeja de leads, gestión de estados, revisión de documentos, pre-evaluación, visitas | ✅ Completo |
| Release 3 — Admin/Gerencia | Dashboards, reportes, gestión de propiedades, roles personalizados, escrituración/cierre | ✅ Completo |
| Producción | Despliegue real en Vercel + Supabase Cloud, integración bancaria real, dominio | ⬜ Pendiente |

---

## Qué hace el sistema hoy

### 1. Captura y perfilamiento del cliente
- Landing con soft-login y wizard de perfilamiento dinámico (antigüedad laboral, tipo de
  contrato, renta, ahorro, tipo de inversión, estado del inmueble deseado).
- Registro extendido: RUT (con validación de dígito verificador chileno), apellidos, sexo,
  fecha de nacimiento, renta, tipo de inversión, estado del inmueble.
- Recuperación de contraseña por email, indicador de fuerza de contraseña.

### 2. Scoring crediticio automático
- Motor determinístico (`lib/scoring.ts`) que pondera renta/salario (35%), ahorro (25%),
  estabilidad laboral (20%) y carga financiera/DTI (20%) → score de 0 a 100.
- 5 categorías: **BRONCE (0-39) · PLATA (40-59) · ORO (60-74) · PLATINO (75-89) · BLACK (90-100)**.
- Reglas de scoring versionadas y configurables desde el panel admin (`scoring_rule_sets`),
  sin necesidad de re-desplegar código.

### 3. Simulación de riesgo por bandas (antes de subir documentos)
- Tras el scoring, el cliente ve **6 tramos de departamentos** (1 · 1-2 · 2-3 · 3-4 · 4-5 · 5-6)
  cada uno con un **% estimado de probabilidad de aprobación bancaria**, calculado a partir de su
  score real.
- Siempre se muestran ambos enfoques (inversión / vivienda propia) aunque el cliente se haya
  registrado solo con uno, por si le interesa la otra alternativa.
- Este paso es un **paso obligatorio del wizard**: aparece automáticamente al llegar al 100% de
  la pantalla de procesamiento, antes de que el cliente entre a su panel. El cliente debe elegir
  una banda para poder avanzar a la subida de documentos.
- Explícitamente marcado como simulación: la confirmación real llega después de que el banco
  evalúe los documentos.

### 4. Documentación con OCR
- Subida de documentos (Supabase Storage) con validación automática por OCR: tipo de documento,
  titular y contenido.
- Documentos válidos se auto-aprueban y la solicitud avanza automáticamente a
  `DOCUMENTOS_APROBADOS`.

### 5. Máquina de estados de la solicitud (9 etapas)
```
RECEPCIONADA → SCORING_COMPLETADO → DOCUMENTOS_PENDIENTES → DOCUMENTOS_APROBADOS
  → PRE_EVALUACION_COMPLETADA → VISITA_COMPLETADA → ENVIADO_A_BANCO
  → ESCRITURACION_AGENDADA → CIERRE
```
- Transiciones automáticas donde no requieren intervención humana (ej. tras aprobar documentos
  OCR), y transiciones manuales con gates de negocio explícitos:
  - El cliente no puede subir documentos sin antes elegir su propuesta inicial (simulación).
  - No se puede avanzar a `ESCRITURACION_AGENDADA` sin que el cliente haya aceptado una opción
    de la propuesta final del asesor.
- Historial completo de transiciones (`application_stage_history`) con notificaciones por email
  en cada cambio de estado.

### 6. Backoffice del asesor
- Bandeja de leads con filtros y vista tipo tabla/Excel por estado y categoría de scoring.
- Detalle de solicitud: documentos, notas, pre-evaluación real (con datos del cliente, no
  placeholders), cambio de estado, asignación/reasignación de asesor.
- Gestión de visitas programadas (crear, listar, marcar realizadas).
- Oferta por comuna: el cliente ve propiedades disponibles según su comuna preferida y puede
  agendar visita directamente desde su panel una vez en `PRE_EVALUACION_COMPLETADA`.
- **Propuesta final:** después de la visita y el envío al banco, el asesor carga hasta 6 opciones
  concretas (departamento, comuna, precio en UF, notas) que el cliente debe revisar y aceptar
  antes de avanzar a escrituración.

### 7. Panel admin / gerencia
- Dashboard de KPIs (conversión, tiempos por etapa, distribución de categorías de scoring).
- Gestión de usuarios y roles personalizados con permisos granulares por módulo.
- CRUD de propiedades (comuna, propósito, plano, precio UF).
- Reportes exportables, gestión de escrituración y cierre.
- Configuración en vivo de los pesos y umbrales del motor de scoring.

### 8. Experiencia de cliente
- Dashboard con timeline vertical de estados, barra de progreso global, estimador de tiempo por
  etapa, alertas contextuales y videos explicativos embebidos por etapa.
- Menú de cuenta (editar datos, cambiar contraseña, cerrar sesión).
- Guardas de sesión y de rol en todas las rutas protegidas (`/dashboard`, `/backoffice`, `/admin`).

---

## Arquitectura de datos

- Multi-tenant ready desde el día 1: **toda tabla de negocio lleva `org_id`**, aunque en el MVP
  se opera con un solo tenant fijo (RLS preparado, deshabilitado operativamente).
- Todas las cantidades de propiedad usan **UF (Unidad de Fomento)**, la unidad de referencia
  chilena para precios inmobiliarios e hipotecarios.
- 14 migraciones aplicadas (`database/migrations/002` a `014`) cubriendo: RLS, reglas de scoring
  versionadas, campos de perfil de cliente, asignación de asesor, categoría BLACK, roles
  personalizados, opciones de campos de perfil, monto de ahorro, unicidad de solicitud abierta
  por cliente, comuna/propósito de propiedades, selección de propuesta inicial, opciones de
  propuesta final, y rediseño de bandas a 6 tramos porcentuales.

## Pruebas

- **Unit tests:** motor de scoring y motor de riesgo de propuestas (`tests/unit`).
- **E2E (Playwright):** flujo completo lead → scoring → propuesta inicial → documentos →
  pre-evaluación → visita → banco → propuesta final → escrituración → cierre
  (`tests/e2e/full-flow.spec.ts`), 14 escenarios, 100% verde.

---

## Qué falta para salir 100% a producción

```
┌──────────────────────────────────────────────────────────────────────┐
│  GAP 1 — Infraestructura de despliegue real                          │
├──────────────────────────────────────────────────────────────────────┤
│  ⬜ Crear proyecto Supabase Cloud (no local) + aplicar schema/migraciones │
│  ⬜ Configurar variables de entorno de producción en Vercel            │
│  ⬜ Desplegar Next.js en Vercel (dominio propio, no localhost)         │
│  ⬜ Configurar Supabase Storage en modo producción (límites, backups)  │
│  ⬜ Habilitar RLS real por organización (hoy está deshabilitado)       │
│  ⬜ CI/CD: pipeline que corra unit + E2E antes de cada deploy          │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  GAP 2 — Integraciones externas reales                                │
├──────────────────────────────────────────────────────────────────────┤
│  ⬜ Integración bancaria real (hoy: 100% mock/simulado)                │
│  ⬜ Envío de emails transaccional en producción (proveedor real, hoy   │
│     probablemente en modo dev/sandbox)                                │
│  ⬜ OCR de documentos: validar proveedor/costo en volumen real         │
│  ⬜ Notarías / escrituración: hoy es workflow manual, falta integrar   │
│     o formalizar el proceso operativo real con notarías               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  GAP 3 — Seguridad y cumplimiento                                     │
├──────────────────────────────────────────────────────────────────────┤
│  ⬜ Auditoría de seguridad (manejo de RUT, datos financieros, PII)     │
│  ⬜ Políticas de retención y borrado de datos personales               │
│  ⬜ Rate limiting / protección anti-abuso en endpoints públicos        │
│     (registro, login, leads)                                          │
│  ⬜ Revisión de permisos y RLS multi-tenant antes de onboardear un     │
│     segundo tenant real                                                │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│  GAP 4 — Operación y calidad                                          │
├──────────────────────────────────────────────────────────────────────┤
│  ⬜ Monitoreo/observabilidad en producción (errores, latencia, logs)   │
│  ⬜ Seed de datos reales de propiedades (hoy: datos de prueba/mock)    │
│  ⬜ Investigar y corregir duplicación de filas en                      │
│     application_stage_history (bug conocido, no bloqueante, pendiente) │
│  ⬜ Pruebas de carga (dashboards con volumen real de solicitudes)      │
│  ⬜ Documentación operativa para el equipo de asesores/gerencia        │
│     (manual de uso, no solo README técnico)                            │
└──────────────────────────────────────────────────────────────────────┘
```

**En resumen:** el producto funcionalmente está completo para el flujo MVP definido (los 3
releases), validado en local con tests pasando. Lo que falta es exclusivamente lo asociado a
**salir de un entorno de desarrollo a un entorno de producción real**: infraestructura cloud,
integraciones bancarias/notariales reales (hoy mock), seguridad/cumplimiento, y observabilidad
operativa.

---

## Desarrollo local

```bash
docker-compose up          # levanta Supabase local (Postgres + Auth + Storage)
npm install
npm run dev                # Next.js en http://localhost:3000
npm run build               # build de producción
npm test                    # unit tests
npx playwright test         # E2E
```

Variables de entorno requeridas: ver `.env.example`.
