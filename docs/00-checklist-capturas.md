# Checklist de capturas de pantalla — Nodrix

Guía para capturar manualmente cada pantalla del sistema y completar el Documento Funcional
(`01-documento-funcional.md`) con imágenes reales. Recomendado: navegador a 1440×900 o superior,
modo claro del sistema operativo desactivado (el sistema es dark-mode por diseño), zoom 100%.

**Credenciales de prueba (entorno local, `npm run dev` + `docker-compose up`):**

| Rol | Email | Password |
|---|---|---|
| Cliente | (crear una cuenta nueva desde `/auth/register`) | — |
| Asesor | `asesor@nodrix.dev` | `Nodrix123!` |
| Admin | `admin@nodrix.dev` | `Nodrix123!` |
| Gerencia | `gerencia@nodrix.dev` | `Nodrix123!` |

Sembradas con `node scripts/seed-staff-users.mjs` (ver `scripts/seed-staff-users.mjs`).

---

## Bloque 1 — Público / sin sesión

| # | URL | Qué capturar |
|---|---|---|
| 1.1 | `/` | Landing completa (hero, soft-login, secciones de valor) |
| 1.2 | `/auth/register` | Formulario de registro completo, incluyendo el paso de RUT/datos extendidos |
| 1.3 | `/auth/login` | Formulario de login |
| 1.4 | `/auth/forgot-password` | Formulario de recuperación de clave |

## Bloque 2 — Cliente (crear cuenta nueva y avanzar el flujo)

| # | URL / acción | Qué capturar |
|---|---|---|
| 2.1 | `/onboarding/welcome` | Pantalla de bienvenida post-registro |
| 2.2 | `/onboarding/wizard` (paso 1) | Situación laboral / fuentes de ingreso |
| 2.3 | `/onboarding/wizard` (paso 2) | Antigüedad, tipo de contrato, ahorro |
| 2.4 | `/onboarding/wizard` (paso 3) | Destino del inmueble (vivir / Airbnb / arriendo / venta corto plazo) |
| 2.5 | `/onboarding/processing` | Pantalla de procesamiento (barra de carga / scoring en curso) |
| 2.6 | `/onboarding/proposal` o `/onboarding/initial-proposal` | Las 6 bandas de riesgo con % de aprobación estimado |
| 2.7 | `/dashboard` | Dashboard cliente: timeline horizontal de 7 pasos, tarjeta de estado, video gancho |
| 2.8 | `/dashboard/documents` | Bóveda documental: checklist de documentos requeridos, subida de archivo |
| 2.9 | `/dashboard` (menú de cuenta) | Dropdown de cuenta abierto (editar datos / cambiar clave / cerrar sesión) |
| 2.10 | `/dashboard` (con oferta por comuna, tras avanzar a Pre-evaluación) | Card de oferta por comuna + botón agendar visita |

> Nota: para llegar a 2.6-2.10 hay que completar el wizard con datos reales de prueba — el flujo
> avanza automáticamente según las reglas de negocio descritas en el README.

## Bloque 3 — Asesor (`asesor@nodrix.dev`)

| # | URL | Qué capturar |
|---|---|---|
| 3.1 | `/backoffice/queue` | Bandeja de leads, vista tabla, con filtros abiertos |
| 3.2 | `/backoffice/queue` (vista tarjetas) | Toggle a vista de tarjetas |
| 3.3 | `/backoffice/[id]` (cualquier solicitud) | Header + timeline horizontal de 7 pasos con fechas |
| 3.4 | `/backoffice/[id]` | Sección Pre-evaluación + sección Documentos (checklist cargado/no cargado) |
| 3.5 | `/backoffice/[id]` | Sección Propuesta final + Notas |
| 3.6 | `/backoffice/[id]` | Selector de "Aplicar estado" (transición de etapa) desplegado |
| 3.7 | `/backoffice/properties` | Listado de propiedades disponibles para ofrecer |
| 3.8 | `/backoffice/visits` | Listado de visitas programadas |

## Bloque 4 — Admin / Gerencia (`admin@nodrix.dev` o `gerencia@nodrix.dev`)

| # | URL | Qué capturar |
|---|---|---|
| 4.1 | `/admin/dashboard` | Dashboard ejecutivo completo (scroll para capturar todos los gráficos) |
| 4.2 | `/admin/dashboard` | Zoom a las 5 KPI cards superiores con el tooltip "?" abierto en una de ellas |
| 4.3 | `/admin/dashboard` | Funnel de Estados + distribución de scoring (donut) |
| 4.4 | `/admin/dashboard` | Timeline de cierres + Proyección de cierres (lado a lado) |
| 4.5 | `/admin/reports` | Pantalla de Reportes con filtros aplicados |
| 4.6 | `/admin/users` | Mantenedor de usuarios |
| 4.7 | `/admin/users/new` | Formulario de creación de usuario |
| 4.8 | `/admin/assignments` | Asignación de asesor a solicitudes |
| 4.9 | `/admin/properties` | CRUD de propiedades (listado + modal de creación) |
| 4.10 | `/admin/regions` | Gestión de regiones habilitadas |
| 4.11 | `/admin/variables` | Variables del wizard (parámetros financieros configurables) |
| 4.12 | `/admin/roles` | Pantalla de Roles — pestaña "Perfil Asesor" (matriz de permisos) |
| 4.13 | `/admin/roles` | Pestaña "Permisos temporales" con el formulario de grant abierto |
| 4.14 | `/admin/manual` | Herramienta manual heredada (override de estado/documentos) |

## Bloque 5 — Detalle técnico (opcional, para el documento de arquitectura)

| # | URL | Qué capturar |
|---|---|---|
| 5.1 | Supabase Studio local (`http://127.0.0.1:54323`) → Table Editor | Vista del schema con las tablas principales |
| 5.2 | Terminal | Salida de `npm run build` exitoso |
| 5.3 | Terminal | Salida de `npx vitest run tests/unit` (123 tests en verde) |

---

Una vez tengas las imágenes, envíamelas (indicando el número de la tabla, ej. "2.7") y las inserto
en `01-documento-funcional.md` en la sección correspondiente.
