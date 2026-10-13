/**
 * LinkPipeline.tsx, ForwardLinkPipeline and ReverseLinkPipeline.
 *
 * Both are the same component with a different direction, because the stage
 * data in lib/pipelines.ts already differs: the forward chain has a MUX, a
 * decimated long code and Walsh channelisation; the reverse chain has 64-ary
 * Walsh modulation, a burst randomiser and full-rate long-code spreading. The
 * two diagrams are NOT forced into the same shape, they have different block
 * counts, different rates and different arithmetic.
 *
 * Every block is clickable and reveals name, purpose, input, operation,
 * output, the rate or parameter where the course reference supports one, and
 * what the next stage does with the output. Step-through mode walks one frame
 * of information from source to RF output.
 */

import { useEffect, useMemo, useState } from 'react';
import { RF, TRAFFIC_RATES_BPS, type TrafficRateBps } from '../lib/spec';
import {
  forwardReceiverChain,
  pipelineFor,
  repetitionFactor,
  type LinkDirection,
  type PipelineStage,
} from '../lib/pipelines';
import { Disclosure, Figure, Panel, Readouts, ResetButton, SelectField, Term, Why } from './ui';

const STEP_MS = 1800;

function PipelineView({
  link,
  rate,
  onRateChange,
}: {
  link: LinkDirection;
  rate: TrafficRateBps;
  onRateChange: (r: TrafficRateBps) => void;
}) {
  const stages = useMemo(() => pipelineFor(link, rate), [link, rate]);
  const receiver = useMemo(() => (link === 'forward' ? forwardReceiverChain() : []), [link]);

  const [selected, setSelected] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const lastIndex = stages.length - 1;

  // As in SpreadingVisualizer: `playing` is intent, `running` is derived, so
  // reaching the final stage ends the walk without an effect writing state.
  const atEnd = cursor !== null && cursor >= lastIndex;
  const running = playing && !atEnd;

  useEffect(() => {
    if (!running) return;
    const at = cursor ?? -1;
    const t = window.setTimeout(() => {
      const next = Math.min(lastIndex, at + 1);
      setCursor(next);
      setSelected(next);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [running, cursor, lastIndex]);

  const reset = () => {
    setSelected(0);
    setCursor(null);
    setPlaying(false);
  };

  // Clamped at read time rather than corrected in an effect: the forward chain
  // has eight stages and the reverse nine, so the index can briefly exceed the
  // list when the direction changes.
  const stage = stages[Math.min(selected, lastIndex)];
  const repeat = repetitionFactor(rate);

  return (
    <div className="stack">
      <div className="controls">
        <SelectField<number>
          label="Information rate"
          value={rate}
          options={TRAFFIC_RATES_BPS.map((r) => ({
            value: r,
            label: `${r.toLocaleString('en-US')} b/s${r === RF.exampleInfoRateBps ? ' · full rate' : ` · repeat ×${repetitionFactor(r)}`}`,
          }))}
          onChange={(v) => onRateChange(v as TrafficRateBps)}
          width="16rem"
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Follow one frame through</span>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPlaying(false);
                const next = Math.max(0, (cursor ?? 0) - 1);
                setCursor(next);
                setSelected(next);
              }}
              disabled={cursor === null || cursor === 0}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (atEnd) {
                  setCursor(null);
                  setSelected(0);
                  setPlaying(true);
                } else {
                  setPlaying((p) => !p);
                }
              }}
            >
              {running ? '❙❙ Pause' : atEnd ? '↻ Replay' : '▶ Step through'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setPlaying(false);
                const next = Math.min(stages.length - 1, (cursor ?? -1) + 1);
                setCursor(next);
                setSelected(next);
              }}
              disabled={cursor !== null && cursor >= stages.length - 1}
            >
              Next →
            </button>
            <ResetButton onReset={reset} />
          </div>
        </div>
      </div>

      <Figure
        label={link === 'forward' ? 'Fig. 4.1' : 'Fig. 4.2'}
        caption={
          <>
            {link === 'forward'
              ? 'Base-station transmitter for one forward traffic channel.'
              : 'Mobile transmitter, reverse traffic channel.'}{' '}
            {stages.length} stages; rates are shown on each block’s output path. Click any block for
            its full description. Values marked{' '}
            <span className="pipeline__derived">(derived)</span> follow from the deck’s repetition
            rule rather than being printed in it.
          </>
        }
      >
        <div className="pipeline">
          {stages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="pipeline__block"
              aria-pressed={i === selected}
              data-active={cursor === i}
              data-passed={cursor !== null && i < cursor}
              onClick={() => {
                setPlaying(false);
                setSelected(i);
              }}
            >
              <span className="pipeline__idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="pipeline__name">{s.name}</span>
              {s.param ? <span className="pipeline__param">{s.param}</span> : null}
              <span className="pipeline__rate">
                {s.rate}
                {s.derived ? <span className="pipeline__derived"> (derived)</span> : null}
              </span>
            </button>
          ))}
        </div>
      </Figure>

      <StageDetail stage={stage} index={selected} total={stages.length} />

      <Readouts
        items={[
          { label: 'Link', value: link === 'forward' ? 'Forward' : 'Reverse', note: link === 'forward' ? 'BS → MS · 869–894 MHz' : 'MS → BS · 824–849 MHz' },
          { label: 'Information rate', value: rate.toLocaleString('en-US'), unit: 'b/s' },
          {
            label: 'Convolutional code',
            value: link === 'forward' ? 'r = 1/2' : 'r = 1/3',
            note: 'K = 9 on both links',
          },
          {
            label: 'Repetition',
            value: repeat === 1 ? 'none' : `×${repeat}`,
            note: repeat === 1 ? 'Full rate' : 'Holds the symbol rate constant',
          },
          {
            label: 'Interleaver',
            value: link === 'forward' ? '24 × 16' : '32 × 18',
            note: '20 ms block',
          },
          {
            label: 'Output chip rate',
            value: '1.2288',
            unit: 'Mc/s',
            emphasis: true,
            note: link === 'forward' ? 'QPSK' : 'OQPSK, Q delayed ½ Tc',
          },
        ]}
      />

      {/* The reverse link's rate arithmetic, which the deck spells out. */}
      {link === 'reverse' ? (
        <Panel variant="sunk" title="The rate arithmetic">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontFamily: 'var(--mono)', fontSize: '0.875rem' }}>
            <span>
              <span className="muted">28 800 sym/s × 64 ÷ 6</span> = <strong style={{ color: 'var(--brick)' }}>307 200 c/s</strong>
            </span>
            <span>
              <span className="muted">307 200 c/s × 4</span> = <strong style={{ color: 'var(--brick)' }}>1 228 800 c/s</strong>
            </span>
          </div>
          <p className="small muted" style={{ margin: '0.75rem 0 0' }}>
            The ÷ 6 is the whole of 64-ary modulation: six coded symbols are consumed to choose one
            of 64 Walsh functions, so six symbols become 64 chips. The × 4 is long-code spreading.
            Both figures are printed in the course reference.
          </p>
        </Panel>
      ) : null}

      {/* Forward-link receiver chain, the deck's "same chain, undone". */}
      {receiver.length > 0 ? (
        <Figure
          label="Fig. 4.3"
          caption={<>The mobile receiver: the same chain, undone. Click a block for its description.</>}
        >
          <ReceiverChain stages={receiver} />
        </Figure>
      ) : null}

      <Why>
        {link === 'forward' ? (
          <>
            Orthogonality holds on the forward link because every channel in the cell is covered and
            scrambled <em>synchronously</em> from one clock, and the pilot supplies the phase
            reference for <Term k="coherent">coherent detection</Term>. Both of those are
            properties of the transmitter being a single device.
          </>
        ) : (
          <>
            Every mobile runs this chain with its own long code, and the base station tells them
            apart by that code, not by <Term k="walsh">Walsh index</Term>, which here is carrying
            data. Because arrivals are unaligned the codes are only quasi-orthogonal, so{' '}
            <Term k="power control">tight power control</Term> is what makes the link work at all.
          </>
        )}
      </Why>

      {rate !== RF.exampleInfoRateBps ? <Disclosure id="trace-rates" /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Detail panel for the selected block.
 * ------------------------------------------------------------------ */

function StageDetail({ stage, index, total }: { stage: PipelineStage; index: number; total: number }) {
  return (
    <Panel title={`Stage ${String(index + 1).padStart(2, '0')} of ${total}`}>
      <div className="stack stack--tight">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.75rem' }}>
          <h3 style={{ fontSize: '1.3125rem' }}>{stage.name}</h3>
          {stage.param ? (
            <span className="mono small" style={{ color: 'var(--olive)' }}>
              {stage.param}
            </span>
          ) : null}
          <span className="mono small" style={{ color: 'var(--brick)', marginLeft: 'auto' }}>
            {stage.rate}
            {stage.derived ? ' (derived)' : ''}
          </span>
        </div>

        <p className="small" style={{ margin: 0 }}>
          <strong>{stage.purpose}</strong>
        </p>

        <div className="blockdetail">
          <div className="blockdetail__field">
            <h4>Input</h4>
            <p>{stage.input}</p>
          </div>
          <div className="blockdetail__field">
            <h4>Operation</h4>
            <p>{stage.operation}</p>
          </div>
          <div className="blockdetail__field">
            <h4>Output</h4>
            <p>{stage.output}</p>
          </div>
          <div className="blockdetail__field">
            <h4>What happens next</h4>
            <p>{stage.next}</p>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------ *
 * Receiver chain, compact, with its own selection.
 * ------------------------------------------------------------------ */

function ReceiverChain({ stages }: { stages: PipelineStage[] }) {
  const [sel, setSel] = useState<number | null>(null);
  return (
    <div>
      <div className="pipeline">
        {stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="pipeline__block"
            aria-pressed={sel === i}
            onClick={() => setSel(sel === i ? null : i)}
          >
            <span className="pipeline__idx">R{String(i + 1).padStart(2, '0')}</span>
            <span className="pipeline__name">{s.name}</span>
            {s.param ? <span className="pipeline__param">{s.param}</span> : null}
            <span className="pipeline__rate">{s.rate}</span>
          </button>
        ))}
      </div>
      {sel !== null ? (
        <div style={{ marginTop: '1rem' }}>
          <div className="blockdetail">
            <div className="blockdetail__field">
              <h4>Purpose</h4>
              <p>{stages[sel].purpose}</p>
            </div>
            <div className="blockdetail__field">
              <h4>Operation</h4>
              <p>{stages[sel].operation}</p>
            </div>
            <div className="blockdetail__field">
              <h4>Output</h4>
              <p>{stages[sel].output}</p>
            </div>
            <div className="blockdetail__field">
              <h4>What happens next</h4>
              <p>{stages[sel].next}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The two named exports the project brief asks for.
 * ------------------------------------------------------------------ */

export function ForwardLinkPipeline({
  rate,
  onRateChange,
}: {
  rate: TrafficRateBps;
  onRateChange: (r: TrafficRateBps) => void;
}) {
  return <PipelineView link="forward" rate={rate} onRateChange={onRateChange} />;
}

export function ReverseLinkPipeline({
  rate,
  onRateChange,
}: {
  rate: TrafficRateBps;
  onRateChange: (r: TrafficRateBps) => void;
}) {
  return <PipelineView link="reverse" rate={rate} onRateChange={onRateChange} />;
}
