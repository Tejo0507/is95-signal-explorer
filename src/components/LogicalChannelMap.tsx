/**
 * LogicalChannelMap.tsx
 *
 * The IS-95 logical channel architecture, in two modes.
 *
 * FORWARD, all 64 Walsh functions drawn as a labelled map. Walsh code n IS
 * logical channel n here, so the map is both the code allocation and the
 * channel list. Selecting a cell explains that channel and highlights its
 * assignment; the paging-channel control moves the paging/traffic boundary,
 * which is the deck's own caveat about configuration dependence made live.
 *
 * REVERSE, the access and reverse traffic channels, with an architecture
 * diagram whose signal path highlights with the selection. There is no Walsh
 * map here, deliberately: on the reverse link Walsh functions are the
 * modulation, not channel identities, and mobiles are separated by long codes.
 */

import { useMemo, useState } from 'react';
import {
  FORWARD_CHANNEL_TYPES,
  KIND_LABEL,
  REFERENCE_PAGING_CHANNELS,
  REVERSE_CHANNEL_TYPES,
  WALSH_ROLE_CONTRAST,
  allocationCounts,
  forwardAllocation,
  type ForwardChannelKind,
  type ReverseChannelKind,
} from '../lib/channels';
import { walshBinary } from '../lib/walsh';
import { Disclosure, Figure, Legend, Panel, Readouts, ResetButton, Segmented, Slider, Term, Why } from './ui';
import { PlotFrame } from './charts';
import { PLOT_COLOURS } from './theme';

const { INK, BRICK, OLIVE, GREY } = PLOT_COLOURS;

type Mode = 'forward' | 'reverse';

