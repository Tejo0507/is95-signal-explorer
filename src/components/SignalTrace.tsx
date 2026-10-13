/**
 * SignalTrace.tsx — the guided end-to-end experiment.
 *
 * Choose a direction, an information rate and a code configuration; the site
 * then traces one signal through all seven stages, from band allocation to
 * receiver decision. Switching direction rebuilds the whole path — not just the
 * labels — because the stage text in lib/trace.ts is genuinely different for
 * each link.
 *
 * The comparison table at the foot separates what changes between the links
 * from what they share, which is the single most useful thing to have in front
 * of you while reading either chain.
 */

import { useMemo, useState } from 'react';
import { TRAFFIC_RATES_BPS, type TrafficRateBps, FORWARD_BAND, RF } from '../lib/spec';
import { DEFAULT_TRACE, buildTrace, traceComparison, type TraceConfig } from '../lib/trace';
import { forwardAllocation } from '../lib/channels';
import type { LinkDirection } from '../lib/pipelines';
import { Disclosure, Figure, NumberField, Panel, Readouts, ResetButton, Segmented, SelectField, Slider, Why } from './ui';
import { PlotFrame } from './charts';
import { PLOT_COLOURS } from './theme';

const { INK, BRICK, OLIVE, GREY } = PLOT_COLOURS;

const USER_LABELS = ['User A', 'User B', 'User C'];

