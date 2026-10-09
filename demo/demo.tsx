import { useEffect, useState } from 'react';

import {
  SelectorMultiple,
  type OpcionSelector,
} from '@/components/selector-multiple';

export const PERSONAS: OpcionSelector[] = [
  { valor: '1', etiqueta: 'Pepe Ruiz', detalle: 'pepe.ruiz@empresa.es' },
  { valor: '2', etiqueta: 'María José Maza', detalle: 'mjmaza@empresa.es' },
  { valor: '3', etiqueta: 'Íñigo Álvarez', detalle: 'inigo@empresa.es' },
  { valor: '4', etiqueta: 'Lucía Fernández', detalle: 'lucia.f@empresa.es' },
  { valor: '5', etiqueta: 'Ana Belén Ortega Sánchez de la Fuente', detalle: 'anabelen.ortega@empresa.es' },
  { valor: '6', etiqueta: 'Carlos Núñez', detalle: 'carlos@empresa.es' },
  { valor: '7', etiqueta: 'Rocío Almería', detalle: 'rocio@empresa.es' },
  { valor: '8', etiqueta: 'Javier Gómez', detalle: 'javier@empresa.es', deshabilitada: true },
];

export function Demo() {
  const [miembros, setMiembros] = useState<string[]>(['1', '2']);
  const [etiquetas, setEtiquetas] = useState<string[]>([]);
  const [oscuro, setOscuro] = useState(false);

  // En <html> y no en un div: la lista se pinta en un portal al final de <body>.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro);
  }, [oscuro]);

  return (
    <>
      <main className="mx-auto grid min-h-screen max-w-lectura content-start gap-8 bg-background px-4 py-10 text-foreground">
        <header className="grid gap-2">
          <h1 className="text-2xl font-semibold">Selector múltiple</h1>
          <p className="text-muted-foreground">
            Adaptado de sersavan/shadcn-multi-select-component. Pruébalo con el
            teclado: Tab, Intro o Espacio para abrir, flechas para moverte,
            Intro para elegir y Escape para cerrar.
          </p>
          <button
            type="button"
            aria-pressed={oscuro}
            onClick={() => setOscuro(!oscuro)}
            className="w-fit rounded-md border border-input px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tema oscuro
          </button>
        </header>

        <section className="grid gap-2">
          <label id="miembros-etiqueta" className="text-sm font-medium">
            Miembros
          </label>
          <SelectorMultiple
            aria-labelledby="miembros-etiqueta"
            aria-describedby="miembros-ayuda"
            opciones={PERSONAS}
            valor={miembros}
            alCambiar={setMiembros}
            name="miembros"
          />
          <p id="miembros-ayuda" className="text-sm text-muted-foreground">
            Busca por nombre o por correo.
          </p>
          <p className="text-sm">
            Valor: <output data-prueba="valor">{miembros.join(', ') || '—'}</output>
          </p>
        </section>

        <section className="grid gap-2">
          <label id="etiquetas-etiqueta" className="text-sm font-medium">
            Etiquetas (textos cambiados)
          </label>
          <SelectorMultiple
            aria-labelledby="etiquetas-etiqueta"
            opciones={[
              { valor: 'urgente', etiqueta: 'Urgente' },
              { valor: 'cliente', etiqueta: 'Cliente nuevo' },
              { valor: 'factura', etiqueta: 'Pendiente de factura' },
            ]}
            valor={etiquetas}
            alCambiar={setEtiquetas}
            textos={{
              marcador: 'Sin etiquetas',
              buscar: 'Buscar etiqueta',
              sinResultados: 'No hay ninguna etiqueta así',
              resumen: (n) => (n === 1 ? '1 etiqueta' : `${n} etiquetas`),
            }}
          />
        </section>

        <section className="grid gap-2">
          <label id="bloqueado-etiqueta" className="text-sm font-medium">
            Deshabilitado
          </label>
          <SelectorMultiple
            aria-labelledby="bloqueado-etiqueta"
            opciones={PERSONAS}
            valor={['3']}
            alCambiar={() => {}}
            disabled
          />
        </section>
      </main>
    </>
  );
}
