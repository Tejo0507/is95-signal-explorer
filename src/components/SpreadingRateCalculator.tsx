/**
 * SpreadingRateCalculator.tsx
 *
 * Spreading factor = chip rate / information bit rate.
 *
 * The deck's example is 1 228 800 / 9 600 = 128 chips per information bit. The
 * information rate here is adjustable, including to values IS-95 never uses,
 * because the arithmetic is what is being taught, but the component says
 * clearly when the chosen rate is one of the four IS-95 vocoder rates and when
 * it is merely illustrative, and it never implies the ratio describes the whole
 * coding and modulation chain.
 */

import { useState } from 'react';
import { RF, TRAFFIC_RATES_BPS } from '../lib/spec';
import { formatDuration, spreadingFactor } from '../lib/spreading';
import { Disclosure, Figure, NumberField, Readouts, ResetButton, Slider, Term, Why } from './ui';
import { PlotFrame } from './charts';
import { PLOT_COLOURS } from './theme';

const { INK, BRICK, OLIVE, GREY } = PLOT_COLOURS;

export function SpreadingRateCalculator() {
  const [rate, setRate] = useState<number>(RF.exampleInfoRateBps);

  const result = spreadingFactor(rate);
  const isStandardRate = (TRAFFIC_RATES_BPS as readonly number[]).includes(rate);

  return (
    <div className="stack">
      <div className="controls">
        <Slider
          label="Illustrative information rate"
          value={rate}
          min={600}
          max={38400}
          step={100}
          unit="b/s"
          onChange={setRate}
          format={(v) => v.toLocaleString('en-US')}
        />
        <NumberField
          label="Exact"
          value={rate}
          min={1}
          max={1_228_800}
          step={100}
          unit="b/s"
          onCommit={setRate}
          width="8.5rem"
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">IS-95 vocoder rates</span>
          <div className="btn-row">
            {TRAFFIC_RATES_BPS.map((r) => (
              <button
                key={r}
                type="button"
                className={`btn${rate === r ? ' btn--primary' : ''}`}
                onClick={() => setRate(r)}
              >
                {r.toLocaleString('en-US')}
              </button>
            ))}
            <ResetButton onReset={() => setRate(RF.exampleInfoRateBps)} />
          </div>
        </div>
      </div>

      {/* The equation, laid out as an equation rather than prose. */}
      <Figure
        label="Fig. 1.3"
        caption={
          <>
            Spreading factor as a ratio of two rates. The numerator is fixed for every IS-95
            channel; only the denominator changes with the vocoder rate.
          </>
        }
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.25rem',
            padding: '0.75rem 0',
            fontFamily: 'var(--mono)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              chip rate
            </div>
            <div style={{ fontSize: '1.375rem', color: INK, paddingBottom: '0.3rem', borderBottom: `1px solid ${INK}` }}>
              {RF.chipRateCps.toLocaleString('en-US')}
            </div>
            <div style={{ fontSize: '1.375rem', color: BRICK, paddingTop: '0.3rem' }}>
              {rate.toLocaleString('en-US')}
            </div>
            <div style={{ fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              information rate
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--ink-faint)', marginTop: '0.4rem' }}>
              chip/s ÷ bit/s
            </div>
          </div>

          <div style={{ fontSize: '1.5rem', color: GREY }}>=</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.75rem', lineHeight: 1, color: BRICK }}>
              {result.exact ? result.factor : result.factor.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: '0.35rem' }}>
              chips per information bit
            </div>
            {!result.exact ? (
              <div style={{ fontSize: '0.625rem', color: OLIVE, marginTop: '0.3rem' }}>
                not a whole number at this rate
              </div>
            ) : null}
          </div>
        </div>
      </Figure>

      <Readouts
        items={[
          {
            label: 'Spreading factor',
            value: result.exact ? result.factor : result.factor.toFixed(3),
            emphasis: true,
            note: rate === RF.exampleInfoRateBps ? 'The deck’s worked example' : undefined,
          },
          {
            label: 'Processing gain',
            value: result.gainDb.toFixed(2),
            unit: 'dB',
            note: '10 · log₁₀(factor)',
          },
          {
            label: 'Bit duration Tb',
            value: formatDuration(result.bitDurationS),
            note: `1 ÷ ${rate.toLocaleString('en-US')} b/s`,
          },
          {
            label: 'Chip duration Tc',
            value: formatDuration(result.chipDurationS),
            note: 'Fixed, 1 ÷ 1.2288 Mchip/s',
          },
          {
            label: 'This rate in IS-95',
            value: isStandardRate ? 'Yes' : 'Illustrative',
            note: isStandardRate
              ? 'One of the four QCELP vocoder rates'
              : 'Not one of the four QCELP rates (9600 / 4800 / 2400 / 1200 b/s)',
          },
        ]}
      />

      {/* Tb against Tc, to scale, so the ratio is something you can see. */}
      <DurationBar factor={result.factor} rate={rate} />

      <div className="panel panel--sunk">
        <h3 className="panel__title">How to read this number</h3>
        <p className="small">
          The factor says how many chips one information bit is spread across, equivalently{' '}
          <span className="mono">Tb ÷ Tc</span>. At the deck’s 9.6 kb/s example that is{' '}
          <span className="mono">128</span>, and the{' '}
          <Term k="processing gain">processing gain</Term> is about 21 dB: roughly how much the
          despreading correlator favours the wanted signal over wideband interference.
        </p>
        <p className="small">
          What it does <em>not</em> say is how the chain gets there. The forward link reaches
          1.2288 Mchip/s in stages, rate 1/2 convolutional coding to 19.2 ks/s, then 64 chips per
          symbol from Walsh covering, and the reverse link reaches it by a different route
          entirely. Module 04 walks both.
        </p>
      </div>

      <Why>
        One ratio, 128, is the headline figure for IS-95, but reading it as "the system multiplies
        by 128 somewhere" misses that the rate changes at four distinct points in the chain, and
        differently on each link.
      </Why>

      <Disclosure id="spreading-factor" />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Tb against Tc drawn to scale, capped in drawing, honest in labelling.
 * ------------------------------------------------------------------ */

function DurationBar({ factor, rate }: { factor: number; rate: number }) {
  const W = 760;
  const H = 96;
  const padL = 18;
  const padR = 18;
  const plotW = W - padL - padR;

  // Draw at most 64 chip divisions; past that the ticks would merge into a
  // solid block and the figure would stop being readable. The caption says so.
  const drawn = Math.min(64, Math.max(1, Math.round(factor)));
  const chipW = plotW / drawn;
  const truncated = Math.round(factor) > drawn;

  return (
    <Figure
      label="Fig. 1.4"
      caption={
        <>
          One bit interval Tb divided into chip intervals Tc, to scale.{' '}
          {truncated ? (
            <>
              Only the first {drawn} of {Math.round(factor)} chips are drawn, beyond that the
              divisions stop being distinguishable.
            </>
          ) : (
            <>All {drawn} chip intervals are drawn.</>
          )}
        </>
      }
    >
      <PlotFrame width={W} height={H} label="Bit interval divided into chip intervals">
        {/* Tb */}
        <rect x={padL} y={18} width={plotW} height={20} fill={BRICK} opacity={0.14} stroke={BRICK} strokeWidth={1} />
        <text x={padL + plotW / 2} y={13} fontSize={9} fontFamily="'Source Sans 3', sans-serif" fill={BRICK} textAnchor="middle">
          Tb, one information bit at {rate.toLocaleString('en-US')} b/s
        </text>

        {/* Tc divisions */}
        <rect x={padL} y={48} width={plotW} height={20} fill={OLIVE} opacity={0.12} stroke={OLIVE} strokeWidth={1} />
        {Array.from({ length: drawn + 1 }, (_, i) => (
          <line
            key={i}
            x1={padL + i * chipW}
            y1={48}
            x2={padL + i * chipW}
            y2={68}
            stroke={OLIVE}
            strokeWidth={chipW > 6 ? 0.8 : 0.4}
          />
        ))}
        <text x={padL} y={82} fontSize={8.5} fontFamily="'Source Sans 3', sans-serif" fill={OLIVE}>
          Tc × {Math.round(factor)} at 1.2288 Mchip/s
          {truncated ? `  (first ${drawn} shown)` : ''}
        </text>
        <text x={padL + plotW} y={82} fontSize={8} fontFamily="'Source Sans 3', sans-serif" fill={GREY} textAnchor="end">
          time →
        </text>
      </PlotFrame>
    </Figure>
  );
}