export function SignalTrace() {
  const [cfg, setCfg] = useState<TraceConfig>(DEFAULT_TRACE);
  const [selected, setSelected] = useState(0);

  const stages = useMemo(() => buildTrace(cfg), [cfg]);
  const comparison = useMemo(() => traceComparison(cfg.rate), [cfg.rate]);

  // Only traffic channels make sense as a trace target, so the selector below
  // offers traffic indices only — no correction pass is needed after the fact.
  const allocation = useMemo(() => forwardAllocation(7), []);

  const stage = stages[selected];
  const reset = () => {
    setCfg(DEFAULT_TRACE);
    setSelected(0);
  };

  const trafficIndices = allocation.filter((a) => a.kind === 'traffic').map((a) => a.index);

  return (
    <div className="stack">
      <div className="controls">
        <Segmented<LinkDirection>
          label="Channel to trace"
          brick
          value={cfg.link}
          onChange={(v) => setCfg((p) => ({ ...p, link: v }))}
          options={[
            { value: 'forward', label: 'Forward traffic' },
            { value: 'reverse', label: 'Reverse traffic' },
          ]}
        />
        <SelectField<number>
          label="Information rate"
          value={cfg.rate}
          options={TRAFFIC_RATES_BPS.map((r) => ({ value: r, label: `${r.toLocaleString('en-US')} b/s` }))}
          onChange={(v) => setCfg((p) => ({ ...p, rate: v as TrafficRateBps }))}
          width="11rem"
        />
        {cfg.link === 'forward' ? (
          <SelectField<number>
            label="Walsh assignment"
            value={cfg.walshIndex}
            options={trafficIndices.map((i) => ({ value: i, label: `W${i} · traffic` }))}
            onChange={(v) => setCfg((p) => ({ ...p, walshIndex: v }))}
            width="11rem"
          />
        ) : (
          <SelectField<string>
            label="Long-code mask"
            value={cfg.userLabel}
            options={USER_LABELS.map((u) => ({ value: u, label: `${u} · own mask` }))}
            onChange={(v) => setCfg((p) => ({ ...p, userLabel: v }))}
            width="11rem"
          />
        )}
        <Slider
          label="Forward carrier centre"
          value={cfg.forwardCentreMHz}
          min={FORWARD_BAND.lowMHz + RF.nominalChannelBandwidthMHz / 2}
          max={FORWARD_BAND.highMHz - RF.nominalChannelBandwidthMHz / 2}
          step={0.05}
          unit="MHz"
          onChange={(v) => setCfg((p) => ({ ...p, forwardCentreMHz: v }))}
          format={(v) => v.toFixed(2)}
        />
        <NumberField
          label="Exact"
          value={cfg.forwardCentreMHz}
          min={FORWARD_BAND.lowMHz}
          max={FORWARD_BAND.highMHz}
          step={0.05}
          unit="MHz"
          onCommit={(v) => setCfg((p) => ({ ...p, forwardCentreMHz: v }))}
          width="8rem"
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">&nbsp;</span>
          <ResetButton onReset={reset} label="Reset experiment" />
        </div>
      </div>

      <Readouts
        items={[
          {
            label: 'Tracing',
            value: cfg.link === 'forward' ? `Forward traffic · W${cfg.walshIndex}` : `Reverse traffic · ${cfg.userLabel}`,
            emphasis: true,
            note: cfg.link === 'forward' ? 'Base station → mobile' : 'Mobile → base station',
          },
          { label: 'Information rate', value: cfg.rate.toLocaleString('en-US'), unit: 'b/s' },
          {
            label: 'Carrier',
            value: (cfg.link === 'forward' ? cfg.forwardCentreMHz : cfg.forwardCentreMHz - RF.duplexSeparationMHz).toFixed(2),
            unit: 'MHz',
            note: cfg.link === 'forward' ? 'Forward band' : `Reverse band — ${RF.duplexSeparationMHz} MHz below its pair`,
          },
          { label: 'Chip rate', value: '1.2288', unit: 'Mc/s', note: 'Same on both links' },
        ]}
      />

      <div className="trace">
        {/* --- the path --- */}
        <div className="stack stack--tight">
          <p className="eyebrow">Signal path · {stages.length} stages</p>
          <div className="tracepath">
            {stages.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="tracepath__stage"
                aria-pressed={i === selected}
                onClick={() => setSelected(i)}
              >
                <span className="tracepath__num">{String(s.num).padStart(2, '0')}</span>
                <span>
                  <span className="tracepath__name">
                    {s.name}
                    {s.shared ? (
                      <span
                        className="mono"
                        style={{ fontSize: '0.5625rem', color: 'var(--olive)', marginLeft: '0.5em', letterSpacing: '0.1em' }}
                      >
                        SHARED
                      </span>
                    ) : null}
                  </span>
                  <span className="tracepath__value">{s.value}</span>
                </span>
              </button>
            ))}
          </div>
          <TraceSchematic link={cfg.link} activeStage={selected} />
        </div>

        {/* --- detail for the selected stage --- */}
        <Panel title={`Stage ${String(stage.num).padStart(2, '0')} of ${stages.length} · ${stage.source}`}>
          <div className="stack stack--tight">
            <h3 style={{ fontSize: '1.375rem' }}>{stage.name}</h3>
            <p className="mono small" style={{ margin: 0, color: 'var(--brick)' }}>
              {stage.value}
            </p>
            <p className="small" style={{ margin: 0 }}>
              <strong>{stage.summary}</strong>
            </p>
            <p className="small" style={{ margin: 0 }}>
              {stage.detail}
            </p>
            {stage.shared ? (
              <p className="small" style={{ margin: 0, color: 'var(--olive)' }}>
                This stage is identical in both directions — switch the link and nothing here
                changes.
              </p>
            ) : null}
            <div className="btn-row" style={{ paddingTop: '0.5rem', borderTop: '1px solid var(--rule)' }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelected((s) => Math.max(0, s - 1))}
                disabled={selected === 0}
              >
                ← Previous stage
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setSelected((s) => Math.min(stages.length - 1, s + 1))}
                disabled={selected === stages.length - 1}
              >
                Next stage →
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* --- what changes, what is shared --- */}
      <Figure
        label="Fig. 5.2"
        caption={
          <>
            Properties of the two links at the currently selected {cfg.rate.toLocaleString('en-US')}{' '}
            b/s. Olive rows are shared; the rest change with direction. Eleven of sixteen change —
            which is why forcing the two chains into one diagram would misrepresent the system.
          </>
        }
      >
        <div className="scroll-x">
          <table className="spec-table" style={{ minWidth: '34rem' }}>
            <thead>
              <tr>
                <th>Property</th>
                <th>Forward · BS → MS</th>
                <th>Reverse · MS → BS</th>
                <th>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.property} className={row.shared ? 'is-shared' : undefined}>
                  <td>{row.property}</td>
                  <td className={`is-value${row.shared ? '' : ' fwd'}`}>{row.forward}</td>
                  <td className={`is-value${row.shared ? '' : ' rev'}`}>{row.reverse}</td>
                  <td className="is-note mono" style={{ whiteSpace: 'nowrap' }}>
                    {row.shared ? 'shared' : 'differs'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Figure>

      <Readouts
        items={[
          {
            label: 'Shared properties',
            value: comparison.filter((c) => c.shared).length,
            unit: `of ${comparison.length}`,
            note: 'Bandwidth, chip rate, frame length, rate and repetition',
          },
          {
            label: 'Properties that differ',
            value: comparison.filter((c) => !c.shared).length,
            unit: `of ${comparison.length}`,
            emphasis: true,
            note: 'Coding, interleaving, code roles, modulation, detection, power control',
          },
        ]}
      />

      <Why>
        The two links share a band plan, a bandwidth and a chip rate — and almost nothing else. The
        asymmetry is not arbitrary: one end is a single mains-powered transmitter with one clock,
        the other is a crowd of battery-powered transmitters with their own clocks and their own
        path losses. Every difference in the table traces back to that one fact.
      </Why>

      <Disclosure>
        This trace reports specifications and stage descriptions; it does not simulate a radio link.
        There is no channel model, no fading, no noise, no measured bit-error rate, and no running
        modem anywhere on this site — those would be fabricated results, since the course reference
        supplies none. What it does guarantee is internal consistency: every figure here is read
        from the same source-of-truth module as the four earlier modules.
      </Disclosure>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * A schematic of the whole path, with the selected stage highlighted.
 * ------------------------------------------------------------------ */

function TraceSchematic({ link, activeStage }: { link: LinkDirection; activeStage: number }) {
  const W = 560;
  const H = 150;
  const isForward = link === 'forward';

  const leftLabel = isForward ? 'BASE STATION' : 'MOBILE STATION';
  const rightLabel = isForward ? 'MOBILE STATION' : 'BASE STATION';

  const boxW = 104;
  const leftX = 14;
  const rightX = W - boxW - 14;
  const midY = 62;

  // Which schematic element each trace stage lights up.
  const highlight = {
    band: activeStage === 0 || activeStage === 1,
    tx: activeStage >= 2 && activeStage <= 4,
    air: activeStage === 5,
    rx: activeStage === 6,
  };

  return (
    <Figure
      label="Fig. 5.1"
      caption={
        <>
          The whole path at a glance for the {isForward ? 'forward' : 'reverse'} link. The selected
          stage is highlighted. {isForward
            ? 'One transmitter, one clock, 64 channels summed onto one carrier.'
            : 'Many transmitters, each with its own clock and path, summing at one receiver.'}
        </>
      }
    >
      <PlotFrame width={W} height={H} label={`${link} link signal path`}>
        {/* transmitter */}
        <rect
          x={leftX}
          y={midY - 26}
          width={boxW}
          height={52}
          fill={highlight.tx ? BRICK : 'none'}
          stroke={highlight.tx ? BRICK : INK}
          strokeWidth={1.2}
        />
        <text x={leftX + boxW / 2} y={midY - 32} fontSize={8} fontFamily="monospace" fill={INK} textAnchor="middle">
          {leftLabel}
        </text>
        <text
          x={leftX + boxW / 2}
          y={midY + 3}
          fontSize={7.5}
          fontFamily="monospace"
          fill={highlight.tx ? '#f4f0e7' : GREY}
          textAnchor="middle"
        >
          {isForward ? 'r=1/2 · 24×16' : 'r=1/3 · 32×18'}
        </text>
        <text
          x={leftX + boxW / 2}
          y={midY + 14}
          fontSize={7.5}
          fontFamily="monospace"
          fill={highlight.tx ? '#f4f0e7' : GREY}
          textAnchor="middle"
        >
          {isForward ? 'Walsh cover' : '64-ary Walsh'}
        </text>

        {/* other transmitters on the reverse link */}
        {!isForward ? (
          <>
            <rect x={leftX + 10} y={midY + 36} width={boxW - 20} height={16} fill="none" stroke={GREY} strokeWidth={0.7} strokeDasharray="3 2" />
            <text x={leftX + boxW / 2} y={midY + 47} fontSize={7} fontFamily="monospace" fill={GREY} textAnchor="middle">
              other mobiles
            </text>
            <line x1={leftX + boxW - 10} y1={midY + 44} x2={rightX} y2={midY + 20} stroke={GREY} strokeWidth={0.7} strokeDasharray="3 2" />
          </>
        ) : null}

        {/* the air */}
        <line
          x1={leftX + boxW}
          y1={midY}
          x2={rightX - 8}
          y2={midY}
          stroke={highlight.air ? BRICK : INK}
          strokeWidth={highlight.air ? 2.4 : 1.4}
        />
        <polygon points={`${rightX - 8},${midY} ${rightX - 16},${midY - 4} ${rightX - 16},${midY + 4}`} fill={highlight.air ? BRICK : INK} />
        <text
          x={(leftX + boxW + rightX) / 2}
          y={midY - 10}
          fontSize={8}
          fontFamily="monospace"
          fill={highlight.air ? BRICK : INK}
          textAnchor="middle"
        >
          {isForward ? 'QPSK · 1.2288 Mc/s' : 'OQPSK · 1.2288 Mc/s'}
        </text>
        <text
          x={(leftX + boxW + rightX) / 2}
          y={midY + 16}
          fontSize={8}
          fontFamily="monospace"
          fill={highlight.band ? BRICK : GREY}
          textAnchor="middle"
        >
          {isForward ? '869–894 MHz' : '824–849 MHz'} · 1.25 MHz
        </text>

        {/* receiver */}
        <rect
          x={rightX}
          y={midY - 26}
          width={boxW}
          height={52}
          fill={highlight.rx ? BRICK : 'none'}
          stroke={highlight.rx ? BRICK : INK}
          strokeWidth={1.2}
        />
        <text x={rightX + boxW / 2} y={midY - 32} fontSize={8} fontFamily="monospace" fill={INK} textAnchor="middle">
          {rightLabel}
        </text>
        <text
          x={rightX + boxW / 2}
          y={midY + 3}
          fontSize={7.5}
          fontFamily="monospace"
          fill={highlight.rx ? '#f4f0e7' : GREY}
          textAnchor="middle"
        >
          {isForward ? 'coherent' : 'non-coherent'}
        </text>
        <text
          x={rightX + boxW / 2}
          y={midY + 14}
          fontSize={7.5}
          fontFamily="monospace"
          fill={highlight.rx ? '#f4f0e7' : GREY}
          textAnchor="middle"
        >
          Viterbi {isForward ? 'r=1/2' : 'r=1/3'}
        </text>

        {/* power control, always drawn: it closes the loop in both directions */}
        <line x1={rightX} y1={H - 18} x2={leftX + boxW} y2={H - 18} stroke={OLIVE} strokeWidth={1.2} strokeDasharray="4 3" />
        <polygon
          points={`${leftX + boxW},${H - 18} ${leftX + boxW + 8},${H - 22} ${leftX + boxW + 8},${H - 14}`}
          fill={OLIVE}
        />
        <text x={(leftX + boxW + rightX) / 2} y={H - 22} fontSize={7.5} fontFamily="monospace" fill={OLIVE} textAnchor="middle">
          {isForward ? 'reverse link carries this user’s data back' : 'power-control bit · 1.25 ms · ±1 dB'}
        </text>
      </PlotFrame>
    </Figure>
  );
}
