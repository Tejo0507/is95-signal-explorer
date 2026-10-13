/**
 * LogicalChannels.tsx — module 02.
 */

import { LogicalChannelMap } from '../components/LogicalChannelMap';
import { KnowledgeCheck } from '../components/KnowledgeCheck';
import { Figure, SectionHead } from '../components/ui';
import { FORWARD_CHANNEL_TYPES, REVERSE_CHANNEL_TYPES } from '../lib/channels';
import { routeById } from '../routes';
import { PageHead } from './PageHead';

export function LogicalChannels() {
  return (
    <div className="page">
      <PageHead route={routeById('channels')}>
        <p>
          Up to 64 logical channels share one 1.25 MHz carrier on the forward link, and Walsh code n
          is channel n. The reverse link has no such map: mobiles are told apart by their long
          codes, and Walsh functions there are doing something else entirely.
        </p>
        <p style={{ marginBottom: 0 }}>
          Switch direction in the explorer below and the whole architecture diagram changes with it.
        </p>
      </PageHead>

      <section className="section">
        <SectionHead num="2.1" title="Channel architecture explorer" aside="Experiment · interactive" />
        <LogicalChannelMap />
      </section>

      {/* ---------------- reference tables ---------------- */}
      <section className="section">
        <SectionHead num="2.2" title="The channels, side by side" aside="Course reference" />

        <div className="stack">
          <Figure
            label="Table 2.1"
            caption={
              <>
                Forward-link channels. The Walsh assignments are the course reference’s numbering;
                how many paging channels are actually configured decides where the paging/traffic
                boundary falls.
              </>
            }
          >
            <div className="scroll-x">
              <table className="spec-table" style={{ minWidth: '38rem' }}>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Walsh</th>
                    <th>Rate</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {FORWARD_CHANNEL_TYPES.map((c) => (
                    <tr key={c.kind}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="is-value" style={{ color: 'var(--brick)', whiteSpace: 'nowrap' }}>
                        {c.walshLabel}
                      </td>
                      <td className="is-value" style={{ color: 'var(--olive)' }}>
                        {c.rateLabel}
                      </td>
                      <td className="is-note">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Figure>

          <Figure
            label="Table 2.2"
            caption={
              <>
                Reverse-link channels. Note the absence of a Walsh column — there is no Walsh index
                identifying a reverse channel, which is the distinction this module exists to make.
              </>
            }
          >
            <div className="scroll-x">
              <table className="spec-table" style={{ minWidth: '34rem' }}>
                <thead>
                  <tr>
                    <th>Channel</th>
                    <th>Rate</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {REVERSE_CHANNEL_TYPES.map((c) => (
                    <tr key={c.kind}>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td className="is-value" style={{ color: 'var(--olive)' }}>
                        {c.rateLabel}
                      </td>
                      <td className="is-note">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Figure>
        </div>
      </section>

      <section className="section">
        <KnowledgeCheck moduleId="channels" />
      </section>
    </div>
  );
}
