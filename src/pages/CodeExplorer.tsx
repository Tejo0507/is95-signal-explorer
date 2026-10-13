/**
 * CodeExplorer.tsx — module 03.
 *
 * Three code families, in the order a signal meets them, with a tabbed
 * interface so each explorer gets the full page width (these are the busiest
 * figures on the site and do not survive being squeezed into columns).
 */

import { useState } from 'react';
import { WalshCodeExplorer } from '../components/WalshCodeExplorer';
import { PNSequenceExplorer } from '../components/PNSequenceExplorer';
import { LongCodeExplorer } from '../components/LongCodeExplorer';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { Figure, SectionHead } from '../components/ui';
import { routeById } from '../routes';
import { PageHead } from './PageHead';

type Tab = 'walsh' | 'pn' | 'long';

const TABS: { id: Tab; label: string; heading: string; sub: string }[] = [
  {
    id: 'walsh',
    label: 'A · Walsh functions',
    heading: 'Walsh functions',
    sub: 'Orthogonal when aligned — the forward link’s channelisation, the reverse link’s modulation.',
  },
  {
    id: 'pn',
    label: 'B · PN sequences',
    heading: 'PN sequences',
    sub: 'Noise-like, with one sharp autocorrelation peak — which is how a receiver finds timing.',
  },
  {
    id: 'long',
    label: 'C · Long codes',
    heading: 'Long codes',
    sub: 'A 42-stage generator with a per-user mask — user identity on the reverse link, scrambling on the forward.',
  },
];

/** The three families compared on the axes that actually distinguish them. */
const COMPARISON = [
  {
    property: 'Length in IS-95',
    walsh: '64 chips',
    pn: 'Short — period 2¹⁵ class',
    long: 'Period 2⁴² − 1',
  },
  {
    property: 'Correlation at zero shift',
    walsh: '0 between distinct codes',
    pn: 'Peak = period',
    long: 'Peak = period',
  },
  {
    property: 'Correlation off zero shift',
    walsh: 'Generally non-zero',
    pn: 'Exactly −1',
    long: 'Near −1',
  },
  {
    property: 'Distinguishes',
    walsh: 'Forward channels · reverse symbols',
    pn: 'Cells, by offset',
    long: 'Users, by mask',
  },
  {
    property: 'Chosen for',
    walsh: 'Exact cancellation',
    pn: 'Sharp timing peak',
    long: 'Length and per-user phase',
  },
  {
    property: 'Needs alignment?',
    walsh: 'Yes — orthogonality depends on it',
    pn: 'No — the peak is what finds alignment',
    long: 'No — but misalignment costs margin',
  },
];

export function CodeExplorer() {
  const [tab, setTab] = useState<Tab>('walsh');
  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div className="page">
      <PageHead route={routeById('codes')}>
        <p>
          IS-95 uses three code families for three different jobs, and the commonest error in this
          material is treating them as interchangeable. They are not: their correlation properties
          differ, and each is chosen for the property the other lacks.
        </p>
        <p style={{ marginBottom: 0 }}>
          Every sequence below is generated live. Where the course reference does not supply a
          specification, the page says so rather than inventing one.
        </p>
      </PageHead>

      <section className="section">
        <SectionHead num="3.1" title="Three families, three jobs" aside="Orientation" />
        <Figure
          label="Table 3.1"
          caption={
            <>
              The distinguishing properties. Note row two against row three: a Walsh pair cancels
              exactly when aligned but generally leaks when not, while a PN sequence never cancels
              exactly and instead gives a single unmistakable peak. Neither substitutes for the
              other, which is why IS-95 uses both.
            </>
          }
        >
          <div className="scroll-x">
            <table className="spec-table" style={{ minWidth: '40rem' }}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Walsh functions</th>
                  <th>PN sequences</th>
                  <th>Long codes</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.property}>
                    <td>{row.property}</td>
                    <td className="is-note">{row.walsh}</td>
                    <td className="is-note">{row.pn}</td>
                    <td className="is-note">{row.long}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Figure>
      </section>

      <section className="section">
        <SectionHead num="3.2" title={active.heading} aside="Experiment · interactive" />

        <div className="segmented" role="tablist" aria-label="Code family" style={{ marginBottom: 'var(--s5)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className="lede" style={{ marginBottom: 'var(--s5)' }}>
          {active.sub}
        </p>

        {tab === 'walsh' ? <WalshCodeExplorer /> : null}
        {tab === 'pn' ? <PNSequenceExplorer /> : null}
        {tab === 'long' ? <LongCodeExplorer /> : null}
      </section>

      <section className="section">
        <KnowledgeCheck moduleId="codes" />
      </section>
    </div>
  );
}
