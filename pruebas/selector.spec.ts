import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Pruebas en Chromium real contra la demo (demo/demo.tsx). Lo que jsdom no puede
// demostrar: el teclado de verdad (Tab, Intro, Espacio), lo que queda en el árbol
// de accesibilidad que lee el lector de pantalla, axe, medidas en píxeles,
// movimiento reducido y las animaciones de los iconos.

const miembros = (page: Page) =>
  page.getByRole('button', { name: /^Miembros/ });
const estado = (page: Page) => page.getByRole('status').first();

async function axe(page: Page) {
  // Durante los 150 ms de entrada la lista está semitransparente y axe mediría un
  // contraste que nadie ve en reposo: se espera a que acabe toda animación.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== 'running'),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
  ).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(miembros(page)).toBeVisible();
});

test('se usa entero con el teclado y anuncia cada cambio', async ({ page }) => {
  // Tab desde el principio: «Tema oscuro» y luego el selector de miembros.
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(miembros(page)).toBeFocused();
  // Lo que oye el lector al llegar: la etiqueta, cuántos hay y la ayuda.
  await expect(miembros(page)).toHaveAccessibleName('Miembros 2 elegidos');
  await expect(miembros(page)).toHaveAccessibleDescription(
    'Busca por nombre o por correo.',
  );

  await page.keyboard.press('Enter');
  const buscador = page.getByRole('combobox', { name: 'Buscar' });
  await expect(buscador).toBeFocused();
  await expect(miembros(page)).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.type('rocio');
  await expect(page.getByRole('option')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expect(estado(page)).toHaveText('Añadido: Rocío Almería');
  await expect(page.getByRole('option', { name: /Rocío Almería/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );

  // Escape cierra y devuelve el foco al botón, que ya dice 3.
  await page.keyboard.press('Escape');
  await expect(buscador).toBeHidden();
  await expect(miembros(page)).toBeFocused();
  await expect(miembros(page)).toHaveAccessibleName('Miembros 3 elegidos');

  // Espacio también abre; la búsqueda anterior se ha vaciado.
  await page.keyboard.press(' ');
  await expect(page.getByRole('combobox', { name: 'Buscar' })).toBeFocused();
  await expect(page.getByRole('combobox', { name: 'Buscar' })).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(miembros(page)).toBeFocused();

  // Tab llega a las ✕ (fuera del botón) y Intro quita.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Quitar Pepe Ruiz' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(estado(page)).toHaveText('Quitado: Pepe Ruiz');
  await expect(
    page.getByRole('button', { name: 'Quitar María José Maza' }),
  ).toBeFocused();
  await expect(page.locator('[data-prueba="valor"]')).toHaveText('2, 7');
});

test('árbol de accesibilidad: lista de elegidos con botones reales', async ({ page }) => {
  await expect(page.getByRole('list', { name: 'Elegidos' }).first()).toMatchAriaSnapshot(`
    - list "Elegidos":
      - listitem:
        - text: Pepe Ruiz
        - button "Quitar Pepe Ruiz"
      - listitem:
        - text: María José Maza
        - button "Quitar María José Maza"
  `);
});

for (const tema of ['claro', 'oscuro'] as const) {
  test(`axe sin infracciones en tema ${tema}, cerrado y abierto`, async ({ page }) => {
    if (tema === 'oscuro') {
      await page.getByRole('button', { name: 'Tema oscuro' }).click();
      await expect(page.locator('html')).toHaveClass(/dark/);
    }
    await axe(page);
    await miembros(page).click();
    await expect(page.getByRole('listbox')).toBeVisible();
    // Con una opción resaltada (fondo de acento) para medir ese contraste también.
    await page.keyboard.press('ArrowDown');
    await axe(page);
  });
}

test('objetivos de al menos 24 px', async ({ page }) => {
  for (const nombre of ['Quitar Pepe Ruiz', 'Quitar María José Maza']) {
    const caja = await page.getByRole('button', { name: nombre }).boundingBox();
    expect(caja!.width).toBeGreaterThanOrEqual(24);
    expect(caja!.height).toBeGreaterThanOrEqual(24);
  }
  const boton = await miembros(page).boundingBox();
  expect(boton!.height).toBeGreaterThanOrEqual(24);
});

test('a 320 px no hay desplazamiento horizontal y los nombres largos se parten', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await miembros(page).click();
  await page.getByRole('option', { name: /Ana Belén/ }).click();
  await page.keyboard.press('Escape');
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(desborda).toBe(false);
  const etiqueta = page
    .getByRole('list', { name: 'Elegidos' })
    .first()
    .getByText('Ana Belén Ortega Sánchez de la Fuente');
  const caja = await etiqueta.boundingBox();
  expect(caja!.x + caja!.width).toBeLessThanOrEqual(320);
});

test('la lista entra en 150 ms con ease-salida; con movimiento reducido no crece', async ({
  page,
}) => {
  const medir = async () => {
    await miembros(page).click();
    const contenido = page.locator('[data-slot="popover-content"]');
    await expect(contenido).toBeVisible();
    const estilo = await contenido.evaluate((el) => {
      const cs = getComputedStyle(el);
      return {
        duracion: cs.animationDuration,
        curva: cs.animationTimingFunction,
        escala: cs.getPropertyValue('--tw-enter-scale').trim(),
        desplazamiento: cs.getPropertyValue('--tw-enter-translate-y').trim(),
      };
    });
    await page.keyboard.press('Escape');
    return estilo;
  };

  const normal = await medir();
  expect(normal.duracion).toBe('0.15s');
  expect(normal.curva).toBe('cubic-bezier(0.23, 1, 0.32, 1)');
  expect(Number(normal.escala)).toBe(0.95);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducido = await medir();
  expect(Number(reducido.escala)).toBe(1);
  // Cero en cualquiera de sus formas: «0», «0px», «calc(0*-100%)»...
  expect(reducido.desplazamiento).toMatch(/^(0|0px|calc\(0\s*\*.*\))$/);
});

test('la ✕ y la flecha animan al pasar el ratón; con movimiento reducido, no', async ({
  page,
}) => {
  await page.bringToFront();
  // Con la ventana en segundo plano rAF va a ~3 ticks/600 ms y la animación no se
  // puede observar: se comprueba antes que rAF corre de verdad.
  const ticks = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let n = 0;
        const fin = performance.now() + 500;
        const paso = () => {
          n++;
          if (performance.now() < fin) requestAnimationFrame(paso);
          else resolve(n);
        };
        requestAnimationFrame(paso);
      }),
  );
  expect(ticks).toBeGreaterThanOrEqual(20);

  // Cuántos estilos distintos toma el trazo del icono durante medio segundo de hover.
  const muestrear = async (boton: ReturnType<Page['getByRole']>, trazo: string) => {
    const pieza = boton.locator(trazo).first();
    const vistos = new Set<string>();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(600);
    await boton.hover();
    for (let i = 0; i < 25; i++) {
      vistos.add((await pieza.getAttribute('style')) ?? '');
      await page.waitForTimeout(20);
    }
    return vistos.size;
  };
  const quitar = page.getByRole('button', { name: 'Quitar Pepe Ruiz' });

  expect(await muestrear(quitar, 'line')).toBeGreaterThan(2);
  expect(await muestrear(miembros(page), 'path')).toBeGreaterThan(2);

  // La preferencia se lee al cargar la página, como le pasa a quien la tiene puesta.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  expect(await muestrear(quitar, 'line')).toBeLessThanOrEqual(1);
  expect(await muestrear(miembros(page), 'path')).toBeLessThanOrEqual(1);
});
