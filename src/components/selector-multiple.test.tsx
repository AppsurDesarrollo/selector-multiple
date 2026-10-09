import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
    SelectorMultiple,
    type OpcionSelector,
    type SelectorMultipleProps,
} from '@/components/selector-multiple';

// Viaja con el registro: corre igual en el repositorio del selector y en el
// proyecto donde se instala. Solo fireEvent (user-event no está en todos los
// proyectos). El teclado real y los anuncios en un lector de pantalla se prueban
// en Chromium con Playwright (repositorio del selector, carpeta pruebas/).

// jsdom no trae lo que usan Radix, cmdk y motion.
beforeAll(() => {
    Element.prototype.scrollIntoView ??= () => {};
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    globalThis.ResizeObserver ??= class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
    globalThis.IntersectionObserver ??= class {
        readonly root = null;
        readonly rootMargin = '';
        readonly thresholds = [];
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
            return [];
        }
    } as unknown as typeof IntersectionObserver;
    window.matchMedia ??= (query: string) =>
        ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }) as MediaQueryList;
});

afterEach(cleanup);

const PERSONAS: OpcionSelector[] = [
    { valor: '1', etiqueta: 'Pepe Ruiz', detalle: 'pepe.ruiz@empresa.es' },
    { valor: '2', etiqueta: 'María José Maza', detalle: 'mjmaza@empresa.es' },
    { valor: '3', etiqueta: 'Íñigo Álvarez', detalle: 'inigo@empresa.es' },
    { valor: '4', etiqueta: 'Rocío Almería', detalle: 'rocio@empresa.es' },
    {
        valor: '5',
        etiqueta: 'Javier Gómez',
        detalle: 'javier@empresa.es',
        deshabilitada: true,
    },
];

let ultimoValor: string[] = [];

function Prueba(
    props: Partial<SelectorMultipleProps> & { inicial?: string[] },
) {
    const { inicial = [], ...resto } = props;
    const [valor, setValor] = useState(inicial);
    return (
        <>
            <span id="etiqueta">Miembros</span>
            <SelectorMultiple
                aria-labelledby="etiqueta"
                opciones={PERSONAS}
                valor={valor}
                alCambiar={(nuevo) => {
                    ultimoValor = nuevo;
                    setValor(nuevo);
                }}
                {...resto}
            />
        </>
    );
}

const disparador = () => screen.getByRole('button', { name: /^Miembros/ });

function abrir() {
    fireEvent.click(disparador());
    return screen.getByRole('combobox');
}

const anuncio = () => screen.getByRole('status').textContent?.trim();

const opcionesVisibles = () =>
    screen.getAllByRole('option').map((o) => o.textContent);