export function LogicalChannelMap() {
  const [mode, setMode] = useState<Mode>('forward');
  const [pagingChannels, setPagingChannels] = useState(REFERENCE_PAGING_CHANNELS);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reverseSelected, setReverseSelected] = useState<ReverseChannelKind>('access');

  const allocation = useMemo(() => forwardAllocation(pagingChannels), [pagingChannels]);
  const counts = useMemo(() => allocationCounts(pagingChannels), [pagingChannels]);

  const slot = allocation[selectedIndex];
  const channelType = FORWARD_CHANNEL_TYPES.find((c) => c.kind === slot.kind)!;
  const reverseType = REVERSE_CHANNEL_TYPES.find((c) => c.kind === reverseSelected)!;

  const reset = () => {
    setPagingChannels(REFERENCE_PAGING_CHANNELS);
    setSelectedIndex(0);
    setReverseSelected('access');
  };

  return (
    <div className="stack">
      <div className="controls">
        <Segmented<Mode>
          label="Link direction"
          brick
          value={mode}
          onChange={setMode}
          options={[
            { value: 'forward', label: 'Forward · BS → MS' },
            { value: 'reverse', label: 'Reverse · MS → BS' },
          ]}
        />
        {mode === 'forward' ? (
          <Slider
            label="Paging channels configured"
            value={pagingChannels}
            min={1}
            max={7}
            unit="of W1–W7"
            onChange={setPagingChannels}
            grow={false}
          />
        ) : null}
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">&nbsp;</span>
          <ResetButton onReset={reset} />
        </div>
      </div>

      {mode === 'forward' ? (
        <>
          <div className="split">
            <Figure
              label="Fig. 2.1"
              caption={
                <>
                  All 64 forward-link Walsh functions. Pilot W0 and sync W32 are fixed; paging
                  occupies W1–W{pagingChannels}; everything else carries traffic. Click any cell.
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
                    aria-pressed={a.index === selectedIndex}
                    aria-label={`Walsh ${a.index}, ${a.label}`}
                    title={`W${a.index}, ${a.label}`}
                    onClick={() => setSelectedIndex(a.index)}
                  >
                    {a.index}
                  </button>
                ))}
              </div>
              <Legend
                entries={[
                  { colour: 'var(--charcoal)', label: 'Pilot · W0', box: true },
                  { colour: 'var(--brick)', label: 'Sync · W32', box: true },
                  { colour: 'var(--brick-wash-strong)', label: `Paging · W1–W${pagingChannels}`, box: true },
                  { colour: 'var(--olive-wash)', label: 'Traffic', box: true },
                ]}
              />
            </Figure>

            <Panel title={`W${selectedIndex}, ${slot.label}`}>
              <div className="stack stack--tight">
                <h3 style={{ fontSize: '1.25rem' }}>{channelType.name}</h3>
                <p className="small muted" style={{ margin: 0 }}>
                  <span className="mono">{channelType.walshLabel}</span> ·{' '}
                  <span className="mono">{channelType.rateLabel}</span>
                </p>
                <p className="small" style={{ margin: 0 }}>
                  <strong>{channelType.purpose}</strong>
                </p>
                <p className="small" style={{ margin: 0 }}>
                  {channelType.detail}
                </p>
                <Why>{channelType.whyItMatters}</Why>
                <div>
                  <p className="control__label" style={{ marginBottom: '0.35rem' }}>
                    W{selectedIndex} · first 32 of 64 chips (binary)
                  </p>
                  <pre className="seq">{walshBinary(selectedIndex, 32).join('')}…</pre>
                </div>
              </div>
            </Panel>
          </div>

          <Readouts
            items={(['pilot', 'sync', 'paging', 'traffic'] as ForwardChannelKind[]).map((kind) => ({
              label: KIND_LABEL[kind],
              value: counts[kind],
              unit: 'codes',
              emphasis: kind === slot.kind,
              note:
                kind === 'traffic'
                  ? `62 − ${pagingChannels} paging`
                  : kind === 'paging'
                    ? `W1–W${pagingChannels}`
                    : kind === 'pilot'
                      ? 'W0, fixed'
                      : 'W32, fixed',
            }))}
          />

          <ForwardArchitecture selectedKind={slot.kind} />

          <Disclosure id="paging-config" />
        </>
      ) : (
        <>
          <div className="split">
            <Figure
              label="Fig. 2.3"
              caption={
                <>
                  Reverse-link architecture. Click a channel to highlight its path. Both channels
                  run the same physical chain but carry different traffic, and both depend on the
                  power-control bits arriving on the forward link.
                </>
              }
            >
              <ReverseArchitecture selected={reverseSelected} onSelect={setReverseSelected} />
            </Figure>

            <Panel title={reverseType.name}>
              <div className="stack stack--tight">
                <div className="segmented" role="group" aria-label="Reverse channel">
                  {REVERSE_CHANNEL_TYPES.map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      aria-pressed={reverseSelected === c.kind}
                      onClick={() => setReverseSelected(c.kind)}
                    >
                      {c.kind === 'access' ? 'Access' : 'Traffic'}
                    </button>
                  ))}
                </div>
                <p className="small muted" style={{ margin: 0 }}>
                  <span className="mono">{reverseType.rateLabel}</span>
                </p>
                <p className="small" style={{ margin: 0 }}>
                  <strong>{reverseType.purpose}</strong>
                </p>
                <p className="small" style={{ margin: 0 }}>
                  {reverseType.detail}
                </p>
                <Why>{reverseType.whyItMatters}</Why>
              </div>
            </Panel>
          </div>

          <Readouts
            items={[
              { label: 'Access channel rate', value: '4800', unit: 'b/s', note: 'Fixed, no variable-rate vocoder' },
              { label: 'Access channels', value: 'up to 32', note: 'Per paging channel' },
              { label: 'Traffic rates', value: '9600 / 4800 / 2400 / 1200', unit: 'b/s', note: '20 ms frames' },
              { label: 'Users separated by', value: 'Long code', emphasis: true, note: 'Period 2⁴² − 1, per-user mask, not by Walsh index' },
            ]}
          />
        </>
      )}

      {/* The distinction that must not blur, shown in both modes. */}
      <div className="split--even split">
        <Panel variant="sunk" title="Forward link">
          <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{WALSH_ROLE_CONTRAST.forward.heading}</h4>
          <p className="small" style={{ margin: 0 }}>
            {WALSH_ROLE_CONTRAST.forward.body}
          </p>
        </Panel>
        <Panel variant="sunk" title="Reverse link">
          <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>{WALSH_ROLE_CONTRAST.reverse.heading}</h4>
          <p className="small" style={{ margin: 0 }}>
            {WALSH_ROLE_CONTRAST.reverse.body}
          </p>
        </Panel>
      </div>

      <Why>
        {WALSH_ROLE_CONTRAST.warning} The reverse link leans on{' '}
        <Term k="long code">long-code</Term> processing for user identity and on{' '}
        <Term k="power control">power control</Term> for survivability, neither of which the
        forward link needs in the same way.
      </Why>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Forward-link architecture: one base station, four channel types, all
 * on one 1.25 MHz carrier, separated by Walsh code.
 * ------------------------------------------------------------------ */

