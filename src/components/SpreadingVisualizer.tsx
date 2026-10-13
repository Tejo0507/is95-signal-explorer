/**
 * SpreadingVisualizer.tsx
 *
 * Step-controlled walk through the full spread/despread cycle:
 *
 *   information bit → spreading code → chip sequence → transmitted
 *   representation → receiver correlation → integration → recovered bit
 *
 * Stages are revealed progressively so earlier waveforms stay on screen for
 * comparison. Play advances automatically; pause and reset are always
 * available. Every waveform is the computed array from `buildSpreadingStages`.
 *
 * The optional second user demonstrates the property the whole scheme rests on:
 * an aligned orthogonal interferer contributes exactly zero to the correlator,
 * and a misaligned one does not.
 */

import { useEffect, useMemo, useState } from 'react';
import { CHIP_DEMO } from '../lib/spec';
import {
  buildSpreadingStages,
  DEFAULT_DEMO,
  SELF_JAMMING_PRESET,
  type SpreadingDemoInput,
} from '../lib/spreading';
import { Disclosure, Figure, Legend, Readouts, ResetButton, SelectField, Slider, Term, Why } from './ui';
import { Waveform } from './charts';

const STAGE_MS = 1500;

/** Colour per stage: brick for our own signal, olive where a second user is involved. */
const STAGE_COLOUR: Record<string, string> = {
  bit: 'var(--brick)',
  code: 'var(--olive)',
  chips: 'var(--brick)',
  channel: 'var(--charcoal)',
  correlate: 'var(--brick)',
  integrate: 'var(--charcoal)',
  decide: 'var(--brick)',
};

