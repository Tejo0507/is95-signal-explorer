/**
 * app.smoke.test.tsx — does the site actually run?
 *
 * The maths tests in src/lib prove the numbers are right. These prove the
 * pages mount, every route renders, and the interactive controls do not throw
 * when exercised — the class of failure a type checker cannot see (an
 * out-of-range array index, a `find()` that returns undefined behind a
 * non-null assertion, an effect that loops).
 *
 * The brief for this project says "do not create buttons that do nothing", so
 * the last test clicks every button on every module page and asserts that the
 * page survives it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

import App from './App';
import { ROUTES } from './routes';

let container: HTMLDivElement;
let root: Root;

// React logs a warning unless the test environment declares itself.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // Start from a dismissed walkthrough so the overlay does not sit over the
  // page and intercept the clicks in the last test.
  try {
    window.localStorage.setItem('is95-explorer:walkthrough-seen', '1');
  } catch {
    // happy-dom always provides localStorage; the guard matches the app's.
  }
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function renderAt(hash: string) {
  window.location.hash = hash;
  act(() => root.render(<App />));
}

/**
 * Set the value of a React-controlled input and fire the change.
 *
 * Assigning `.value` directly is not enough: React installs its own value
 * setter on the element to track changes, so a direct assignment leaves React's
 * cached value equal to the new one and the change event is treated as a
 * no-op. Going through the prototype's native setter updates the DOM without
 * touching React's tracker, so the subsequent event is seen as a real change.
 */
function setReactInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('application shell', () => {
  it('mounts the overview without throwing', () => {
    renderAt('#/');
    expect(container.textContent).toContain('IS-95 Signal');
    expect(container.querySelector('.masthead')).not.toBeNull();
    expect(container.querySelector('.colophon')).not.toBeNull();
  });

  it('renders a nav entry for every route', () => {
    renderAt('#/');
    const nav = container.querySelectorAll('.nav__item');
    // One per route, plus the Guide button.
    expect(nav.length).toBe(ROUTES.length + 1);
  });

  it('falls back to the overview for an unknown hash', () => {
    renderAt('#/does-not-exist');
    expect(container.textContent).toContain('Five modules');
  });
});

describe('every module page renders', () => {
  for (const route of ROUTES) {
    it(`${route.num} — ${route.nav}`, () => {
      renderAt(route.hash);

      // Something substantial rendered, not an empty shell.
      expect(container.textContent!.length).toBeGreaterThan(500);

      // The page head shows this route, except on the overview.
      if (route.id !== 'overview') {
        expect(container.textContent).toContain(route.title);
      }

      // No figure is left without a caption.
      for (const fig of container.querySelectorAll('figure.figure')) {
        expect(fig.querySelector('figcaption')).not.toBeNull();
      }
    });
  }
});

describe('interactive controls', () => {
  it('every module page has controls and at least one reset', () => {
    for (const route of ROUTES.filter((r) => r.id !== 'overview')) {
      renderAt(route.hash);
      const buttons = container.querySelectorAll('button');
      expect(buttons.length, `${route.nav} should have buttons`).toBeGreaterThan(3);

      const resets = [...container.querySelectorAll('button')].filter((b) =>
        b.textContent?.includes('↺'),
      );
      expect(resets.length, `${route.nav} should offer a reset`).toBeGreaterThan(0);
    }
  });

  it('survives clicking every button on every module page', () => {
    for (const route of ROUTES) {
      renderAt(route.hash);

      // Re-query each time: clicking can replace the tree.
      let i = 0;
      for (;;) {
        const buttons = [...container.querySelectorAll('button')];
        if (i >= buttons.length) break;
        const button = buttons[i];
        if (!button.disabled) {
          act(() => {
            button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          });
        }
        i += 1;
      }

      // Still alive and still rendering content after the whole sweep.
      expect(container.textContent!.length, `${route.nav} survived its buttons`).toBeGreaterThan(200);
    }
  });

  it('moves the frequency marker and reports band membership', () => {
    renderAt('#/rf');

    const range = container.querySelector<HTMLInputElement>('input[type="range"]');
    expect(range).not.toBeNull();

    // Starts in the forward band at 880 MHz.
    expect(container.textContent).toContain('Forward link');

    // 835 MHz is inside the reverse band; its pair is 45 MHz up at 880.
    setReactInputValue(range!, '835');

    expect(container.textContent).toContain('Reverse link');
    expect(container.textContent).toContain('835.00');
  });

  it('answers a knowledge-check question and shows feedback', () => {
    renderAt('#/rf');

    const option = container.querySelector<HTMLButtonElement>('.quiz__option');
    expect(option).not.toBeNull();

    act(() => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const feedback = container.querySelector('.quiz__feedback');
    expect(feedback).not.toBeNull();
    expect(['true', 'false']).toContain(feedback!.getAttribute('data-correct'));
  });

  it('switches the pipeline between forward and reverse', () => {
    renderAt('#/physical');
    expect(container.textContent).toContain('Forward-link processing');

    const reverse = [...container.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Reverse · MS → BS'),
    );
    expect(reverse).not.toBeUndefined();

    act(() => {
      reverse!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(container.textContent).toContain('Reverse-link processing');
    // A block that exists only on the reverse chain.
    expect(container.textContent).toContain('Burst randomiser');
  });

  it('rebuilds the trace when the direction changes', () => {
    renderAt('#/trace');
    expect(container.textContent).toContain('Forward traffic');

    const reverse = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Reverse traffic',
    );
    expect(reverse).not.toBeUndefined();

    act(() => {
      reverse!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    // Reverse-only language from lib/trace.ts.
    expect(container.textContent).toContain('64-ary');
  });
});