function ForwardArchitecture({ selectedKind }: { selectedKind: ForwardChannelKind }) {
  const W = 760;
  const H = 230;

  const rows: { kind: ForwardChannelKind; label: string; code: string }[] = [
    { kind: 'pilot', label: 'Pilot', code: 'W0' },
    { kind: 'sync', label: 'Sync', code: 'W32' },
    { kind: 'paging', label: 'Paging', code: 'W1–W7' },
    { kind: 'traffic', label: 'Traffic', code: 'W8–W31, W33–W63' },
  ];

  const bsX = 30;
  const bsW = 120;
  const sumX = 430;
  const msX = 600;
  const rowY = (i: number) => 38 + i * 42;

  return (
    <Figure
      label="Fig. 2.2"
      caption={
        <>
          Forward-link channelisation. All four channel types leave one transmitter on one clock,
          each covered by its own Walsh function, and sum onto a single 1.25 MHz carrier. Because
          they are transmitted synchronously they arrive chip-aligned, so their mutual correlation
          really is zero. The selected channel’s path is highlighted.
        </>
      }
    >
      <PlotFrame width={W} height={H} label="Forward link architecture">
        {/* base station */}
        <rect x={bsX} y={30} width={bsW} height={rowY(3) + 14 - 30} fill="none" stroke={INK} strokeWidth={1.2} />
        <text x={bsX + bsW / 2} y={24} fontSize={9} fontFamily="monospace" fill={INK} textAnchor="middle">
          BASE STATION
        </text>

        {rows.map((row, i) => {
          const active = row.kind === selectedKind;
          const colour = active ? BRICK : GREY;
          const y = rowY(i);
          return (
            <g key={row.kind}>
              {/* channel source */}
              <text x={bsX + 10} y={y + 4} fontSize={9} fontFamily="monospace" fill={active ? BRICK : INK}>
                {row.label}
              </text>
              {/* path to Walsh cover */}
              <line x1={bsX + bsW} y1={y} x2={260} y2={y} stroke={colour} strokeWidth={active ? 2 : 1} />
              {/* Walsh multiplier */}
              <rect x={260} y={y - 11} width={96} height={22} fill={active ? BRICK : 'none'} stroke={colour} strokeWidth={active ? 1.2 : 1} />
              <text x={308} y={y + 4} fontSize={8.5} fontFamily="monospace" fill={active ? '#f4f0e7' : INK} textAnchor="middle">
                × {row.code}
              </text>
              {/* path to summer */}
              <line x1={356} y1={y} x2={sumX - 14} y2={y} stroke={colour} strokeWidth={active ? 2 : 1} />
              <line
                x1={sumX - 14}
                y1={y}
                x2={sumX - 14}
                y2={rowY(1.5)}
                stroke={colour}
                strokeWidth={active ? 2 : 1}
              />
            </g>
          );
        })}

        {/* summing node */}
        <line x1={sumX - 14} y1={rowY(0)} x2={sumX - 14} y2={rowY(3)} stroke={GREY} strokeWidth={1} />
        <circle cx={sumX} cy={rowY(1.5)} r={13} fill="none" stroke={INK} strokeWidth={1.2} />
        <text x={sumX} y={rowY(1.5) + 5} fontSize={13} fontFamily="monospace" fill={INK} textAnchor="middle">
          Σ
        </text>
        <line x1={sumX - 14} y1={rowY(1.5)} x2={sumX - 13} y2={rowY(1.5)} stroke={INK} strokeWidth={1.2} />

        {/* carrier */}
        <line x1={sumX + 13} y1={rowY(1.5)} x2={msX - 10} y2={rowY(1.5)} stroke={INK} strokeWidth={2} />
        <polygon
          points={`${msX - 10},${rowY(1.5)} ${msX - 18},${rowY(1.5) - 4} ${msX - 18},${rowY(1.5) + 4}`}
          fill={INK}
        />
        <text x={(sumX + msX) / 2} y={rowY(1.5) - 10} fontSize={8.5} fontFamily="monospace" fill={INK} textAnchor="middle">
          one 1.25 MHz carrier
        </text>
        <text x={(sumX + msX) / 2} y={rowY(1.5) + 18} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="middle">
          1.2288 Mchip/s · QPSK
        </text>

        {/* mobile */}
        <rect x={msX} y={rowY(1.5) - 26} width={125} height={52} fill="none" stroke={INK} strokeWidth={1.2} />
        <text x={msX + 62} y={rowY(1.5) - 6} fontSize={9} fontFamily="monospace" fill={INK} textAnchor="middle">
          MOBILE
        </text>
        <text x={msX + 62} y={rowY(1.5) + 8} fontSize={8} fontFamily="monospace" fill={BRICK} textAnchor="middle">
          correlate for
        </text>
        <text x={msX + 62} y={rowY(1.5) + 19} fontSize={8} fontFamily="monospace" fill={BRICK} textAnchor="middle">
          its own Walsh code
        </text>

        <text x={30} y={H - 8} fontSize={8} fontFamily="monospace" fill={GREY}>
          Synchronous: one transmitter, one clock → orthogonality preserved within the cell
        </text>
      </PlotFrame>
    </Figure>
  );
}

