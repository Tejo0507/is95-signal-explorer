/**
 * TraceSignal.tsx — module 05, the signature experiment.
 */

import { SignalTrace } from '../components/SignalTrace';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { SectionHead } from '../components/ui';
import { routeById } from '../routes';
import { PageHead } from './PageHead';

export function TraceSignal() {
  return (
    <div className="page">
      <PageHead route={routeById('trace')}>
        <p>
          The four earlier modules each look at one layer. This one connects them: choose a
          direction, a rate and a code configuration, and follow a single signal from band
          allocation through to the receiver’s decision.
        </p>
        <p style={{ marginBottom: 0 }}>
          Switch direction and the whole path rebuilds — not just the labels. Eleven of the sixteen
          properties in the comparison table change with it.
        </p>
      </PageHead>

      <section className="section">
        <SectionHead num="5.1" title="Seven stages, end to end" aside="Experiment · interactive" />
        <SignalTrace />
      </section>

      <section className="section">
        <KnowledgeCheck moduleId="trace" title="Knowledge check · synthesis" />
      </section>
    </div>
  );
}
