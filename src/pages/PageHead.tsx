/**
 * PageHead.tsx — the masthead block at the top of each module page.
 *
 * Asymmetric by design: the title takes the wide column, and the standing
 * commentary ("what this module is for") sits in a narrower measure beside it,
 * separated by a hairline rule — a journal section opener rather than a
 * centred hero.
 */

import type { ReactNode } from 'react';
import type { Route } from '../routes';

export function PageHead({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <header className="page__head">
      <div>
        <p className="eyebrow eyebrow--brick">
          {route.num} — {route.nav}
        </p>
        <h1>{route.title}</h1>
      </div>
      <div className="page__head-aside">{children}</div>
    </header>
  );
}
