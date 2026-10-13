/**
 * PhysicalAllocation.tsx — module 04.
 *
 * The link toggle and the information rate are held here, so switching
 * direction keeps the rate you were studying and the comparison stays
 * meaningful.
 */

import { useState } from 'react';
import { ForwardLinkPipeline, ReverseLinkPipeline } from '../components/LinkPipeline';
import { WalshAllocationMap } from '../components/WalshAllocationMap';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { Figure, SectionHead, Segmented } from '../components/ui';
import { LINK_COMPARISON, type LinkDirection } from '../lib/pipelines';
import { RF, type TrafficRateBps } from '../lib/spec';
import { routeById } from '../routes';
import { PageHead } from './PageHead';

export function PhysicalAllocation() {
  const [link, setLink] = useState<LinkDirection>('forward');
  const [rate, setRate] = useState<TrafficRateBps>(RF.exampleInfoRateBps as TrafficRateBps);

  return (
    <div className="page">
      <PageHead route={routeById('physical')}>
        <p>
          The two processing chains are not mirror images. The forward link codes at rate 1/2,
          interleaves 24 × 16, multiplexes in a power-control bit and a decimated long code, and
          covers with one Walsh function. The reverse link codes at rate 1/3, interleaves 32 × 18,
          uses 64-ary Walsh modulation, randomises bursts, and spreads with the full-rate long code.
        </p>
        <p style={{ marginBottom: 0 }}>
          Every block is clickable. Step-through mode follows one 20 ms frame from source to RF.
        </p>
      </PageHead>

      <section className="section">
        <SectionHead
          num="4.1"
          title={link === 'forward' ? 'Forward-link processing' : 'Reverse-link processing'}
          aside="Experiment · interactive"
        />

        <div style={{ marginBottom: 'var(--s5)' }}>
          <Segmented<LinkDirection>
            label="Link"
            brick
            value={link}
            onChange={setLink}
            options={[
              { value: 'forward', label: 'Forward · BS → MS' },
              { value: 'reverse', label: 'Reverse · MS → BS' },
            ]}
          />
        </div>

        {link === 'forward' ? (
          <ForwardLinkPipeline rate={rate} onRateChange={setRate} />
        ) : (
          <ReverseLinkPipeline rate={rate} onRateChange={setRate} />
        )}
      </section>

      {/* ---------------- the two directions compared ---------------- */}
      <section className="section">
        <SectionHead num="4.2" title="Two directions, two strategies" aside="Course reference" />
        <Figure
          label="Table 4.1"
          caption={
            <>
              The course reference’s own comparison, row for row. Olive values are the ones the two
              links share — bandwidth, chip rate and frame length. Everything else is asymmetric,
              and the asymmetry follows from one fact: the forward link has a single mains-powered
              transmitter with one clock, and the reverse link does not.
            </>
          }
        >
          <div className="scroll-x">
            <table className="spec-table" style={{ minWidth: '38rem' }}>
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Forward · BS → MS · 869–894 MHz</th>
                  <th>Reverse · MS → BS · 824–849 MHz</th>
                </tr>
              </thead>
              <tbody>
                {LINK_COMPARISON.map((row) => (
                  <tr key={row.property} className={row.shared ? 'is-shared' : undefined}>
                    <td>{row.property}</td>
                    <td className={`is-value${row.shared ? '' : ' fwd'}`}>{row.forward}</td>
                    <td className={`is-value${row.shared ? '' : ' rev'}`}>{row.reverse}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Figure>
      </section>

      {/* ---------------- allocation map ---------------- */}
      <section className="section">
        <SectionHead num="4.3" title="The 64-channel forward allocation map" aside="Experiment · interactive" />
        <WalshAllocationMap />
      </section>

      <section className="section">
        <KnowledgeCheck moduleId="physical" />
      </section>
    </div>
  );
}
