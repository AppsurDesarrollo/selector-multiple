'use client';

/**
 * Selector múltiple con buscador.
 *
 * Adaptado de sersavan/shadcn-multi-select-component (MIT, © 2024 sersavan) por
 * AppsurDesarrollo: https://github.com/AppsurDesarrollo/selector-multiple
 *
 * Uso:
 *   <Label id="miembros-etiqueta">Miembros</Label>
 *   <SelectorMultiple
 *       aria-labelledby="miembros-etiqueta"
 *       opciones={personas}
 *       valor={elegidos}
 *       alCambiar={setElegidos}
 *   />
 * donde cada persona es un objeto con valor '7', etiqueta 'Pepe Ruiz' y
 * detalle 'pepe@empresa.es' (el detalle es opcional).
 *
 * Lo que cambia respecto al original y por qué:
 * - Las etiquetas elegidas van FUERA del botón que abre la lista, cada una con su
 *   ✕ como <button> real de 24 px («Quitar Pepe Ruiz»). En el original era un div
 *   de 16 px dentro de otro botón: el lector de pantalla no lo anunciaba como
 *   botón y no llegaba al tamaño mínimo de objetivo (WCAG 2.5.8).
 * - Se pasa `aria-labelledby` (el id de la etiqueta visible) en vez de
 *   <label htmlFor>: así el botón se anuncia como «Miembros, 3 elegidos». Con
 *   <label htmlFor> el lector diría solo «Miembros» y no cuántos hay.
 * - El buscador mira la etiqueta y el detalle (nombre y correo) sin distinguir
 *   mayúsculas ni acentos: «almeria» encuentra «Almería».
 * - Una sola región de anuncios: «Añadido: Pepe Ruiz», «Quitado: Pepe Ruiz».
 * - Sin rebotes, sin cálculos por tamaño de pantalla y sin medidas fijas. Solo se
 *   mueve la lista al abrirse y cerrarse (150 ms, curva `ease-salida`); con
 *   movimiento reducido aparece sin crecer ni desplazarse, y los iconos (✕ y
 *   flecha) no se mueven al pasar el ratón.
 * - Componente controlado: el estado vive en quien lo usa (`valor` + `alCambiar`).
 */
import { useReducedMotion } from 'motion/react';
import * as React from 'react';

import { Check } from '@/components/animate-ui/icons/check';
import { ChevronDown } from '@/components/animate-ui/icons/chevron-down';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { X } from '@/components/animate-ui/icons/x';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type OpcionSelector = {
    valor: string;
    etiqueta: string;
    /** Segunda línea en la lista (p. ej. el correo). El buscador también la mira. */
    detalle?: string;
    deshabilitada?: boolean;
};

export type TextosSelector = {
    /** Lo que muestra el botón cuando no hay nada elegido. */
    marcador: string;
    buscar: string;
    sinResultados: string;
    /** Nombre de la lista de opciones para el lector de pantalla. */
    opciones: string;
    /** Nombre de la lista de etiquetas elegidas para el lector de pantalla. */
    elegidos: string;
    resumen: (cuantos: number) => string;
    quitar: (etiqueta: string) => string;
    anuncioAlElegir: (etiqueta: string) => string;
    anuncioAlQuitar: (etiqueta: string) => string;
};

export const TEXTOS_SELECTOR: TextosSelector = {
    marcador: 'Elige…',
    buscar: 'Buscar',
    sinResultados: 'Sin resultados',
    opciones: 'Opciones',
    elegidos: 'Elegidos',
    resumen: (cuantos) => (cuantos === 1 ? '1 elegido' : `${cuantos} elegidos`),
    quitar: (etiqueta) => `Quitar ${etiqueta}`,
    anuncioAlElegir: (etiqueta) => `Añadido: ${etiqueta}`,
    anuncioAlQuitar: (etiqueta) => `Quitado: ${etiqueta}`,
};

