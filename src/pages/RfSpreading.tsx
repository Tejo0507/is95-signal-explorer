/**
 * RfSpreading.tsx — module 01.
 *
 * Three experiments: the band/channel explorer, the spreading-rate calculator,
 * and the step-controlled spread-and-recover demonstration. The vocabulary
 * table between them exists because almost every mistake students make in this
 * material is a units mistake — a width confused with a rate, or an allocation
 * confused with a carrier.
 */

import { FrequencySpectrumExplorer } from '../components/FrequencySpectrumExplorer';
import { SpreadingRateCalculator } from '../components/SpreadingRateCalculator';
import { SpreadingVisualizer } from '../components/SpreadingVisualizer';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { Figure, SectionHead, Term } from '../components/ui';
import { routeById } from '../routes';
import { PageHead } from './PageHead';

/** Seven terms that are routinely collapsed into one another. */
const VOCABULARY: { term: string; key: string; what: string; units: string; value: string }[] = [
  {
    term: 'Licensed frequency band',
    key: 'licensed band',
    what: 'The block of spectrum an operator may use, for one direction of travel.',
    units: 'MHz (a range)',
    value: '824–849 and 869–894',
  },
  {
    term: 'Carrier centre frequency',
    key: 'centre frequency',
    what: 'The frequency one CDMA carrier is tuned to, inside that band.',
    units: 'MHz (a point)',
    value: 'any point in the band',
  },
  {
    term: 'Nominal channel bandwidth',
    key: 'bandwidth',
    what: 'How much spectrum one carrier occupies, on one link.',
    units: 'MHz (a width)',
    value: '1.25',
  },
  {
    term: 'Duplex frequency separation',
    key: 'duplex',
    what: 'The fixed gap between a channel and its pair in the other direction.',
    units: 'MHz (a difference)',
    value: '45',
  },
  {
    term: 'Information bit rate',
    key: 'info rate',
    what: 'The rate of bits that carry meaning, out of the vocoder.',
    units: 'bit/s',
    value: '9600 / 4800 / 2400 / 1200',
  },
  {
    term: 'Chip rate',
    key: 'chip rate',
    what: 'The rate of the ±1 values the data is multiplied by. Not a bandwidth.',
    units: 'chip/s',
    value: '1 228 800',
  },
  {
    term: 'Spreading factor',
    key: 'spreading factor',
    what: 'Chip rate ÷ information rate, equivalently Tb ÷ Tc. Dimensionless.',
    units: 'chips per bit',
    value: '128 at 9.6 kb/s',
  },
];

export function RfSpreading() {
  return (
    <div className="page">
      <PageHead route={routeById('rf')}>
        <p>
          Two 25 MHz bands, one per direction, paired channel by channel 45 MHz apart. Inside each
          band, a carrier occupies a nominal 1.25 MHz and carries a chip stream at 1.2288 Mchip/s —
          a rate, not a width.
        </p>
        <p style={{ marginBottom: 0 }}>
          The three experiments below take the vocabulary apart, do the spreading arithmetic, and
          then walk one bit through a complete spread-and-recover cycle.
        </p>
      </PageHead>

      {/* ---------------- vocabulary ---------------- */}
      <section className="section">
        <SectionHead num="1.1" title="Seven quantities, kept apart" aside="Units first" />
        <Figure
          label="Table 1.1"
          caption={
            <>
              Hover any term for its definition. The units column is the fastest way to tell these
              apart: a range, a point, a width and a difference are all MHz but mean different
              things, and chip/s is not MHz at all.
            </>
          }
        >
          <div className="scroll-x">
            <table className="spec-table" style={{ minWidth: '38rem' }}>
              <thead>
                <tr>
                  <th>Quantity</th>
                  <th>What it is</th>
                  <th>Units</th>
                  <th>IS-95 value</th>
                </tr>
              </thead>
              <tbody>
                {VOCABULARY.map((v) => (
                  <tr key={v.term}>
                    <td>
                      <Term k={v.key}>
                        <strong>{v.term}</strong>
                      </Term>
                    </td>
                    <td className="is-note">{v.what}</td>
                    <td className="is-value" style={{ color: 'var(--olive)', whiteSpace: 'nowrap' }}>
                      {v.units}
                    </td>
                    <td className="is-value" style={{ color: 'var(--brick)' }}>
                      {v.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Figure>
      </section>

      {/* ---------------- spectrum ---------------- */}
      <section className="section">
        <SectionHead num="1.2" title="Where IS-95 lives on the spectrum" aside="Experiment · interactive" />
        <FrequencySpectrumExplorer />
      </section>

      {/* ---------------- spreading factor ---------------- */}
      <section className="section">
        <SectionHead num="1.3" title="Spreading-rate calculator" aside="Experiment · interactive" />
        <SpreadingRateCalculator />
      </section>

      {/* ---------------- spreading demo ---------------- */}
      <section className="section">
        <SectionHead num="1.4" title="One bit, spread and recovered" aside="Experiment · step-controlled" />
        <SpreadingVisualizer />
      </section>

      <section className="section">
        <KnowledgeCheck moduleId="rf" />
      </section>
    </div>
  );
}
