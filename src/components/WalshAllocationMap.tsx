/**
 * WalshAllocationMap.tsx
 *
 * The 64-channel forward-link allocation map, framed physically rather than
 * logically. Module 02 asks "what is this channel for?"; this map asks "what
 * does this index DO to the signal?" — and shows the actual 64-chip sequence
 * that covers each symbol of the selected channel.
 *
 * It exists partly to carry one specific correction: "W19 is a traffic channel"
 * is a statement about logical channel naming, while "W19 multiplies each
 * symbol by this particular 64-chip sequence" is a statement about physical
 * processing. The two are related and are not the same thing.
 */

import { useMemo, useState } from 'react';
import { CODES, FRAME_MS, RF } from '../lib/spec';
import {
  FORWARD_CHANNEL_TYPES,
  KIND_LABEL,
  REFERENCE_PAGING_CHANNELS,
  allocationCounts,
  forwardAllocation,
} from '../lib/channels';
import { toBinaryString, walshSequence } from '../lib/walsh';
import { Waveform } from './charts';
import { Disclosure, Figure, Legend, NumberField, Panel, Readouts, ResetButton, Slider, Term } from './ui';

export function WalshAllocationMap() {
  const [pagingChannels, setPagingChannels] = useState(REFERENCE_PAGING_CHANNELS);
  const [index, setIndex] = useState(19);

  const allocation = useMemo(() => forwardAllocation(pagingChannels), [pagingChannels]);
  const counts = useMemo(() => allocationCounts(pagingChannels), [pagingChannels]);
  const slot = allocation[index];
  const type = FORWARD_CHANNEL_TYPES.find((c) => c.kind === slot.kind)!;
  const sequence = useMemo(() => walshSequence(index, CODES.walshOrder), [index]);

  const reset = () => {
    setPagingChannels(REFERENCE_PAGING_CHANNELS);
    setIndex(19);
  };

  return (
    <div className="stack">
      <div className="controls">
        <Slider label="Walsh index" value={index} min={0} max={63} unit={`· ${slot.label}`} onChange={setIndex} />
        <NumberField label="Index" value={index} min={0} max={63} onCommit={setIndex} width="6rem" />
        <Slider
          label="Paging channels configured"
          value={pagingChannels}
          min={1}
          max={7}
          unit="of W1–W7"
          onChange={setPagingChannels}
          grow={false}
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">&nbsp;</span>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => setIndex(0)}>
              W0
            </button>
            <button type="button" className="btn" onClick={() => setIndex(32)}>
              W32
            </button>
            <ResetButton onReset={reset} />
          </div>
        </div>
      </div>

      <div className="split">
        <Figure
          label="Fig. 4.4"
          caption={
            <>
              The 64-channel forward-link allocation map. Walsh code n is logical channel n, so one
              grid serves as both the code list and the channel list. Select any index.
            </>
          }
        >
          <div className="walsh-grid">
            {allocation.map((a) => (
              <button
                key={a.index}
                type="button"
                className="walsh-cell"
                data-kind={a.kind}
                aria-pressed={a.index === index}
                aria-label={`Walsh ${a.index}, ${a.label}`}
                title={`W${a.index} — ${a.label}`}
                onClick={() => setIndex(a.index)}
              >
                {a.index}
              </button>
            ))}
          </div>
          <Legend
            entries={[
              { colour: 'var(--charcoal)', label: `Pilot · ${counts.pilot} code`, box: true },
              { colour: 'var(--brick)', label: `Sync · ${counts.sync} code`, box: true },
              { colour: 'var(--brick-wash-strong)', label: `Paging · ${counts.paging} codes`, box: true },
              { colour: 'var(--olive-wash)', label: `Traffic · ${counts.traffic} codes`, box: true },
            ]}
          />
        </Figure>

        <Panel title={`W${index} · physical view`}>
          <div className="stack stack--tight">
            <h3 style={{ fontSize: '1.1875rem' }}>{type.name}</h3>
            <Readouts
              items={[
                { label: 'Logical channel', value: slot.label, note: KIND_LABEL[slot.kind] },
                { label: 'Chips per symbol', value: CODES.walshChipsPerSymbol, emphasis: true },
                { label: 'Symbol rate in', value: '19 200', unit: 'sym/s' },
                { label: 'Chip rate out', value: '1.2288', unit: 'Mc/s', note: '19 200 × 64' },
              ]}
            />
            <div>
              <p className="control__label" style={{ marginBottom: '0.3rem' }}>
                The actual 64-chip covering sequence (binary, 0 ↦ +1)
              </p>
              <pre className="seq">{toBinaryString(sequence)}</pre>
            </div>
          </div>
        </Panel>
      </div>

      <Figure
        label="Fig. 4.5"
        caption={
          <>
            W{index} as a chip waveform: this is what every {FRAME_MS} ms frame’s symbols on this
            channel get multiplied by, 64 chips at a time, at {(RF.chipRateCps / 1e6).toFixed(4)}{' '}
            Mc/s.
          </>
        }
      >
        <Waveform samples={sequence} colour="var(--brick)" label={`W${index}`} showBitBoundaries={false} />
      </Figure>

      <Panel variant="sunk" title="Logical channel ≠ physical processing">
        <div className="split--even split">
          <div>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.4rem' }}>The logical statement</h4>
            <p className="small" style={{ margin: 0 }}>
              "W{index} is {slot.label.toLowerCase()}." This is about the <em>role</em> the channel
              plays in the protocol: who sends on it, what messages it carries, at what rate, how
              many of them an operator configures.
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.4rem' }}>The physical statement</h4>
            <p className="small" style={{ margin: 0 }}>
              "W{index} is the 64-chip sequence above." This is about an <em>operation</em>: each
              19 200 sym/s symbol is multiplied by these 64 chips, producing 1.2288 Mc/s of chips
              that sum with the other 63 channels onto one carrier.
            </p>
          </div>
        </div>
        <p className="small" style={{ margin: '1rem 0 0' }}>
          They line up one-to-one on the forward link, which is exactly why they get conflated — and
          why the reverse link, where they do <em>not</em> line up, is so often misread. There, a
          Walsh index is six bits of data, not a channel name. See{' '}
          <Term k="orthogonal modulation">64-ary orthogonal modulation</Term>.
        </p>
      </Panel>

      <Disclosure id="paging-config" />
    </div>
  );
}
