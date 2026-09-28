# 11 — Design System "Azul y Oro"

> Identidad suministrada por el usuario en `docs/LOGO AZUL Y ORO/LOGO AZUL Y ORO`. Tailwind v4, con tokens en `front/app/globals.css`. Al construir UI, pasar por `/ui-ux-pro-max` + `/frontend-design`.

## Marca
- **Nombre:** "Azul y Oro". **Logo:** composición "AZUL & ORO" y emblema del material suministrado; reemplaza el monograma provisional "AyO".
- **Variantes:** logo a color sobre fondos claros y blanco sobre fondos oscuros. Emblema azul u oro para espacios compactos; conservar proporciones y evitar duplicar el nombre junto al logo completo.
- **Tono:** apasionado pero editorial/confiable (E-E-A-T). Hincha con criterio, no fanpage ruidosa.
- **Favicon:** emblema suministrado, con los márgenes transparentes ajustados para lectura a tamaño pequeño.
- **Sitio no oficial:** mantener siempre visible el aviso del Footer; la identidad no implica afiliación con el club.

## Paleta (light + dark)
Azul `#275585` y oro `#ffcf42` del arte suministrado, con variantes funcionales para fondos, interacción y contraste. Los neutros y estados semánticos se mantienen en `front/app/globals.css`.
```css
/* Brand */
--azul-900: #102b46;   /* fondo azul profundo */
--azul-700: #275585;   /* azul del logo; primario en claro */
--azul-500: #86b4e0;   /* azul interactivo en oscuro */
--oro-700:  #806000;   /* texto y enlaces sobre claro */
--oro-600:  #e6b52d;   /* oro hover/borde */
--oro-500:  #ffcf42;   /* oro del logo; acento en oscuro */
--oro-400:  #ffdf80;   /* oro claro */

/* Semantic (light) */
--primary:   var(--azul-700);
--accent:    var(--oro-700);

/* Semantic (dark) */
--primary:   var(--azul-500);
--accent:    var(--oro-500);
```
- **Contraste:** oro sobre azul y texto sobre fondos → cumplir **WCAG AA** (≥4.5:1 texto normal). El oro del logo sobre blanco tiene bajo contraste → usar `--oro-700` para texto/enlaces sobre claro.
- **Dark mode:** de arranque (audiencia mobile, uso nocturno en partidos).

## Tipografía
- **Display/titulares:** **Space Grotesk**.
- **Texto/UI:** **Manrope**.
- **Arte del logo:** Microsport y Poppins forman parte del diseño suministrado; no sustituyen las fuentes de la interfaz. Los SVG originales contienen texto con fuentes no embebidas, por lo que no se sirven directamente: las exportaciones PNG preservan la forma exacta del logo.
- **Números/stats:** variante tabular (`font-variant-numeric: tabular-nums`) para tablas y marcadores.
- `font-display: swap`, preload de la display para LCP.

## Escala & layout
- Espaciado base 4px; contenedor de lectura ~72ch para artículos.
- Grid responsive mobile-first. Breakpoints Tailwind estándar.
- Radios: `sm` tarjetas, `full` badges. Sombras sutiles; en dark, borde > sombra.

## Componentes clave (mapa a `components/ui/`)
- **LiveScoreBadge** — pill roja `--live` con minuto, animación de pulso sutil.
- **MatchCard** — escudos (de API), marcador tabular, competición, fecha/hora local AR, estado.
- **FixtureList / ResultsList** — agrupado por fecha/competición.
- **StandingsTable** — resaltar fila de Boca con borde oro; tabular-nums.
- **PlayerCard** — foto, número, posición, nacionalidad (bandera).
- **PlayerStatsTable** — stats temporada/partido, tabular.
- **ArticleCard** — imagen 16:9, categoría (badge), **SourceAttribution** ("Fuente: X" + link), fecha, autor.
- **RumorBadge** — badge ámbar "RUMOR / No confirmado".
- **NewsletterForm** — email + checkbox opt-in (destildado) + estado double opt-in.
- **UnofficialDisclaimer** — banda discreta en footer (texto de `02-legal §1`).
- **LocaleSwitcher**, **Breadcrumbs** (con schema), **Skeleton**, **EmptyState**, **StatCard**.

## Patrones UI (reglas globales del usuario)
- IDs de registros: UUID corto (6 chars, mayúsculas, sin guiones) en tablas/admin. **Nunca** UUID completo en modales/cards salvo pedido explícito.
- **Nada** `window.confirm/alert` → usar `ConfirmDialog` + `Toast` (`useConfirm()`/`useToast()`).
- Campos obligatorios con `(*)` (`<Label required>`).
- Consistencia de tamaños con módulos de referencia cuando se pida "como X".

## Accesibilidad & rendimiento
- WCAG AA, foco visible, navegación por teclado, `alt` en imágenes, `lang` por locale.
- Reservar alto de imágenes/embeds (CLS<0.1). `next/image` con `width/height`. Diferir widgets sociales.
- Respetar `prefers-reduced-motion` (animación del LiveBadge).

## Assets / imágenes (legal)
- Fotos: sólo **API-licenciadas / CC no-NC / propias**. Placeholders propios cuando falte foto. Ver `02-legal §5`.
- El material de esta actualización procede de la carpeta entregada por el usuario; mantener los originales como fuente de los derivados web.

## Assets web y regeneración

| Archivo | Uso / fuente |
| --- | --- |
| `front/public/brand/logo-color.webp` | Logo sobre claro, derivado fiel de `LOGO/PNG/LOGO COLOR.png`. |
| `front/public/brand/logo-white.webp` | Logo sobre oscuro, derivado fiel de `LOGO/PNG/LOGO BLANCO.png`. |
| `front/public/brand/icon-blue.png` | Emblema azul de `FAV ICON/PNG/FAVI ICON AZUL.png`. |
| `front/public/brand/icon-gold.png` | Emblema oro de `FAV ICON/PNG/FAV ICON AMARILLO.png`. |
| `front/app/icon.png` | Icono del sitio servido por Next.js. |
| `front/app/apple-icon.png` | Icono para dispositivos Apple. |
| `front/public/brand/tribuna.webp` | Fotografía optimizada de `IMG/TRIBUNA RECORTE-100.jpg` para la portada. |

Con las dependencias del frontend instaladas, regenerar desde la raíz del repositorio:

```sh
node tools/brand/prepare-assets.cjs
```

El proceso adapta márgenes transparentes y tamaños para web y conserva los originales. Revisar logos en claro/oscuro, favicon y portada en móvil tras regenerar.

- Imagen social: `front/public/brand/social.png` (1200 × 630), usada por Open Graph y Twitter.