describe('SelectorMultiple', () => {
    beforeEach(() => {
        ultimoValor = [];
    });

    it('habla en castellano por defecto', () => {
        render(<Prueba />);
        expect(disparador().textContent).toBe('Elige…');
        const buscador = abrir();
        expect(buscador.getAttribute('placeholder')).toBe('Buscar');
        expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe(
            'Opciones',
        );
        fireEvent.change(buscador, { target: { value: 'zzz' } });
        expect(screen.getByText('Sin resultados')).toBeTruthy();
    });

    it('acepta otros textos', () => {
        render(
            <Prueba
                inicial={['1']}
                textos={{
                    marcador: 'Sin etiquetas',
                    buscar: 'Buscar etiqueta',
                    resumen: (n) => `${n} etiquetas`,
                    quitar: (e) => `Fuera ${e}`,
                }}
            />,
        );
        expect(disparador().textContent).toBe('1 etiquetas');
        expect(
            screen.getByRole('button', { name: 'Fuera Pepe Ruiz' }),
        ).toBeTruthy();
        expect(abrir().getAttribute('placeholder')).toBe('Buscar etiqueta');
    });

    it('el botón se anuncia con la etiqueta y cuántos hay elegidos', () => {
        render(<Prueba inicial={['1', '2']} />);
        expect(disparador().getAttribute('aria-expanded')).toBe('false');
        expect(
            screen.getByRole('button', { name: 'Miembros 2 elegidos' }),
        ).toBeTruthy();
        abrir();
        expect(disparador().getAttribute('aria-expanded')).toBe('true');
    });

    it('elige con un clic, marca la opción y lo anuncia', () => {
        render(<Prueba />);
        abrir();
        fireEvent.click(screen.getByRole('option', { name: /Rocío Almería/ }));
        expect(ultimoValor).toEqual(['4']);
        expect(anuncio()).toBe('Añadido: Rocío Almería');
        expect(
            screen
                .getByRole('option', { name: /Rocío Almería/ })
                .getAttribute('aria-checked'),
        ).toBe('true');
        // Sigue abierto para elegir más; un segundo clic la quita.
        fireEvent.click(screen.getByRole('option', { name: /Rocío Almería/ }));
        expect(ultimoValor).toEqual([]);
        expect(anuncio()).toBe('Quitado: Rocío Almería');
    });

    it('las etiquetas van fuera del botón y cada ✕ es un botón real', () => {
        render(<Prueba inicial={['1', '2']} />);
        const lista = screen.getByRole('list', { name: 'Elegidos' });
        const quitar = within(lista).getByRole('button', {
            name: 'Quitar Pepe Ruiz',
        });
        expect(quitar.tagName).toBe('BUTTON');
        expect(quitar.getAttribute('type')).toBe('button');
        expect(disparador().contains(quitar)).toBe(false);
        expect(quitar.className).toContain('size-6'); // 24 px
    });

    it('al quitar, el foco pasa a la ✕ siguiente y, al final, al botón', () => {
        render(<Prueba inicial={['1', '2']} />);
        fireEvent.click(
            screen.getByRole('button', { name: 'Quitar Pepe Ruiz' }),
        );
        expect(ultimoValor).toEqual(['2']);
        expect(anuncio()).toBe('Quitado: Pepe Ruiz');
        expect(document.activeElement).toBe(
            screen.getByRole('button', { name: 'Quitar María José Maza' }),
        );
        fireEvent.click(
            screen.getByRole('button', { name: 'Quitar María José Maza' }),
        );
        expect(ultimoValor).toEqual([]);
        expect(screen.queryByRole('list', { name: 'Elegidos' })).toBeNull();
        expect(document.activeElement).toBe(disparador());
    });

    it('busca por nombre y por correo sin mayúsculas ni acentos', () => {
        render(<Prueba />);
        const buscador = abrir();
        fireEvent.change(buscador, { target: { value: 'almeria' } });
        expect(opcionesVisibles()).toEqual(['Rocío Almeríarocio@empresa.es']);
        fireEvent.change(buscador, { target: { value: 'INIGO' } });
        expect(opcionesVisibles()).toEqual(['Íñigo Álvarezinigo@empresa.es']);
        fireEvent.change(buscador, { target: { value: 'mjmaza@' } });
        expect(opcionesVisibles()).toEqual([
            'María José Mazamjmaza@empresa.es',
        ]);
        fireEvent.change(buscador, { target: { value: '' } });
        expect(opcionesVisibles()).toHaveLength(PERSONAS.length);
    });

    it('se maneja con el teclado: flechas, Intro y Escape', () => {
        render(<Prueba />);
        const buscador = abrir();
        // La primera opción queda resaltada al abrir; flecha abajo pasa a la segunda.
        fireEvent.keyDown(buscador, { key: 'ArrowDown' });
        fireEvent.keyDown(buscador, { key: 'Enter' });
        expect(ultimoValor).toEqual(['2']);
        // La deshabilitada se salta: desde la cuarta, flecha abajo no llega a Javier.
        fireEvent.keyDown(buscador, { key: 'ArrowDown' });
        fireEvent.keyDown(buscador, { key: 'ArrowDown' });
        fireEvent.keyDown(buscador, { key: 'ArrowDown' });
        fireEvent.keyDown(buscador, { key: 'Enter' });
        expect(ultimoValor).toEqual(['2', '4']);
        act(() => {
            fireEvent.keyDown(buscador, { key: 'Escape' });
        });
        expect(screen.queryByRole('combobox')).toBeNull();
        expect(disparador().getAttribute('aria-expanded')).toBe('false');
    });

    it('con name, manda un campo oculto por cada valor', () => {
        const { container } = render(
            <Prueba inicial={['1', '3']} name="miembros" />,
        );
        const ocultos = container.querySelectorAll('input[type="hidden"]');
        expect(
            Array.from(ocultos).map((i) => [
                i.getAttribute('name'),
                i.getAttribute('value'),
            ]),
        ).toEqual([
            ['miembros[]', '1'],
            ['miembros[]', '3'],
        ]);
    });

    it('con error: borde marcado y el mensaje enlazado al botón', () => {
        render(
            <>
                <Prueba invalido aria-describedby="error" />
                <p id="error">Elige al menos una persona</p>
            </>,
        );
        expect(disparador().getAttribute('data-invalido')).toBe('true');
        expect(disparador().getAttribute('aria-describedby')).toBe('error');
    });

    it('deshabilitado no abre ni deja quitar', () => {
        render(<Prueba inicial={['1']} disabled />);
        expect((disparador() as HTMLButtonElement).disabled).toBe(true);
        expect(
            (
                screen.getByRole('button', {
                    name: 'Quitar Pepe Ruiz',
                }) as HTMLButtonElement
            ).disabled,
        ).toBe(true);
    });
});