export function SpreadingVisualizer() {
  const [input, setInput] = useState<SpreadingDemoInput>(DEFAULT_DEMO);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const stages = useMemo(() => buildSpreadingStages(input), [input]);
  const last = stages.length - 1;

  // `playing` is the user's intent; `running` is whether anything is actually
  // advancing. Deriving it means reaching the last stage stops the animation
  // and flips the button to "Replay" without an effect writing state back.
  const atEnd = step >= last;
  const running = playing && !atEnd;

  // Auto-advance while running. The animation stops at the end rather than
  // looping, so the final state stays on screen to be read.
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setStep((s) => Math.min(last, s + 1)), STAGE_MS);
    return () => window.clearTimeout(t);
  }, [running, step, last]);

  const reset = () => {
    setInput(DEFAULT_DEMO);
    setStep(0);
    setPlaying(false);
  };

  const current = stages[step];

  return (
    <div className="stack">
      <div className="controls">
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Playback</span>
          <div className="btn-row">
            <button type="button" className="btn" onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>
              ← Back
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (atEnd) {
                  setStep(0);
                  setPlaying(true);
                } else {
                  setPlaying((p) => !p);
                }
              }}
            >
              {running ? '❙❙ Pause' : atEnd ? '↻ Replay' : '▶ Play'}
            </button>
            <button type="button" className="btn" onClick={() => { setPlaying(false); setStep((s) => Math.min(last, s + 1)); }} disabled={step >= last}>
              Next →
            </button>
            <ResetButton onReset={reset} />
          </div>
        </div>

        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Preset</span>
          <div className="btn-row">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setInput(SELF_JAMMING_PRESET);
                setStep(5);
                setPlaying(false);
              }}
            >
              Self-jamming · 4 of 8
            </button>
          </div>
        </div>

        <SelectField
          label="Our spreading code"
          value={input.codeIndex}
          options={Array.from({ length: CHIP_DEMO.codeLength }, (_, i) => ({
            value: i,
            label: `W${i} of the ${CHIP_DEMO.codeLength}-chip family`,
          }))}
          onChange={(v) => setInput((p) => ({ ...p, codeIndex: v }))}
          width="14rem"
        />

        <SelectField
          label="Data bits"
          value={input.bits.join(',')}
          options={[
            { value: '1,-1', label: '+1, −1' },
            { value: '1,1', label: '+1, +1' },
            { value: '-1,1', label: '−1, +1' },
            { value: '1,-1,-1,1', label: '+1, −1, −1, +1' },
          ]}
          onChange={(v) =>
            setInput((p) => ({ ...p, bits: v.split(',').map(Number) }))
          }
          width="11rem"
        />

        <SelectField
          label="Second user"
          value={input.interfererIndex === null ? 'none' : String(input.interfererIndex)}
          options={[
            { value: 'none', label: 'None, clean channel' },
            ...Array.from({ length: CHIP_DEMO.codeLength }, (_, i) => ({
              value: String(i),
              label: `W${i}`,
            })).filter((o) => Number(o.value) !== input.codeIndex),
          ]}
          onChange={(v) =>
            setInput((p) => ({ ...p, interfererIndex: v === 'none' ? null : Number(v) }))
          }
          width="12rem"
        />

        {input.interfererIndex !== null ? (
          <Slider
            label="Second user’s delay"
            value={input.interfererDelayChips}
            min={0}
            max={CHIP_DEMO.codeLength - 1}
            unit="Tc"
            onChange={(v) => setInput((p) => ({ ...p, interfererDelayChips: v }))}
            grow={false}
          />
        ) : null}
      </div>

      {/* Stage tracker */}
      <div className="pipeline">
        {stages.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="pipeline__block"
            aria-pressed={i === step}
            data-passed={i < step}
            onClick={() => {
              setPlaying(false);
              setStep(i);
            }}
          >
            <span className="pipeline__idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="pipeline__name">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Progressive reveal of the waveforms */}
      <div className="stack stack--tight">
        {stages.slice(0, step + 1).map((s, i) => (
          <Figure
            key={s.id}
            label={`Stage ${String(i + 1).padStart(2, '0')} · ${s.title}`}
            caption={s.caption}
          >
            <Waveform
              samples={s.waveform}
              samplesPerBit={s.samplesPerBit}
              colour={STAGE_COLOUR[s.id]}
              label={s.title}
              height={s.id === 'integrate' ? 84 : 62}
              yMax={s.id === 'integrate' ? input.codeLength : undefined}
            />
            {s.readouts ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.35rem 1.5rem',
                  marginTop: '0.5rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid var(--rule)',
                  fontFamily: 'var(--mono)',
                  fontSize: '0.6875rem',
                }}
              >
                {s.readouts.map((r) => (
                  <span key={r.label}>
                    <span style={{ color: 'var(--ink-faint)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.5625rem' }}>
                      {r.label}
                    </span>{' '}
                    <span style={{ color: 'var(--ink)' }}>{r.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </Figure>
        ))}
      </div>

      <Legend
        entries={[
          { colour: 'var(--brick)', label: 'Our signal' },
          { colour: 'var(--olive)', label: 'Spreading code' },
          { colour: 'var(--charcoal)', label: 'Composite on air / correlator output' },
          { colour: 'var(--warm-grey)', label: 'Bit boundaries, axes' },
        ]}
      />

      <Readouts
        items={[
          { label: 'Stage', value: `${step + 1} of ${stages.length}`, note: current.title },
          { label: 'Code length', value: input.codeLength, unit: 'chips', note: CHIP_DEMO.note },
          { label: 'Chips transmitted', value: input.bits.length * input.codeLength },
          {
            label: 'Correlator peak',
            value: `±${input.codeLength}`,
            emphasis: true,
            note: 'For a cleanly received bit',
          },
        ]}
      />

      <Why>
        The chip carries no information on its own, only the pattern does. Multiplying by the same
        code twice makes it vanish, because every chip squares to +1. That is the entire mechanism
        by which a receiver pulls one conversation out of a sum of many, and it is why{' '}
        <Term k="correlation">correlation</Term> rather than filtering is the operation that matters
        in CDMA.
      </Why>

      <Disclosure>
        Eight chips per bit, not 128. The deck uses an eight-chip code so the whole cycle fits on
        one figure, and is explicit that 128 is the real IS-95 figure. There is also no noise,
        pulse shaping or carrier here: those would be simulation output the course reference does
        not supply. What is exact is the arithmetic, every value plotted is integer arithmetic on
        ±1 sequences.
      </Disclosure>
    </div>
  );
}
