# Design System v3 — Rediseño "Real Estate Editorial" (Navy + Oro)

> Fuente de verdad de tokens: `app/globals.css` (`:root`). Este documento es la
> referencia de USO para agentes — no dupliques valores hardcodeados, siempre
> consume las clases/tokens de abajo. Reemplaza al v2 (dark glassmorphism/neón).

## Contexto de marca

Plataforma de inversión inmobiliaria. El diseño debe transmitir **solidez,
patrimonio y confianza editorial** — como una publicación inmobiliaria premium,
NO un dashboard "fintech oscuro"/"gamer". Fondo cálido y luminoso, tarjetas
blancas con borde sutil, tipografía serif editorial en titulares/cifras, oro
como acento (nunca como color de fondo grande), fotografía de propiedad como
protagonista donde haya espacio.

Referencia visual aportada por el negocio:
`Rediseño/Mejora de sitio Nodrix V2/Nodrix - Rediseño Completo.html` (mockup
interactivo de 8 pantallas: Landing, Login/Registro, Wizard, Dashboard,
Documentos, Admin/Gerencia, Backoffice).

## Paleta (mismos NOMBRES de variable que el sistema v2, valores nuevos —
## así todo el código existente hereda el rediseño sin tocar cada archivo)

| Token CSS | Valor | Uso |
|---|---|---|
| `--deep` | `#F7F5F0` | Fondo de página (cálido, off-white) — antes casi-negro |
| `--surface` / `--surface-elevated` | `#FFFFFF` | Fondo de card/panel/input |
| `--glass-border` / `--border` | `#E4DFD3` | Borde de cards, inputs, header |
| `--input` | `#D8D2C2` | Borde de inputs específicamente |
| `--neon-cyan` | `#16324F` (navy) | Acento PRIMARIO — CTAs, bordes activos, iconos, `--primary` |
| `--neon-purple` | `#5C4A72` (ciruela apagado) | Acento secundario — IA/procesamiento, categoría BLACK |
| `--neon-green` | `#2E8B63` | Éxito/rentabilidad — checks, números positivos |
| `--gold` | `#B8863C` | Acento de marca — badges, subtítulos "eyebrow", categoría ORO, íconos destacados |
| `--text-primary` | `#16324F` (navy) | Titulares y texto fuerte |
| `--text-secondary` | `#4B5563` | Texto de cuerpo |
| `--text-tertiary` | `#6C7787` | Texto atenuado / captions |

Las clases Tailwind derivadas (`bg-neon-cyan`, `text-neon-cyan`,
`border-neon-cyan/40`, `bg-deep`, `text-deep`, `bg-surface`,
`border-glass-border`, `text-text-primary`, etc.) ya reflejan estos valores —
**no hace falta cambiar className por className**, solo revisar que la
combinación siga teniendo sentido visual (ver sección de gotchas abajo).

## Tipografía

- **Newsreader** (serif editorial, var `--font-heading`, clase `font-heading`):
  titulares (`h1`-`h3`), marca "Nodrix", cifras clave (UF, precios, scoring),
  citas/testimonios. Pesos 500/600/700, admite `italic`.
- **Manrope** (sans, var `--font-body`, clase `font-sans` / default): cuerpo,
  labels, botones, nav, inputs.

## Utilidades (`app/globals.css`, `@layer utilities`) — YA actualizadas, úsalas tal cual

- `.glass-card` / `.glass-surface` — tarjeta blanca sólida + borde cálido +
  sombra muy sutil (`0 1px 2px rgba(20,30,40,.03-.04)`). Ya NO llevan blur.
  Seguir usando estas clases para todas las cards (no reinventar).
- `.bg-deep-ambient` — fondo de página plano (`var(--deep)`), sin gradientes.
- `.glow-cyan` / `.glow-purple` / `.glow-green` — sombra de elevación sutil
  para CTAs primarios (ya no es un halo de neón, es solo `box-shadow` suave).
- `.text-glow-*` — ahora no-op (`text-shadow:none`); se dejan por compatibilidad,
  no agregar glow de texto nuevo.

## Reglas de aplicación (obligatorias)

1. **Un CTA primario por pantalla**, sólido navy + texto blanco (`bg-neon-cyan
   text-deep` en el código existente sigue funcionando: `--deep` es blanco
   cálido, `--neon-cyan` es navy). El resto de acciones van `variant="outline"`
   o `variant="ghost"`.
2. **Oro = acento, nunca relleno grande.** Úsalo en: eyebrows/kickers
   ("SCORING CON IA", "CÓMO FUNCIONA"), iconos puntuales, bordes de tarjetas
   destacadas, badges (`bg-[#EFE6D4] text-[#8A6423]`), categoría ORO.
3. **Tarjetas blancas con borde cálido**, nunca fondo gris frío ni blur.
   Sombra siempre sutil (`0 1px 2px rgba(20,30,40,.03)`), nunca "glow".
4. **Contraste**: cuerpo de texto en `text-text-secondary`/`text-text-tertiary`
   sobre blanco/off-white — nunca navy puro en párrafos largos (usar
   `text-text-primary` solo en titulares/valores fuertes).
5. **Iconos**: SVG (lucide-react), nunca emoji.
6. **Fotografía de propiedad como protagonista** donde el layout lo permita
   (hero de landing, panel lateral de login/registro, cards de propiedades) —
   usar el mismo patrón `<img>`/placeholder ya existente en el código
   (`PropertyCarousel`, `PropertyGalleryModal`) en vez de inventar uno nuevo.
7. **Motion**: transiciones 150–300ms, easing `ease-out` al entrar; respetar
   `prefers-reduced-motion`.
8. **Responsive**: mobile-first, igual que antes.
9. **Radios**: `--radius` subió a `0.75rem` — los `rounded-*` de Tailwind ya
   heredan radios más generosos (cards ~16-20px, botones ~10-12px) sin cambios
   de className.

## Gotchas al migrar de v2 a v3 (revisar caso a caso, NO son automáticos)

- **Badges/pills con `bg-X/10` muy sutiles** (ej. `bg-neon-cyan/10
  text-neon-cyan` para nav activo) siguen funcionando (navy al 10% sobre
  blanco = tinte azulado sutil, correcto) — no tocar.
- **`scoring-badge.tsx`** (BRONCE/PLATA/ORO/PLATINO/BLACK): sus colores son
  independientes del acento de marca (paleta metálica, ver tabla de arriba).
  La variante BLACK (`bg-black/60`) puede necesitar ajuste de opacidad sobre
  fondo blanco — revisar contraste si tu pantalla la usa.
- **Cualquier `backdrop-blur-*` o efecto de vidrio hardcodeado FUERA de
  `.glass-card`/`.glass-surface`** (ej. `bg-surface/60 backdrop-blur-md` en un
  header) — quitarlo, ya no aplica sobre fondo plano cálido; usar
  `bg-surface` sólido + `border-b border-border`.
- **Gradientes ambientales tipo `bg-deep-ambient` con blobs de color** ya no
  existen (la clase quedó plana) — si una pantalla necesita una sección con
  fondo de imagen/foto, usar una card de propiedad real, no un gradiente falso.

## Búsqueda en el skill `ui-ux-pro-max` (para profundizar)

```bash
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain style
python .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
```