/* ------------------------------------------------------------------ *
 * Reverse-link architecture: many mobiles, one receiver, long codes.
 * ------------------------------------------------------------------ */

function ReverseArchitecture({
  selected,
  onSelect,
}: {
  selected: ReverseChannelKind;
  onSelect: (k: ReverseChannelKind) => void;
}) {
  const W = 760;
  const H = 260;
  const msX = 30;
  const msW = 130;
  const bsX = 600;
  const bsW = 130;

  const accessY = 62;
  const trafficY = 140;
  const pcY = 214;

  const row = (kind: ReverseChannelKind, y: number, label: string, sub: string) => {
    const active = selected === kind;
    const colour = active ? BRICK : GREY;
    return (
      <g key={kind} style={{ cursor: 'pointer' }} onClick={() => onSelect(kind)}>
        {/* generous hit area */}
        <rect x={msX} y={y - 24} width={bsX + bsW - msX} height={48} fill="transparent" />
        <line x1={msX + msW} y1={y} x2={360} y2={y} stroke={colour} strokeWidth={active ? 2 : 1} />
        <rect x={360} y={y - 13} width={118} height={26} fill={active ? BRICK : 'none'} stroke={colour} strokeWidth={active ? 1.2 : 1} />
        <text x={419} y={y - 1} fontSize={8} fontFamily="monospace" fill={active ? '#f4f0e7' : INK} textAnchor="middle">
          long code
        </text>
        <text x={419} y={y + 9} fontSize={7.5} fontFamily="monospace" fill={active ? '#f4f0e7' : GREY} textAnchor="middle">
          user mask
        </text>
        <line x1={478} y1={y} x2={bsX - 10} y2={y} stroke={colour} strokeWidth={active ? 2 : 1} />
        <polygon points={`${bsX - 10},${y} ${bsX - 18},${y - 4} ${bsX - 18},${y + 4}`} fill={colour} />
        <text x={msX + msW + 8} y={y - 8} fontSize={8.5} fontFamily="monospace" fill={active ? BRICK : INK}>
          {label}
        </text>
        <text x={msX + msW + 8} y={y + 16} fontSize={7.5} fontFamily="monospace" fill={GREY}>
          {sub}
        </text>
      </g>
    );
  };

  return (
    <PlotFrame width={W} height={H} label="Reverse link architecture">
      {/* mobile */}
      <rect x={msX} y={40} width={msW} height={120} fill="none" stroke={INK} strokeWidth={1.2} />
      <text x={msX + msW / 2} y={34} fontSize={9} fontFamily="monospace" fill={INK} textAnchor="middle">
        MOBILE STATION
      </text>
      <text x={msX + msW / 2} y={88} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="middle">
        own clock
      </text>
      <text x={msX + msW / 2} y={100} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="middle">
        own path
      </text>
      <text x={msX + msW / 2} y={112} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="middle">
        own long code
      </text>

      {/* other mobiles, to make the asynchrony visible */}
      <rect x={msX + 12} y={176} width={msW - 24} height={20} fill="none" stroke={GREY} strokeWidth={0.8} strokeDasharray="3 2" />
      <text x={msX + msW / 2} y={190} fontSize={7.5} fontFamily="monospace" fill={GREY} textAnchor="middle">
        other mobiles
      </text>
      <line x1={msX + msW} y1={186} x2={bsX - 10} y2={178} stroke={GREY} strokeWidth={0.8} strokeDasharray="3 2" />
      <text x={400} y={176} fontSize={7.5} fontFamily="monospace" fill={OLIVE} textAnchor="middle">
        quasi-orthogonal on arrival → interference
      </text>

      {row('access', accessY, 'Access channel · 4800 b/s', 'registration · call set-up · page response')}
      {row('reverse-traffic', trafficY, 'Reverse traffic channel', '9600 / 4800 / 2400 / 1200 b/s · 20 ms frames')}

      {/* base station */}
      <rect x={bsX} y={40} width={bsW} height={120} fill="none" stroke={INK} strokeWidth={1.2} />
      <text x={bsX + bsW / 2} y={34} fontSize={9} fontFamily="monospace" fill={INK} textAnchor="middle">
        BASE STATION
      </text>
      <text x={bsX + bsW / 2} y={96} fontSize={8} fontFamily="monospace" fill={BRICK} textAnchor="middle">
        correlate for
      </text>
      <text x={bsX + bsW / 2} y={108} fontSize={8} fontFamily="monospace" fill={BRICK} textAnchor="middle">
        each long code
      </text>
      <text x={bsX + bsW / 2} y={124} fontSize={8} fontFamily="monospace" fill={GREY} textAnchor="middle">
        measure power
      </text>

      {/* power control feedback on the forward link */}
      <line x1={bsX} y1={pcY} x2={msX + msW + 10} y2={pcY} stroke={OLIVE} strokeWidth={1.4} strokeDasharray="5 3" />
      <polygon points={`${msX + msW + 10},${pcY} ${msX + msW + 18},${pcY - 4} ${msX + msW + 18},${pcY + 4}`} fill={OLIVE} />
      <line x1={bsX} y1={160} x2={bsX} y2={pcY} stroke={OLIVE} strokeWidth={1.4} strokeDasharray="5 3" />
      <text x={(msX + bsX) / 2} y={pcY - 7} fontSize={8} fontFamily="monospace" fill={OLIVE} textAnchor="middle">
        FORWARD LINK · power-control bit every 1.25 ms · ±1 dB
      </text>

      <text x={msX} y={H - 6} fontSize={8} fontFamily="monospace" fill={GREY}>
        Asynchronous: many transmitters → orthogonality not guaranteed → tight power control mandatory
      </text>
    </PlotFrame>
  );
}
