# selector-multiple

Selector múltiple con buscador para React + shadcn, distribuido como **registro de shadcn**.

Es una adaptación de [sersavan/shadcn-multi-select-component](https://github.com/sersavan/shadcn-multi-select-component)
(MIT, © 2024 sersavan). La licencia original se conserva en [LICENSE](LICENSE).

## Instalación

Desde la raíz del proyecto:

```bash
pnpm --config.minimum-release-age=1440 dlx shadcn@4.21.3 add https://raw.githubusercontent.com/AppsurDesarrollo/selector-multiple/main/public/r/selector-multiple.json
```

Instala:

| Fichero | Qué es |
|---|---|
| `components/selector-multiple.tsx` | El selector |
| `components/selector-multiple.test.tsx` | Sus pruebas de Vitest (corren con las del proyecto) |
| `components/ui/popover.tsx` | Popover de shadcn (Radix, importa de `radix-ui`) |
| `components/ui/command.tsx` | Command de shadcn sin `CommandDialog` (no arrastra `dialog.tsx`) |
| `components/animate-ui/icons/{x,check,chevron-down}.tsx` | Iconos animados de animate-ui (y su base `icon.tsx` si falta) |

Dependencias: `cmdk`, `radix-ui`, `motion`, `lucide-react`.

**En proyectos Laravel (`resources/js`):** los ficheros del selector caen en su sitio, pero el CLI
deja los de animate-ui en `components/` y `hooks/` **de la raíz**, porque traen una ruta fija.
Hay que mover `x.tsx`, `check.tsx` y `chevron-down.tsx` a `resources/js/components/animate-ui/icons/`
y borrar lo de la raíz después de compararlo con lo que ya haya en `resources/js` (suele ser lo
mismo con otra sangría).

Necesita el token de curva `--ease-salida` en el `@theme` (lo trae `/install-starter`):

```css
--ease-salida: cubic-bezier(0.23, 1, 0.32, 1);
```

## Uso

```tsx
import { SelectorMultiple, type OpcionSelector } from '@/components/selector-multiple';

const personas: OpcionSelector[] = [
    { valor: '7', etiqueta: 'Pepe Ruiz', detalle: 'pepe@empresa.es' },
    { valor: '9', etiqueta: 'Lucía Fernández', detalle: 'lucia@empresa.es' },
];

const [elegidos, setElegidos] = useState<string[]>([]);

<Label id="miembros-etiqueta">Miembros</Label>
<SelectorMultiple
    aria-labelledby="miembros-etiqueta"
    opciones={personas}
    valor={elegidos}
    alCambiar={setElegidos}
/>
```

Se etiqueta con `aria-labelledby` (el `id` de la etiqueta visible), no con `<label htmlFor>`: así
el botón se anuncia «Miembros, 2 elegidos». Con `htmlFor` el lector diría solo «Miembros».

### Props

| Prop | Tipo | Para qué |
|---|---|---|
| `opciones` | `{ valor, etiqueta, detalle?, deshabilitada? }[]` | Lo que se puede elegir. El buscador mira `etiqueta` y `detalle` |
| `valor` | `string[]` | Lo elegido (componente controlado) |
| `alCambiar` | `(valor: string[]) => void` | Se llama al elegir o quitar |
| `textos` | `Partial<TextosSelector>` | Textos que se quieran cambiar |
| `aria-labelledby` | `string` | `id` de la etiqueta visible |
| `aria-describedby` | `string` | `id` de la ayuda o del mensaje de error |
| `invalido` | `boolean` | Pinta el borde de error (el mensaje va por `aria-describedby`) |
| `id` | `string` | `id` del botón, para llevar el foco a él desde un error |
| `name` | `string` | Añade un campo oculto `name[]` por cada valor (formularios clásicos) |
| `disabled` | `boolean` | Ni abre ni deja quitar |
| `className` | `string` | Clases del contenedor |

### Textos por defecto

| Clave | Por defecto |
|---|---|
| `marcador` | «Elige…» |
| `buscar` | «Buscar» |
| `sinResultados` | «Sin resultados» |
| `opciones` | «Opciones» (nombre de la lista para el lector de pantalla) |
| `elegidos` | «Elegidos» (nombre de la lista de etiquetas) |
| `resumen(n)` | «1 elegido» / «3 elegidos» |
| `quitar(etiqueta)` | «Quitar Pepe Ruiz» |
| `anuncioAlElegir(etiqueta)` | «Añadido: Pepe Ruiz» |
| `anuncioAlQuitar(etiqueta)` | «Quitado: Pepe Ruiz» |

## Qué cambia respecto al original

- **Etiquetas fuera del botón.** Cada ✕ es un `<button>` real de 24 px con «Quitar Pepe Ruiz». En
  el original era un `div role="button"` de 16 px dentro del botón del selector: interactivo
  anidado, por debajo del tamaño mínimo (WCAG 2.5.8) y mal anunciado.
- **Foco al quitar:** pasa a la ✕ siguiente; si no queda ninguna, al botón del selector.
- **Buscador** por etiqueta y detalle, sin mayúsculas ni acentos («almeria» → «Almería»). Un solo
  filtro (el original filtraba dos veces: el suyo y el de cmdk).
- **Una sola región de anuncios** (`<output>`). El original tenía dos regiones que repetían lo mismo
  y una lista dentro de otra lista.
- **Castellano con tuteo**, todos los textos sustituibles.
- **Sin rebotes ni animaciones por defecto.** Solo se mueve la lista al abrirse y cerrarse: 150 ms,
  opacidad y escala desde el 95 %, curva `ease-salida`. Con movimiento reducido aparece sin crecer
  ni desplazarse, y los iconos no se mueven.
- **Sin cálculos por tamaño de pantalla ni medidas fijas** (`max-w-[120px]`, cortes a 640/1024 px):
  los nombres largos se parten en varias líneas.
- **Recortado** de 1.210 a ~340 líneas (con comentarios): fuera grupos, «Seleccionar todo», «+N más», colores por
  opción, ref imperativa y el botón de la varita.

## Desarrollo

```bash
pnpm install
pnpm dev              # demo en http://localhost:5173
pnpm test             # Vitest
pnpm exec playwright install chromium   # una vez
pnpm test:e2e         # Playwright en Chromium: teclado, anuncios, axe claro/oscuro, 24 px, 320 px, movimiento reducido
pnpm registro         # regenera public/r/selector-multiple.json (hay que versionarlo)
```

La demo está en [demo/demo.tsx](demo/demo.tsx); sus colores y curvas son los mismos que deja
`/install-starter` en los proyectos, así que lo que se mide aquí es lo que se ve allí.

El formato del código (sangría de 4) es el de los proyectos de destino, para que `pnpm run check`
no proteste tras instalarlo.
