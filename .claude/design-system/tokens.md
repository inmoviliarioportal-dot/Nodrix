# Design System v2 — Rediseño Visual (Dark Glassmorphism + Neón)

> Fuente de verdad de tokens: `app/globals.css` (`:root`). Este documento es la
> referencia de USO para agentes — no dupliques valores hardcodeados, siempre
> consume las clases/tokens de abajo.

## Contexto de marca

Plataforma de inversión inmobiliaria inteligente. El diseño debe transmitir:
**modernidad, análisis de datos y confianza algorítmica** — profesional y
robusto, NO "gamer"/cyberpunk. Evitar neón saturado puro (#00FFFF, #FF00FF)
como texto/fondo — falla WCAG y rompe la sensación de "hecho por profesionales".

## Paleta

| Token CSS | Valor | Uso |
|---|---|---|
| `--deep` | `#05060A` | Fondo base de pantallas full-bleed (Landing, Wizard, AI Processing, Proposal) |
| `--surface` | `#0B0E16` | Fondo de secciones/paneles no-glass |
| `--surface-elevated` | `#10141F` | Elementos elevados (inputs, dropdowns) |
| `--glass` | `rgba(255,255,255,0.04)` | Fondo de tarjetas glassmorphism |
| `--glass-border` | `rgba(255,255,255,0.08)` | Borde de tarjetas glass |
| `--neon-cyan` | `#22D3EE` | Acento primario — CTAs, links activos, dato "positivo/neutral" |
| `--neon-purple` | `#A78BFA` | Acento secundario — IA/procesamiento, elementos "inteligentes" |
| `--neon-green` | `#34D399` | Acento de éxito/rentabilidad — números financieros positivos, checks |
| `--neon-*-glow` | `rgba(*, 0.35)` | Glow (box-shadow/text-shadow), SIEMPRE sutil, nunca el color plano como fondo grande |

Colores heredados de Release 1 que se mantienen (NO tocar su semántica):
`--gold` (#D4AF37, categoría scoring ORO/PLATINO), `--bronce`, `--plata`,
`--oro`, `--platino` (badges de categoría de scoring — dominio propio, no son
parte del sistema neón de UI general).

## Clases utilitarias (`app/globals.css`, `@layer utilities`)

- `.bg-deep-ambient` — fondo full-bleed con gradiente radial ambiental sutil (usar en pantallas hero: Landing, AI Processing, Proposal)
- `.glass-card` — tarjeta glassmorphism (blur 20px + borde translúcido) — usar para TODAS las cards flotantes sobre fondo ambiental
- `.glass-surface` — superficie sólida con borde translúcido (sin blur) — usar para paneles internos de dashboard/vault donde no hay imagen de fondo detrás
- `.glow-cyan` / `.glow-purple` / `.glow-green` — box-shadow de glow, para botones primarios y elementos que deben "guiar el ojo"
- `.text-glow-cyan` / `.text-glow-purple` / `.text-glow-green` — glow de texto, usar SOLO en números clave grandes (Cap Rate, Plusvalía, Flujo Mensual) — no abusar

## Reglas de aplicación (obligatorias para todos los agentes de UI)

1. **Un CTA primario por pantalla.** Botón con `.glow-cyan` (o purple si es una acción "IA"), el resto de acciones son secundarias (outline/ghost).
2. **Glass solo sobre fondo ambiental o imagen.** No uses `.glass-card` sobre `--surface` plano sin gradiente detrás — pierde el efecto.
3. **Neón = acento, no relleno.** Nunca uses `--neon-cyan`/`purple`/`green` como color de fondo de una superficie grande; son para bordes, textos de dato, iconos, glows y CTAs.
4. **Contraste primero.** Texto de cuerpo siempre en `--text-primary`/`--text-secondary` (blancos/grises), nunca en color neón puro (falla legibilidad en párrafos largos).
5. **Iconos**: SVG (lucide-react, ya instalado), nunca emoji — regla del skill `ui-ux-pro-max`.
6. **Motion**: transiciones 150–300ms, easing `ease-out` al entrar / `ease-in` al salir; respetar `prefers-reduced-motion`.
7. **Responsive**: mobile-first, grids de 2-3 columnas en desktop (≥1024px) colapsando a stack vertical en mobile (<768px).
8. **Números financieros clave** (Cap Rate, Plusvalía, Flujo Mensual, scoring score): tipografía grande (text-4xl/5xl), `font-variant-numeric: tabular-nums`, con `.text-glow-*` opcional para destacar.

## Búsqueda en el skill `ui-ux-pro-max` (para profundizar)

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
```
