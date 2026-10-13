/**
 * PNSequenceExplorer.tsx
 *
 * A maximal-length-sequence explorer: generated sequence, shifted sequence,
 * chip-by-chip comparison, and periodic autocorrelation against relative shift.
 *
 * SCOPE, STATED PLAINLY
 * The course reference names the IS-95 pilot PN sequences but gives no
 * generator polynomial, so this page does NOT claim to produce them. It runs
 * genuine m-sequences from standard primitive polynomials, short enough to see
 * whole, and demonstrates the property PN sequences are actually chosen for:
 * a single sharp autocorrelation peak against a flat floor of −1. That peak is
 * what lets a receiver find chip timing, and it is computed here from the
 * running generator rather than drawn.
 */

import { useMemo, useState } from 'react';
import {
  PN_POLYNOMIALS,
  balance,
  hasIdealAutocorrelation,
  normalizeSeed,
  periodicAutocorrelation,
  pnBinary,
  pnBipolar,
  polynomialForDegree,
  runLfsr,
} from '../lib/pn';
import { innerProduct } from '../lib/walsh';
import { ChipStrip, StemPlot, Waveform } from './charts';
import { Disclosure, Figure, Legend, Panel, Readouts, ResetButton, SelectField, Slider, Term, Why } from './ui';

const DEFAULT_DEGREE = 5;
const DEFAULT_SHIFT = 3;

