/**
 * App.tsx, shell, hash routing, masthead and colophon.
 *
 * Routing is hand-rolled over `location.hash`: the built site is static files
 * only, so hash routes work on any host (GitHub Pages included) with no
 * rewrite rules, and a deep link survives a refresh.
 */

import { useCallback, useEffect, useState } from 'react';
import { ROUTES, routeFromHash, type Route } from './routes';
import { Overview } from './pages/Overview';
import { RfSpreading } from './pages/RfSpreading';
import { LogicalChannels } from './pages/LogicalChannels';
import { CodeExplorer } from './pages/CodeExplorer';
import { PhysicalAllocation } from './pages/PhysicalAllocation';
import { TraceSignal } from './pages/TraceSignal';
import { Walkthrough } from './components/Walkthrough';
import { markWalkthroughSeen, walkthroughSeen } from './lib/storage';
import { SOURCE } from './lib/spec';
import { Legend } from './components/ui';
import { SIGNAL_LEGEND } from './components/theme';

export default function App() {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));
  const [guideOpen, setGuideOpen] = useState(() => !walkthroughSeen());

  // Follow the hash, including back/forward navigation.
  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Scrolling to the top on navigation matters here: the module pages are long,
  // and arriving halfway down one is disorienting.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    document.title = route.id === 'overview' ? 'IS-95 Signal Explorer' : `${route.num} ${route.nav} · IS-95 Signal Explorer`;
  }, [route]);

  const navigate = useCallback((r: Route) => {
    window.location.hash = r.hash;
  }, []);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    markWalkthroughSeen();
  }, []);

  return (
    <div className="shell">
      <header className="masthead">
        <div className="masthead__inner">
          <button
            type="button"
            className="masthead__brand"
            onClick={() => navigate(ROUTES[0])}
            aria-label="Back to the overview"
          >
            <BrandMark />
            <span className="masthead__title">
              IS-95 Signal Explorer
              <em>CDMA interactive laboratory</em>
            </span>
          </button>

          <nav className="nav" aria-label="Modules">
            {ROUTES.map((r) => (
              <button
                key={r.id}
                type="button"
                className="nav__item"
                aria-current={route.id === r.id ? 'page' : undefined}
                onClick={() => navigate(r)}
              >
                <span className="nav__num">{r.num}</span>
                {r.nav}
              </button>
            ))}
            <button type="button" className="nav__item" onClick={() => setGuideOpen(true)}>
              Guide
            </button>
          </nav>
        </div>
      </header>

      <main>
        {route.id === 'overview' ? <Overview onNavigate={navigate} /> : null}
        {route.id === 'rf' ? <RfSpreading /> : null}
        {route.id === 'channels' ? <LogicalChannels /> : null}
        {route.id === 'codes' ? <CodeExplorer /> : null}
        {route.id === 'physical' ? <PhysicalAllocation /> : null}
        {route.id === 'trace' ? <TraceSignal /> : null}
      </main>

      <footer className="colophon">
        <div className="colophon__inner">
          <div>
            <h3>Source</h3>
            <p>
              All specifications follow <strong>{SOURCE.deck}</strong>, the course deck for{' '}
              {SOURCE.course}, {SOURCE.unit}, which in turn cites {SOURCE.reference}. Figures the
              deck marks illustrative or schematic are reproduced as schematic here.
            </p>
            <p style={{ marginBottom: 0 }}>
              This site is a teaching instrument. It is <strong>not</strong> a standard-compliant
              IS-95 modem: the Walsh and shift-register mathematics are exact, and everything else
              is a labelled block diagram. Where the reference supplies no value, none is invented,
              see the full list of simplifications on the overview page.
            </p>
          </div>
          <div>
            <h3>Colour convention</h3>
            <Legend entries={SIGNAL_LEGEND} />
            <p style={{ marginTop: 'var(--s4)', marginBottom: 0 }}>
              A dashed olive box is always a disclosure: a point where this site simplifies
              something and says so.
            </p>
          </div>
        </div>
      </footer>

      <Walkthrough open={guideOpen} onClose={closeGuide} />
    </div>
  );
}

/**
 * The mark: four chips of a Walsh function. Small enough to read at 24 px,
 * and a signal rather than a logo.
 */
function BrandMark() {
  return (
    <svg className="masthead__mark" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M1 7 H6 V17 H11 V7 H16 V17 H21 V7"
        fill="none"
        stroke="var(--brick)"
        strokeWidth="1.6"
        strokeLinejoin="miter"
      />
      <line x1="1" y1="12" x2="23" y2="12" stroke="var(--charcoal)" strokeWidth="0.5" />
    </svg>
  );
}