export type SelectorMultipleProps = {
    opciones: OpcionSelector[];
    valor: string[];
    alCambiar: (valor: string[]) => void;
    /** id del botón que abre la lista (para llevar el foco a él desde un error). */
    id?: string;
    /** Si se da, se añade un campo oculto `name[]` por cada valor elegido. */
    name?: string;
    disabled?: boolean;
    className?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    /**
     * Pinta el borde de error. El mensaje se enlaza con aria-describedby: un
     * <button> no admite aria-invalid (ARIA 1.2), así que el lector se entera por
     * el texto del error, que lee al llegar al botón.
     */
    invalido?: boolean;
    // Al final a propósito: así check-ingles no toma por texto de pantalla el
    // código que sigue al tipo genérico (daba un falso «texto en inglés»).
    /** Textos que se quieran cambiar; el resto sale de TEXTOS_SELECTOR. */
    textos?: Partial<TextosSelector>;
};

const sinAcentos = (texto: string) =>
    texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// cmdk llama a esto con el valor del elemento, lo escrito y sus palabras clave
// (etiqueta y detalle). 1 = se muestra, 0 = se oculta.
function filtrar(_valor: string, busqueda: string, claves?: string[]) {
    const buscado = sinAcentos(busqueda.trim());
    if (buscado === '') return 1;
    return (claves ?? []).some((clave) => sinAcentos(clave).includes(buscado))
        ? 1
        : 0;
}