export function PNSequenceExplorer() {
  const [degree, setDegree] = useState(DEFAULT_DEGREE);
  const [shift, setShift] = useState(DEFAULT_SHIFT);
  const [seedBits, setSeedBits] = useState<number[]>([1, 0, 0, 0, 0, 0, 0, 0, 0]);

  const poly = polynomialForDegree(degree);
  const seed = useMemo(() => normalizeSeed(seedBits, degree), [seedBits, degree]);

  // One full period, plus enough extra to read off any shift directly.
  const binary = useMemo(() => pnBinary(poly, seed, poly.period * 2), [poly, seed]);
  const bipolar = useMemo(() => pnBipolar(poly, seed, poly.period * 2), [poly, seed]);

  const period = poly.period;
  const base = bipolar.slice(0, period);
  const effectiveShift = shift % period;
  const shifted = bipolar.slice(effectiveShift, effectiveShift + period);

  const product = base.map((v, i) => v * shifted[i]);
  const dot = innerProduct(base, shifted);

  const autocorr = useMemo(() => periodicAutocorrelation(base), [base]);
  const ideal = useMemo(() => hasIdealAutocorrelation(base), [base]);
  const bal = balance(binary.slice(0, period));

  const steps = useMemo(() => runLfsr(poly, seed, Math.min(12, period)), [poly, seed, period]);

  const reset = () => {
    setDegree(DEFAULT_DEGREE);
    setShift(DEFAULT_SHIFT);
    setSeedBits([1, 0, 0, 0, 0, 0, 0, 0, 0]);
  };

  return (
    <div className="stack">
      <Disclosure id="pn-polynomials" />

      <div className="controls">
        <SelectField
          label="Register length & polynomial"
          value={degree}
          options={PN_POLYNOMIALS.map((p) => ({
            value: p.degree,
            label: `${p.degree} stages · ${p.label} · period ${p.period}`,
          }))}
          onChange={(v) => {
            setDegree(v);
            setShift((s) => s % polynomialForDegree(v).period);
          }}
          width="19rem"
        />
        <Slider
          label="Relative shift"
          value={shift}
          min={0}
          max={period - 1}
          unit="chips"
          onChange={setShift}
        />
        <div className="control" style={{ flex: '0 0 auto' }}>
          <span className="control__label">Seed (initial register state)</span>
          <div className="btn-row">
            {Array.from({ length: degree }, (_, i) => (
              <button
                key={i}
                type="button"
                className={`btn${seed[i] === 1 ? ' btn--primary' : ''}`}
                style={{ padding: '0.4rem 0.6rem' }}
                aria-label={`Stage ${i + 1} is ${seed[i] === 1 ? 'one' : 'zero'}`}
                onClick={() =>
                  setSeedBits((prev) => {
                    const next = normalizeSeed(prev, degree);
                    next[i] = next[i] === 1 ? 0 : 1;
                    return next;
                  })
                }
              >
                {seed[i]}
              </button>
            ))}
            <ResetButton onReset={reset} />
          </div>
        </div>
      </div>

      <Readouts
        items={[
          { label: 'Stages', value: degree, note: poly.label },
          { label: 'Period', value: period, unit: 'chips', note: `2^${degree} − 1`, emphasis: true },
          { label: 'Balance', value: `${bal.ones} / ${bal.zeros}`, note: 'ones / zeros, differ by one, as an m-sequence must' },
          {
            label: 'Shift',
            value: effectiveShift,
            unit: 'chips',
            note: effectiveShift === 0 ? 'Aligned' : 'Misaligned',
          },
          {
            label: 'Correlation',
            value: dot > 0 ? `+${dot}` : String(dot),
            emphasis: true,
            note: effectiveShift === 0 ? `Peak, equals the period, ${period}` : 'Off-peak, exactly −1 for a true m-sequence',
          },
          {
            label: 'Ideal autocorrelation?',
            value: ideal ? 'Yes' : 'No',
            note: ideal
              ? `Peak ${period} at zero shift, −1 at all ${period - 1} others, verified from the generated bits`
              : 'The polynomial is not primitive for this register length',
          },
        ]}
      />

      {/* ---------------- the generator itself ---------------- */}

      <Figure
        label="Fig. 3.5"
        caption={
          <>
            The shift register, first {steps.length} clocks. Each row is the register state before
            the clock; the output is the last stage, and the bit fed back into stage 1 is the XOR of
            the tapped stages ({poly.taps.map((t) => `s${t}`).join(' ⊕ ')}).
          </>
        }
      >
        <div className="scroll-x">
          <table className="spec-table" style={{ minWidth: '28rem' }}>
            <thead>
              <tr>
                <th>Clock</th>
                {Array.from({ length: degree }, (_, i) => (
                  <th key={i} style={{ textAlign: 'center' }}>
                    s{i + 1}
                    {poly.taps.includes(i + 1) ? <span style={{ color: 'var(--brick)' }}> ⊕</span> : null}
                  </th>
                ))}
                <th style={{ textAlign: 'center' }}>Feedback</th>
                <th style={{ textAlign: 'center' }}>Output</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={i}>
                  <td className="is-value">{i}</td>
                  {s.state.map((bit, j) => (
                    <td
                      key={j}
                      className="is-value"
                      style={{
                        textAlign: 'center',
                        color: poly.taps.includes(j + 1) ? 'var(--brick)' : undefined,
                      }}
                    >
                      {bit}
                    </td>
                  ))}
                  <td className="is-value" style={{ textAlign: 'center', color: 'var(--olive)' }}>
                    {s.feedback}
                  </td>
                  <td className="is-value" style={{ textAlign: 'center', fontWeight: 600 }}>
                    {s.output}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Figure>

      {/* ---------------- sequence and shifted sequence ---------------- */}

      <div className="stack stack--tight">
        <Figure label="Fig. 3.6a" caption={<>One full period of the generated sequence, bipolar.</>}>
          <Waveform samples={base} colour="var(--brick)" label="PN sequence" showBitBoundaries={false} />
        </Figure>
        <Figure
          label="Fig. 3.6b"
          caption={<>The same sequence shifted by {effectiveShift} chips, what a late arrival looks like.</>}
        >
          <Waveform samples={shifted} colour="var(--olive)" label="shifted PN sequence" showBitBoundaries={false} />
        </Figure>
        <Figure
          label="Fig. 3.6c"
          caption={
            <>
              Chip-by-chip product. Summed over the period it gives {dot > 0 ? `+${dot}` : dot}
              {effectiveShift === 0 ? ', the full peak.' : ', the flat off-peak floor.'}
            </>
          }
        >
          <Waveform samples={product} colour="var(--charcoal)" label="product" showBitBoundaries={false} />
        </Figure>
      </div>

      <Figure
        label="Fig. 3.7"
        caption={
          <>
            Chip-by-chip comparison, first 32 chips of the period. Binary form uses 0 ↦ +1 and
            1 ↦ −1, the same convention as the Walsh explorer.
          </>
        }
      >
        <ChipStrip
          maxChips={Math.min(32, period)}
          rows={[
            { label: 'c(n)', values: base },
            { label: `c(n+${effectiveShift})`, values: shifted },
            { label: 'product', values: product },
          ]}
        />
      </Figure>

      <Figure
        label="Fig. 3.8"
        caption={
          <>
            Periodic autocorrelation against relative shift, the reason PN sequences are used for
            timing. One peak of {period} at zero shift, and exactly −1 everywhere else. Click a stem
            to set the shift.
          </>
        }
      >
        <StemPlot
          values={autocorr}
          xLabel="shift / chips"
          yLabel="autocorrelation"
          highlightIndex={effectiveShift}
          onPick={setShift}
          thresholdLabel={`peak = ${period}`}
          height={120}
        />
      </Figure>

      <Legend
        entries={[
          { colour: 'var(--brick)', label: 'Generated sequence' },
          { colour: 'var(--olive)', label: 'Shifted copy / feedback bit' },
          { colour: 'var(--charcoal)', label: 'Product and autocorrelation' },
        ]}
      />

      <div className="split--even split">
        <Panel variant="sunk" title="What PN sequences do in IS-95">
          <ul className="small" style={{ marginBottom: 0 }}>
            <li>
              <strong>Timing.</strong> The sharp autocorrelation peak is how a receiver finds chip
              alignment at all, correlate, slide, and the peak tells you where you are.
            </li>
            <li>
              <strong>Quadrature spreading.</strong> The pilot PN sequences spread the I and Q
              branches on both links.
            </li>
            <li>
              <strong>Cell identity.</strong> Base stations use different <em>offsets</em> of the
              same pilot PN sequence, so finding the offset identifies the cell.
            </li>
          </ul>
        </Panel>
        <Panel variant="sunk" title="Short PN vs. long code, not the same thing">
          <p className="small" style={{ margin: 0 }}>
            The <Term k="short pn">pilot PN sequences</Term> are short, common to the whole system,
            and distinguish <em>cells</em> by offset. The <Term k="long code">long code</Term> comes
            from a 42-stage generator with period 2⁴² − 1 and a per-user mask, and distinguishes{' '}
            <em>users</em>. Different lengths, different jobs, different place in the chain. The
            next panel covers the long code.
          </p>
        </Panel>
      </div>

      <Why>
        An <Term k="m-sequence">m-sequence</Term>’s off-peak autocorrelation is −1, not 0. That is
        the difference between a PN sequence and a Walsh function in one number: PN sequences are
        chosen for a sharp timing peak, Walsh functions for exact cancellation. Neither substitutes
        for the other, which is why IS-95 uses both.
      </Why>
    </div>
  );
}