export function SelectorMultiple({
    opciones,
    valor,
    alCambiar,
    textos,
    id,
    name,
    disabled,
    className,
    'aria-labelledby': etiquetadoPor,
    'aria-describedby': descritoPor,
    invalido,
}: SelectorMultipleProps) {
    const t = { ...TEXTOS_SELECTOR, ...textos };
    const [abierto, setAbierto] = React.useState(false);
    const [busqueda, setBusqueda] = React.useState('');
    const [anuncio, setAnuncio] = React.useState('');
    // MotionConfig reducedMotion="user" NO frena los iconos de animate-ui (los
    // mueve con controles, medido en Chromium): se les quita el disparador.
    const animarIconos = !useReducedMotion();

    const idBase = React.useId();
    const idResumen = `${idBase}-resumen`;
    const disparador = React.useRef<HTMLButtonElement>(null);
    const botonesQuitar = React.useRef(new Map<string, HTMLButtonElement>());
    // Tras quitar con la ✕: a qué ✕ va el foco (null = al botón que abre la lista).
    const focoPendiente = React.useRef<string | null | undefined>(undefined);

    const porValor = new Map(opciones.map((opcion) => [opcion.valor, opcion]));
    const elegidas = valor
        .map((v) => porValor.get(v))
        .filter((opcion): opcion is OpcionSelector => opcion !== undefined);
    const marcadas = new Set(valor);

    React.useEffect(() => {
        const pendiente = focoPendiente.current;
        if (pendiente === undefined) return;
        focoPendiente.current = undefined;
        const destino =
            pendiente === null
                ? disparador.current
                : botonesQuitar.current.get(pendiente);
        destino?.focus();
    }, [valor]);

    // Si el texto coincide con el anterior, el lector no lo repetiría: se le añade
    // un espacio duro para que la región cambie y se vuelva a leer.
    function anunciar(texto: string) {
        setAnuncio((anterior) => (anterior === texto ? `${texto} ` : texto));
    }

    function alternar(opcion: OpcionSelector) {
        if (marcadas.has(opcion.valor)) {
            alCambiar(valor.filter((v) => v !== opcion.valor));
            anunciar(t.anuncioAlQuitar(opcion.etiqueta));
        } else {
            alCambiar([...valor, opcion.valor]);
            anunciar(t.anuncioAlElegir(opcion.etiqueta));
        }
    }

    function quitar(opcion: OpcionSelector, posicion: number) {
        const restantes = elegidas.filter((o) => o.valor !== opcion.valor);
        const siguiente = restantes[posicion] ?? restantes[posicion - 1];
        focoPendiente.current = siguiente ? siguiente.valor : null;
        alCambiar(valor.filter((v) => v !== opcion.valor));
        anunciar(t.anuncioAlQuitar(opcion.etiqueta));
    }

    return (
        <div className={cn('grid gap-2', className)}>
            <Popover
                open={abierto}
                onOpenChange={(abrir) => {
                    setAbierto(abrir);
                    if (!abrir) setBusqueda('');
                }}
            >
                <AnimateIcon animateOnHover={animarIconos} asChild>
                    <PopoverTrigger asChild>
                        <button
                            ref={disparador}
                            id={id}
                            type="button"
                            disabled={disabled}
                            aria-labelledby={
                                etiquetadoPor
                                    ? `${etiquetadoPor} ${idResumen}`
                                    : undefined
                            }
                            aria-describedby={descritoPor}
                            data-invalido={invalido || undefined}
                            className="flex min-h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-start text-sm shadow-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-invalido:border-destructive"
                        >
                            <span
                                id={idResumen}
                                className={cn(
                                    'min-w-0',
                                    elegidas.length === 0 &&
                                        'text-muted-foreground',
                                )}
                            >
                                {elegidas.length === 0
                                    ? t.marcador
                                    : t.resumen(elegidas.length)}
                            </span>
                            <ChevronDown
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                            />
                        </button>
                    </PopoverTrigger>
                </AnimateIcon>
                <PopoverContent
                    align="start"
                    className="w-(--radix-popover-trigger-width) min-w-64 p-0 ease-salida motion-reduce:data-[side=bottom]:slide-in-from-top-0 motion-reduce:data-[side=top]:slide-in-from-bottom-0 motion-reduce:data-[state=closed]:zoom-out-100 motion-reduce:data-[state=open]:zoom-in-100"
                >
                    <Command filter={filtrar} label={t.buscar}>
                        <CommandInput
                            placeholder={t.buscar}
                            value={busqueda}
                            onValueChange={setBusqueda}
                        />
                        <CommandList label={t.opciones}>
                            <CommandEmpty>{t.sinResultados}</CommandEmpty>
                            <CommandGroup>
                                {opciones.map((opcion) => {
                                    const marcada = marcadas.has(opcion.valor);
                                    return (
                                        <CommandItem
                                            key={opcion.valor}
                                            value={opcion.valor}
                                            keywords={[
                                                opcion.etiqueta,
                                                opcion.detalle ?? '',
                                            ]}
                                            disabled={opcion.deshabilitada}
                                            aria-checked={marcada}
                                            onSelect={() => alternar(opcion)}
                                        >
                                            <Check
                                                className={cn(
                                                    'size-4',
                                                    !marcada && 'invisible',
                                                )}
                                                aria-hidden
                                            />
                                            <span className="grid min-w-0 break-words">
                                                <span>{opcion.etiqueta}</span>
                                                {opcion.detalle && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {opcion.detalle}
                                                    </span>
                                                )}
                                            </span>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {elegidas.length > 0 && (
                <ul aria-label={t.elegidos} className="flex flex-wrap gap-1.5">
                    {elegidas.map((opcion, posicion) => (
                        <li
                            key={opcion.valor}
                            className="inline-flex max-w-full items-center gap-0.5 rounded-md bg-secondary py-0.5 ps-2 pe-0.5 text-sm text-secondary-foreground"
                        >
                            <span className="min-w-0 break-words">
                                {opcion.etiqueta}
                            </span>
                            <AnimateIcon animateOnHover={animarIconos} asChild>
                                <button
                                    ref={(boton) => {
                                        if (boton)
                                            botonesQuitar.current.set(
                                                opcion.valor,
                                                boton,
                                            );
                                        else
                                            botonesQuitar.current.delete(
                                                opcion.valor,
                                            );
                                    }}
                                    type="button"
                                    disabled={disabled}
                                    aria-label={t.quitar(opcion.etiqueta)}
                                    onClick={() => quitar(opcion, posicion)}
                                    className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                                >
                                    <X className="size-4" aria-hidden />
                                </button>
                            </AnimateIcon>
                        </li>
                    ))}
                </ul>
            )}

            {/* <output> es una región de estado: el lector lee lo que cambia sin mover el foco. */}
            <output className="sr-only">{anuncio}</output>

            {name &&
                valor.map((v) => (
                    <input key={v} type="hidden" name={`${name}[]`} value={v} />
                ))}
        </div>
    );
}
